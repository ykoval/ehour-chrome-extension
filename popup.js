// eHour Git Log Auto-Fill - Popup Script

class RawGitLogReformatter {
  reformatGitLog(rawText) {
    const lines = rawText.split('\n').filter(line => line.trim());
    
    // Group entries by date
    const dateGroups = {};
    
    lines.forEach(line => {
      const match = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.+)$/);
      if (match) {
        const [, date, commit] = match;
        
        // Skip merge commits (all variations)
        if (commit.match(/^Merge (branch|remote-tracking branch)/i)) {
          return;
        }
        
        if (!dateGroups[date]) {
          dateGroups[date] = [];
        }
        dateGroups[date].push(commit);
      }
    });
    
    // Process each date group
    const output = [];
    
    Object.keys(dateGroups).sort().forEach(date => {
      const commits = dateGroups[date];
      
      // Group commits by MKIS ticket
      const ticketGroups = {};
      const nonTicketCommits = [];
      
      commits.forEach(commit => {
        // Match MKIS ticket at the start
        const ticketMatch = commit.match(/^(MKIS-\d+)/);
        if (ticketMatch) {
          const ticketId = ticketMatch[1];
          const restOfCommit = commit.substring(ticketId.length).trim();
          
          if (!ticketGroups[ticketId]) {
            ticketGroups[ticketId] = {
              mainTitle: '',
              subtasks: [],
              titleParts: new Set()
            };
          }
          
          // Parse the description after ticket ID
          let description = restOfCommit.replace(/^[-:\s]+/, '');
          
          if (description.includes(' - ')) {
            const parts = description.split(' - ').map(p => p.trim().replace(/;$/, ''));
            
            let mainTitle = parts[0];
            let subtaskStartIndex = 1;
            
            // Check if second part is a feature/component name
            let hasFeatureName = false;
            if (parts.length > 1) {
              const secondPart = parts[1];
              const startsWithActionVerb = /^(add|fix|update|remove|delete|place|use|enable|disable|migrate|refactor|cleanup|rename|show|hide|set|implement|improve|revert|replace|move|output|call|upd|initial|build)/i.test(secondPart);
              
              if (!startsWithActionVerb && secondPart[0] === secondPart[0].toUpperCase()) {
                mainTitle = `${parts[0]} - ${secondPart}`;
                subtaskStartIndex = 2;
                hasFeatureName = true;
                ticketGroups[ticketId].titleParts.add(secondPart.toLowerCase());
              }
            }
            
            // Set main title - prefer titles with feature names
            const currentHasFeature = ticketGroups[ticketId].mainTitle.includes(' - ');
            if (!ticketGroups[ticketId].mainTitle || 
                (hasFeatureName && !currentHasFeature) ||
                (hasFeatureName === currentHasFeature && ticketGroups[ticketId].mainTitle.length < mainTitle.length)) {
              ticketGroups[ticketId].mainTitle = mainTitle;
            }
            
            // Add remaining parts as subtasks
            parts.slice(subtaskStartIndex).forEach(subtask => {
              const lowerSubtask = subtask.toLowerCase();
              if (subtask && 
                  !ticketGroups[ticketId].subtasks.includes(subtask) &&
                  !ticketGroups[ticketId].titleParts.has(lowerSubtask)) {
                ticketGroups[ticketId].subtasks.push(subtask);
              }
            });
          } else if (description) {
            if (!ticketGroups[ticketId].mainTitle || ticketGroups[ticketId].mainTitle.length < description.length) {
              ticketGroups[ticketId].mainTitle = description;
            }
          }
        } else {
          nonTicketCommits.push(commit);
        }
      });
      
      // Generate output for this date
      output.push(`## ${date}`);
      
      const ticketIds = Object.keys(ticketGroups).sort();
      
      if (ticketIds.length > 0) {
        // First ticket with [8] hours
        const firstTicket = ticketIds[0];
        const firstGroup = ticketGroups[firstTicket];
        output.push(`[8] ${firstTicket}: ${firstGroup.mainTitle}`);
        
        firstGroup.subtasks.forEach(subtask => {
          output.push(`  - ${subtask}`);
        });
        
        // Add remaining tickets
        ticketIds.slice(1).forEach(ticketId => {
          const group = ticketGroups[ticketId];
          output.push(`${ticketId} ${group.mainTitle}`);
          
          group.subtasks.forEach(subtask => {
            output.push(`  - ${subtask}`);
          });
        });
        
        // Add non-ticket commits at the end
        if (nonTicketCommits.length > 0) {
          nonTicketCommits.forEach(commit => {
            output.push(commit);
          });
        }
      } else {
        output.push(`[8] General work`);
        nonTicketCommits.forEach(commit => {
          output.push(`  - ${commit}`);
        });
      }
      
      output.push('');
    });
    
    return output.join('\n');
  }
}

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
const gitCommandInput = document.getElementById('gitCommand');
const rawGitLogTextarea = document.getElementById('rawGitLog');
const gitLogTextarea = document.getElementById('gitLog');
const copyCmdBtn = document.getElementById('copyCmd');
const parseRawBtn = document.getElementById('parseRawBtn');
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const parseBtn = document.getElementById('parseBtn');
const fillBtn = document.getElementById('fillBtn');
const previewDiv = document.getElementById('preview');
const statusDiv = document.getElementById('status');

