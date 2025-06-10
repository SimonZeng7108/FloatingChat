// FloatingChat - AI Platform Enhancer
// Main content script for detecting platforms and managing floating answer windows

class FloatingChatManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.floatingWindow = null;
    this.isEnabled = true;
    this.lastAnswerElement = null;
    this.observers = [];
    this.windowPosition = { x: 20, y: 20 };
    this.windowSize = { width: 400, height: 500 };
    
    this.init();
  }

  detectPlatform() {
    const hostname = window.location.hostname;
    const url = window.location.href;
    
    if (hostname.includes('chatgpt.com')) {
      return 'chatgpt';
    } else if (hostname.includes('claude.ai')) {
      return 'claude';
    } else if (hostname.includes('gemini.google.com')) {
      return 'gemini';
    } else if (hostname.includes('chat.deepseek.com')) {
      return 'deepseek';
    }
    
    return null;
  }

  async init() {
    if (!this.platform) {
      console.log('FloatingChat: Unsupported platform');
      return;
    }

    console.log(`FloatingChat: Initializing for ${this.platform}`);
    
    // Load saved settings
    await this.loadSettings();
    
    // Create floating window
    this.createFloatingWindow();
    
    // Start monitoring for new answers
    this.startAnswerMonitoring();
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sendResponse);
    });
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['floatingChatEnabled', 'windowPosition', 'windowSize']);
      this.isEnabled = result.floatingChatEnabled !== false;
      this.windowPosition = result.windowPosition || this.windowPosition;
      this.windowSize = result.windowSize || this.windowSize;
    } catch (error) {
      console.log('FloatingChat: Could not load settings, using defaults');
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        floatingChatEnabled: this.isEnabled,
        windowPosition: this.windowPosition,
        windowSize: this.windowSize
      });
    } catch (error) {
      console.log('FloatingChat: Could not save settings');
    }
  }

  createFloatingWindow() {
    if (this.floatingWindow) {
      this.floatingWindow.remove();
    }

    this.floatingWindow = document.createElement('div');
    this.floatingWindow.id = 'floating-chat-window';
    this.floatingWindow.className = `floating-chat-window platform-${this.platform}`;
    
    this.floatingWindow.innerHTML = `
      <div class="floating-chat-header">
        <div class="floating-chat-title">
          <span class="platform-icon ${this.platform}"></span>
          Latest Answer
        </div>
        <div class="floating-chat-controls">
          <button class="control-btn minimize-btn" title="Minimize">−</button>
          <button class="control-btn close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="floating-chat-content">
        <div class="floating-chat-placeholder">
          Waiting for new AI response...
        </div>
      </div>
      <div class="floating-chat-resize-handle"></div>
    `;

    // Position the window
    this.floatingWindow.style.left = `${this.windowPosition.x}px`;
    this.floatingWindow.style.top = `${this.windowPosition.y}px`;
    this.floatingWindow.style.width = `${this.windowSize.width}px`;
    this.floatingWindow.style.height = `${this.windowSize.height}px`;

    // Add event listeners
    this.addWindowEventListeners();

    // Add to DOM
    document.body.appendChild(this.floatingWindow);

    // Show/hide based on settings
    if (!this.isEnabled) {
      this.floatingWindow.style.display = 'none';
    }
  }

  addWindowEventListeners() {
    const header = this.floatingWindow.querySelector('.floating-chat-header');
    const closeBtn = this.floatingWindow.querySelector('.close-btn');
    const minimizeBtn = this.floatingWindow.querySelector('.minimize-btn');
    const resizeHandle = this.floatingWindow.querySelector('.floating-chat-resize-handle');

    // Make window draggable
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.floating-chat-controls')) return;
      
      isDragging = true;
      dragOffset.x = e.clientX - this.floatingWindow.offsetLeft;
      dragOffset.y = e.clientY - this.floatingWindow.offsetTop;
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
    });

    this.handleDrag = (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep window within viewport
      const maxX = window.innerWidth - this.floatingWindow.offsetWidth;
      const maxY = window.innerHeight - this.floatingWindow.offsetHeight;
      
      this.windowPosition.x = Math.max(0, Math.min(newX, maxX));
      this.windowPosition.y = Math.max(0, Math.min(newY, maxY));
      
      this.floatingWindow.style.left = `${this.windowPosition.x}px`;
      this.floatingWindow.style.top = `${this.windowPosition.y}px`;
    };

    this.handleDragEnd = () => {
      isDragging = false;
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.handleDragEnd);
      this.saveSettings();
    };

    // Close button
    closeBtn.addEventListener('click', () => {
      this.isEnabled = false;
      this.floatingWindow.style.display = 'none';
      this.saveSettings();
    });

    // Minimize button
    let isMinimized = false;
    minimizeBtn.addEventListener('click', () => {
      const content = this.floatingWindow.querySelector('.floating-chat-content');
      isMinimized = !isMinimized;
      
      if (isMinimized) {
        content.style.display = 'none';
        this.floatingWindow.style.height = '40px';
        minimizeBtn.textContent = '+';
        minimizeBtn.title = 'Restore';
      } else {
        content.style.display = 'block';
        this.floatingWindow.style.height = `${this.windowSize.height}px`;
        minimizeBtn.textContent = '−';
        minimizeBtn.title = 'Minimize';
      }
    });

    // Make window resizable
    let isResizing = false;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      document.addEventListener('mousemove', this.handleResize);
      document.addEventListener('mouseup', this.handleResizeEnd);
      e.preventDefault();
    });

    this.handleResize = (e) => {
      if (!isResizing) return;
      
      const rect = this.floatingWindow.getBoundingClientRect();
      const newWidth = Math.max(250, e.clientX - rect.left);
      const newHeight = Math.max(200, e.clientY - rect.top);
      
      this.windowSize.width = newWidth;
      this.windowSize.height = newHeight;
      
      this.floatingWindow.style.width = `${newWidth}px`;
      this.floatingWindow.style.height = `${newHeight}px`;
    };

    this.handleResizeEnd = () => {
      isResizing = false;
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.handleResizeEnd);
      this.saveSettings();
    };
  }

  startAnswerMonitoring() {
    const selectors = this.getAnswerSelectors();
    
    if (!selectors) {
      console.log('FloatingChat: No selectors found for platform');
      return;
    }

    console.log(`FloatingChat: Starting answer monitoring for ${this.platform}`);

    // Create observer for new answers
    const observer = new MutationObserver((mutations) => {
      this.checkForNewAnswers(mutations);
    });

    // Try multiple container selectors
    let chatContainer = null;
    const containerSelectors = selectors.container.split(', ');
    
    for (const selector of containerSelectors) {
      try {
        const found = document.querySelector(selector.trim());
        if (found) {
          chatContainer = found;
          console.log(`FloatingChat: Found container with selector: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`FloatingChat: Invalid container selector ${selector}`, error);
      }
    }

    // Fallback to document.body if no container found
    if (!chatContainer) {
      chatContainer = document.body;
      console.log('FloatingChat: Using document.body as fallback container');
    }

    if (chatContainer) {
      observer.observe(chatContainer, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['class', 'data-testid']
      });
      this.observers.push(observer);
      console.log(`FloatingChat: Monitoring ${chatContainer.tagName}.${chatContainer.className} for changes`);
    }

    // Check for existing answers on load with multiple attempts
    const initialChecks = [500, 1000, 2000, 3000];
    initialChecks.forEach(delay => {
      setTimeout(() => {
        console.log(`FloatingChat: Initial check at ${delay}ms`);
        this.findLatestAnswer();
      }, delay);
    });
    
    // More frequent monitoring for platforms that might need it
    const monitoringInterval = (this.platform === 'claude' || this.platform === 'deepseek') ? 3000 : 5000;
    setInterval(() => {
      this.findLatestAnswer();
    }, monitoringInterval);
  }

  getAnswerSelectors() {
    const selectors = {
      chatgpt: {
        container: 'main',
        answer: '[data-message-author-role="assistant"]',
        content: '.markdown, .prose, [data-message-author-role="assistant"] > div > div'
      },
      claude: {
        container: 'main, [data-testid="conversation"]',
        answer: '.font-claude-message, [data-testid="message"]:not([data-testid="user-message"])',
        content: '.font-claude-message, .prose, [data-testid="message"] div'
      },
      gemini: {
        container: '.conversation, main, chat-window',
        answer: '.model-response, .response-container, [data-response-id], .assistant-response',
        content: '.model-response-text, .markdown, .response-content, .message-content'
      },
      deepseek: {
        container: '._8f60047, ._0f72b0b, .chat-container, main',
        answer: '._4f9bf79, .dad65929, ._7eb2358, [class*="assistant"]',
        content: '.ds-markdown, ._7eb2358, .ds-markdown-paragraph, .message-content'
      }
    };

    return selectors[this.platform];
  }

  checkForNewAnswers(mutations) {
    // Debounce rapid changes
    clearTimeout(this.checkTimeout);
    this.checkTimeout = setTimeout(() => {
      this.findLatestAnswer();
    }, 500);
  }

  findLatestAnswer() {
    const selectors = this.getAnswerSelectors();
    if (!selectors) return;

    console.log(`FloatingChat: Looking for answers on ${this.platform}`, selectors);

    // Try multiple selector patterns for answers
    let answers = [];
    const answerSelectors = selectors.answer.split(', ');
    
    for (const selector of answerSelectors) {
      try {
        const found = document.querySelectorAll(selector.trim());
        console.log(`FloatingChat: Selector "${selector}" found ${found.length} elements`);
        if (found.length > 0) {
          answers = Array.from(found);
          console.log(`FloatingChat: Using selector "${selector}" with ${answers.length} answers`);
          break;
        }
      } catch (error) {
        console.log(`FloatingChat: Invalid selector ${selector}`, error);
      }
    }
    
    // Platform-specific fallback searches
    if (answers.length === 0) {
      console.log(`FloatingChat: No answers found with primary selectors, trying fallbacks`);
      
      if (this.platform === 'claude') {
        // Claude-specific fallbacks
        const claudeFallbacks = [
          '[class*="font-claude"]',
          '[data-testid*="message"]',
          '.prose',
          '[role="group"]'
        ];
        
        for (const fallback of claudeFallbacks) {
          try {
            const found = document.querySelectorAll(fallback);
            console.log(`FloatingChat: Claude fallback "${fallback}" found ${found.length} elements`);
            if (found.length > 0) {
              // Filter to exclude user messages
              answers = Array.from(found).filter(el => 
                !el.hasAttribute('data-testid') || 
                el.getAttribute('data-testid') !== 'user-message'
              );
              if (answers.length > 0) break;
            }
          } catch (error) {
            continue;
          }
        }
      } else if (this.platform === 'deepseek') {
        // DeepSeek-specific fallbacks
        const deepSeekFallbacks = [
          '.ds-markdown',
          '._7eb2358',
          '._4f9bf79',
          '.dad65929',
          '[class*="markdown"]'
        ];
        
        for (const fallback of deepSeekFallbacks) {
          try {
            const found = document.querySelectorAll(fallback);
            console.log(`FloatingChat: DeepSeek fallback "${fallback}" found ${found.length} elements`);
            if (found.length > 0) {
              answers = Array.from(found);
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }
      
      // Generic fallbacks for all platforms
      if (answers.length === 0) {
        const genericFallbacks = [
          '[class*="assistant"]',
          '[class*="ai"]',
          '[class*="response"]',
          '[data-role="assistant"]',
          '[role="assistant"]',
          '[class*="message"]:not([class*="user"])'
        ];
        
        for (const fallback of genericFallbacks) {
          try {
            const found = document.querySelectorAll(fallback);
            console.log(`FloatingChat: Generic fallback "${fallback}" found ${found.length} elements`);
            if (found.length > 0) {
              answers = Array.from(found);
              break;
            }
          } catch (error) {
            continue;
          }
        }
      }
    }

    if (answers.length === 0) {
      console.log('FloatingChat: No answers found with any selector');
      return;
    }

    // Get the latest answer (filter out empty ones)
    const validAnswers = answers.filter(answer => {
      const text = answer.textContent?.trim();
      return text && text.length > 10; // Must have meaningful content
    });

    if (validAnswers.length === 0) {
      console.log('FloatingChat: No valid answers with content found');
      return;
    }

    const latestAnswer = validAnswers[validAnswers.length - 1];
    console.log(`FloatingChat: Latest answer found:`, latestAnswer);
    
    // Check if this is a new answer
    if (latestAnswer !== this.lastAnswerElement) {
      console.log(`FloatingChat: New answer detected, updating floating window`);
      this.lastAnswerElement = latestAnswer;
      this.updateFloatingWindow(latestAnswer);
    } else {
      console.log(`FloatingChat: Same answer as before, no update needed`);
    }
  }

  updateFloatingWindow(answerElement) {
    if (!this.floatingWindow || !this.isEnabled) return;

    console.log(`FloatingChat: Updating floating window with element:`, answerElement);

    const content = this.floatingWindow.querySelector('.floating-chat-content');
    
    // Try to find the best content within the answer element
    let answerContent = null;
    const selectors = this.getAnswerSelectors();
    
    if (selectors && selectors.content) {
      const contentSelectors = selectors.content.split(', ');
      
      for (const selector of contentSelectors) {
        try {
          const found = answerElement.querySelector(selector.trim());
          console.log(`FloatingChat: Content selector "${selector}" found:`, found);
          if (found && found.textContent.trim().length > 0) {
            answerContent = found;
            break;
          }
        } catch (error) {
          console.log(`FloatingChat: Error with content selector "${selector}":`, error);
          continue;
        }
      }
    }
    
    // Platform-specific content extraction
    if (!answerContent) {
      console.log(`FloatingChat: No content found with selectors, trying platform-specific extraction`);
      
      if (this.platform === 'claude') {
        // Look for Claude-specific content patterns
        const claudeContentSelectors = [
          '.font-claude-message',
          '.prose',
          '[data-testid="message"] > div > div',
          'div'
        ];
        
        for (const selector of claudeContentSelectors) {
          const found = answerElement.querySelector(selector);
          if (found && found.textContent.trim().length > 10) {
            answerContent = found;
            break;
          }
        }
      } else if (this.platform === 'deepseek') {
        // Look for DeepSeek-specific content patterns
        const deepSeekContentSelectors = [
          '.ds-markdown',
          '.ds-markdown-paragraph',
          '._7eb2358 svg + div',
          'div[class*="markdown"]',
          'div'
        ];
        
        for (const selector of deepSeekContentSelectors) {
          const found = answerElement.querySelector(selector);
          if (found && found.textContent.trim().length > 10) {
            answerContent = found;
            break;
          }
        }
      }
    }
    
    // Fallback to the entire element if no specific content found
    if (!answerContent) {
      console.log(`FloatingChat: Using entire element as content`);
      answerContent = answerElement;
    }
    
    console.log(`FloatingChat: Final content to display:`, answerContent);
    
    const clonedContent = answerContent.cloneNode(true);
    
    // Clean up the cloned content
    this.cleanupClonedContent(clonedContent);
    
    // Update the floating window
    content.innerHTML = '';
    content.appendChild(clonedContent);
    
    // Scroll to top of new content
    content.scrollTop = 0;
    
    // Add visual feedback
    this.floatingWindow.classList.add('new-content');
    setTimeout(() => {
      this.floatingWindow.classList.remove('new-content');
    }, 1000);
    
    console.log(`FloatingChat: Floating window updated successfully`);
  }

  cleanupClonedContent(element) {
    // Remove any absolute positioning
    element.style.position = 'relative';
    
    // Remove interactive elements that might interfere
    const buttonsToRemove = element.querySelectorAll('button, .copy-button, .edit-button');
    buttonsToRemove.forEach(btn => btn.remove());
    
    // Ensure proper styling for floating window
    element.classList.add('floating-content');
  }

  handleMessage(request, sendResponse) {
    switch (request.action) {
      case 'toggle':
        this.toggleWindow();
        sendResponse({ success: true, enabled: this.isEnabled });
        break;
      case 'getStatus':
        sendResponse({ 
          enabled: this.isEnabled, 
          platform: this.platform,
          hasAnswer: !!this.lastAnswerElement
        });
        break;
    }
  }

  toggleWindow() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      if (!this.floatingWindow) {
        this.createFloatingWindow();
      } else {
        this.floatingWindow.style.display = 'block';
      }
      
      // Refresh content if we have an answer
      if (this.lastAnswerElement) {
        this.updateFloatingWindow(this.lastAnswerElement);
      }
    } else {
      if (this.floatingWindow) {
        this.floatingWindow.style.display = 'none';
      }
    }
    
    this.saveSettings();
  }

  destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Remove floating window
    if (this.floatingWindow) {
      this.floatingWindow.remove();
      this.floatingWindow = null;
    }
  }
}

// Initialize the extension
let floatingChatManager = null;

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}

function initializeExtension() {
  // Clean up any existing instance
  if (floatingChatManager) {
    floatingChatManager.destroy();
  }
  
  // Create new instance
  floatingChatManager = new FloatingChatManager();
}

// Handle page navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    setTimeout(initializeExtension, 1000); // Reinitialize after navigation
  }
}).observe(document, { subtree: true, childList: true }); 