# Happy Timer Roadmap

## Task list

### To do

- [ ] _(Ready for the next task)_

### Pending

- [ ] **Custom session templates** – Save combinations of durations, tags, and notification prefs for one-click reuse.
- [ ] **Goal-based stats** – Track progress against weekly focus-hour goals from the stats view.
- [ ] **Session export** – Export logged sessions (CSV/JSON) for personal analytics tools.
- [ ] **Shared presets** – Sync timer presets across machines via Raycast cloud sync when available.

### Completed

- [x] **Fix Focus 55 styling** – Correct the timer font weight and spacing so the 55-minute preset matches the Focus 25 layout.
- [x] **Resurface last session details** – In the preset picker, show the most recent session selection with its tags and settings for quick restart.
- [x] **Menu bar session editing** – Let people tweak the active session (duration, tags, pause/finish) directly from the menu-bar timer.

## Guiding principles

- Keep focus sessions quick to start with as little setup as possible.
- Reinforce positive momentum through friendly visuals, sounds, and messaging.
- Surface insights (stats, logs, tags) that help people improve their routines.
- Integrate politely with adjacent tools like Slack and Do Not Disturb.

## Quality-of-life improvements

- Better onboarding tips inside the main command to highlight tagging and logging.
- Optional compact menu-bar layout that shows elapsed time only.
- Preference descriptions that clarify how Slack status mapping works.

## Known bugs & fixes

- Confetti completion effect interrupts the `Interval completed` dialog; rework the effect to run asynchronously.
- Slack status sometimes lags when reconnecting after sleep; add retries with clearer errors.
- Interval restart occasionally ignores custom durations; ensure the timer resets with the chosen length.

## Research & ideas

- Explore native calendar integration for automatic focus blocks.
- Evaluate pulling quotes from a cached list to avoid network dependency for completions.
- Investigate optional white-noise playback during focus sessions.
