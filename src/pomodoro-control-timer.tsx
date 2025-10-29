import { exec } from "node:child_process";
import { useMemo, useState } from "react";
import {
  Detail,
  launchCommand,
  LaunchType,
  closeMainWindow,
  popToRoot,
  List,
  Icon,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useFetch, usePromise } from "@raycast/utils";
import {
  continueInterval,
  getCurrentInterval,
  getNextIntervalExecutor,
  isPaused,
  pauseInterval,
  preferences,
  resetInterval,
  restartInterval,
} from "./lib/intervals";
import { FocusText, ShortBreakText, LongBreakText } from "./lib/constants";
import { GiphyResponse, Interval, Quote } from "./lib/types";
import { checkDNDExtensionInstall } from "./lib/doNotDisturb";
import AddSessionNoteForm from "./components/AddSessionNoteForm";
import StartTaggedTimerForm from "./components/StartTaggedTimerForm";
import { SessionRecord } from "./lib/sessionStore";
import { getLastSessionChoice } from "./lib/lastSessionChoice";
import { secondsToTime } from "./lib/secondsToTime";
import { startTimer } from "./lib/timer";

const handleAfterTimerMutation = () => {
  try {
    launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }

  popToRoot();
  closeMainWindow();
};

const createAction = (action: () => unknown | Promise<unknown>) => async () => {
  await action();
  handleAfterTimerMutation();
};

const getIntervalMetadata = (intervalType: Interval["type"]) => {
  switch (intervalType) {
    case "short-break":
      return { title: ShortBreakText, icon: "🧘‍♂️" };
    case "long-break":
      return { title: LongBreakText, icon: "🚶" };
    case "focus":
    default:
      return { title: FocusText, icon: "🎯" };
  }
};

const ActionsList = () => {
  const currentInterval = getCurrentInterval();
  checkDNDExtensionInstall();
  const { data: lastSessionChoice, isLoading: isLoadingLastSession } = usePromise(getLastSessionChoice, []);

  const lastSessionAccessories = useMemo(() => {
    if (!lastSessionChoice) {
      return [];
    }

    const accessories: List.Item.Accessory[] = [];
    if (lastSessionChoice.tag) {
      accessories.push({ icon: Icon.Tag, text: lastSessionChoice.tag });
    }
    if (lastSessionChoice.name) {
      accessories.push({ icon: Icon.TextDocument, text: lastSessionChoice.name });
    }
    return accessories;
  }, [lastSessionChoice]);

  const lastSessionSubtitle = useMemo(() => {
    if (!lastSessionChoice) {
      return undefined;
    }
    const { title } = getIntervalMetadata(lastSessionChoice.intervalType);
    const durationLabel = secondsToTime(lastSessionChoice.durationSeconds);
    return `${title} • ${durationLabel}`;
  }, [lastSessionChoice]);

  const lastSessionDurations = useMemo(() => {
    if (!lastSessionChoice) {
      return undefined;
    }
    return {
      [lastSessionChoice.intervalType]: Math.round(lastSessionChoice.durationSeconds / 60),
    };
  }, [lastSessionChoice]);

  return (
    <List navigationTitle="Control Pomodoro Timers" isLoading={isLoadingLastSession && !currentInterval}>
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <List.Item
              title="Continue"
              icon={Icon.Play}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(continueInterval)} title={"Continue"} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pause"
              icon={Icon.Pause}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(pauseInterval)} title={"Pause"} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title="Reset"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action onAction={createAction(resetInterval)} title={"Reset"} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Restart Current"
            icon={Icon.Repeat}
            actions={
              <ActionPanel>
                <Action onAction={createAction(restartInterval)} title={"Restart Current"} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          {lastSessionChoice && (
            <List.Section title="Last Session">
              <List.Item
                title={lastSessionChoice.name ?? getIntervalMetadata(lastSessionChoice.intervalType).title}
                icon={getIntervalMetadata(lastSessionChoice.intervalType).icon}
                subtitle={lastSessionSubtitle}
                accessories={lastSessionAccessories}
                actions={
                  <ActionPanel>
                    <Action
                      title="Start Again"
                      onAction={createAction(() =>
                        startTimer(lastSessionChoice.intervalType, {
                          duration: lastSessionChoice.durationSeconds,
                          tag: lastSessionChoice.tag,
                          name: lastSessionChoice.name,
                        }),
                      )}
                    />
                    <Action.Push
                      title="Edit Details"
                      target={
                        <StartTaggedTimerForm
                          defaultIntervalType={lastSessionChoice.intervalType}
                          defaultDurations={lastSessionDurations}
                          defaultTag={lastSessionChoice.tag}
                          defaultSessionName={lastSessionChoice.name}
                          onCompleted={handleAfterTimerMutation}
                        />
                      }
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
          <List.Section title="Start New">
            <List.Item
              title={`Focus`}
              subtitle={`${preferences.focusIntervalDuration}:00`}
              icon={`🎯`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set Tag and Start"
                    target={<StartTaggedTimerForm defaultIntervalType="focus" onCompleted={handleAfterTimerMutation} />}
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`Focus`}
              subtitle={`55:00`}
              icon={`🎯`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set Tag and Start"
                    target={
                      <StartTaggedTimerForm
                        defaultIntervalType="focus"
                        defaultDurations={{ focus: 55 }}
                        onCompleted={handleAfterTimerMutation}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`Short Break`}
              subtitle={`${preferences.shortBreakIntervalDuration}:00`}
              icon={`🧘‍♂️`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set Tag and Start"
                    target={
                      <StartTaggedTimerForm defaultIntervalType="short-break" onCompleted={handleAfterTimerMutation} />
                    }
                  />
                </ActionPanel>
              }
            />
            <List.Item
              title={`Long Break`}
              subtitle={`${preferences.longBreakIntervalDuration}:00`}
              icon={`🚶`}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Set Tag and Start"
                    target={
                      <StartTaggedTimerForm defaultIntervalType="long-break" onCompleted={handleAfterTimerMutation} />
                    }
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}
    </List>
  );
};

const handleQuote = (): string => {
  let quote = { content: "You did it!", author: "Unknown" };
  const { isLoading, data } = useFetch<Quote[]>("https://zenquotes.io/api/random", {
    keepPreviousData: true,
  });
  if (!isLoading && data?.length) {
    quote = {
      content: data[0].q,
      author: data[0].a,
    };
  }

  return `> ${quote.content} \n>\n> &dash; ${quote.author}`;
};

const EndOfInterval = ({
  currentInterval,
  sessionRecord,
}: {
  currentInterval?: Interval;
  sessionRecord?: SessionRecord;
}) => {
  const [note, setNote] = useState(sessionRecord?.note);

  let markdownContent = "# Interval Completed \n\n";
  let usingGiphy = false;
  const sessionName = sessionRecord?.name ?? currentInterval?.name;

  if (sessionName) {
    markdownContent += `**Session:** ${sessionName}\n\n`;
  }

  if (note) {
    markdownContent += `> ${note}\n\n`;
  }

  if (preferences.enableConfetti) {
    exec("open raycast://extensions/raycast/raycast/confetti", function (err) {
      if (err) {
        // handle error
        console.error(err);
        return;
      }
    });
  }

  if (preferences.sound) {
    exec(`afplay /System/Library/Sounds/${preferences.sound}.aiff -v 10 && $$`);
  }

  if (preferences.enableQuote) {
    markdownContent += handleQuote() + "\n\n";
  }

  if (preferences.enableImage) {
    if (preferences.giphyAPIKey) {
      const { isLoading, data } = useFetch(
        `https://api.giphy.com/v1/gifs/random?api_key=${preferences.giphyAPIKey}&tag=${preferences.giphyTag}&rating=${preferences.giphyRating}`,
        {
          keepPreviousData: true,
        },
      );
      if (!isLoading && data) {
        const giphyResponse = data as GiphyResponse;
        markdownContent += `![${giphyResponse.data.title}](${giphyResponse.data.images.fixed_height.url})`;
        usingGiphy = true;
      } else if (isLoading) {
        ("You did it!");
      } else {
        markdownContent += `![${"You did it!"}](${preferences.completionImage})`;
      }
    } else {
      markdownContent += preferences.completionImage
        ? `![${"You did it!"}](${preferences.completionImage})`
        : "You did it!";
    }
  }

  if (usingGiphy) {
    markdownContent = `![powered by GIPHY](Poweredby_100px-White_VertLogo.png) \n\n` + markdownContent;
  }

  const executor = getNextIntervalExecutor();

  return (
    <Detail
      navigationTitle={`Interval completed`}
      markdown={markdownContent}
      actions={
        <ActionPanel>
          {sessionRecord?.id ? (
            <ActionPanel.Section title="Reflection">
              <Action.Push
                title={note ? "Edit Reflection" : "Add Reflection"}
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                target={
                  <AddSessionNoteForm
                    sessionId={sessionRecord.id}
                    defaultNote={note}
                    sessionName={sessionName}
                    onSaved={setNote}
                  />
                }
              />
            </ActionPanel.Section>
          ) : null}
          <ActionPanel.Section title="Start Next Interval">
            <Action.Push
              title={executor.title}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <StartTaggedTimerForm
                  defaultIntervalType={executor.intervalType}
                  defaultIsFreshStart={executor.isFreshStart}
                  onCompleted={handleAfterTimerMutation}
                />
              }
            />
            <Action.Push
              title={FocusText}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
              target={<StartTaggedTimerForm defaultIntervalType="focus" onCompleted={handleAfterTimerMutation} />}
            />
            <Action.Push
              title={ShortBreakText}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
              target={<StartTaggedTimerForm defaultIntervalType="short-break" onCompleted={handleAfterTimerMutation} />}
            />
            <Action.Push
              title={LongBreakText}
              shortcut={{ modifiers: ["cmd"], key: "l" }}
              target={<StartTaggedTimerForm defaultIntervalType="long-break" onCompleted={handleAfterTimerMutation} />}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function Command(props: {
  launchContext?: { currentInterval?: Interval; sessionRecord?: SessionRecord };
}) {
  const currentInterval = props.launchContext?.currentInterval;
  const sessionRecord = props.launchContext?.sessionRecord;
  return currentInterval ? (
    <EndOfInterval currentInterval={currentInterval} sessionRecord={sessionRecord} />
  ) : (
    <ActionsList />
  );
}
