import { environment, getPreferenceValues } from "@raycast/api";
import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, extname, isAbsolute, join, resolve } from "path";
import { homedir } from "os";

export type SessionRecord = {
  id: string;
  tag: string;
  intervalType: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  name?: string;
  note?: string;
};

const SESSIONS_FILENAME = "sessions.json";

function expandHomePath(rawPath: string) {
  if (rawPath === "~") {
    return homedir();
  }
  if (rawPath.startsWith("~/")) {
    return join(homedir(), rawPath.slice(2));
  }
  return rawPath;
}

function resolveCustomSessionsPath(rawPath: string) {
  const expanded = expandHomePath(rawPath.trim());
  const basePath = isAbsolute(expanded) ? expanded : resolve(environment.supportPath, expanded);
  if (extname(basePath)) {
    return basePath;
  }
  return join(basePath, SESSIONS_FILENAME);
}

export function getSessionsFilePath() {
  let sessionsPath = join(environment.supportPath, SESSIONS_FILENAME);
  try {
    const preferences = getPreferenceValues<Preferences>();
    const override = preferences.sessionsFilePath?.trim();
    if (override) {
      sessionsPath = resolveCustomSessionsPath(override);
    }
  } catch (error) {
    // Unable to load preferences, fall back to default location
  }
  return sessionsPath;
}

async function ensureDirectoryExists(path: string) {
  await mkdir(dirname(path), { recursive: true });
}

export async function loadSessions(): Promise<SessionRecord[]> {
  const filePath = getSessionsFilePath();
  try {
    const fileContent = await readFile(filePath, "utf8");
    const parsed = JSON.parse(fileContent);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is SessionRecord => Boolean(item && item.id && item.startedAt && item.endedAt));
  } catch (error) {
    // File likely does not exist yet
    return [];
  }
}

export async function saveSessions(sessions: SessionRecord[]) {
  const filePath = getSessionsFilePath();
  await ensureDirectoryExists(filePath);
  await writeFile(filePath, JSON.stringify(sessions, null, 2), "utf8");
}

export async function addSession(record: SessionRecord): Promise<SessionRecord> {
  const sessions = await loadSessions();
  sessions.push(record);
  await saveSessions(sessions);
  return record;
}

export async function getKnownTags(): Promise<string[]> {
  const sessions = await loadSessions();
  const seen = new Set<string>();
  sessions.forEach((session) => {
    if (session.tag) {
      seen.add(session.tag);
    }
  });
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export async function updateSessionRecord(
  id: string,
  updates: Partial<Pick<SessionRecord, "note" | "name">>,
): Promise<SessionRecord | undefined> {
  const sessions = await loadSessions();
  const index = sessions.findIndex((session) => session.id === id);
  if (index === -1) {
    return undefined;
  }

  const sanitizedUpdates: Partial<SessionRecord> = { ...updates };
  if ("note" in sanitizedUpdates) {
    const rawNote = sanitizedUpdates.note;
    if (typeof rawNote === "string") {
      const trimmed = rawNote.trim();
      sanitizedUpdates.note = trimmed ? trimmed : undefined;
    }
  }
  if ("name" in sanitizedUpdates) {
    const rawName = sanitizedUpdates.name;
    if (typeof rawName === "string") {
      const trimmed = rawName.trim();
      sanitizedUpdates.name = trimmed ? trimmed : undefined;
    }
  }

  const existing = sessions[index];
  const next: SessionRecord = {
    ...existing,
    ...sanitizedUpdates,
  };

  sessions[index] = next;
  await saveSessions(sessions);
  return next;
}
