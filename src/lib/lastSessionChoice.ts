import { LocalStorage } from "@raycast/api";
import { IntervalType } from "./types";

const LAST_SESSION_CHOICE_KEY = "last-session-choice";

export type SessionChoice = {
  intervalType: IntervalType;
  durationSeconds: number;
  tag?: string;
  name?: string;
  updatedAt: number;
};

export async function saveLastSessionChoice(choice: SessionChoice): Promise<void> {
  const sanitizedDuration = Number(choice.durationSeconds);
  if (!Number.isFinite(sanitizedDuration) || sanitizedDuration <= 0) {
    return;
  }

  const sanitizedChoice: SessionChoice = {
    intervalType: choice.intervalType,
    durationSeconds: sanitizedDuration,
    tag: choice.tag?.trim() || undefined,
    name: choice.name?.trim() || undefined,
    updatedAt: choice.updatedAt,
  };

  await LocalStorage.setItem(LAST_SESSION_CHOICE_KEY, JSON.stringify(sanitizedChoice));
}

export async function getLastSessionChoice(): Promise<SessionChoice | undefined> {
  const rawValue = await LocalStorage.getItem<string>(LAST_SESSION_CHOICE_KEY);
  if (!rawValue) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<SessionChoice>;
    if (
      parsed &&
      parsed.intervalType &&
      typeof parsed.durationSeconds === "number" &&
      Number.isFinite(parsed.durationSeconds) &&
      parsed.durationSeconds > 0
    ) {
      return {
        intervalType: parsed.intervalType,
        durationSeconds: parsed.durationSeconds,
        tag: parsed.tag,
        name: parsed.name,
        updatedAt: parsed.updatedAt ?? Date.now(),
      };
    }
  } catch (error) {
    console.error("Failed to parse last session choice", error);
  }

  return undefined;
}
