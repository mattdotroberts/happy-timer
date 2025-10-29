import { Cache, LaunchType, LocalStorage, Toast, getPreferenceValues, launchCommand, showToast } from "@raycast/api";
import { FocusText, LongBreakText, ShortBreakText } from "./constants";
import { enableFocusWhileFocused, setDND } from "./doNotDisturb";
import { Interval, IntervalExecutor, IntervalType } from "./types";
import { addSession, SessionRecord } from "./sessionStore";
import { secondsToTime } from "./secondsToTime";

const cache = new Cache();

const CURRENT_INTERVAL_CACHE_KEY = "pomodoro-interval/1.1";
const COMPLETED_POMODORO_COUNT_CACHE_KEY = "pomodoro-interval/completed-pomodoro-count";
const POMODORO_INTERVAL_HISTORY = "pomodoro-interval/history";

const currentTimestamp = () => Math.round(new Date().valueOf() / 1000);

const DEFAULT_FOCUS_MINUTES = 25;
const DEFAULT_SHORT_BREAK_MINUTES = 5;
const DEFAULT_LONG_BREAK_MINUTES = 20;

type CreateIntervalOptions = {
  isFreshStart?: boolean;
  customDuration?: number;
  tag?: string;
  startedAt?: number;
  name?: string;
};

function parseDurationPreference(rawMinutes: unknown, fallbackMinutes: number): number {
  if (typeof rawMinutes === "number" && Number.isFinite(rawMinutes) && rawMinutes > 0) {
    return rawMinutes * 60;
  }

  if (typeof rawMinutes === "string") {
    const minutes = parseFloat(rawMinutes);
    if (Number.isFinite(minutes) && minutes > 0) {
      return minutes * 60;
    }
  }

  return fallbackMinutes * 60;
}

