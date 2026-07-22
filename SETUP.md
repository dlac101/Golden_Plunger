# Cleanest Cabin: Setup and Deploy Guide

This guide covers deploying the Cleanest Cabin Competition app as a Google Apps Script web app. For scoring rules and cabin codes, see `SCORING.md`; this document does not repeat them.

## 1. Architecture at a glance

- One Google Sheet holds the data. A container-bound Apps Script project attached to that Sheet serves the web app.
- Three files are pasted into the Apps Script editor: `Code.gs` (server logic), `Entry.html` (scoring page), `Dashboard.html` (live dashboard).
- One deployment, two views, same URL:
  - Entry page: the base `/exec` URL.
  - Dashboard: the same `/exec` URL with `?page=dashboard` appended.
- All submitted scores land in a single `Scores` sheet tab. Inspectors do not need Google accounts; the app runs as the owner.

## 2. Prerequisites

- A Google account (personal or Workspace) with access to Google Drive and Sheets.
- The three file contents ready to paste: `Code.gs`, `Entry.html`, `Dashboard.html`.

## 3. Create the Google Sheet

1. In Google Drive, create a new Google Sheet.
2. Name it something identifiable, for example `Camp Cabin Grades`.

## 4. Open the Apps Script editor

1. In the Sheet, open the **Extensions** menu, then **Apps Script**.
2. This opens a new Apps Script project bound to the Sheet. Leave the browser tab open; you will work here for the next several steps.

## 5. Add the code files

The Apps Script editor starts with one default file, `Code.gs`, and no HTML files.

1. Click into the default `Code.gs` file. Delete any placeholder content and paste in the full contents of the project's `Code.gs`.
2. Add the entry page: click the **+** next to **Files**, choose **HTML**, and name it exactly `Entry` (Apps Script appends `.html` automatically, so the file becomes `Entry.html`). Paste in the full contents of the project's `Entry.html`.
3. Add the dashboard: click the **+** next to **Files** again, choose **HTML**, and name it exactly `Dashboard`. Paste in the full contents of the project's `Dashboard.html`.

The exact names `Entry` and `Dashboard` matter: `Code.gs` looks up files by these names in `doGet`. A typo or different capitalization breaks routing.

4. Save all files: press `Ctrl+S`, or click the disk icon in the toolbar.

## 6. Initialize the Scores sheet

1. Switch back to the Google Sheet browser tab and reload it.
2. A custom menu named **Cabin Comp** appears next to **Help** in the menu bar. If you do not see it, reload the tab again; custom menus only appear after the script loads on a fresh page load.
3. Open **Cabin Comp** and choose **Initialize / repair sheet**.
4. The first run triggers a Google authorization prompt:
   - Choose your Google account.
   - If you see a screen warning the app is unverified, click **Advanced**, then **Go to (unsafe)**. This is expected for a personal script that has not gone through Google's app review; you wrote or pasted the code, so this is safe to accept.
   - Click **Allow**.
5. Running the menu item creates (or repairs) a `Scores` tab with the correct header row:

   `Timestamp, Day, CabinCode, AgeGroup, Gender, Floors, Beds, Belongings, Trash, Bath, Polish, Cleanliness, TieOrder, Inspector, Notes`

   Re-running it later is safe and will not erase existing data.

## 7. Deploy as a web app

1. In the Apps Script editor, click **Deploy** (top right), then **New deployment**.
2. Next to **Select type**, click the gear icon and choose **Web app**.
3. Fill in the deployment form:
   - **Description**: something like `Initial deployment` (any text; it is just a label for this version).
   - **Execute as**: `Me`.
   - **Who has access**: `Anyone with the link`. If this is a Google Workspace account and only camp staff should reach it, you may choose `Anyone within [your organization]` instead.
4. Click **Deploy**.
5. If prompted, authorize the deployment the same way as step 6.4 (account picker, Advanced / Go to (unsafe) if shown, Allow).
6. Copy the **Web app URL**. It ends in `/exec`. This is the base URL for both pages.

## 8. Get the entry and dashboard links

- **Entry link** (for inspectors): the `/exec` URL exactly as copied.
- **Dashboard link** (for the live view): the same `/exec` URL with `?page=dashboard` appended to the end.
- **Presentation link** (for projecting the reveal ceremony): the dashboard link with `&present=1` appended, for example `.../exec?page=dashboard&present=1`. Opening this link shows a "press any key or tap to begin" splash; pressing a key or tapping starts presentation mode at whatever day/division is currently selected. Bookmark or QR-code this link for the projector PC.

To append a query parameter to a URL that has none yet, add `?page=dashboard` directly after the URL with no space, for example:

