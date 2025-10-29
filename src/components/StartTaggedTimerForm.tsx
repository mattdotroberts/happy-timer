import { useCallback, useEffect, useMemo, useState } from "react";
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
import { useNavigation } from "@raycast/api";
import { getKnownTags } from "../lib/sessionStore";
import { IntervalType } from "../lib/types";
import { startTimer } from "../lib/timer";

type StartTaggedTimerFormProps = {
  defaultIntervalType?: IntervalType;
  onCompleted?: () => void;
  defaultIsFreshStart?: boolean;
  defaultDurations?: Partial<Record<IntervalType, number>>;
  defaultTag?: string;
  defaultSessionName?: string;
};

type FormValues = {
  intervalType: IntervalType;
  existingTag?: string;
  customTag?: string;
  sessionName?: string;
};

const INTERVAL_OPTIONS: { value: IntervalType; title: string }[] = [
  { value: "focus", title: "Focus" },
  { value: "short-break", title: "Short Break" },
  { value: "long-break", title: "Long Break" },
];

export default function StartTaggedTimerForm({
  defaultIntervalType = "focus",
  defaultIsFreshStart,
  defaultDurations,
  defaultTag,
  defaultSessionName,
  onCompleted,
}: StartTaggedTimerFormProps) {
  const { pop } = useNavigation();
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getKnownTags()
      .then((tags) => setKnownTags(tags))
      .catch((error) => console.error(error));
  }, []);

  const handleCompletion = useCallback(async () => {
    if (onCompleted) {
      onCompleted();
      return;
    }

    try {
      await launchCommand({ name: "pomodoro-menu-bar", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error(error);
    }

    try {
      await pop();
    } catch (error) {
      // no-op when there is no navigation stack
    }

    await closeMainWindow();
    await popToRoot();
  }, [onCompleted, pop]);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        const rawTag = values.customTag?.trim() || values.existingTag?.trim() || "";
        const sessionName = values.sessionName?.trim();
        const customDurationMinutes = defaultDurations?.[values.intervalType];
        const customDurationSeconds =
          typeof customDurationMinutes === "number" &&
          Number.isFinite(customDurationMinutes) &&
          customDurationMinutes > 0
            ? customDurationMinutes * 60
            : undefined;
        await startTimer(values.intervalType, {
          tag: rawTag || undefined,
          isFreshStart: defaultIsFreshStart,
          duration: customDurationSeconds,
          name: sessionName || undefined,
        });
        await showToast({
          style: Toast.Style.Success,
          title: "Timer started",
          message: rawTag ? `Tagged as ${rawTag}` : undefined,
        });
        await handleCompletion();
      } catch (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: "Failed to start timer" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [defaultDurations, defaultIsFreshStart, handleCompletion, isSubmitting],
  );

  const actions = useMemo(
    () => (
      <ActionPanel>
        <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
      </ActionPanel>
    ),
    [handleSubmit],
  );

  return (
    <Form actions={actions} navigationTitle="Start Tagged Timer" isLoading={isSubmitting}>
      <Form.Dropdown id="intervalType" title="Interval Type" defaultValue={defaultIntervalType}>
        {INTERVAL_OPTIONS.map((option) => (
          <Form.Dropdown.Item key={option.value} value={option.value} title={option.title} />
        ))}
      </Form.Dropdown>
      <Form.TextField
        id="sessionName"
        title="Session Name"
        placeholder="Designing the website"
        defaultValue={defaultSessionName}
      />
      {knownTags.length > 0 && (
        <Form.Dropdown id="existingTag" title="Existing Tag" storeValue defaultValue="">
          <Form.Dropdown.Item value="" title="(None)" />
          {knownTags.map((tag) => (
            <Form.Dropdown.Item key={tag} value={tag} title={tag} />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextField id="customTag" title="Tag" placeholder="Client, project, or context" defaultValue={defaultTag} />
    </Form>
  );
}
