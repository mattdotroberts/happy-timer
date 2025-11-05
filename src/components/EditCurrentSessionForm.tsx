import { useCallback, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Form,
  LaunchType,
  Toast,
  closeMainWindow,
  launchCommand,
  popToRoot,
  showToast,
} from "@raycast/api";
import { getCurrentInterval, updateCurrentIntervalDetails, duration } from "../lib/intervals";
import { saveRecentSessionChoice } from "../lib/lastSessionChoice";
import { secondsToTime } from "../lib/secondsToTime";

type FormValues = {
  sessionName?: string;
  tag?: string;
  durationMinutes?: string;
};

const MIN_DURATION_MINUTES = 1;

export default function EditCurrentSessionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentInterval = useMemo(() => getCurrentInterval(), []);

  const elapsedSeconds = currentInterval ? duration(currentInterval) : 0;
  const defaultDurationMinutes = currentInterval ? Math.round(currentInterval.length / 60) : 25;
  const minimumAllowedMinutes = Math.max(MIN_DURATION_MINUTES, Math.ceil(elapsedSeconds / 60));

  const handleCompletion = useCallback(async () => {
    try {
      await launchCommand({ name: "pomodoro-menu-bar", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error(error);
    }

    try {
      await closeMainWindow();
    } catch (error) {
      // no-op: window may already be closed
    }

    await popToRoot();
  }, []);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (isSubmitting) {
        return;
      }

      const runningInterval = getCurrentInterval();
      if (!runningInterval) {
        await showToast({ style: Toast.Style.Failure, title: "No active session to edit" });
        return;
      }

      setIsSubmitting(true);
      try {
        const tag = values.tag?.trim();
        const sessionName = values.sessionName?.trim();
        const requestedMinutes = values.durationMinutes ? parseFloat(values.durationMinutes) : undefined;
        const sanitizedMinutes =
          typeof requestedMinutes === "number" && Number.isFinite(requestedMinutes) && requestedMinutes > 0
            ? Math.max(requestedMinutes, minimumAllowedMinutes)
            : undefined;
        const updatedInterval = await updateCurrentIntervalDetails({
          name: sessionName,
          tag,
          durationSeconds: sanitizedMinutes ? sanitizedMinutes * 60 : undefined,
        });
        if (!updatedInterval) {
          await showToast({ style: Toast.Style.Failure, title: "Failed to update session" });
          return;
        }

        await saveRecentSessionChoice({
          intervalType: updatedInterval.type,
          durationSeconds: updatedInterval.length,
          tag: updatedInterval.tag ?? undefined,
          name: updatedInterval.name ?? undefined,
          updatedAt: Date.now(),
        });

        await showToast({
          style: Toast.Style.Success,
          title: "Session updated",
          message: [
            updatedInterval.name,
            updatedInterval.tag ? `#${updatedInterval.tag}` : undefined,
            secondsToTime(updatedInterval.length),
          ]
            .filter(Boolean)
            .join("  "),
        });
        await handleCompletion();
      } catch (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: "Failed to update session" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [handleCompletion, isSubmitting, minimumAllowedMinutes],
  );

  if (!currentInterval) {
    return (
      <Form
        navigationTitle="Edit Current Session"
        actions={
          <ActionPanel>
            <Action title="Close" onAction={handleCompletion} />
          </ActionPanel>
        }
      >
        <Form.Description text="No session is currently running." />
      </Form>
    );
  }

  const durationHint = `Minimum ${minimumAllowedMinutes} minute${
    minimumAllowedMinutes === 1 ? "" : "s"
  } (elapsed so far: ${secondsToTime(elapsedSeconds)})`;

  return (
    <Form
      navigationTitle="Edit Current Session"
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Interval Type"
        text={`${currentInterval.type === "focus" ? "Focus" : currentInterval.type === "short-break" ? "Short Break" : "Long Break"}`}
      />
      <Form.TextField
        id="sessionName"
        title="Session Name"
        defaultValue={currentInterval.name}
        placeholder="Planning sprint work"
      />
      <Form.TextField id="tag" title="Tag" defaultValue={currentInterval.tag} placeholder="client / project / #tag" />
      <Form.TextField
        id="durationMinutes"
        title="Duration (Minutes)"
        defaultValue={defaultDurationMinutes.toString()}
        placeholder="25"
        info={durationHint}
      />
    </Form>
  );
}
