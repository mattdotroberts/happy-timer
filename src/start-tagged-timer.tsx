import StartTaggedTimerForm from "./components/StartTaggedTimerForm";
import { IntervalType } from "./lib/types";

type LaunchContext = {
  intervalType?: IntervalType;
  isFreshStart?: boolean;
};

export default function Command(props: { launchContext?: LaunchContext }) {
  return (
    <StartTaggedTimerForm
      defaultIntervalType={props.launchContext?.intervalType}
      defaultIsFreshStart={props.launchContext?.isFreshStart}
    />
  );
}
