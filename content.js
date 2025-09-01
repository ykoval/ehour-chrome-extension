// eHour Git Log Auto-Fill - Content Script

class EHourTimesheetFiller {
  constructor() {
    this.isEHourPage = this.detectEHourPage();
    this.timesheetData = [];
    
    if (this.isEHourPage) {
      console.log('eHour Auto-Fill: Detected eHour page');
      this.init();
    }
  }

  detectEHourPage() {
    // Check if we're on an eHour page
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    
    return url.includes('ehour') || 
           url.includes('timesheet') || 
           url.includes('/eh/') ||
           title.includes('ehour') ||
           document.querySelector('[class*="ehour"]') !== null ||
           document.querySelector('[id*="timesheet"]') !== null ||
           document.querySelector('.timesheetTable') !== null;
  }

  init() {
    // Listen for messages from popup via Chrome extension messaging
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === 'EHOUR_AUTOFILL') {
        console.log('eHour Auto-Fill: Received message from popup', request);
        this.fillTimesheet(request.data);
        sendResponse({ success: true });
      }
    });

    // Also listen for window messages (backup method)
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EHOUR_AUTOFILL') {
        console.log('eHour Auto-Fill: Received window message', event.data);
        this.fillTimesheet(event.data.data);
      }
    });

    // Add visual indicator that extension is active
    this.addIndicator();
  }

  addIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'ehour-autofill-indicator';
    indicator.innerHTML = '🤖 eHour Auto-Fill Ready';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #4CAF50;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      indicator.remove();
    }, 3000);
  }

  async fillTimesheet(data) {
    console.log('eHour Auto-Fill: Starting to fill timesheet', data);
    
    try {
      // Show progress indicator
      this.showProgress('Analyzing page structure...');
      
      // Detect the timesheet form structure
      const formStructure = this.analyzeTimesheetStructure();
      
      if (!formStructure.detected) {
        throw new Error('Could not detect eHour timesheet structure');
      }

      this.showProgress('Filling timesheet entries...');
      
      // Group entries by week to minimize navigation
      const weekGroups = this.groupEntriesByWeek(data);
      
      for (const [weekKey, entries] of Object.entries(weekGroups)) {
        this.showProgress(`Processing week: ${weekKey}...`);
        
        // Navigate to the correct week if needed
        await this.navigateToWeek(entries[0].date);
        await this.delay(1000); // Wait for page to load
        
        // Re-analyze structure after navigation
        const currentFormStructure = this.analyzeTimesheetStructure();
        
        // Fill all entries for this week
        for (const entry of entries) {
          await this.fillDayEntry(entry, currentFormStructure);
          await this.delay(300); // Small delay between entries
        }
        
        // Save the week's data
        await this.saveWeek();
        await this.delay(1000); // Wait for save to complete
      }

      this.showProgress('All timesheet entries filled successfully!', 'success');
      
    } catch (error) {
      console.error('eHour Auto-Fill Error:', error);
      this.showProgress(`Error: ${error.message}`, 'error');
    }
  }

  analyzeTimesheetStructure() {
    // eHour-specific selectors based on actual HTML structure
    const selectors = {
      // Hour inputs - these are the main timesheet input fields
      hourInputs: [
        'input[name*="day:day"]',  // Main pattern: blueFrame:blueFrame_body:customers:0:rows:1:days:0:day:day
        'input[tabindex="1"]',     // All hour inputs have tabindex="1"
        '.timesheetTable input[type="text"]'
      ],
      
      // Weekly comment field
      weeklyCommentInputs: [
        'textarea[name*="commentsArea"]',
        'textarea.timesheetTextarea',
        'textarea[placeholder="Comments"]'
      ],
      
      // Day comment links (pencil icons)
      dayCommentLinks: [
        'a[href="javascript:;"] i.fa-pencil',
        '.iconLink',
        '.iconLinkOn'
      ],
      
      // Submit buttons
      submitButtons: [
        'a[name="submitButton"]',
        'a[name*="submitButtonTop"]',
        'a.button.store',
        '#submit',
        '#submitButtonTop'
      ],
      
      // Project rows for targeting specific projects
      projectRows: [
        '.projectRow',
        'tr.projectRow'
      ],
      
      // Project codes for identification
      projectCodes: [
        '.projectCode span',
        '.projectCodeFilter'
      ]
    };

    const structure = {
      detected: false,
      hourFields: [],
      weeklyCommentFields: [],
      dayCommentLinks: [],
      submitButtons: [],
      projectRows: [],
      projectCodes: []
    };

    // Find matching elements
    for (const [type, selectorList] of Object.entries(selectors)) {
      for (const selector of selectorList) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const fieldName = type.replace(/s$/, 'Fields').replace('Inputs', 'Fields').replace('Links', 'Links').replace('Buttons', 'Buttons').replace('Rows', 'Rows').replace('Codes', 'Codes');
          structure[fieldName] = Array.from(elements);
          structure.detected = true;
        }
      }
    }

    console.log('eHour Auto-Fill: Detected structure', structure);
    return structure;
  }

  async fillDayEntry(entry, formStructure) {
    const { date, hours, description, tasks, subtasks } = entry;
    
    console.log(`eHour Auto-Fill: Filling entry for ${date}`);

    // Find the MKIS project row (since that's what we're working with)
    const mkisRow = this.findMKISProjectRow();
    if (!mkisRow) {
      console.warn('Could not find MKIS project row');
      return;
    }

    // Find the day column that matches our date
    const dayIndex = this.getDayIndexFromDate(date);
    if (dayIndex === -1) {
      console.warn(`Could not determine day index for date: ${date}`);
      return;
    }

    // Fill hours in the appropriate day column
    const hourInput = mkisRow.querySelector(`input[name*="days:${dayIndex}:day:day"]`);
    if (hourInput) {
      this.fillField(hourInput, hours.toString());
      console.log(`Filled ${hours} hours for ${date} in MKIS project`);
    } else {
      console.warn(`Could not find hour input for day ${dayIndex}`);
    }

    // Build complete description with subtasks
    let fullDescription = `[${hours}] ${description}`;
    if (subtasks && subtasks.length > 0) {
      const subtaskText = subtasks.map(subtask => `  - ${subtask}`).join('\n');
      fullDescription += '\n' + subtaskText;
    }

    // Fill day-specific comment via pencil icon modal
    await this.fillDayComment(mkisRow, dayIndex, fullDescription, date);

    // Add description to weekly comments if it's the first entry
    if (formStructure.weeklyCommentFields.length > 0) {
      const commentField = formStructure.weeklyCommentFields[0];
      const existingComment = commentField.value;
      const newComment = tasks.length > 0 ? tasks.join(', ') + ': ' + description : description;
      
      if (!existingComment.includes(newComment.substring(0, 50))) {
        const updatedComment = existingComment ? existingComment + '\n' + newComment : newComment;
        this.fillField(commentField, updatedComment);
      }
    }
  }

  findMKISProjectRow() {
    // Look for project rows and find the one with MKIS
    const projectRows = document.querySelectorAll('.projectRow');
    
    for (const row of projectRows) {
      const projectCodeElement = row.querySelector('.projectCodeFilter');
      if (projectCodeElement && projectCodeElement.textContent.trim() === 'MKIS') {
        return row;
      }
    }
    
    return null;
  }

  getDayIndexFromDate(dateString) {
    // Parse the date (format: 2025-08-01)
    const targetDate = new Date(dateString);
    const targetDay = targetDate.getDate();
    
    // Find the day headers in the timesheet table
    const dayHeaders = document.querySelectorAll('.timesheetTable .day .date');
    
    for (let i = 0; i < dayHeaders.length; i++) {
      const dayNumber = parseInt(dayHeaders[i].textContent.trim());
      if (dayNumber === targetDay) {
        return i;
      }
    }
    
    return -1; // Day not found in current week
  }

  fillField(field, value) {
    // Clear existing value
    field.value = '';
    field.focus();
    
    // Set new value
    field.value = value;
    
    // Trigger events to ensure the form recognizes the change
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
    field.blur();
    
    // Small delay to ensure the change is processed
    setTimeout(() => {
      if (field.value !== value) {
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 100);
  }

  // Helper method to check if we're in the correct week for the date
  isDateInCurrentWeek(dateString) {
    const targetDate = new Date(dateString);
    const weekTitle = document.querySelector('h1');
    
    if (!weekTitle) return false;
    
    // Extract week dates from title like "Week 31: 28 Jul 2025 - 03 Aug 2025"
    const weekText = weekTitle.textContent;
    const dateMatch = weekText.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s+-\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    
    if (!dateMatch) return false;
    
    const startDay = parseInt(dateMatch[1]);
    const startMonth = this.getMonthNumber(dateMatch[2]);
    const startYear = parseInt(dateMatch[3]);
    
    const endDay = parseInt(dateMatch[4]);
    const endMonth = this.getMonthNumber(dateMatch[5]);
    const endYear = parseInt(dateMatch[6]);
    
    const weekStart = new Date(startYear, startMonth, startDay);
    const weekEnd = new Date(endYear, endMonth, endDay);
    
    return targetDate >= weekStart && targetDate <= weekEnd;
  }
  
  getMonthNumber(monthAbbr) {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthAbbr] || 0;
  }

  groupEntriesByWeek(entries) {
    const weekGroups = {};
    
    for (const entry of entries) {
      const date = new Date(entry.date);
      // Get the Monday of the week for this date
      const monday = new Date(date);
      monday.setDate(date.getDate() - date.getDay() + 1);
      
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weekGroups[weekKey]) {
        weekGroups[weekKey] = [];
      }
      weekGroups[weekKey].push(entry);
    }
    
    return weekGroups;
  }

  async navigateToWeek(targetDateString) {
    const targetDate = new Date(targetDateString);
    
    // Check if we're already in the correct week
    if (this.isDateInCurrentWeek(targetDateString)) {
      console.log('Already in correct week for', targetDateString);
      return;
    }
    
    console.log('Navigating to week containing', targetDateString);
    
    // Find navigation buttons
    const prevWeekBtn = document.querySelector('a.previousWeek, #id11e');
    const nextWeekBtn = document.querySelector('a.nextWeek, #id11f');
    
    if (!prevWeekBtn || !nextWeekBtn) {
      console.warn('Could not find week navigation buttons');
      return;
    }
    
    // Get current week info
    const currentWeekInfo = this.getCurrentWeekInfo();
    if (!currentWeekInfo) {
      console.warn('Could not determine current week');
      return;
    }
    
    const currentWeekStart = currentWeekInfo.startDate;
    const targetWeekStart = new Date(targetDate);
    targetWeekStart.setDate(targetDate.getDate() - targetDate.getDay() + 1);
    
    // Calculate how many weeks to navigate
    const weekDiff = Math.round((targetWeekStart - currentWeekStart) / (7 * 24 * 60 * 60 * 1000));
    
    if (weekDiff === 0) {
      return; // Already in correct week
    }
    
    const button = weekDiff > 0 ? nextWeekBtn : prevWeekBtn;
    const clicks = Math.abs(weekDiff);
    
    for (let i = 0; i < clicks; i++) {
      button.click();
      await this.delay(1500); // Wait for navigation to complete
    }
  }

  getCurrentWeekInfo() {
    const weekTitle = document.querySelector('h1');
    if (!weekTitle) return null;
    
    const weekText = weekTitle.textContent;
    const dateMatch = weekText.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})\s+-\s+(\d{1,2})\s+(\w{3})\s+(\d{4})/);
    
    if (!dateMatch) return null;
    
    const startDay = parseInt(dateMatch[1]);
    const startMonth = this.getMonthNumber(dateMatch[2]);
    const startYear = parseInt(dateMatch[3]);
    
    return {
      startDate: new Date(startYear, startMonth, startDay),
      weekText: weekText
    };
  }

  async saveWeek() {
    // Find and click the store button
    const storeButton = document.querySelector('#submit, #submitButtonTop, a[name="submitButton"]');
    
    if (storeButton) {
      console.log('Saving week data...');
      storeButton.click();
      
      // Wait for save to complete
      await this.delay(2000);
      
      // Check for any error messages
      const errorMsg = document.querySelector('.error, .errorMessage, [class*="error"]');
      if (errorMsg && errorMsg.textContent.trim()) {
        console.warn('Save warning/error:', errorMsg.textContent);
      } else {
        console.log('Week saved successfully');
      }
    } else {
      console.warn('Could not find store button');
    }
  }

  showProgress(message, type = 'info') {
    // Remove existing progress indicator
    const existing = document.getElementById('ehour-progress');
    if (existing) existing.remove();

    const progress = document.createElement('div');
    progress.id = 'ehour-progress';
    progress.textContent = message;
    
    const colors = {
      info: '#2196F3',
      success: '#4CAF50',
      error: '#f44336'
    };
    
    progress.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: ${colors[type]};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10001;
      font-family: Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      max-width: 300px;
    `;
    
    document.body.appendChild(progress);
    
    // Auto-remove after delay
    const delay = type === 'error' ? 8000 : 4000;
    setTimeout(() => {
      if (progress.parentNode) {
        progress.remove();
      }
    }, delay);
  }

  async fillDayComment(mkisRow, dayIndex, description, date) {
    try {
      // Find all day cells and their corresponding option cells in this row
      const dayCells = mkisRow.querySelectorAll('td:not(.projectCode):not(.project):not(.spacer):not(.total)');
      let pencilLink = null;
      
      // Find the pencil icon for the specific day index
      // Day cells alternate: day input, options, day input, options, etc.
      const optionsCellIndex = (dayIndex * 2) + 1; // Options cell is after each day cell
      
      if (optionsCellIndex < dayCells.length) {
        const optionsCell = dayCells[optionsCellIndex];
        pencilLink = optionsCell.querySelector('a[href="javascript:;"] i.fa-pencil')?.parentElement;
      }
      
      if (!pencilLink) {
        console.warn(`Could not find pencil icon for day ${dayIndex}`);
        return;
      }

      console.log(`Clicking pencil icon for ${date}`);
      
      // Click the pencil icon to open the modal
      pencilLink.click();
      
      // Wait for modal to appear
      await this.delay(1000);
      
      // Find the modal textarea
      const modal = document.querySelector('.wicket-modal');
      if (!modal || modal.style.visibility !== 'visible') {
        console.warn('Day comment modal did not open');
        return;
      }
      
      const textarea = modal.querySelector('textarea.timesheetTextarea');
      if (!textarea) {
        console.warn('Could not find textarea in day comment modal');
        return;
      }
      
      // Fill the textarea with the description
      this.fillField(textarea, description);
      console.log(`Filled day comment for ${date}: ${description.substring(0, 50)}...`);
      
      // Click OK button to close modal
      const okButton = modal.querySelector('a.button.floatRight');
      if (okButton) {
        await this.delay(500); // Small delay before clicking OK
        okButton.click();
        console.log(`Closed day comment modal for ${date}`);
        
        // Wait for modal to close
        await this.delay(1000);
      } else {
        console.warn('Could not find OK button in day comment modal');
      }
      
    } catch (error) {
      console.error(`Error filling day comment for ${date}:`, error);
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize the timesheet filler when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new EHourTimesheetFiller();
  });
} else {
  new EHourTimesheetFiller();
}
