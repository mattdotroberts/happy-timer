# Happy Timer

Stay on track with a cheerful focus timer built for Raycast by the Happy Operators team. It’s designed from the ground up to streamline session edits, tagging, and reporting so you can keep momentum without extra clicks.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## What it does

- Start, pause, reset, and restart focus, short break, and long break intervals directly inside Raycast.
- Keep timers visible in the Raycast menu bar command for quick control.
- Tag sessions, add notes, and view a running log so you can review completed work.
- See daily and weekly stats that summarize how you spend your focus time.
- Celebrate completed intervals with quotes, sounds, and optional images or Giphy-powered GIFs.
- Tweak the active session’s name, tag, or duration right from the menu bar.
- (Optional) Sync your focus status to Slack using the dedicated Slack commands.
- Automatically toggle Apple Do Not Disturb when the companion Raycast extension is installed.

## Available commands

- `Control Happy Timer` – Manage the active interval or start a new tagged session.
- `Show Happy Timer in Menu Bar` – Keep timer controls pinned in the Raycast menu bar.
- `Start Tagged Timer` – Jump straight into a session with custom durations and tags.
- `Edit Current Session` – Update the running timer’s name, tag, or duration.
- `View Session Log` – Review past sessions grouped by tag.
- `View Happy Timer Stats` – Inspect daily or weekly focus metrics.
- `Slack Control Happy Timer` / `Slack Happy Timer in Menu Bar` – Mirror the core commands while updating your Slack status (disabled by default; enable via Raycast preferences).

## Run it locally

> Requires Raycast (macOS) with the [Ray CLI](https://developers.raycast.com/basics/getting-started/ray-cli) enabled and Node.js 18+.

```bash
# Install dependencies
npm install

# Start the extension in Raycast
npm run dev    # runs `ray develop`

# (Optional) Build or lint from the terminal
npm run build
npm run lint
```

When `npm run dev` is running, open Raycast and search for "Happy Timer" to launch the commands above. Preference toggles (sounds, quotes, Do Not Disturb, Giphy, Slack, etc.) are configurable from the extension settings inside Raycast.

## Edit a running session

1. Click the Happy Timer icon in the macOS menu bar to open the current session controls.
2. Choose `Edit Session Details…` to launch the edit form with the timer’s existing name, tag, and length.
3. Adjust the fields you need and press `Save Changes`—the menu bar command refreshes immediately with your updates.

## Cross-extension integration

Happy Timer follows the [Raycast Cross-Extension Conventions][raycast-cross-extension-link]. The Do Not Disturb automation depends on the [yakitrak/do-not-disturb](https://www.raycast.com/yakitrak/do-not-disturb) extension—install and enable it if you want focus sessions to silence notifications automatically.

## Project docs & organization

- `README.md` (this file) – High-level overview, setup steps, and usage notes.
- `CHANGELOG.md` – Release history and noteworthy user-facing changes.
- `metadata/` – Store listing assets (screenshots) for the Raycast Gallery.
- `assets/` – Completion imagery used by default when timers finish.

## Known issues

- The Confetti preference interrupts the `Interval completed` dialog; leave it disabled for an uninterrupted flow.

[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square
[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions
