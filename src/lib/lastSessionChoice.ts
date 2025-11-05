import { LocalStorage } from "@raycast/api";
import { IntervalType } from "./types";

const RECENT_SESSION_CHOICES_KEY = "recent-session-choices";
const MAX_RECENT_CHOICES = 3;

export type SessionChoice = {
  intervalType: IntervalType;
  durationSeconds: number;
  tag?: string;
  name?: string;
  updatedAt: number;
};

function sanitizeChoice(choice: SessionChoice): SessionChoice | undefined {
  const sanitizedDuration = Number(choice.durationSeconds);
  if (!Number.isFinite(sanitizedDuration) || sanitizedDuration <= 0) {
    return undefined;
  }

  return {
    intervalType: choice.intervalType,
    durationSeconds: sanitizedDuration,
    tag: choice.tag?.trim() || undefined,
    name: choice.name?.trim() || undefined,
    updatedAt: choice.updatedAt,
  };
}

export async function saveRecentSessionChoice(choice: SessionChoice): Promise<void> {
  const sanitizedChoice = sanitizeChoice(choice);
  if (!sanitizedChoice) {
    return;
  }

  const existing = await getRecentSessionChoices();
  const filtered = existing.filter(
    (entry) =>
      !(
        entry.intervalType === sanitizedChoice.intervalType &&
        entry.durationSeconds === sanitizedChoice.durationSeconds &&
        (entry.tag ?? "") === (sanitizedChoice.tag ?? "") &&
        (entry.name ?? "") === (sanitizedChoice.name ?? "")
      ),
  );

  const next = [sanitizedChoice, ...filtered].slice(0, MAX_RECENT_CHOICES);
  await LocalStorage.setItem(RECENT_SESSION_CHOICES_KEY, JSON.stringify(next));
}

export async function getRecentSessionChoices(): Promise<SessionChoice[]> {
  const rawValue = await LocalStorage.getItem<string>(RECENT_SESSION_CHOICES_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => sanitizeChoice({ ...item, updatedAt: item?.updatedAt ?? Date.now() }))
      .filter((item): item is SessionChoice => Boolean(item));
  } catch (error) {
    console.error("Failed to parse last session choice", error);
  }

  return [];
}

export async function getLatestSessionChoice(): Promise<SessionChoice | undefined> {
  const [first] = await getRecentSessionChoices();
  return first;
}