// Initialize parsers
const reformatter = new RawGitLogReformatter();
const parser = new GitLogParser();
let filteredData = [];

// Set default date range (previous month)
const now = new Date();
const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);

startDateInput.value = firstDay.toISOString().split('T')[0];
endDateInput.value = lastDay.toISOString().split('T')[0];

// Load saved data from local storage
loadSavedData();

// Auto-save when user types
gitCommandInput.addEventListener('input', () => {
  saveToStorage('gitCommand', gitCommandInput.value);
});

rawGitLogTextarea.addEventListener('input', () => {
  saveToStorage('rawGitLog', rawGitLogTextarea.value);
});

gitLogTextarea.addEventListener('input', () => {
  saveToStorage('formattedReport', gitLogTextarea.value);
});

// Copy command button
copyCmdBtn.addEventListener('click', async () => {
  const command = document.getElementById('gitCommand').value;
  try {
    await navigator.clipboard.writeText(command);
    showStatus('Command copied to clipboard!', 'success');
  } catch (error) {
    showStatus('Failed to copy command', 'error');
  }
});

// Parse raw git log button
parseRawBtn.addEventListener('click', () => {
  const rawText = rawGitLogTextarea.value.trim();
  
  if (!rawText) {
    showStatus('Please paste raw git log first.', 'error');
    return;
  }

  try {
    const reformatted = reformatter.reformatGitLog(rawText);
    
    // Populate the formatted report field
    gitLogTextarea.value = reformatted;
    saveToStorage('formattedReport', reformatted);
    
    // Extract and set date range from parsed log
    updateDateRangeFromLog(reformatted);
    
    showStatus('Git log parsed successfully!', 'success');
  } catch (error) {
    showStatus(`Error parsing git log: ${error.message}`, 'error');
    console.error('Parse error:', error);
  }
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

// Function to save to local storage
function saveToStorage(key, value) {
  const data = {};
  data[key] = value;
  data[`${key}_lastSaved`] = Date.now();
  chrome.storage.local.set(data);
}

// Function to load saved data from local storage
async function loadSavedData() {
  try {
    const result = await chrome.storage.local.get([
      'gitCommand', 'gitCommand_lastSaved',
      'rawGitLog', 'rawGitLog_lastSaved',
      'formattedReport', 'formattedReport_lastSaved'
    ]);
    
    if (result.gitCommand) {
      gitCommandInput.value = result.gitCommand;
    }
    
    if (result.rawGitLog) {
      rawGitLogTextarea.value = result.rawGitLog;
    }
    
    if (result.formattedReport) {
      gitLogTextarea.value = result.formattedReport;
      
      // Show when it was last saved
      if (result.formattedReport_lastSaved) {
        const lastSaved = new Date(result.formattedReport_lastSaved);
        const timeAgo = getTimeAgo(lastSaved);
        console.log(`Restored saved data (${timeAgo})`);
      }
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
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

// Helper function to extract and set date range from parsed log
function updateDateRangeFromLog(logText) {
  const dateMatches = logText.match(/^##\s*(\d{4}-\d{2}-\d{2})/gm);
  
  if (dateMatches && dateMatches.length > 0) {
    // Extract dates from matches
    const dates = dateMatches.map(match => {
      const dateStr = match.replace(/^##\s*/, '');
      return dateStr;
    }).sort();
    
    // Set first and last date
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    
    startDateInput.value = firstDate;
    endDateInput.value = lastDate;
    
    console.log(`Date range set: ${firstDate} to ${lastDate}`);
  }
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
