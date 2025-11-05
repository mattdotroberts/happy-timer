import { useMemo } from "react";
import { Action, ActionPanel, Icon, List, environment, openCommandPreferences, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getSessionsFilePath, loadSessions, SessionRecord } from "./lib/sessionStore";

type SessionGroup = {
  id: string;
  tagLabel: string;
  totalDuration: number;
  sessions: SessionRecord[];
};

const UNTITLED_TAG_LABEL = "Untagged";

export default function ViewSessionLog() {
  const {
    data: sessions = [],
    isLoading,
    mutate,
  } = useCachedPromise(async () => {
    const data = await loadSessions();
    return data.sort((a, b) => b.startedAt - a.startedAt);
  });

  const groups = useMemo<SessionGroup[]>(() => {
    const bucket = new Map<string, SessionGroup>();

    sessions.forEach((session) => {
      const tagLabel = session.tag?.trim() ? session.tag.trim() : UNTITLED_TAG_LABEL;
      if (!bucket.has(tagLabel)) {
        bucket.set(tagLabel, {
          id: tagLabel.toLowerCase() || UNTITLED_TAG_LABEL.toLowerCase(),
          tagLabel,
          totalDuration: 0,
          sessions: [],
        });
      }
      const group = bucket.get(tagLabel)!;
      group.sessions.push(session);
      group.totalDuration += session.durationSeconds;
    });

    return Array.from(bucket.values()).sort((a, b) => a.tagLabel.localeCompare(b.tagLabel));
  }, [sessions]);

  const allSessionsJSON = useMemo(() => JSON.stringify(sessions, null, 2), [sessions]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter sessions by tag or type"
      navigationTitle="Session Log"
      isShowingDetail={groups.length > 0}
    >
      {groups.length === 0 ? (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No sessions recorded yet"
          description="Start and complete a timer to log your first session."
          actions={
            <ActionPanel>
              <Action
                title="Open Command Preferences"
                icon={Icon.Gear}
                onAction={async () => {
                  await openCommandPreferences();
                }}
              />
            </ActionPanel>
          }
        />
      ) : null}

      {groups.map((group) => (
        <List.Section
          key={group.id}
          title={group.tagLabel}
          subtitle={`${group.sessions.length} ${group.sessions.length === 1 ? "session" : "sessions"} • ${formatDuration(
            group.totalDuration,
          )}`}
        >
          {group.sessions.map((session) => (
            <SessionItem key={session.id} session={session} onRefresh={mutate} allSessionsJSON={allSessionsJSON} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function SessionItem({
  session,
  onRefresh,
  allSessionsJSON,
}: {
  session: SessionRecord;
  onRefresh: () => Promise<SessionRecord[] | undefined>;
  allSessionsJSON: string;
}) {
  const startedAtDate = new Date(session.startedAt * 1000);
  const endedAtDate = new Date(session.endedAt * 1000);
  const durationLabel = formatDuration(session.durationSeconds);
  const accessoryText = `${session.intervalType} • ${durationLabel}`;
  const accessories = [
    { text: accessoryText },
    {
      date: startedAtDate,
    },
  ];
  const title = session.name?.trim() ? session.name.trim() : startedAtDate.toLocaleString();

  return (
    <List.Item
      title={title}
      accessories={accessories}
      icon={Icon.Clock}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              {session.name ? <List.Item.Detail.Metadata.Label title="Session Name" text={session.name} /> : null}
              <List.Item.Detail.Metadata.Label title="Tag" text={session.tag || UNTITLED_TAG_LABEL} />
              <List.Item.Detail.Metadata.Label
                title="Interval Type"
                text={
                  session.intervalType === "short-break"
                    ? "Short Break"
                    : session.intervalType === "long-break"
                      ? "Long Break"
                      : "Focus"
                }
              />
              <List.Item.Detail.Metadata.Label title="Duration" text={durationLabel} />
              <List.Item.Detail.Metadata.Label title="Started" text={startedAtDate.toLocaleString()} />
              <List.Item.Detail.Metadata.Label title="Ended" text={endedAtDate.toLocaleString()} />
              {session.note ? <List.Item.Detail.Metadata.Label title="Reflection" text={session.note} /> : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Session ID" text={session.id} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy All Sessions to Clipboard" content={allSessionsJSON} />
          <Action.CopyToClipboard title="Copy Session to Clipboard" content={JSON.stringify(session, null, 2)} />
          <Action.Open title="Open Log File" target={getSessionsFilePath()} icon={Icon.Document} />
          <Action
            title="Refresh Sessions"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await onRefresh();
              await showToast(Toast.Style.Success, "Session log refreshed");
            }}
          />
          <Action.Open title="Open Support Folder" target={environment.supportPath} icon={Icon.Folder} />
        </ActionPanel>
      }
    />
  );
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0s";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(" ");
}
