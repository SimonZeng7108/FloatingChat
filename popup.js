// FloatingChat - AI Platform Enhancer
// Popup interface JavaScript

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('loading');
  const mainContentEl = document.getElementById('main-content');
  const statusSectionEl = document.getElementById('status-section');
  const statusTextEl = document.getElementById('status-text');
  const platformInfoEl = document.getElementById('platform-info');
  const platformIconEl = document.getElementById('platform-icon');
  const platformNameEl = document.getElementById('platform-name');
  const toggleEl = document.getElementById('toggle-extension');
  
  
  
  const helpLink = document.getElementById('help-link');

  let currentTab = null;
  let extensionStatus = null;


  // Initialize popup
  await initializePopup();

  async function initializePopup() {
    try {
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tabs[0];

      if (!currentTab) {
        showError('No active tab found');
        return;
      }

      // Check if tab is supported
      const supportedDomains = ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'chat.deepseek.com'];
      const isSupported = supportedDomains.some(domain => currentTab.url.includes(domain));

      if (!isSupported) {
        showUnsupportedSite();
        return;
      }

      // Load scroll prevention setting
  

      // Get extension status from content script
      await getExtensionStatus();
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      showError('Failed to load extension status');
    }
  }

  async function getExtensionStatus() {
    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'getStatus' });
      
      if (response) {
        extensionStatus = response;
        updateUI();
      } else {
        showError('Could not communicate with content script');
      }
    } catch (error) {
      console.error('Failed to get status:', error);
      showError('Extension not loaded on this page');
    }
  }



  function updateUI() {
    // Hide loading, show content
    loadingEl.style.display = 'none';
    mainContentEl.style.display = 'block';

    if (!extensionStatus) {
      showError('No status available');
      return;
    }

    // Update status section
    const { enabled, platform, hasAnswer } = extensionStatus;
    
    if (platform) {
      // Show platform info
      platformInfoEl.style.display = 'flex';
      platformIconEl.className = `platform-icon ${platform}`;
      platformNameEl.textContent = platform.charAt(0).toUpperCase() + platform.slice(1);

      // Update status
      if (enabled) {
        statusSectionEl.className = 'status-section';
        statusTextEl.textContent = hasAnswer 
          ? 'Active - Floating window available with latest answer'
          : 'Active - Waiting for AI response';
      } else {
        statusSectionEl.className = 'status-section inactive';
        statusTextEl.textContent = 'Disabled - Click toggle to enable floating window';
      }

      // Update toggle
      toggleEl.className = enabled ? 'toggle-switch active' : 'toggle-switch';
      
    } else {
      showUnsupportedSite();
    }
  }

  function showUnsupportedSite() {
    loadingEl.style.display = 'none';
    mainContentEl.style.display = 'block';
    
    statusSectionEl.className = 'status-section unsupported';
    statusTextEl.textContent = 'This page is not a supported AI chat platform';
    platformInfoEl.style.display = 'none';
    
    // Disable controls
    toggleEl.style.opacity = '0.5';
    toggleEl.style.pointerEvents = 'none';
    
    
  }

  function showError(message) {
    loadingEl.style.display = 'none';
    mainContentEl.style.display = 'block';
    
    statusSectionEl.className = 'status-section inactive';
    statusTextEl.textContent = message;
    platformInfoEl.style.display = 'none';
    
    // Disable controls
    toggleEl.style.opacity = '0.5';
    toggleEl.style.pointerEvents = 'none';
  }

  // Event listeners
  toggleEl.addEventListener('click', async () => {
    if (!currentTab || !extensionStatus) return;

    try {
      const response = await chrome.tabs.sendMessage(currentTab.id, { action: 'toggle' });
      
      if (response && response.success) {
        extensionStatus.enabled = response.enabled;
        updateUI();
      } else {
        console.error('Failed to toggle extension');
      }
    } catch (error) {
      console.error('Failed to toggle extension:', error);
    }
  });





  helpLink.addEventListener('click', (e) => {
    e.preventDefault();
    showHelpDialog();
  });

  function showHelpDialog() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'help-modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    
    const helpContent = `
      <div class="help-header">
                 <h2>FloatingChat - AI History Navigator</h2>
        <button class="help-close">&times;</button>
      </div>
      <div class="help-content">
        <div class="help-section">
          <h3>🚀 FEATURES</h3>
          <ul>
            <li>Automatic platform detection for ChatGPT, Claude, Gemini, and DeepSeek</li>
            <li>Floating window that shows the latest AI response with your question</li>
            <li>Independent scrolling without affecting main chat</li>
            <li>Real-time updates during AI response generation</li>
            <li>Response navigation with previous/next buttons</li>
            <li>Draggable and resizable window</li>
            <li>Light/dark mode support</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>📝 USAGE</h3>
          <ol>
            <li>Visit any supported AI chat platform</li>
            <li>Start a conversation with the AI</li>
            <li>The floating window will automatically appear with the latest response</li>
            <li>View both your question and the AI's answer in the floating window</li>
            <li>Use previous/next buttons to navigate through conversation history</li>
            <li>Drag the window by its header to reposition</li>
            <li>Resize by dragging the corner handle</li>
            <li>Use the close button to hide the window</li>
          </ol>
        </div>

        <div class="help-section">
          <h3>🌐 SUPPORTED PLATFORMS</h3>
          <ul>
            <li><strong>ChatGPT</strong> - chatgpt.com</li>
            <li><strong>Claude</strong> - claude.ai</li>
            <li><strong>Gemini</strong> - gemini.google.com</li>
            <li><strong>DeepSeek</strong> - chat.deepseek.com</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>🔧 TROUBLESHOOTING</h3>
          <ul>
            <li>If the extension doesn't work, try refreshing the page</li>
            <li>Make sure you're on a supported platform</li>
            <li>Check that the extension is enabled in Chrome</li>
            <li>The floating window updates in real-time as AI generates responses</li>
          </ul>
        </div>

        <div class="help-section">
          <h3>📞 ABOUT</h3>
          <p><strong>Author:</strong> Simon Zeng</p>
          <p><strong>Contact:</strong> simon7108528@gmail.com</p>
          <p><strong>Source Code:</strong> <a href="https://github.com/SimonZeng7108/FloatingChat" target="_blank">GitHub Repository</a></p>
          <p><strong>Version:</strong> 1.0.0</p>
          <p>Feel free to report bugs, suggest features, or contribute to the project!</p>
        </div>
      </div>
    `;
    
    modal.innerHTML = helpContent;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Close handlers
    const closeBtn = modal.querySelector('.help-close');
    const closeModal = () => {
      document.body.removeChild(overlay);
    };
    
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    
    // Escape key handler
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.close();
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (e.target === toggleEl) {
        toggleEl.click();
      }
    }
  });

  // Auto-refresh status every 5 seconds if popup is open
  setInterval(async () => {
    if (document.visibilityState === 'visible' && currentTab) {
      try {
        await getExtensionStatus();
      } catch (error) {
        // Silently ignore errors during auto-refresh
      }
    }
  }, 5000);
}); 