# Golden Plunger — Cleanest Cabin Competition

A small Google Apps Script web app for running a daily "cleanest cabin"
competition at summer camp. Inspectors score each cabin on a phone; a live
dashboard and a fullscreen "reveal ceremony" mode project the results for
the whole camp.

No accounts, no installs: inspectors open a link on their phone and submit
scores. All data lives in a single Google Sheet you own.

## Features

- **Entry page** — mobile-friendly scorecard. Five 0/1/2 categories summing
  to a Cleanliness score (0–10), plus a "Sparkle" tiebreaker score. An
  "all 2s" shortcut for a spotless cabin. Built-in manual tie-resolution
  when two cabins tie on both Cleanliness and Sparkle.
- **Dashboard** — live leaderboard per age group, a week-so-far trend
  chart, and a fullscreen **Presentation Mode** built for projecting a
  results "reveal ceremony" (rank-by-rank, keyboard-driven) on a
  1920x1080 screen.
- **Golden Plunger** — a fullscreen daily-winners announcement view,
  integrated into the Dashboard, with a tie-badge and day-specific splash
  copy.
- Runs entirely on Google Sheets + Apps Script — no server, no database,
  no build step to deploy.

## Quick start

See [`SETUP.md`](SETUP.md) for the full step-by-step deploy guide (create
the Sheet, paste the three files into the Apps Script editor, deploy as a
web app, share the links).

See [`SCORING.md`](SCORING.md) for the scoring rules, cabin-code scheme,
and the day-to-day workflow an inspector follows.

## Local development / preview

`test-harness/` contains standalone copies of each page wired to an
in-memory JS mock (`mock-gs.js`) instead of a real Google Sheet, so you can
open them directly via a `file://` path in a Chromium-based browser
without deploying anything. See
[`test-harness/README.md`](test-harness/README.md).

## Project structure

```
Code.gs              Apps Script server: sheet I/O, ranking, tie logic
Entry.html           Inspector-facing scorecard
Dashboard.html        Live dashboard, Presentation Mode, Golden Plunger view
GoldenPlunger.html    Standalone fullscreen daily-winners kiosk page
SETUP.md             Deploy guide
SCORING.md           Scoring rules and cabin-code reference
test-harness/        Local preview pages backed by a mock, no Sheet required
```

## Customizing for your own camp

- Cabin codes, counts, and age-group names are all defined in `Code.gs`'s
  `CABIN_SPEC`, `AGE_GROUPS`, and `ageGroupFromLetter_`/`genderFromLetter_`.
- The five scoring categories live in `Code.gs`'s `CATEGORIES` array.
- If cabins share a bathhouse instead of each having a sink, relabel the
  fifth category via the `BATH_LABEL` constant — see `SETUP.md` section 11.

## License

MIT — see [`LICENSE`](LICENSE).