function parseTimestamp(rawValue: unknown): number | undefined {
  if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
    return rawValue;
  }

  if (typeof rawValue === "string") {
    const parsed = parseInt(rawValue, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getIntervalStart(interval: Interval): number {
  if (typeof interval.startedAt === "number" && Number.isFinite(interval.startedAt)) {
    return interval.startedAt;
  }

  const firstPartStart = interval.parts[0]?.startedAt;
  return Number.isFinite(firstPartStart) ? firstPartStart : currentTimestamp();
}

function getElapsedSeconds(interval: Interval, endedAt: number): number {
  return interval.parts.reduce((acc, part) => {
    const startedAt = part.startedAt;
    if (!Number.isFinite(startedAt)) {
      return acc;
    }

    const stopAt =
      typeof part.pausedAt === "number" && Number.isFinite(part.pausedAt) && part.pausedAt >= startedAt
        ? part.pausedAt
        : endedAt;

    if (!Number.isFinite(stopAt) || stopAt < startedAt) {
      return acc;
    }

    return acc + (stopAt - startedAt);
  }, 0);
}

async function logIntervalSession(interval: Interval, endedAt: number): Promise<SessionRecord | undefined> {
  const startedAt = getIntervalStart(interval);
  const elapsedSeconds = getElapsedSeconds(interval, endedAt);
  const durationSeconds = Math.max(0, Math.min(elapsedSeconds, interval.length));

  const trimmedName = interval.name?.trim();
  const trimmedNote = interval.note?.trim();

  const record = await addSession({
    id: generateSessionId(),
    tag: interval.tag ?? "",
    intervalType: interval.type,
    startedAt,
    endedAt,
    durationSeconds,
    name: trimmedName ? trimmedName : undefined,
    note: trimmedNote ? trimmedNote : undefined,
  });
  return record;
}

export async function getIntervalHistory(): Promise<Interval[]> {
  const history = await LocalStorage.getItem(POMODORO_INTERVAL_HISTORY);

  if (typeof history !== "string" || history === null) {
    return [];
  }
  const intervales = JSON.parse(history);
  return intervales;
}

export async function saveIntervalHistory(interval: Interval) {
  const history = await getIntervalHistory();
  const index = history.findIndex((i) => i.id === interval.id);

  if (index !== -1) {
    history[index] = interval;
  } else {
    history.push(interval);
  }

  await LocalStorage.setItem(POMODORO_INTERVAL_HISTORY, JSON.stringify(history));
}

export function duration({ parts }: Interval): number {
  return parts.reduce((acc, part) => {
    const startedAt = part.startedAt;
    const comparisonPoint = typeof part.pausedAt !== "undefined" ? part.pausedAt : currentTimestamp();
    if (!Number.isFinite(startedAt) || !Number.isFinite(comparisonPoint) || comparisonPoint < startedAt) {
      return acc;
    }

    return acc + (comparisonPoint - startedAt);
  }, 0);
}

export function progress(interval: Interval): number {
  if (!Number.isFinite(interval.length) || interval.length <= 0) {
    return 0;
  }

  const computedProgress = (duration(interval) / interval.length) * 100;
  if (!Number.isFinite(computedProgress)) {
    return 0;
  }

  return Math.min(computedProgress, 100);
}

export function isPaused({ parts }: Interval): boolean {
  return !!parts[parts.length - 1].pausedAt;
}

export function createInterval(type: IntervalType, options: CreateIntervalOptions = {}): Interval {
  const { isFreshStart, customDuration, tag, startedAt, name } = options;
  let completedCount = 0;
  if (isFreshStart) {
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, completedCount.toString());
  } else {
    completedCount = parseInt(cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY) ?? "0", 10);
    completedCount++;
    cache.set(COMPLETED_POMODORO_COUNT_CACHE_KEY, completedCount.toString());
  }

  const fallbackLength = intervalDurations[type];
  const intervalStart = typeof startedAt === "number" && Number.isFinite(startedAt) ? startedAt : currentTimestamp();
  const length =
    typeof customDuration === "number" && Number.isFinite(customDuration) && customDuration > 0
      ? customDuration
      : fallbackLength;

  const interval: Interval = {
    type,
    id: completedCount,
    length,
    tag,
    startedAt: intervalStart,
    parts: [
      {
        startedAt: intervalStart,
      },
    ],
    name,
  };

  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  saveIntervalHistory(interval).then();
  if (type === "focus") setDND(true);
  return interval;
}

export function pauseInterval(): Interval | undefined {
  let interval = getCurrentInterval();
  if (interval?.type === "focus") setDND(false);
  if (interval) {
    const parts = [...interval.parts];
    parts[parts.length - 1].pausedAt = currentTimestamp();
    interval = {
      ...interval,
      parts,
    };
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
  }
  return interval;
}

export function continueInterval(): Interval | undefined {
  let interval = getCurrentInterval();
  if (interval) {
    const parts = [...interval.parts, { startedAt: currentTimestamp() }];
    interval = {
      ...interval,
      parts,
    };
    cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(interval));
    if (interval.type === "focus") setDND(true);
  }
  return interval;
}

type ResetOptions = {
  skipLog?: boolean;
};