```
https://script.google.com/macros/s/AKfycb.../exec?page=dashboard
```

**Projector tips:** if using the presentation link above, click or press a key once after the page loads to enter presentation mode (a browser will not enter fullscreen automatically without that first interaction). Whether the in-app "Start Presentation" fullscreen request works inside Apps Script's own sandboxed iframe wrapper has not been confirmed; for the most reliable fullscreen result on the projector, also press F11 (or use the browser's own fullscreen control) after starting presentation mode.

## 9. Share the links

- Send the **entry link** to inspectors. It works in any phone browser, requires no app install, and does not require inspectors to sign into Google; the app runs under your authorization, not theirs.
- Open the **dashboard link** on a laptop or a TV in the dining hall for the live leaderboard view.
- Suggest inspectors add a home-screen shortcut for the entry link on their phones (in most mobile browsers: share/menu button, then "Add to Home Screen"), so it behaves like an app icon for the week.

## 10. Editing code after deployment

Editing a file in the Apps Script editor does not change what the live `/exec` URL serves until you publish a new version.

To update the live deployment:

1. In the Apps Script editor, click **Deploy**, then **Manage deployments**.
2. Click the pencil (edit) icon on the existing web app deployment.
3. Next to **Version**, choose **New version**.
4. Click **Deploy**.

The `/exec` URL stays the same as long as you edit the existing deployment this way; you do not need to re-share a new link. Creating a brand-new deployment instead of editing the existing one produces a different `/exec` URL, so avoid that unless you specifically want a separate link.

For quick testing without touching the live URL, use **Deploy > Test deployments** to get a `/dev` URL that always reflects the current saved code.

## 11. Customizing the bathroom category

If cabins share a bathhouse instead of each having its own sink, relabel that scoring row:

1. Open `Code.gs` in the Apps Script editor.
2. Find the `BATH_LABEL` constant near the top of the file.
3. Change its value, for example to `"Shoes and gear lined up"`.
4. Save (`Ctrl+S`).
5. Deploy a new version following step 10 above so the change reaches the live entry page.

## 12. Fixing a mistaken score

Submitting a score for the same day and cabin again overwrites that cabin's previous entry for that day; it does not create a duplicate row. To correct a mistake, simply re-open the entry page and re-score that cabin.

## 13. Reading and exporting raw data

The `Scores` sheet tab is the full raw record of every submission. You can read it directly at any time, or export it: in the Sheet, use **File > Download > Comma Separated Values (.csv)** to archive a day's results or back up before awards.

## 14. Scoring reference

For the categories, the 0/1/2 descriptors that sum to Cleanliness, the Polish tiebreaker, cabin codes, and award pools, see `SCORING.md`.

`Entry.html` is the scorecard: it is what an inspector uses live, cabin by cabin. The inspector opens the entry link, picks the day and a cabin, taps a 0/1/2 for each of the five categories, adjusts the Polish stepper from its default of 5 if the cabin exceeded or fell short of expectations, and submits. They repeat this for each cabin on their list until all 21 are scored. There is no paper form; the phone entry page is the only scoring record until it is submitted.

If cabins in the same age group end up tied on both Cleanliness and Polish, a banner appears on the entry page prompting a tiebreak. Tapping it shows the tied cabins' category breakdowns and lets the inspector put them in order by hand; that order settles the day's ranking for those cabins.

## 15. Troubleshooting

**The authorization prompt looks alarming ("Google hasn't verified this app").**
This is expected. It is the standard flow for any personal Apps Script project that has not been submitted for Google's app verification. Since you pasted and control the code, it is safe to continue: click **Advanced**, then **Go to (unsafe)**, then **Allow**.

**Counselors see "You need permission" or "You need access" when opening the entry link.**
Check the deployment settings: **Deploy > Manage deployments**, edit the web app deployment, and confirm **Who has access** is set to `Anyone with the link` (or the appropriate organization-wide option) and **Execute as** is set to `Me`. Deploy a new version after changing this.

**The dashboard is not updating.**
The dashboard polls for new data on its own, roughly every 15 seconds; it does not update instantly on every keystroke. Try a manual refresh of the page. If it still shows stale data, open the `Scores` sheet directly and confirm new rows are actually being added when inspectors submit.

**The `Cabin Comp` custom menu is missing from the Sheet.**
Reload the Google Sheet browser tab. Custom menus load via a script trigger on page open and will not appear until the page is freshly loaded.

**Code changes are not showing up on the live link.**
Editing and saving a file in the Apps Script editor does not update the deployed `/exec` URL by itself. Follow step 10 to deploy a new version.
