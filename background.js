// eHour Git Log Auto-Fill - Background Script

// Service worker for Chrome Extension Manifest V3

chrome.runtime.onInstalled.addListener(() => {
  console.log('eHour Auto-Fill Extension installed');
  
  // Set up default settings
  chrome.storage.local.set({
    settings: {
      defaultProject: '',
      autoSubmit: false,
      debugMode: false
    }
  });
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.type) {
    case 'PARSE_GIT_LOG':
      handleGitLogParsing(request.data, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'FILL_TIMESHEET':
      handleTimesheetFilling(request.data, sender.tab.id, sendResponse);
      return true;
      
    case 'GET_SETTINGS':
      getSettings(sendResponse);
      return true;
      
    case 'SAVE_SETTINGS':
      saveSettings(request.data, sendResponse);
      return true;
  }
});

async function handleGitLogParsing(gitLogText, sendResponse) {
  try {
    // This could be extended to do more sophisticated parsing
    // For now, we'll let the popup handle the parsing
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function handleTimesheetFilling(timesheetData, tabId, sendResponse) {
  try {
    // Inject the content script if it's not already there
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    // Send data to content script
    await chrome.tabs.sendMessage(tabId, {
      type: 'FILL_TIMESHEET_DATA',
      data: timesheetData
    });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error filling timesheet:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function getSettings(sendResponse) {
  try {
    const result = await chrome.storage.local.get(['settings']);
    sendResponse({ success: true, settings: result.settings || {} });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

async function saveSettings(settings, sendResponse) {
  try {
    await chrome.storage.local.set({ settings });
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Context menu for quick access (optional)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'fill-timesheet') {
    // Open popup or trigger filling
    chrome.action.openPopup();
  }
});

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'fill-timesheet',
    title: 'Fill eHour Timesheet',
    contexts: ['page'],
    documentUrlPatterns: ['*://*/*ehour*', '*://*/*timesheet*']
  });
});