export async function resetInterval(options?: ResetOptions): Promise<SessionRecord | undefined> {
  const shouldLog = !options?.skipLog;
  const interval = shouldLog ? getCurrentInterval() : undefined;
  let sessionRecord: SessionRecord | undefined;

  if (interval) {
    const endedAt = currentTimestamp();
    const parts = interval.parts.map((part, index, array) => {
      if (index === array.length - 1) {
        const hasValidEndAt = typeof part.endAt === "number" && Number.isFinite(part.endAt);
        if (!hasValidEndAt || (hasValidEndAt && part.endAt! < part.startedAt)) {
          return {
            ...part,
            endAt: endedAt,
          };
        }
      }
      return part;
    });

    const intervalForLogging: Interval = {
      ...interval,
      parts,
    };

    await saveIntervalHistory(intervalForLogging);
    sessionRecord = await logIntervalSession(intervalForLogging, endedAt);

    const typeLabel =
      intervalForLogging.type === "focus"
        ? FocusText
        : intervalForLogging.type === "short-break"
          ? ShortBreakText
          : LongBreakText;

    const displayName = sessionRecord?.name ?? intervalForLogging.name?.trim();
    const tag = (sessionRecord?.tag ?? intervalForLogging.tag ?? "").trim();
    const durationLabel = secondsToTime(sessionRecord?.durationSeconds ?? 0);

    const detailParts = [];
    if (displayName) {
      detailParts.push(displayName);
    }
    detailParts.push(`${typeLabel} • ${durationLabel}`);
    if (tag) {
      detailParts.push(tag.startsWith("#") ? tag : `#${tag}`);
    }

    await showToast(Toast.Style.Success, "Session logged", detailParts.join(" • "));
  } else if (shouldLog) {
    await showToast(Toast.Style.Success, "Session logged", "No active session, nothing to record");
  }

  cache.remove(CURRENT_INTERVAL_CACHE_KEY);
  return sessionRecord;
}

export function restartInterval() {
  const currentInterval = getCurrentInterval();
  if (currentInterval) {
    const { type } = currentInterval;
    if (type === "focus") setDND(true);
    createInterval(type, { isFreshStart: false, tag: currentInterval.tag, name: currentInterval.name });
  }
}

export function getCurrentInterval(): Interval | undefined {
  const result = cache.get(CURRENT_INTERVAL_CACHE_KEY);
  if (result) {
    try {
      const parsed = JSON.parse(result);
      const sanitized = sanitizeInterval(parsed);
      if (sanitized) {
        cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(sanitized));
        return sanitized;
      }
    } catch (error) {
      console.error(error);
    }
  }
}

type UpdateIntervalOptions = {
  name?: string | null;
  tag?: string | null;
  durationSeconds?: number;
};

export async function updateCurrentIntervalDetails(updates: UpdateIntervalOptions): Promise<Interval | undefined> {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return undefined;
  }

  const sanitizedName = updates.name?.trim() || undefined;
  const sanitizedTag = updates.tag?.trim() || undefined;
  let nextLength = currentInterval.length;

  if (
    typeof updates.durationSeconds === "number" &&
    Number.isFinite(updates.durationSeconds) &&
    updates.durationSeconds > 0
  ) {
    const elapsedSeconds = duration(currentInterval);
    const roundedLength = Math.round(updates.durationSeconds);
    nextLength = Math.max(roundedLength, elapsedSeconds);
  }

  const nextInterval: Interval = {
    ...currentInterval,
    name: sanitizedName,
    tag: sanitizedTag,
    length: nextLength,
  };

  cache.set(CURRENT_INTERVAL_CACHE_KEY, JSON.stringify(nextInterval));
  await saveIntervalHistory(nextInterval);
  return nextInterval;
}

export async function endOfInterval(currentInterval: Interval) {
  try {
    const endedAt = currentTimestamp();
    currentInterval.parts[currentInterval.parts.length - 1].endAt = endedAt;
    saveIntervalHistory(currentInterval).then();
    const sessionRecord = await logIntervalSession(currentInterval, endedAt);
    if (sessionRecord) {
      currentInterval.sessionId = sessionRecord.id;
      currentInterval.note = sessionRecord.note;
      if (sessionRecord.name) {
        currentInterval.name = sessionRecord.name;
      }
    }
    const context = sessionRecord
      ? {
          currentInterval,
          sessionRecord,
        }
      : { currentInterval };
    if (currentInterval.type === "focus" && enableFocusWhileFocused) {
      setDND(false, {
        name: "pomodoro-control-timer",
        context,
      });
    } else {
      launchCommand({
        name: "pomodoro-control-timer",
        type: LaunchType.UserInitiated,
        context,
      });
    }
  } catch (error) {
    console.error(error);
  }
}

export function getCompletedPomodoroCount(): number {
  const result = cache.get(COMPLETED_POMODORO_COUNT_CACHE_KEY);
  if (result) {
    return parseInt(result, 10);
  }

  return 0;
}

