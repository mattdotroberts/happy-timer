import { launchCommand, LaunchType } from "@raycast/api";
import { checkDNDExtensionInstall, setDND } from "./doNotDisturb";
import { continueInterval, createInterval, pauseInterval, resetInterval } from "./intervals";
import { IntervalType } from "./types";
import { saveRecentSessionChoice } from "./lastSessionChoice";

type StartTimerOptions = {
  duration?: number;
  tag?: string;
  isFreshStart?: boolean;
  name?: string;
};

export async function startTimer(type: IntervalType, options: StartTimerOptions = {}) {
  await checkDNDExtensionInstall();
  const interval = createInterval(type, {
    isFreshStart: options.isFreshStart ?? false,
    customDuration: options.duration,
    tag: options.tag,
    name: options.name,
  });
  await saveRecentSessionChoice({
    intervalType: interval.type,
    durationSeconds: interval.length,
    tag: interval.tag ?? undefined,
    name: interval.name ?? undefined,
    updatedAt: Date.now(),
  });
  await refreshMenuBar();
  return interval;
}

export async function pauseTimer() {
  const interval = pauseInterval();
  await refreshMenuBar();
  return interval;
}

export async function continueTimer() {
  const interval = continueInterval();
  await refreshMenuBar();
  return interval;
}

export async function stopTimer() {
  await resetInterval();
  setDND(false);
  await refreshMenuBar();
  return "Timer stopped";
}

async function refreshMenuBar() {
  try {
    await launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }
}
