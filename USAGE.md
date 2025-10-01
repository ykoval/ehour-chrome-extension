# eHour Git Log Auto-Fill Extension - Usage Guide

## Version 2 Features

### Raw Git Log Input (New!)

The extension now supports parsing raw git log output directly, making it easier to fill your eHour timesheet.

#### Workflow:

1. **Copy the Git Command**
   - Click the 📋 button next to the git command to copy it to your clipboard
   - Default command: `git log --since="1 month ago" --author="Yuriy Koval" --pretty=format:"%ad: %s" --reverse --date=short`

2. **Run the Command**
   - Open your terminal in your project directory
   - Paste and run the command
   - Or redirect output to a file: `git log ... > output.txt`

3. **Paste Raw Git Log**
   - Copy the git log output
   - Paste it into the "Raw Git Log" textarea (4 rows)

4. **Parse the Log**
   - Click "Parse Raw Git Log" button
   - The extension will automatically:
     - Group commits by date
     - Extract MKIS ticket numbers
     - Combine related tasks
     - Filter out merge commits
     - Add [8] hours to the first task of each day
     - Format subtasks with proper indentation
     - Populate the "Formatted Daily Report" field
     - Set the date range pickers to first/last dates in the log

5. **Fill eHour**
   - Select your date range
   - Click "Parse & Preview" to see what will be filled
   - Click "Fill eHour Timesheet" to auto-fill

### Alternative: Direct Formatted Input

If you already have a formatted report, you can paste it directly into the "Formatted Daily Report" textarea and skip the parsing step.

### Data Persistence

Both text areas are automatically saved to local storage:
- Raw Git Log
- Formatted Daily Report

Your data persists between sessions, so you can close and reopen the extension without losing your work.

## Format Examples

### Raw Git Log Format (Input):
```
2025-09-01: MKIS-1177 FE: Public user management - Create User table - add graphql's for public user management
2025-09-01: MKIS-1177 FE: Public user management - Create User table - rename, refactoring
2025-09-02: MKIS-1177 FE: Public user management - Create User table - resolvers added
```

### Formatted Report (Output):
```
## 2025-09-01
[8] MKIS-1177: FE: Public user management - Create User table
  - add graphql's for public user management
  - rename, refactoring

## 2025-09-02
[8] MKIS-1177: FE: Public user management - Create User table
  - resolvers added
```

## Tips

- The parser intelligently detects feature names (e.g., "Create User table") and includes them in the title
- Merge commits are automatically filtered out
- Multiple commits for the same ticket on the same day are combined
- Non-MKIS commits are preserved as general work items
- You can customize the git command for your needs (change author, date range, etc.)
