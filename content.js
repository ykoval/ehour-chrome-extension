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
           title.includes('ehour') ||
           document.querySelector('[class*="ehour"]') !== null ||
           document.querySelector('[id*="timesheet"]') !== null;
  }

  init() {
    // Listen for messages from popup
    window.addEventListener('message', (event) => {
      if (event.data.type === 'EHOUR_AUTOFILL') {
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
      
      // Fill each day's data
      for (const entry of data) {
        await this.fillDayEntry(entry, formStructure);
        await this.delay(500); // Small delay between entries
      }

      this.showProgress('Timesheet filled successfully!', 'success');
      
    } catch (error) {
      console.error('eHour Auto-Fill Error:', error);
      this.showProgress(`Error: ${error.message}`, 'error');
    }
  }

  analyzeTimesheetStructure() {
    // Common eHour selectors and patterns
    const selectors = {
      // Date inputs
      dateInputs: [
        'input[type="date"]',
        'input[name*="date"]',
        'input[id*="date"]',
        '.date-input input'
      ],
      
      // Hour inputs
      hourInputs: [
        'input[type="number"]',
        'input[name*="hour"]',
        'input[id*="hour"]',
        'input[name*="time"]',
        '.hours input',
        '.time-input input'
      ],
      
      // Description/Comment fields
      descriptionInputs: [
        'textarea[name*="comment"]',
        'textarea[name*="description"]',
        'input[name*="comment"]',
        'input[name*="description"]',
        '.comment textarea',
        '.description textarea'
      ],
      
      // Project selectors
      projectSelectors: [
        'select[name*="project"]',
        'select[id*="project"]',
        '.project select'
      ],
      
      // Add/Submit buttons
      submitButtons: [
        'button[type="submit"]',
        'input[type="submit"]',
        'button[name*="save"]',
        'button[id*="save"]',
        '.save-button',
        '.submit-button'
      ]
    };

    const structure = {
      detected: false,
      dateFields: [],
      hourFields: [],
      descriptionFields: [],
      projectFields: [],
      submitButtons: []
    };

    // Find matching elements
    for (const [type, selectorList] of Object.entries(selectors)) {
      for (const selector of selectorList) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          const fieldName = type.replace('s', 'Fields');
          structure[fieldName] = Array.from(elements);
          structure.detected = true;
        }
      }
    }

    console.log('eHour Auto-Fill: Detected structure', structure);
    return structure;
  }

  async fillDayEntry(entry, formStructure) {
    const { date, hours, description, tasks } = entry;
    
    console.log(`eHour Auto-Fill: Filling entry for ${date}`);

    // Try to find or create a row for this date
    const row = await this.findOrCreateDateRow(date, formStructure);
    
    if (!row) {
      console.warn(`Could not find/create row for date: ${date}`);
      return;
    }

    // Fill hours
    const hourField = row.querySelector('input[type="number"], input[name*="hour"]');
    if (hourField) {
      this.fillField(hourField, hours.toString());
    }

    // Fill description
    const descField = row.querySelector('textarea, input[name*="comment"], input[name*="description"]');
    if (descField) {
      // Create a concise description from tasks
      const taskSummary = tasks.length > 0 ? tasks.join(', ') : 'Development work';
      const shortDescription = `${taskSummary} - ${description.substring(0, 100)}...`;
      this.fillField(descField, shortDescription);
    }

    // If there's a project selector, try to select a relevant project
    const projectField = row.querySelector('select[name*="project"]');
    if (projectField && tasks.length > 0) {
      this.selectProject(projectField, tasks[0]); // Use first task as project hint
    }
  }

  async findOrCreateDateRow(targetDate, formStructure) {
    // First, try to find existing row with this date
    const dateFields = document.querySelectorAll('input[type="date"], input[name*="date"]');
    
    for (const dateField of dateFields) {
      if (dateField.value === targetDate) {
        return dateField.closest('tr, .row, .entry, form');
      }
    }

    // If not found, try to find an empty row and set the date
    for (const dateField of dateFields) {
      if (!dateField.value || dateField.value === '') {
        this.fillField(dateField, targetDate);
        return dateField.closest('tr, .row, .entry, form');
      }
    }

    // If still not found, try to add a new row (if there's an "Add" button)
    const addButton = document.querySelector('button[id*="add"], button[name*="add"], .add-button');
    if (addButton) {
      addButton.click();
      await this.delay(1000); // Wait for new row to appear
      
      // Try to find the newly created row
      const newDateFields = document.querySelectorAll('input[type="date"], input[name*="date"]');
      const lastDateField = newDateFields[newDateFields.length - 1];
      if (lastDateField && !lastDateField.value) {
        this.fillField(lastDateField, targetDate);
        return lastDateField.closest('tr, .row, .entry, form');
      }
    }

    return null;
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
    field.blur();
  }

  selectProject(selectField, taskHint) {
    // Try to find a project option that matches the task
    const options = selectField.querySelectorAll('option');
    
    for (const option of options) {
      const optionText = option.textContent.toLowerCase();
      const taskLower = taskHint.toLowerCase();
      
      // Look for matches in project names
      if (optionText.includes('mkis') || 
          optionText.includes('development') || 
          optionText.includes('frontend') ||
          optionText.includes(taskLower.split('-')[0])) {
        selectField.value = option.value;
        selectField.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
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
