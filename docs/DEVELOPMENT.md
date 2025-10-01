# Development notes

## Files

```
manifest.json        Manifest V3 configuration
popup.html/.js       Popup: raw git log → formatted report → preview → fill
content.js           Runs on the eHour page: finds the project row, types hours and comments, saves
background.js        Service worker: default settings, message relay, context menu
reformat_gitlog.js   Node CLI with the same raw-log → report conversion as the popup
examples/            Synthetic raw git log and the report generated from it
generate-icons.sh    Builds the PNG icons from icons/icon.svg
```

## Data flow

```
git log  →  popup "Parse Raw Git Log"  →  formatted daily report
         →  "Parse & Preview" (date range filter)  →  "Fill eHour Timesheet"
         →  content.js: project row → day column → hours → comment dialog → save week
```

The popup and `reformat_gitlog.js` group commits by date and by ticket, drop merge
commits, put `[8]` on the first task of each day and turn ` - ` separated parts of a
commit subject into subtasks. Commits without a ticket are listed after the ticket tasks,
or under `[8] General work` when a day has no ticket at all.

## Project-specific parts

The extension was written for one eHour project, and two things are hardcoded:

- **Ticket key `MKIS`**: the ticket regexes in `popup.js` and `reformat_gitlog.js`.
- **Project row `MKIS`**: `findMKISProjectRow()` in `content.js` looks for the row whose
  `.projectCodeFilter` text is exactly `MKIS`.

For another project, change both to your ticket key and eHour project code.

## eHour markup the filler relies on

- Project rows: `.projectRow`, project code in `.projectCodeFilter`
- Day headers: `.timesheetTable .day .date`
- Hour inputs: `input[name*="days:<index>:day:day"]`
- Comment dialog: the pencil icon `a[href="javascript:;"] i.fa-pencil` in the day cell
- Save: `a[name="submitButton"]`, `#submit` or `#submitButtonTop`

If filling stops working after an eHour upgrade, check these selectors first in DevTools.
The content script logs each step to the page console with the `eHour Auto-Fill` prefix.

## Testing

There are no automated tests. Before a change, load the unpacked extension, fill one
week on a test timesheet and check the hours, the comments and the saved state.
