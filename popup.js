// eHour Git Log Auto-Fill - Popup Script

class GitLogParser {
  constructor() {
    this.parsedData = [];
  }

  parse(gitLogText) {
    const lines = gitLogText.split('\n');
    const dailyEntries = [];
    let currentDate = null;
    let currentEntry = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Match date headers: ## 2025-07-01
      const dateMatch = trimmedLine.match(/^##\s*(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        if (currentEntry) {
          dailyEntries.push(currentEntry);
        }
        currentDate = dateMatch[1];
        currentEntry = {
          date: currentDate,
          hours: 0,
          tasks: [],
          description: ''
        };
        continue;
      }

      // Match task entries: [8] MKIS-869: Description...
      const taskMatch = trimmedLine.match(/^\[(\d+)\]\s*(.+)/);
      if (taskMatch && currentEntry) {
        currentEntry.hours = parseInt(taskMatch[1]);
        currentEntry.description = taskMatch[2];
        
        // Extract MKIS ticket numbers
        const tickets = taskMatch[2].match(/MKIS-\d+/g) || [];
        currentEntry.tasks = tickets;
      }
    }

    // Add the last entry
    if (currentEntry) {
      dailyEntries.push(currentEntry);
    }

    this.parsedData = dailyEntries;
    return dailyEntries;
  }

  filterByDateRange(startDate, endDate) {
    if (!startDate || !endDate) return this.parsedData;
    
    return this.parsedData.filter(entry => {
      return entry.date >= startDate && entry.date <= endDate;
    });
  }

  generatePreview(filteredData) {
    return filteredData.map(entry => {
      const taskList = entry.tasks.length > 0 ? entry.tasks.join(', ') : 'General work';
      return `${entry.date}: ${entry.hours}h - ${taskList}`;
    }).join('\n');
  }
}

// DOM Elements
const gitLogTextarea = document.getElementById('gitLog');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const parseBtn = document.getElementById('parseBtn');
const fillBtn = document.getElementById('fillBtn');
const previewDiv = document.getElementById('preview');
const statusDiv = document.getElementById('status');

// Initialize parser
const parser = new GitLogParser();
let filteredData = [];

// Set default date range (current month)
const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

startDateInput.value = firstDay.toISOString().split('T')[0];
endDateInput.value = lastDay.toISOString().split('T')[0];

// Event Listeners
parseBtn.addEventListener('click', () => {
  const gitLogText = gitLogTextarea.value.trim();
  
  if (!gitLogText) {
    showStatus('Please paste your daily report first.', 'error');
    return;
  }

  try {
    // Parse the git log
    const parsedData = parser.parse(gitLogText);
    
    if (parsedData.length === 0) {
      showStatus('No valid entries found in the git log.', 'error');
      return;
    }

    // Filter by date range
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    filteredData = parser.filterByDateRange(startDate, endDate);

    if (filteredData.length === 0) {
      showStatus('No entries found in the selected date range.', 'error');
      return;
    }

    // Show preview
    const preview = parser.generatePreview(filteredData);
    previewDiv.textContent = preview;
    previewDiv.style.display = 'block';
    
    // Enable fill button
    fillBtn.disabled = false;
    
    showStatus(`Parsed ${filteredData.length} entries successfully!`, 'success');
    
    // Store data for content script
    chrome.storage.local.set({ 
      timesheetData: filteredData,
      lastParsed: Date.now()
    });

  } catch (error) {
    showStatus(`Error parsing git log: ${error.message}`, 'error');
    console.error('Parse error:', error);
  }
});

fillBtn.addEventListener('click', async () => {
  if (filteredData.length === 0) {
    showStatus('No data to fill. Please parse your git log first.', 'error');
    return;
  }

  try {
    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.url.includes('ehour') && !tab.url.includes('timesheet')) {
      showStatus('Please navigate to your eHour timesheet page first.', 'error');
      return;
    }

    // Inject content script to fill the timesheet
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: fillTimesheetData,
      args: [filteredData]
    });

    showStatus('Timesheet filling initiated! Check the eHour page.', 'success');
    
    // Close popup after a delay
    setTimeout(() => {
      window.close();
    }, 2000);

  } catch (error) {
    showStatus(`Error filling timesheet: ${error.message}`, 'error');
    console.error('Fill error:', error);
  }
});

// Helper function to show status messages
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}

// Function that will be injected into the page
function fillTimesheetData(timesheetData) {
  console.log('eHour Auto-Fill: Starting to fill timesheet with data:', timesheetData);
  
  // This function will be executed in the context of the eHour page
  // We'll implement the actual filling logic in the content script
  window.postMessage({
    type: 'EHOUR_AUTOFILL',
    data: timesheetData
  }, '*');
}
