# Percussion Part Scheduler

A free, browser-only tool for generating fair percussion part assignments.
No accounts, no backend, no student data ever leaves the visitor's browser.

## Putting this on GitHub Pages

1. Create a new GitHub repository (public is fine, e.g. `percussion-scheduler`).
2. Upload `index.html`, `app.js`, and `student-roster-template.xlsx` to the root of that repository.
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch", branch `main`, folder `/ (root)`. Save.
5. GitHub will give you a URL like `https://yourusername.github.io/percussion-scheduler/` within a minute or two. That's the link to share.

## Files

- `index.html` — page structure and styling.
- `app.js` — all the app logic, including the scheduling algorithm (ported from the original Google Apps Script version).
- `student-roster-template.xlsx` — a fillable Excel workbook (with an Instructions tab and dropdown validation) that the Students tab links to as an alternative to the plain CSV template. This file must sit in the same folder as `index.html` for that link to work.

## Notes on the scheduling algorithm

This mirrors the original Apps Script scoring/trial logic:
- Runs up to 1,000 randomized trial schedules per ensemble (fewer for larger rosters, to stay fast) and keeps the best-scoring one.
- Scores penalize (a) mismatches between a student's actual pitched-instrument count and their availability-based target, and (b) repeated instruments for the same student across the week — except repeats of an unpitched Fill instrument (like "Pad"), which are expected and not penalized.
- The fill step reads your actual **Fill**-role instruments instead of hardcoding "Bells"/"Pad" (this was a bug carried over from the original script, since fixed). It picks a random active Pitched Fill instrument if the student still needs pitched days to hit their target ratio, otherwise a random active Unpitched Fill instrument. If you don't have an active instrument of the needed type, it falls back to whatever Fill instrument you do have and logs a warning; if you have no active Fill instrument at all, it leaves that student unassigned that day and warns you.
- Each student's pitched-target days are chosen at random from their own available days, once per trial — not derived from the order the group's days happen to get processed in. This avoids the whole roster's pitched/unpitched split falling into identical day-by-day blocks, which could happen especially when very few instruments are active.
- As before, Fill instruments are not subject to their daily limit the way Core/Optional instruments are — the fill step always finds a home for every remaining student.
- Known pre-existing quirk carried over from the Apps Script: the emergency fallback (used when no eligible student is found for a Core instrument after several attempts) doesn't check that instrument's daily limit, so in tight-availability days it could rarely exceed the configured limit by one. Flagging it here since it hasn't been changed.

## Data & privacy

All data (instruments, students, generated schedules) lives only in the browser tab's memory, with an automatic local-storage backup **on that same browser** so a refresh doesn't lose work. Nothing is transmitted anywhere. Use **Save to File** to make a portable backup or to hand a roster off to another computer.
