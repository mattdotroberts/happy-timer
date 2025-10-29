import { startTimer } from "../lib/timer";
import { IntervalType } from "../lib/types";

type Input = {
  /**
   * Interval type. Use `short-break` by default
   */
  type: IntervalType;
  /**
   * Duration in seconds.
   * There are default durations for each type set by the user, use this argument only to set custom duration
   */
  duration?: number;
  /**
   * Optional tag to associate with this timer session.
   */
  tag?: string;
  /**
   * Optional name to describe the session.
   */
  name?: string;
};

export default async function (input: Input) {
  return startTimer(input.type, { duration: input.duration, tag: input.tag, name: input.name });
}
