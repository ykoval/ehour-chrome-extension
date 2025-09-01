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
          description: '',
          subtasks: []
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
        continue;
      }

      // Match subtask entries: - subtask description
      const subtaskMatch = line.match(/^\s*-\s*(.+)/);
      if (subtaskMatch && currentEntry) {
        currentEntry.subtasks.push(subtaskMatch[1]);
        continue;
      }

      // Match additional MKIS tickets without [8]: MKIS-XXX Description
      const additionalTicketMatch = trimmedLine.match(/^(MKIS-\d+)\s+(.+)/);
      if (additionalTicketMatch && currentEntry) {
        const additionalDesc = `${additionalTicketMatch[1]}: ${additionalTicketMatch[2]}`;
        currentEntry.subtasks.push(additionalDesc);
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
      // Build complete description with subtasks
      let fullDescription = entry.description || 'General work';
      
      if (entry.subtasks && entry.subtasks.length > 0) {
        const subtaskText = entry.subtasks.map(subtask => `  - ${subtask}`).join('\n');
        fullDescription += '\n' + subtaskText;
      }
      
      return `${entry.date}: ${entry.hours}h - ${fullDescription}`;
    }).join('\n\n');
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

// Set default date range (previous month)
const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

startDateInput.value = firstDay.toISOString().split('T')[0];
endDateInput.value = lastDay.toISOString().split('T')[0];

// Load saved report from local storage
loadSavedReport();

// Auto-save report text when user types
gitLogTextarea.addEventListener('input', () => {
  saveReportToStorage(gitLogTextarea.value);
});

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
    
    if (!tab.url.includes('ehour') && !tab.url.includes('timesheet') && !tab.url.includes('/eh/')) {
      showStatus('Please navigate to your eHour timesheet page first.', 'error');
      return;
    }

    // First ensure content script is injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (error) {
      console.log('Content script may already be injected:', error.message);
    }

    // Wait a moment for content script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));

    // Send message to content script
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'EHOUR_AUTOFILL',
        data: filteredData
      });
      
      showStatus('Timesheet filling initiated! Check the eHour page.', 'success');
      
      // Don't close popup immediately - let user see progress
      setTimeout(() => {
        window.close();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to send message to content script:', error);
      showStatus('Failed to communicate with page. Try refreshing the eHour page.', 'error');
    }

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
// Function to save report to local storage
function saveReportToStorage(reportText) {
  chrome.storage.local.set({ 
    savedReport: reportText,
    lastSaved: Date.now()
  });
}

// Function to load saved report from local storage
async function loadSavedReport() {
  try {
    const result = await chrome.storage.local.get(['savedReport', 'lastSaved']);
    if (result.savedReport) {
      gitLogTextarea.value = result.savedReport;
      
      // Show when it was last saved
      if (result.lastSaved) {
        const lastSaved = new Date(result.lastSaved);
        const timeAgo = getTimeAgo(lastSaved);
        showStatus(`Restored saved report (${timeAgo})`, 'info');
      }
    }
  } catch (error) {
    console.error('Error loading saved report:', error);
  }
}

// Helper function to show time ago
function getTimeAgo(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
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
