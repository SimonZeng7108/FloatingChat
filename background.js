// FloatingChat - AI Platform Enhancer
// Background service worker

// Installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('FloatingChat extension installed/updated');
  
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      floatingChatEnabled: true,
      windowPosition: { x: 20, y: 20 },
      windowSize: { width: 500, height: 650 }
    });
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getStatus':
      // Forward to active tab's content script
      if (sender.tab) {
        sendResponse({ success: true });
      }
      break;
      
    case 'toggleExtension':
      // Forward toggle request to active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle' }, (response) => {
            sendResponse(response || { success: false });
          });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
      });
      return true; // Will respond asynchronously
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

// Tab updates - reinject if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedDomains = [
      'chatgpt.com',
      'claude.ai',
      'gemini.google.com',
      'chat.deepseek.com'
    ];
    
    const isSupported = supportedDomains.some(domain => tab.url.includes(domain));
    
    if (isSupported) {
      chrome.action.setTitle({
        tabId: tabId,
        title: 'FloatingChat - Active on this AI platform'
      });
    } else {
      chrome.action.setTitle({
        tabId: tabId,
        title: 'FloatingChat - Not available on this site'
      });
    }
  }
});

// Handle action button clicks
chrome.action.onClicked.addListener((tab) => {
  // Send toggle message to content script
  chrome.tabs.sendMessage(tab.id, { action: 'toggle' }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('Could not communicate with content script:', chrome.runtime.lastError.message);
    }
  });
}); 