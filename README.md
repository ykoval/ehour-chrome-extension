# eHour Git Log Auto-Fill Chrome Extension

Automatically fill eHour timesheets from parsed git logs. This extension parses your daily development reports and fills your eHour timesheet entries automatically.

## Features

- 📝 **Parse Git Logs**: Converts daily reports in the format `[8] MKIS-869: Task description...`
- 📅 **Date Range Selection**: Fill timesheets for specific weeks or months
- 🤖 **Auto-Fill**: Automatically fills eHour timesheet forms
- 🎯 **Smart Detection**: Detects eHour pages and timesheet structures
- 📊 **Preview**: Shows parsed data before filling
- 🔄 **Bulk Entry**: Process multiple days at once

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select this extension folder
4. The extension icon should appear in your Chrome toolbar

## Usage

### 1. Prepare Your Daily Report

Create a daily report in this format:
```markdown
## 2025-07-01
[8] MKIS-869: Remove the confirmation dialog for MDS offer deletion - fix; MKIS-852: Fix the behavior of the "Save and Continue" button

## 2025-07-02
[8] MKIS-885: Target group dictionary - remove add item button

## 2025-07-03
[8] MKIS-896: Submit media - fix "Save changes" button; MKIS-866: Create MDS store
```

### 2. Fill Your Timesheet

1. Navigate to your eHour timesheet page
2. Click the extension icon in Chrome toolbar
3. Paste your daily report in the text area
4. Select the date range you want to fill
5. Click "Parse & Preview" to see what will be filled
6. Click "Fill eHour Timesheet" to automatically fill the forms

## How It Works

### Parsing Logic
- Extracts dates from `## YYYY-MM-DD` headers
- Extracts hours from `[X]` brackets (e.g., `[8]` = 8 hours)
- Identifies MKIS ticket numbers for project mapping
- Creates descriptions from task summaries

### Auto-Fill Process
1. **Page Detection**: Identifies eHour timesheet pages
2. **Structure Analysis**: Analyzes form fields and layout
3. **Data Mapping**: Maps parsed data to form fields
4. **Form Filling**: Automatically fills date, hours, and descriptions
5. **Validation**: Ensures data is properly entered

## Supported eHour Versions

The extension is designed to work with common eHour installations by detecting:
- Date input fields
- Hour/time input fields  
- Description/comment text areas
- Project selection dropdowns
- Submit/save buttons

## Troubleshooting

### Extension Not Working?
1. Check that you're on an eHour timesheet page
2. Ensure the page has loaded completely
3. Check browser console for error messages
4. Try refreshing the page and running again

### Data Not Parsing?
1. Verify your daily report follows the correct format
2. Ensure dates are in `YYYY-MM-DD` format
3. Check that hours are in `[X]` brackets
4. Make sure each day starts with `## Date`

### Form Not Filling?
1. The extension tries to detect common eHour form structures
2. If your eHour installation uses custom fields, the extension may need updates
3. Check the browser console for detection logs
4. Try manually clicking on form fields first

## Development

### File Structure
```
ehour-chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup interface
├── popup.js              # Popup logic and git log parsing
├── content.js            # Page interaction and form filling
├── background.js         # Background service worker
└── README.md            # This file
```

### Key Components

**GitLogParser Class**: Parses daily reports and extracts timesheet data
**EHourTimesheetFiller Class**: Handles form detection and filling
**Popup Interface**: User interface for data input and preview

## Contributing

1. Fork the repository
2. Make your changes
3. Test with your eHour installation
4. Submit a pull request

## License

MIT License - feel free to modify and distribute.

## Version History

- **v1.0.0**: Initial release with basic parsing and filling functionality