export function getNextIntervalExecutor(): IntervalExecutor {
  const currentInterval = getCurrentInterval();
  void resetInterval({ skipLog: true });

  const completedCount = getCompletedPomodoroCount();
  const longBreakThreshold = parseInt(preferences.longBreakStartThreshold, 10);
  let executor: IntervalExecutor;
  switch (currentInterval?.type) {
    case "short-break":
      executor = {
        title: FocusText,
        intervalType: "focus",
        isFreshStart: false,
      };
      break;
    case "long-break":
      executor = { title: FocusText, intervalType: "focus" };
      break;
    default:
      if (completedCount === longBreakThreshold) {
        executor = {
          title: LongBreakText,
          intervalType: "long-break",
        };
      } else {
        executor = {
          title: ShortBreakText,
          intervalType: "short-break",
          isFreshStart: false,
        };
      }
      break;
  }

  return executor;
}

export const preferences = getPreferenceValues<Preferences>();
export const intervalDurations: Record<IntervalType, number> = {
  focus: parseDurationPreference(preferences.focusIntervalDuration, DEFAULT_FOCUS_MINUTES),
  "short-break": parseDurationPreference(preferences.shortBreakIntervalDuration, DEFAULT_SHORT_BREAK_MINUTES),
  "long-break": parseDurationPreference(preferences.longBreakIntervalDuration, DEFAULT_LONG_BREAK_MINUTES),
};

function sanitizeInterval(rawInterval: unknown): Interval | undefined {
  if (!rawInterval || typeof rawInterval !== "object") {
    return undefined;
  }

  const candidate = rawInterval as Interval & { parts?: Array<Record<string, unknown>> };
  if (candidate.type !== "focus" && candidate.type !== "short-break" && candidate.type !== "long-break") {
    return undefined;
  }

  const defaultLength = intervalDurations[candidate.type];
  const lengthValue = Number((candidate as Interval).length);
  const length = Number.isFinite(lengthValue) && lengthValue > 0 ? lengthValue : defaultLength;

  const parts: Interval["parts"] = Array.isArray(candidate.parts)
    ? candidate.parts
        .map((part) => {
          if (!part || typeof part !== "object") {
            return undefined;
          }
          const startedAt = parseTimestamp(part.startedAt);
          if (!startedAt) {
            return undefined;
          }

          const sanitizedPart: Interval["parts"][number] = { startedAt };

          const pausedAt = parseTimestamp(part.pausedAt);
          if (typeof pausedAt === "number" && pausedAt >= startedAt) {
            sanitizedPart.pausedAt = pausedAt;
          }

          const endAt = parseTimestamp(part.endAt);
          if (typeof endAt === "number" && endAt >= startedAt) {
            sanitizedPart.endAt = endAt;
          }

          return sanitizedPart;
        })
        .filter((item): item is Interval["parts"][number] => Boolean(item))
    : [];

  if (parts.length === 0) {
    parts.push({ startedAt: currentTimestamp() });
  }

  const idValue = Number(candidate.id);
  const startedAtValue = parseTimestamp((candidate as Interval).startedAt);
  const tagValue = typeof (candidate as Interval).tag === "string" ? (candidate as Interval).tag : undefined;
  const nameValue = typeof (candidate as Interval).name === "string" ? (candidate as Interval).name : undefined;
  const noteValue = typeof (candidate as Interval).note === "string" ? (candidate as Interval).note : undefined;
  const sessionIdValue =
    typeof (candidate as Interval).sessionId === "string" ? (candidate as Interval).sessionId : undefined;

  return {
    id: Number.isFinite(idValue) ? idValue : 0,
    type: candidate.type,
    length,
    tag: tagValue,
    startedAt: typeof startedAtValue === "number" ? startedAtValue : parts[0]?.startedAt,
    name: nameValue,
    note: noteValue,
    sessionId: sessionIdValue,
    parts,
  };
}
