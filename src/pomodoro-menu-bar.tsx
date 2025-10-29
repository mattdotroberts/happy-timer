import { MenuBarExtra, Icon, Image, Color, launchCommand, LaunchType } from "@raycast/api";
import { useState } from "react";
import { FocusText, LongBreakText, ShortBreakText, TimeStoppedPlaceholder } from "./lib/constants";
import {
  getCurrentInterval,
  resetInterval,
  restartInterval,
  pauseInterval,
  continueInterval,
  isPaused,
  duration,
  preferences,
  progress,
  endOfInterval,
} from "./lib/intervals";
import { secondsToTime } from "./lib/secondsToTime";
import { Interval, IntervalType } from "./lib/types";
import { setDND } from "./lib/doNotDisturb";

const INTERVAL_TYPE_META: Record<IntervalType, { emoji: string; label: string }> = {
  focus: { emoji: "🎯", label: FocusText },
  "short-break": { emoji: "🧘‍♂️", label: ShortBreakText },
  "long-break": { emoji: "🚶", label: LongBreakText },
};

const IconTint: Color.Dynamic = {
  light: "#000000",
  dark: "#FFFFFF",
  adjustContrast: false,
};

export default function TogglePomodoroTimer() {
  const [currentInterval, setCurrentInterval] = useState<Interval | undefined>(getCurrentInterval());

  if (currentInterval && progress(currentInterval) >= 100) {
    void endOfInterval(currentInterval);
  }

  async function onStart(type: IntervalType) {
    await launchCommand({
      name: "start-tagged-timer",
      type: LaunchType.UserInitiated,
      context: { intervalType: type },
    });
  }

  function onPause() {
    setCurrentInterval(pauseInterval());
  }

  function onContinue() {
    setCurrentInterval(continueInterval());
  }

  async function onReset() {
    await resetInterval();
    setCurrentInterval(undefined);
    setDND(false);
  }

  function onRestart() {
    restartInterval();
    setCurrentInterval(getCurrentInterval());
  }

  let icon: Image.ImageLike;
  icon = { source: "tomato-0.png", tintColor: IconTint };
  if (currentInterval) {
    const progressInTenth = 100 - Math.floor(progress(currentInterval) / 10) * 10;
    icon = { source: `tomato-${progressInTenth}.png`, tintColor: IconTint };
  }

  const stopedPlaceholder = preferences.hideTimeWhenStopped ? undefined : TimeStoppedPlaceholder;
  const title = currentInterval ? secondsToTime(currentInterval.length - duration(currentInterval)) : stopedPlaceholder;

  const sessionDetails = currentInterval
    ? (() => {
        const meta = INTERVAL_TYPE_META[currentInterval.type];
        const displayName = currentInterval.name?.trim();
        const tag = currentInterval.tag?.trim();
        const detailParts = [];

        if (displayName) {
          detailParts.push(displayName);
        }

        if (tag) {
          detailParts.push(tag.startsWith("#") ? tag : `#${tag}`);
        }

        return {
          title: `${meta.emoji} ${meta.label}`,
          subtitle: detailParts.length ? detailParts.join("  ") : undefined,
        };
      })()
    : undefined;

  return (
    <MenuBarExtra icon={icon} title={preferences.enableTimeOnMenuBar ? title : undefined} tooltip={"Pomodoro"}>
      {preferences.enableTimeOnMenuBar ? null : <MenuBarExtra.Item icon="⏰" title={TimeStoppedPlaceholder} />}
      {currentInterval ? (
        <>
          <MenuBarExtra.Section title="Current Session">
            <MenuBarExtra.Item title={sessionDetails?.title ?? ""} subtitle={sessionDetails?.subtitle} />
          </MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Edit Session Details…"
            icon={Icon.Pencil}
            onAction={async () => {
              await launchCommand({ name: "edit-current-session", type: LaunchType.UserInitiated });
            }}
            shortcut={{ modifiers: ["cmd"], key: "e" }}
          />
          {isPaused(currentInterval) ? (
            <MenuBarExtra.Item
              title="Continue"
              icon={Icon.Play}
              onAction={onContinue}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          ) : (
            <MenuBarExtra.Item
              title="Pause"
              icon={Icon.Pause}
              onAction={onPause}
              shortcut={{ modifiers: ["cmd"], key: "p" }}
            />
          )}
          <MenuBarExtra.Item
            title="Reset"
            icon={Icon.Stop}
            onAction={onReset}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <MenuBarExtra.Item
            title="Restart Current"
            icon={Icon.Repeat}
            onAction={onRestart}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
        </>
      ) : (
        <>
          <MenuBarExtra.Item
            title={FocusText}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            onAction={async () => await onStart("focus")}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <MenuBarExtra.Item
            title={ShortBreakText}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            onAction={async () => await onStart("short-break")}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <MenuBarExtra.Item
            title={LongBreakText}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            onAction={async () => await onStart("long-break")}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </>
      )}
    </MenuBarExtra>
  );
}
