import { useCallback, useState } from "react";
import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { updateSessionRecord } from "../lib/sessionStore";

type AddSessionNoteFormProps = {
  sessionId: string;
  defaultNote?: string;
  sessionName?: string;
  onSaved?: (note?: string) => void;
};

type FormValues = {
  note?: string;
};

export default function AddSessionNoteForm({ sessionId, defaultNote, sessionName, onSaved }: AddSessionNoteFormProps) {
  const { pop } = useNavigation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(
    async (values: FormValues) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        const note = values.note ?? "";
        const updated = await updateSessionRecord(sessionId, { note });
        if (onSaved) {
          onSaved(updated?.note);
        }
        await showToast({
          style: Toast.Style.Success,
          title: updated?.note ? "Reflection saved" : "Note cleared",
        });
        await pop();
      } catch (error) {
        console.error(error);
        await showToast({ style: Toast.Style.Failure, title: "Failed to save note" });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onSaved, pop, sessionId],
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Note" onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isSubmitting}
    >
      {sessionName ? (
        <Form.Description text={`Session: ${sessionName}`} title="Session Name" />
      ) : (
        <Form.Description text="Reflect on how the session went." title="Session" />
      )}
      <Form.TextArea
        id="note"
        title="Reflection"
        defaultValue={defaultNote}
        placeholder="Didn't quite complete it but feel good."
        autoFocus
      />
    </Form>
  );
}
