// FloatingChat - AI Platform Enhancer
// Main content script for detecting platforms and managing floating answer windows

class FloatingChatManager {
  constructor() {
    this.platform = this.detectPlatform();
    this.floatingWindow = null;
    this.isEnabled = true;
    this.lastAnswerElement = null;
    this.lastAnswerContent = '';
    this.lastAnswerHTML = '';
    this.observers = [];
    this.windowPosition = { x: 20, y: 20 };
    this.windowSize = { width: 500, height: 650 };
    
    // Enhanced floating window state
    this.responses = []; // Store all responses
    this.currentResponseIndex = -1;
    this.contentObserver = null;
    this.contentUpdateTimeout = null;
    this.fastMonitoringTimer = null;
    this.generationMonitoringTimer = null;
    this.elementPollingTimer = null;
    this.debugMode = false; // Set to true for detailed logging
    this.windowCreated = false; // Track if window has been created
    this.geminiUpdateTimeout = null; // Special timeout for Gemini updates
    this.claudeUpdateTimeout = null; // Special timeout for Claude research mode
    this.chatgptUpdateTimeout = null; // Special timeout for ChatGPT streaming
    this.lastValidationTime = 0; // Track validation frequency
    this.saveSettingsTimeout = null; // Debounce settings saves
    this.historyCheckTimer = null; // Timer for checking missed responses
    
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
    
    // Clear any invalid stored responses from previous sessions
    this.clearInvalidResponses();
    
    // Remove any duplicate windows from previous sessions
    this.removeDuplicateWindows();
    
    // Create floating window only if enabled
    if (this.isEnabled) {
      this.createFloatingWindow();
    }
    
    // Start monitoring for new answers
    this.startAnswerMonitoring();
    
    console.log('FloatingChat: Manager initialized successfully');
  }

  // Clear invalid responses on initialization
  clearInvalidResponses() {
    if (this.responses.length === 0) return;
    
    console.log(`FloatingChat: Clearing ${this.responses.length} old responses from previous session`);
    this.responses = [];
    this.currentResponseIndex = -1;
    this.lastValidationTime = Date.now(); // Reset validation timer
  }

  // Remove any duplicate floating windows
  removeDuplicateWindows() {
    const windows = document.querySelectorAll('#floating-chat-window, .floating-chat-window');
    if (windows.length > 1) {
      console.log(`FloatingChat: Found ${windows.length} floating windows, removing duplicates`);
      
      // Keep the first one that matches our reference, remove others
      let keptWindow = null;
      windows.forEach((window, index) => {
        if (window === this.floatingWindow && !keptWindow) {
          keptWindow = window;
          console.log(`FloatingChat: Keeping window ${index} (our reference)`);
        } else if (!keptWindow && index === 0) {
          keptWindow = window;
          this.floatingWindow = window; // Update our reference
          console.log(`FloatingChat: Keeping window ${index} (first found)`);
        } else {
          console.log(`FloatingChat: Removing duplicate window ${index}`);
          window.remove();
        }
      });
    }
  }

  // Check if floating window is properly attached and visible
  isFloatingWindowValid() {
    return this.floatingWindow && 
           document.contains(this.floatingWindow) && 
           this.floatingWindow.parentNode === document.body;
  }

  // Ensure floating window exists and is properly positioned
  ensureFloatingWindow() {
    if (!this.isEnabled) return;
    
    // Check if there's already a window in the DOM that we might have lost reference to
    const existingWindow = document.getElementById('floating-chat-window');
    if (existingWindow && !this.floatingWindow) {
      console.log('FloatingChat: Found existing window, reusing it');
      this.floatingWindow = existingWindow;
      return;
    }
    
    // Only create if we truly don't have a valid window
    if (!this.isFloatingWindowValid()) {
      // Throttle window creation to prevent rapid recreation during answer generation
      const now = Date.now();
      if (this.lastWindowCreationTime && now - this.lastWindowCreationTime < 1000) {
        console.log('FloatingChat: Throttling window creation (created recently)');
        return;
      }
      
      console.log('FloatingChat: Floating window invalid, recreating...');
      this.createFloatingWindow();
    }
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
    // Prevent multiple windows - check if one already exists in DOM
    const existingWindow = document.getElementById('floating-chat-window');
    if (existingWindow && existingWindow !== this.floatingWindow) {
      console.log('FloatingChat: Removing duplicate floating window');
      existingWindow.remove();
    }
    
    // If we already have a valid window, don't create another
    if (this.isFloatingWindowValid()) {
      console.log('FloatingChat: Window already exists and is valid, skipping creation');
      return;
    }
    
    // Preserve current position if window exists
    let currentPosition = this.windowPosition;
    let currentSize = this.windowSize;
    
    if (this.floatingWindow) {
      // Save current position and size before removing
      const rect = this.floatingWindow.getBoundingClientRect();
      currentPosition = { x: rect.left, y: rect.top };
      currentSize = { width: rect.width, height: rect.height };
      
      console.log('FloatingChat: Preserving window position:', currentPosition, 'size:', currentSize);
      
      this.floatingWindow.remove();
    }
    
    // Update stored position and size
    this.windowPosition = currentPosition;
    this.windowSize = currentSize;

    this.floatingWindow = document.createElement('div');
    this.floatingWindow.id = 'floating-chat-window';
    this.floatingWindow.className = `floating-chat-window platform-${this.platform}`;
    
    this.floatingWindow.innerHTML = `
      <div class="floating-chat-header">
        <div class="floating-chat-title">
          <span class="platform-icon ${this.platform}"></span>
          <span class="title-text">FloatingChat</span>
        </div>
        <div class="floating-chat-controls">
          <div class="navigation-controls">
            <button class="control-btn prev-btn" title="Previous Response">◀</button>
            <span class="response-counter">0/0</span>
            <button class="control-btn next-btn" title="Next Response">▶</button>
          </div>
          <div class="window-controls">
          <button class="control-btn close-btn" title="Close">×</button>
          </div>
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
    console.log('FloatingChat: Setting window position to:', this.windowPosition, 'size:', this.windowSize);
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
    
    this.windowCreated = true;
    this.lastWindowCreationTime = Date.now();
    console.log('FloatingChat: Floating window created successfully at position:', this.windowPosition);
  }

  addWindowEventListeners() {
    const header = this.floatingWindow.querySelector('.floating-chat-header');
    const closeBtn = this.floatingWindow.querySelector('.close-btn');
    const resizeHandle = this.floatingWindow.querySelector('.floating-chat-resize-handle');
    
    // Navigation controls
    const prevBtn = this.floatingWindow.querySelector('.prev-btn');
    const nextBtn = this.floatingWindow.querySelector('.next-btn');

    // Check if required elements exist
    if (!header || !closeBtn || !resizeHandle || !prevBtn || !nextBtn) {
      console.error('FloatingChat: Missing required UI elements for event listeners');
      return;
    }

    // Make window draggable with optimized performance
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    let dragAnimationFrame = null;
    let pendingDragUpdate = false;

    header.addEventListener('mousedown', (e) => {
      if (e.target.closest('.floating-chat-controls')) return;
      
      isDragging = true;
      dragOffset.x = e.clientX - this.floatingWindow.offsetLeft;
      dragOffset.y = e.clientY - this.floatingWindow.offsetTop;
      
      // Add dragging class for visual feedback
      this.floatingWindow.classList.add('dragging');
      
      document.addEventListener('mousemove', this.handleDrag);
      document.addEventListener('mouseup', this.handleDragEnd);
      
      e.preventDefault(); // Prevent text selection during drag
    });

    this.handleDrag = (e) => {
      if (!isDragging) return;
      
      // Use requestAnimationFrame to throttle updates for smooth performance
      if (!pendingDragUpdate) {
        pendingDragUpdate = true;
        dragAnimationFrame = requestAnimationFrame(() => {
          const newX = e.clientX - dragOffset.x;
          const newY = e.clientY - dragOffset.y;
          
          // Cache viewport dimensions to avoid recalculating
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const windowWidth = this.floatingWindow.offsetWidth;
          const windowHeight = this.floatingWindow.offsetHeight;
          
          // Keep window within viewport with minimal calculations
          const constrainedX = Math.max(0, Math.min(newX, viewportWidth - windowWidth));
          const constrainedY = Math.max(0, Math.min(newY, viewportHeight - windowHeight));
          
          // Use transform for better performance than left/top
          this.floatingWindow.style.transform = `translate(${constrainedX}px, ${constrainedY}px)`;
          
          // Store position for later saving
          this.windowPosition.x = constrainedX;
          this.windowPosition.y = constrainedY;
          
          pendingDragUpdate = false;
        });
      }
    };

    this.handleDragEnd = () => {
      isDragging = false;
      pendingDragUpdate = false;
      
      if (dragAnimationFrame) {
        cancelAnimationFrame(dragAnimationFrame);
        dragAnimationFrame = null;
      }
      
      // Remove dragging class
      this.floatingWindow.classList.remove('dragging');
      
      // Convert transform back to left/top for consistency
      this.floatingWindow.style.left = `${this.windowPosition.x}px`;
      this.floatingWindow.style.top = `${this.windowPosition.y}px`;
      this.floatingWindow.style.transform = '';
      
      document.removeEventListener('mousemove', this.handleDrag);
      document.removeEventListener('mouseup', this.handleDragEnd);
      
      // Debounce settings save to avoid excessive writes
      if (this.saveSettingsTimeout) {
        clearTimeout(this.saveSettingsTimeout);
      }
      this.saveSettingsTimeout = setTimeout(() => {
        this.saveSettings();
      }, 500); // Save settings 500ms after drag ends
    };

    // Close button
    closeBtn.addEventListener('click', () => {
      this.isEnabled = false;
      this.floatingWindow.style.display = 'none';
      this.saveSettings();
    });

    // Make window resizable with optimized performance
    let isResizing = false;
    let resizeAnimationFrame = null;
    let pendingResizeUpdate = false;
    
    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      
      // Add resizing class for visual feedback
      this.floatingWindow.classList.add('resizing');
      
      document.addEventListener('mousemove', this.handleResize);
      document.addEventListener('mouseup', this.handleResizeEnd);
      e.preventDefault();
    });

    this.handleResize = (e) => {
      if (!isResizing) return;
      
      // Use requestAnimationFrame to throttle updates
      if (!pendingResizeUpdate) {
        pendingResizeUpdate = true;
        resizeAnimationFrame = requestAnimationFrame(() => {
          const rect = this.floatingWindow.getBoundingClientRect();
          const newWidth = Math.max(250, e.clientX - rect.left);
          const newHeight = Math.max(200, e.clientY - rect.top);
          
          this.windowSize.width = newWidth;
          this.windowSize.height = newHeight;
          
          this.floatingWindow.style.width = `${newWidth}px`;
          this.floatingWindow.style.height = `${newHeight}px`;
          
          pendingResizeUpdate = false;
        });
      }
    };

    this.handleResizeEnd = () => {
      isResizing = false;
      pendingResizeUpdate = false;
      
      if (resizeAnimationFrame) {
        cancelAnimationFrame(resizeAnimationFrame);
        resizeAnimationFrame = null;
      }
      
      // Remove resizing class
      this.floatingWindow.classList.remove('resizing');
      
      document.removeEventListener('mousemove', this.handleResize);
      document.removeEventListener('mouseup', this.handleResizeEnd);
      
      // Debounce settings save
      if (this.saveSettingsTimeout) {
        clearTimeout(this.saveSettingsTimeout);
      }
      this.saveSettingsTimeout = setTimeout(() => {
        this.saveSettings();
      }, 500);
    };

    // Navigation control handlers
    prevBtn.addEventListener('click', () => {
      if (this.currentResponseIndex > 0) {
        this.navigateToResponse(this.currentResponseIndex - 1);
      }
    });

    nextBtn.addEventListener('click', () => {
      if (this.currentResponseIndex < this.responses.length - 1) {
        this.navigateToResponse(this.currentResponseIndex + 1);
      }
    });
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

      // Track this observer for cleanup
      this.observers.push(observer);


    }

    // Check for existing answers on load with multiple attempts
    const initialChecks = [500, 1000, 2000, 3000];
    initialChecks.forEach(delay => {
      setTimeout(() => {
        console.log(`FloatingChat: Initial check at ${delay}ms`);
        this.findLatestAnswer();
      }, delay);
    });
    
    // Multiple monitoring strategies for reliable updates
    
    // Strategy 1: Frequent polling for content changes
    const fastMonitoringInterval = 500; // Check every 500ms for fast updates
    this.fastMonitoringTimer = setInterval(() => {
      this.findLatestAnswer();
    }, fastMonitoringInterval);
    
    // Strategy 2: Very frequent polling when actively generating
    this.generationMonitoringTimer = setInterval(() => {
      this.checkForActiveGeneration();
    }, 200); // Check every 200ms during generation
    
    // Strategy 3: Periodic cleanup of duplicate windows
    this.cleanupTimer = setInterval(() => {
      this.removeDuplicateWindows();
    }, 5000); // Check every 5 seconds
    
    // Strategy 4: Periodic history checking for ChatGPT and Gemini
    this.historyCheckTimer = setInterval(() => {
      if (this.platform === 'chatgpt' && !this.isNewChatGPTChat()) {
        this.checkForMissedChatGPTResponses();
      } else if (this.platform === 'gemini') {
        this.checkForMissedGeminiResponses();
      }
    }, 3000); // Check every 3 seconds for missed responses
  }

  // Check for active generation and force updates
  checkForActiveGeneration() {
    if (!this.lastAnswerElement) return;
    
    const currentContent = this.lastAnswerElement.textContent || '';
    
    // Check if content has changed since last check
    if (this.lastAnswerContent !== currentContent) {
      if (this.debugMode) {
        console.log('FloatingChat: Active generation detected - forcing update', {
          previousLength: this.lastAnswerContent.length,
          currentLength: currentContent.length,
          elementTag: this.lastAnswerElement.tagName,
          elementClasses: this.lastAnswerElement.className
        });
      }
      this.handleContentUpdate(this.lastAnswerElement);
    }
    
    // Also check for typical generation indicators
    const isGenerating = this.detectActiveGeneration();
    if (isGenerating && this.debugMode) {
      console.log('FloatingChat: Generation indicators detected, forcing thorough check');
    }
    if (isGenerating) {
      // Force a more thorough check
      this.findLatestAnswer();
    }
  }

  // Detect if AI is actively generating content
  detectActiveGeneration() {
    // Platform-specific generation indicators
    switch (this.platform) {
      case 'chatgpt':
        // Look for spinning indicators, "thinking" states, etc.
        return !!(
          document.querySelector('[data-testid*="stop"]') ||
          document.querySelector('.result-streaming') ||
          document.querySelector('[aria-label*="Stop"]') ||
          document.querySelector('[title*="Stop"]')
        );
      
      case 'claude':
        return !!(
          document.querySelector('[data-testid="stop-button"]') ||
          document.querySelector('[aria-label*="stop"]') ||
          document.querySelector('.animate-pulse')
        );
      
      case 'gemini':
        return !!(
          document.querySelector('[aria-label*="Stop"]') ||
          document.querySelector('.generating')
        );
      
      case 'deepseek':
        return !!(
          document.querySelector('[title*="Stop"]') ||
          document.querySelector('.generating')
        );
      
      default:
        return false;
    }
  }

  getAnswerSelectors() {
    const selectors = {
      chatgpt: {
        container: 'main, [role="main"], .flex.flex-col.text-sm, .h-full.w-full.flex.flex-col',
        answer: '[data-message-author-role="assistant"], .group\\/conversation-turn, [data-testid*="conversation-turn"], .agent-turn, [data-message-id], .group[data-testid]',
        content: '.markdown, .prose, [data-message-author-role="assistant"] > div > div, .whitespace-pre-wrap, .agent-turn .whitespace-pre-wrap, .prose.w-full, .whitespace-pre-wrap:not(code)'
      },
      claude: {
        container: 'main, [data-testid="conversation"], .claude-chat',
        answer: '.font-claude-message, [data-testid="message"]:not([data-testid="user-message"]), [data-message-author="assistant"], .assistant-message, [class*="assistant"], [data-role="assistant"]',
        content: '.font-claude-message, .prose, [data-testid="message"] div, .markdown, .message-content, [class*="markdown"], [class*="content"], [class*="response"]'
      },
      gemini: {
        container: '.conversation, main, chat-window, [role="main"]',
        answer: '.model-response, .response-container, [data-response-id], .assistant-response, [class*="model"], [class*="assistant"], [class*="response"]:not([class*="user"])',
        content: '.model-response-text, .markdown, .response-content, .message-content, [class*="markdown"], [class*="text"]'
      },
      deepseek: {
        container: '._8f60047, ._0f72b0b, .chat-container, main, [class*="chat"], [class*="conversation"], body',
        answer: '._4f9bf79, .dad65929, ._7eb2358, [class*="assistant"], [class*="ai"], [class*="response"], [class*="model"], [data-role="assistant"], [role="assistant"], div[class*="message"]:has([class*="assistant"]), div[class*="message"]:has([class*="ai"])',
        content: '.ds-markdown, ._7eb2358, .ds-markdown-paragraph, .message-content, [class*="markdown"], [class*="content"], [class*="text"], div p, div div'
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

  // Helper method to detect if ChatGPT content is recent/active
  isRecentChatGPTContent(element) {
    // If ChatGPT is actively generating, always allow the content
    if (this.isChatGPTGenerating()) {
      console.log('FloatingChat: ChatGPT is generating, allowing content');
      return true;
    }
    
    // Check if we're in a new/empty chat
    const isNewChat = this.isNewChatGPTChat();
    if (isNewChat) {
      // In a new chat, be more permissive - allow any content that exists
      return element.textContent && element.textContent.trim().length > 0;
    }
    
    // For existing chats, check if this element appears to be current
    // Look for indicators that this is the active conversation
    const parentTurn = element.closest('[data-message-id], .group\\/conversation-turn, [data-testid*="conversation-turn"]');
    if (!parentTurn) return true; // If we can't determine, allow it
    
    // Check if this is the last message in the conversation
    const allTurns = document.querySelectorAll('[data-message-id], .group\\/conversation-turn, [data-testid*="conversation-turn"]');
    const isLastTurn = allTurns.length > 0 && parentTurn === allTurns[allTurns.length - 1];
    
    return isLastTurn;
  }

  // Check if we're in a new ChatGPT chat
  isNewChatGPTChat() {
    // Check if URL indicates a new chat
    const isNewChatUrl = window.location.pathname === '/' || window.location.pathname === '/c/new';
    
    // Look for indicators of a new chat
    const hasWelcomeMessage = document.querySelector('[class*="welcome"], [class*="intro"], [class*="empty"]');
    const hasNoUserMessages = document.querySelectorAll('[data-message-author-role="user"]').length === 0;
    const hasNoAssistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]').length === 0;
    
    // Additional check: if we have stored responses but no messages in DOM, it might be a page reload
    const hasStoredResponses = this.responses.length > 0;
    
    // Be more conservative about clearing responses
    // Only consider it a new chat if:
    // 1. URL indicates new chat AND
    // 2. No conversation history in DOM AND
    // 3. Either we have no stored responses OR we see welcome message
    const isNewChat = isNewChatUrl && 
                     (hasNoUserMessages && hasNoAssistantMessages) && 
                     (!hasStoredResponses || hasWelcomeMessage);
    
    if (isNewChat) {
      console.log('FloatingChat: New ChatGPT chat detected via:', {
        newUrl: isNewChatUrl,
        welcome: !!hasWelcomeMessage,
        noUser: hasNoUserMessages,
        noAssistant: hasNoAssistantMessages,
        hasStoredResponses: hasStoredResponses
      });
    }
    
    return isNewChat;
  }

  // Check if ChatGPT is currently generating
  isChatGPTGenerating() {
    // Primary indicators - most reliable
    const hasStopButton = document.querySelector('[data-testid="stop-button"], [aria-label*="Stop"], button[title*="Stop"]');
    
    // Check for disabled send button (reliable indicator)
    const sendButton = document.querySelector('button[data-testid="send-button"], [aria-label*="Send"], button[type="submit"]');
    const isSendDisabled = sendButton && (sendButton.disabled || sendButton.hasAttribute('disabled'));
    
    // Look for streaming cursor or partial content indicators
    const hasStreamingIndicator = document.querySelector('[class*="result-streaming"], [class*="streaming"], .cursor-blink');
    
    // Check for regenerate button being disabled (indicates active generation)
    const regenerateButton = document.querySelector('[aria-label*="Regenerate"], button[title*="Regenerate"]');
    const isRegenerateDisabled = regenerateButton && (regenerateButton.disabled || regenerateButton.hasAttribute('disabled'));
    
    // Additional indicators
    const hasTypingIndicator = document.querySelector('[class*="typing"], [class*="generating"], [class*="loading"]');
    const hasThinkingIndicator = document.querySelector('[class*="thinking"], [aria-label*="thinking"]');
    const hasProgressIndicator = document.querySelector('[role="progressbar"], .progress, [class*="progress"]');
    
    // Check for partial/incomplete responses (text ending abruptly without punctuation)
    let hasPartialContent = false;
    if (this.lastAnswerElement) {
      const content = this.lastAnswerElement.textContent || '';
      const endsAbruptly = content.length > 20 && !content.trim().match(/[.!?]$/);
      const hasStreamingCursor = this.lastAnswerElement.querySelector('.cursor-blink, [class*="cursor"]');
      hasPartialContent = endsAbruptly || !!hasStreamingCursor;
    }
    
    // Primary indicators are most reliable
    const isGenerating = hasStopButton || isSendDisabled || hasStreamingIndicator || 
                        isRegenerateDisabled || hasPartialContent ||
                        hasTypingIndicator || hasThinkingIndicator || hasProgressIndicator;
    
    if (isGenerating) {
      console.log('FloatingChat: ChatGPT generation detected via:', {
        stopButton: !!hasStopButton,
        sendDisabled: !!isSendDisabled,
        streaming: !!hasStreamingIndicator,
        regenerateDisabled: !!isRegenerateDisabled,
        partialContent: !!hasPartialContent,
        typing: !!hasTypingIndicator,
        thinking: !!hasThinkingIndicator,
        progress: !!hasProgressIndicator
      });
    }
    
    return isGenerating;
  }



  // Check for missed ChatGPT responses in the conversation
  // Attempt to recover responses from current page content
  attemptResponseRecovery() {
    console.log('FloatingChat: Attempting response recovery...');
    
    try {
      if (this.platform === 'chatgpt') {
        // Force check for missed ChatGPT responses
        this.checkForMissedChatGPTResponses();
      } else if (this.platform === 'gemini') {
        // Force check for missed Gemini responses
        this.checkForMissedGeminiResponses();
      } else {
        // For other platforms, try to find any answer elements
        const latestAnswer = this.findLatestAnswer();
        if (latestAnswer) {
          console.log('FloatingChat: Found answer element during recovery');
          this.storeNewResponse(latestAnswer);
        }
      }
      
      // If we still have no responses, try a more aggressive search
      if (this.responses.length === 0) {
        const selectors = this.getAnswerSelectors();
        if (selectors && selectors.answer) {
          const answerSelectors = selectors.answer.split(', ');
          for (const selector of answerSelectors) {
            try {
              const elements = document.querySelectorAll(selector.trim());
              if (elements.length > 0) {
                console.log(`FloatingChat: Recovery found ${elements.length} elements with selector: ${selector}`);
                
                // Store the most recent element
                const latestElement = elements[elements.length - 1];
                if (latestElement.textContent && latestElement.textContent.trim().length > 10) {
                  this.storeNewResponse(latestElement);
                  break;
                }
              }
            } catch (error) {
              continue;
            }
          }
        }
      }
      
      console.log(`FloatingChat: Recovery complete, found ${this.responses.length} responses`);
    } catch (error) {
      console.error('FloatingChat: Error during response recovery:', error);
    }
  }

  checkForMissedGeminiResponses() {
    try {
      // Get all Gemini response elements
      const geminiSelectors = [
        '.model-response',
        '.response-container',
        '[data-response-id]',
        '.assistant-response',
        '[class*="model"]:not([class*="user"])',
        '[class*="assistant"]',
        '[class*="response"]:not([class*="user"])'
      ];
      
      let allResponses = [];
      for (const selector of geminiSelectors) {
        try {
          const found = document.querySelectorAll(selector);
          if (found.length > 0) {
            allResponses = Array.from(found).filter(el => {
              const text = el.textContent.trim();
              return text.length > 10 && 
                     text.toLowerCase() !== 'just a second...' &&
                     text.toLowerCase() !== 'just a second…' &&
                     text.toLowerCase() !== 'just a second';
            });
            break;
          }
        } catch (error) {
          continue;
        }
      }
      
      if (allResponses.length === 0) return;
      
      console.log(`FloatingChat: Found ${allResponses.length} Gemini responses, have ${this.responses.length} stored`);
      
      // Add any missing responses
      if (allResponses.length > this.responses.length) {
        console.log('FloatingChat: Found missed Gemini responses, adding them to history');
        
        // Start from the number of responses we already have
        for (let i = this.responses.length; i < allResponses.length; i++) {
          const responseElement = allResponses[i];
          const responseText = responseElement.textContent.trim();
          
          // Check if we already have this response stored
          const alreadyStored = this.responses.some(r => 
            r.answerElement === responseElement ||
            (r.initialContent && this.calculateContentSimilarity(r.initialContent, responseText) > 0.8)
          );
          
          if (!alreadyStored && responseText.length > 10) {
            const responseData = {
              answerElement: responseElement,
              questionElement: this.findCorrespondingQuestion(responseElement),
              timestamp: Date.now() + i,
              content: responseText.substring(0, 100) + '...',
              index: this.responses.length,
              isComplete: this.isCompleteResponse(responseText),
              initialContent: responseText,
              isGeminiPlaceholder: false
            };
            
            this.responses.push(responseData);
            console.log(`FloatingChat: Added Gemini response ${responseData.index}: ${responseData.content}`);
          }
        }
        
        // Update current index and UI
        if (this.responses.length > 0) {
          this.currentResponseIndex = this.responses.length - 1;
          const latestResponse = this.responses[this.currentResponseIndex];
          
          this.lastAnswerElement = latestResponse.answerElement;
          this.lastAnswerContent = latestResponse.answerElement ? (latestResponse.answerElement.textContent || '') : '';
          this.lastAnswerHTML = latestResponse.answerElement ? (latestResponse.answerElement.innerHTML || '') : '';
          
          if (this.floatingWindow && this.isEnabled) {
            this.updateFloatingWindowWithQA(latestResponse);
            this.updateNavigationControls();
          }
          
          if (latestResponse.answerElement) {
            this.setupContentMonitoring(latestResponse.answerElement);
          }
        }
      }
    } catch (error) {
      console.error('FloatingChat: Error checking for missed Gemini responses:', error);
    }
  }

  checkForMissedChatGPTResponses() {
    try {
      // Get all assistant messages in the current conversation
      const allAssistantMessages = document.querySelectorAll('[data-message-author-role="assistant"]');
      
      if (allAssistantMessages.length === 0) return;
      
      console.log(`FloatingChat: Found ${allAssistantMessages.length} assistant messages, have ${this.responses.length} stored`);
      
      // Check if we have more assistant messages than stored responses
      if (allAssistantMessages.length > this.responses.length) {
        console.log('FloatingChat: Found missed ChatGPT responses, adding them to history');
        
        // Don't clear existing responses, just add the missing ones
        const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
        
        // Start from the number of responses we already have
        for (let i = this.responses.length; i < allAssistantMessages.length; i++) {
          const assistantMsg = allAssistantMessages[i];
          const correspondingUserMsg = userMessages[i] || null;
          
          if (assistantMsg.textContent && assistantMsg.textContent.trim().length > 10) {
            // Check if we already have this response stored
            const alreadyStored = this.responses.some(r => r.answerElement === assistantMsg);
            
            if (!alreadyStored) {
              const responseData = {
                answerElement: assistantMsg,
                questionElement: correspondingUserMsg,
                timestamp: Date.now() + i, // Add index to ensure unique timestamps
                content: assistantMsg.textContent.substring(0, 100) + '...',
                index: this.responses.length,
                isComplete: this.isCompleteResponse(assistantMsg.textContent),
                initialContent: assistantMsg.textContent
              };
              
              this.responses.push(responseData);
              console.log(`FloatingChat: Added ChatGPT response ${responseData.index}: ${responseData.content}`);
            }
          }
        }
        
        // Update current index to the latest response
        if (this.responses.length > 0) {
          this.currentResponseIndex = this.responses.length - 1;
          const latestResponse = this.responses[this.currentResponseIndex];
          
          // Update the tracking variables
          this.lastAnswerElement = latestResponse.answerElement;
          this.lastAnswerContent = latestResponse.answerElement ? (latestResponse.answerElement.textContent || '') : '';
          this.lastAnswerHTML = latestResponse.answerElement ? (latestResponse.answerElement.innerHTML || '') : '';
          
          // Update floating window with latest response
          if (this.floatingWindow && this.isEnabled) {
            this.updateFloatingWindowWithQA(latestResponse);
            this.updateNavigationControls();
          }
          
          // Set up monitoring for the latest response
          if (latestResponse.answerElement) {
            this.setupContentMonitoring(latestResponse.answerElement);
          }
        }
      } else if (allAssistantMessages.length < this.responses.length) {
        // We have more stored responses than DOM elements, clean up
        console.log('FloatingChat: More stored responses than DOM elements, cleaning up');
        this.responses = this.responses.filter(r => 
          r.answerElement && document.contains(r.answerElement)
        );
        
        // Update indices
        this.responses.forEach((response, index) => {
          response.index = index;
        });
        
        // Adjust current index
        if (this.currentResponseIndex >= this.responses.length) {
          this.currentResponseIndex = this.responses.length - 1;
        }
      }
    } catch (error) {
      console.error('FloatingChat: Error checking for missed ChatGPT responses:', error);
    }
  }

  findLatestAnswer() {
    const selectors = this.getAnswerSelectors();
    if (!selectors) return;

    // Check if we're in a new chat (ChatGPT-specific)
    // Only clear responses if we're confident this is truly a new chat
    if (this.platform === 'chatgpt' && this.isNewChatGPTChat() && this.responses.length > 0) {
      // Additional safety check: don't clear if window was recently created/enabled
      const timeSinceWindowCreated = this.windowCreated ? (Date.now() - (this.lastWindowCreationTime || 0)) : Infinity;
      const recentlyCreated = timeSinceWindowCreated < 5000; // Less than 5 seconds ago
      
      if (!recentlyCreated) {
        console.log('FloatingChat: New ChatGPT chat detected, clearing previous responses');
        this.responses = [];
        this.currentResponseIndex = -1;
        this.lastAnswerElement = null;
        this.lastAnswerContent = '';
        this.lastAnswerHTML = '';
        
        // Show waiting message
        if (this.floatingWindow) {
          const content = this.floatingWindow.querySelector('.floating-chat-content');
          if (content) {
            content.innerHTML = '<div class="floating-chat-placeholder">Waiting for new AI response...</div>';
          }
          this.updateNavigationControls();
        }
      } else {
        console.log('FloatingChat: Detected new chat but window was recently created, keeping responses');
      }
    }

    // For ChatGPT, check if we have multiple answers that we haven't stored yet
    if (this.platform === 'chatgpt' && !this.isNewChatGPTChat()) {
      this.checkForMissedChatGPTResponses();
    }
    
    // For Gemini, check for multiple responses
    if (this.platform === 'gemini') {
      this.checkForMissedGeminiResponses();
    }

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
      } else if (this.platform === 'gemini') {
        // Gemini-specific fallbacks
        const geminiFallbacks = [
          '[class*="model"]',
          '[class*="assistant"]',
          '[class*="response"]:not([class*="user"])',
          '[data-testid*="response"]',
          '[data-testid*="assistant"]',
          '[role="assistant"]',
          '.markdown',
          'div[class*="text"]:not([class*="user"])'
        ];
        
        for (const fallback of geminiFallbacks) {
          try {
            const found = document.querySelectorAll(fallback);
            console.log(`FloatingChat: Gemini fallback "${fallback}" found ${found.length} elements`);
            if (found.length > 0) {
              // Filter out user messages and empty elements
              answers = Array.from(found).filter(el => {
                const text = el.textContent.trim();
                const classes = el.className.toLowerCase();
                return text.length > 10 && !classes.includes('user') && !classes.includes('human');
              });
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
      const text = answer.textContent ? answer.textContent.trim() : '';
      // For Gemini, be more lenient with short initial content that might expand
      const minLength = this.platform === 'gemini' ? 5 : 10;
      
      // ChatGPT-specific filtering to avoid stale content
      if (this.platform === 'chatgpt') {
        // Check if this element is in the current conversation
        const conversationContainer = answer.closest('main, [role="main"]');
        if (!conversationContainer) return false;
        
        // Avoid detecting elements that might be from old conversations
        // Look for recent timestamp or active conversation indicators
        const hasRecentActivity = this.isRecentChatGPTContent(answer);
        if (!hasRecentActivity) return false;
      }
      
      return text && text.length > minLength; // Must have meaningful content
    });

    if (validAnswers.length === 0) {
      console.log('FloatingChat: No valid answers with content found');
      return;
    }

    const latestAnswer = validAnswers[validAnswers.length - 1];
    console.log(`FloatingChat: Latest answer found:`, latestAnswer);
    
    // Check if this is a new answer OR if content has changed
    const currentContent = latestAnswer.textContent || '';
    const hasNewAnswer = latestAnswer !== this.lastAnswerElement;
    const hasContentChanged = this.lastAnswerContent !== currentContent;
    
    if (hasNewAnswer) {
      console.log(`FloatingChat: New answer element detected, storing and updating floating window`);
      
      this.lastAnswerElement = latestAnswer;
      this.lastAnswerContent = currentContent;
      this.lastAnswerHTML = latestAnswer.innerHTML || '';
      
      const responseStored = this.storeNewResponse(latestAnswer);
      
      if (responseStored) {
        // Update floating window with latest response
        const latestResponse = this.responses[this.responses.length - 1];
        if (latestResponse) {
          this.updateFloatingWindowWithQA(latestResponse);
        } else {
          console.error('FloatingChat: Latest response is undefined after storing new response');
        }
      } else {
        console.log('FloatingChat: Response was not stored (likely placeholder), will monitor for updates');
      }
      
      // Set up real-time content monitoring for this answer regardless
      this.setupContentMonitoring(latestAnswer);
    } else if (hasContentChanged && this.lastAnswerElement) {
      console.log(`FloatingChat: Content changed in existing answer, updating floating window`);
      
      this.lastAnswerContent = currentContent;
      this.lastAnswerHTML = latestAnswer.innerHTML || '';
      
      // Update the stored response content
      if (this.responses.length > 0) {
        const latestResponse = this.responses[this.responses.length - 1];
        latestResponse.content = currentContent.substring(0, 100) + '...';
        
        // Update floating window if we're viewing the latest response
        if (this.currentResponseIndex === this.responses.length - 1 && latestResponse) {
          this.updateFloatingWindowWithQA(latestResponse);
        }
      }
    } else {
      console.log(`FloatingChat: No changes detected`);
    }
  }

  // Set up real-time content monitoring for the current answer element
  setupContentMonitoring(answerElement) {
    // Safety check for null answerElement
    if (!answerElement) {
      console.warn('FloatingChat: Cannot setup content monitoring - answerElement is null');
      return;
    }
    
    // Clean up previous content observer
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }

    // Create new observer for content changes
    this.contentObserver = new MutationObserver((mutations) => {
      let hasContentChange = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            mutation.type === 'characterData' || 
            (mutation.type === 'attributes' && mutation.attributeName === 'data-testid')) {
          hasContentChange = true;
          break;
        }
      }

      if (hasContentChange) {
        // Debounce rapid content changes
        clearTimeout(this.contentUpdateTimeout);
        this.contentUpdateTimeout = setTimeout(() => {
          this.handleContentUpdate(answerElement);
        }, 100); // Very short debounce for responsiveness
      }
    });

    // Observe the answer element for content changes with comprehensive monitoring
    this.contentObserver.observe(answerElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['data-testid', 'class', 'aria-label', 'title']
    });

    console.log('FloatingChat: Real-time content monitoring setup for current answer');
    
    // Additional polling for this specific element (very aggressive)
    if (this.elementPollingTimer) {
      clearInterval(this.elementPollingTimer);
    }
    
    // Use more frequent polling for all platforms to catch placeholder-to-complete transitions
    // More aggressive polling for platforms known to have incremental updates
    let pollingInterval = 150;
    if (this.platform === 'gemini' || this.platform === 'chatgpt') {
      pollingInterval = 100; // More frequent for ChatGPT and Gemini
    } else if (this.platform === 'claude') {
      pollingInterval = 120; // Moderate for Claude
    }
    
    this.elementPollingTimer = setInterval(() => {
      this.handleContentUpdate(answerElement);
    }, pollingInterval); // Poll every 100-150ms for this specific answer element
    
    // Additional check: If current content looks like a placeholder, use even more aggressive polling
    const currentContent = answerElement.textContent || '';
    if (this.isPlaceholderContent(currentContent)) {
      console.log('FloatingChat: Detected placeholder content, using aggressive polling (50ms)');
      
      // Clear the regular timer and use a more aggressive one
      if (this.elementPollingTimer) {
        clearInterval(this.elementPollingTimer);
      }
      
      this.elementPollingTimer = setInterval(() => {
        this.handleContentUpdate(answerElement);
      }, 50); // Very aggressive polling for placeholder content
      
      // Set a timeout to reduce polling frequency after some time
      setTimeout(() => {
        if (this.elementPollingTimer) {
          clearInterval(this.elementPollingTimer);
          // Resume normal polling
          this.elementPollingTimer = setInterval(() => {
            this.handleContentUpdate(answerElement);
          }, pollingInterval);
        }
      }, 10000); // Reduce to normal polling after 10 seconds
    }
  }

  // Handle content updates in real-time
  handleContentUpdate(answerElement) {
    if (!answerElement || !this.floatingWindow) return;
    
    const currentContent = answerElement.textContent || '';
    const currentInnerHTML = answerElement.innerHTML || '';
    
    // Special handling for Gemini placeholder flashing
    if (this.platform === 'gemini') {
      const isCurrentlyPlaceholder = currentContent.toLowerCase() === 'just a second...' || 
                                   currentContent.toLowerCase() === 'just a second…' || 
                                   currentContent.toLowerCase() === 'just a second';
      
      // If content switches back to placeholder after we had real content, ignore it
      if (isCurrentlyPlaceholder && this.lastAnswerContent && this.lastAnswerContent.length > 20) {
        console.log('FloatingChat: Ignoring Gemini placeholder flash-back, keeping previous content');
        return;
      }
      
      // If we're transitioning from placeholder to real content, mark it as significant
      const wasPlaceholder = this.lastAnswerContent && (
        this.lastAnswerContent.toLowerCase() === 'just a second...' || 
        this.lastAnswerContent.toLowerCase() === 'just a second…' || 
        this.lastAnswerContent.toLowerCase() === 'just a second'
      );
      
      if (wasPlaceholder && !isCurrentlyPlaceholder && currentContent.length > 10) {
        console.log('FloatingChat: Gemini transitioning from placeholder to real content');
      }
    }
    
    // Check both text content and HTML structure changes
    const hasTextChanged = this.lastAnswerContent !== currentContent;
    const hasStructureChanged = this.lastAnswerHTML !== currentInnerHTML;
    
    if (hasTextChanged || hasStructureChanged) {
      // Analyze the content change to determine if it's significant
      const contentAnalysis = this.analyzeContentChange(this.lastAnswerContent, currentContent);
      
      console.log('FloatingChat: Real-time content update detected', {
        textChanged: hasTextChanged,
        structureChanged: hasStructureChanged,
        contentLength: currentContent.length,
        previousLength: this.lastAnswerContent.length,
        isSignificantChange: contentAnalysis.isSignificant,
        changeType: contentAnalysis.type,
        isCompleteResponse: contentAnalysis.isComplete
      });
      
      this.lastAnswerContent = currentContent;
      this.lastAnswerHTML = currentInnerHTML;
      
      // Check if we have stored responses to update, or if we need to store this as a new response
      if (this.responses.length > 0) {
        // Validate all responses to ensure data integrity
        this.validateAllResponses();
        
        if (this.responses.length === 0) {
          console.warn('FloatingChat: No valid responses after validation, will try to store current content');
          // Try to store the current content as a new response
          const responseStored = this.storeNewResponse(answerElement);
          if (responseStored && this.responses.length > 0) {
            const newResponse = this.responses[this.responses.length - 1];
            this.updateFloatingWindowWithQA(newResponse);
          }
          return;
        }
        
        const latestResponse = this.responses[this.responses.length - 1];
        
        // Ensure the response object has all required properties
        if (!latestResponse) {
          console.error('FloatingChat: Latest response is undefined');
          return;
        }
        
        const wasComplete = latestResponse.isComplete || false; // Default to false if undefined
        const wasGeminiPlaceholder = latestResponse.isGeminiPlaceholder || false;
        
        // Special handling for Gemini placeholder replacement
        if (this.platform === 'gemini' && wasGeminiPlaceholder) {
          const isCurrentlyPlaceholder = currentContent.toLowerCase() === 'just a second...' || 
                                       currentContent.toLowerCase() === 'just a second…' || 
                                       currentContent.toLowerCase() === 'just a second';
          
          if (!isCurrentlyPlaceholder && currentContent.length > 10) {
            console.log('FloatingChat: Replacing Gemini placeholder with real content');
            latestResponse.isGeminiPlaceholder = false;
            latestResponse.initialContent = currentContent; // Update initial content
          } else if (isCurrentlyPlaceholder) {
            // Don't update if it's still a placeholder
            console.log('FloatingChat: Still showing Gemini placeholder, not updating');
            return;
          }
        }
        
        // For Gemini, check if this is the same element being updated
        if (this.platform === 'gemini' && latestResponse.answerElement === answerElement) {
          console.log('FloatingChat: Gemini - Same element update detected, updating in place');
          latestResponse.initialContent = currentContent; // Always update the full content
        }
        
        // Update response data
        latestResponse.content = currentContent.substring(0, 100) + '...';
        latestResponse.answerElement = answerElement; // Update element reference
        latestResponse.isComplete = contentAnalysis.isComplete;
        
        // Ensure questionElement exists (add if missing)
        if (!latestResponse.questionElement) {
          latestResponse.questionElement = this.findCorrespondingQuestion(answerElement);
        }
        
        // Check if this is a transition from incomplete to complete
        const nowComplete = !wasComplete && contentAnalysis.isComplete;
        if (nowComplete) {
          console.log('FloatingChat: Response transitioned from incomplete to complete');
        }
        
        // Always update floating window if we're viewing the latest response
        // But add special handling for significant content changes
        if (this.currentResponseIndex === this.responses.length - 1 || this.currentResponseIndex === -1) {
          // Platform-specific debouncing strategies
          if (this.platform === 'chatgpt') {
            // Clear any pending ChatGPT update
            if (this.chatgptUpdateTimeout) {
              clearTimeout(this.chatgptUpdateTimeout);
            }
            
            // Check if ChatGPT is currently generating
            const isGenerating = this.isChatGPTGenerating();
            
            if (isGenerating) {
              // During generation, use longer debounce to prevent flashing
              this.chatgptUpdateTimeout = setTimeout(() => {
                // Check if generation has stopped
                const stillGenerating = this.isChatGPTGenerating();
                if (!stillGenerating) {
                  // Generation finished, update with final content
                  console.log('FloatingChat: ChatGPT generation completed, updating with final content');
                  this.updateFloatingWindowWithQA(latestResponse);
                } else if (contentAnalysis.isSignificant) {
                  // Still generating but significant change, update anyway
                  console.log('FloatingChat: ChatGPT significant change during generation');
                  this.updateFloatingWindowWithQA(latestResponse);
                }
                this.chatgptUpdateTimeout = null;
              }, 800); // 800ms debounce during generation
            } else {
              // Not generating, update immediately for final result
              console.log('FloatingChat: ChatGPT not generating, immediate update');
              this.updateFloatingWindowWithQA(latestResponse);
              
              // Ensure we capture the final complete response
              if (contentAnalysis.isComplete) {
                latestResponse.isComplete = true;
                latestResponse.finalContent = currentContent;
              }
            }
          } else if (this.platform === 'gemini') {
            // Clear any pending Gemini update
            if (this.geminiUpdateTimeout) {
              clearTimeout(this.geminiUpdateTimeout);
            }
            
            // Debounce Gemini updates to prevent flashing
            this.geminiUpdateTimeout = setTimeout(() => {
              this.updateFloatingWindowWithQA(latestResponse);
              this.geminiUpdateTimeout = null;
            }, 300); // 300ms debounce for Gemini
          } else if (this.platform === 'claude') {
            // Clear any pending Claude update
            if (this.claudeUpdateTimeout) {
              clearTimeout(this.claudeUpdateTimeout);
            }
            
            // Longer debounce for Claude research mode to wait for completion
            this.claudeUpdateTimeout = setTimeout(() => {
              this.updateFloatingWindowWithQA(latestResponse);
              this.claudeUpdateTimeout = null;
            }, 1500); // 1.5s debounce for Claude research mode
          } else {
            // Immediate update for other platforms
            this.updateFloatingWindowWithQA(latestResponse);
          }
          
          // Add visual indicator for real-time updates
          let indicatorClass = 'updating';
          let indicatorDuration = 200;
          
          if (contentAnalysis.isSignificant) {
            indicatorClass = 'major-update';
            indicatorDuration = 500;
          }
          
          if (nowComplete) {
            indicatorClass = 'completed';
            indicatorDuration = 1000;
          }
          
          if (this.floatingWindow && this.floatingWindow.classList) {
            this.floatingWindow.classList.add(indicatorClass);
            setTimeout(() => {
              if (this.floatingWindow && this.floatingWindow.classList) {
                this.floatingWindow.classList.remove(indicatorClass);
              }
            }, indicatorDuration);
          }
        }
      } else {
        // No stored responses yet, try to store this content if it's substantial enough
        console.log('FloatingChat: No stored responses, attempting to store current content');
        const responseStored = this.storeNewResponse(answerElement);
        if (responseStored && this.responses.length > 0) {
          const newResponse = this.responses[this.responses.length - 1];
          this.updateFloatingWindowWithQA(newResponse);
          
          // Add completion indicator if this is a complete response
          if (contentAnalysis.isComplete && this.floatingWindow && this.floatingWindow.classList) {
            this.floatingWindow.classList.add('completed');
            setTimeout(() => {
              if (this.floatingWindow && this.floatingWindow.classList) {
                this.floatingWindow.classList.remove('completed');
              }
            }, 1000);
          }
        }
      }
    }
  }

  // Extract main content from Claude research mode responses
  extractClaudeResearchContent(element) {
    if (!element) return null;
    
    // Claude research mode often has multiple sections
    // Try to find the main answer content vs research steps
    
    // Look for patterns that indicate main content
    const contentIndicators = [
      // Look for sections that contain substantial paragraphs
      'p:not(:empty)',
      // Look for content after research indicators
      '[class*="answer"]',
      '[class*="response"]',
      '[class*="result"]',
      // Look for the last substantial text block (often the final answer)
      'div:last-child',
      // Look for markdown content
      '.markdown',
      '.prose'
    ];
    
    let bestContent = null;
    let maxContentLength = 0;
    
    // Try each indicator and find the one with most substantial content
    for (const indicator of contentIndicators) {
      try {
        const candidates = element.querySelectorAll(indicator);
        
        for (const candidate of candidates) {
          const text = candidate.textContent?.trim() || '';
          
          // Skip if it looks like research steps or metadata
          if (this.isClaudeResearchStep(text)) {
            continue;
          }
          
          // Prefer longer, more substantial content
          if (text.length > maxContentLength && text.length > 50) {
            maxContentLength = text.length;
            bestContent = candidate;
          }
        }
      } catch (error) {
        continue;
      }
    }
    
    // If we found substantial content, return it
    if (bestContent && maxContentLength > 100) {
      console.log(`FloatingChat: Claude research mode - extracted main content (${maxContentLength} chars)`);
      return bestContent;
    }
    
    // Fallback: look for the largest text block in the element
    const allTextNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent?.trim();
      if (text && text.length > 50) {
        allTextNodes.push({
          node: node.parentElement,
          length: text.length,
          text: text
        });
      }
    }
    
    // Sort by length and return the parent of the longest text
    if (allTextNodes.length > 0) {
      allTextNodes.sort((a, b) => b.length - a.length);
      const longest = allTextNodes[0];
      
      if (!this.isClaudeResearchStep(longest.text)) {
        console.log(`FloatingChat: Claude research mode - using longest text block (${longest.length} chars)`);
        return longest.node;
      }
    }
    
    return null;
  }

  // Check if text looks like a Claude research step rather than main content
  isClaudeResearchStep(text) {
    if (!text) return false;
    
    const researchIndicators = [
      'searching',
      'looking up',
      'finding',
      'researching',
      'checking',
      'verifying',
      'step 1',
      'step 2',
      'step 3',
      'first, i',
      'next, i',
      'then, i',
      'let me',
      'i need to',
      'i\'ll',
      'gathering',
      'collecting'
    ];
    
    const lowerText = text.toLowerCase();
    
    // Check if it's very short (likely a step indicator)
    if (text.length < 100) {
      return researchIndicators.some(indicator => lowerText.includes(indicator));
    }
    
    // For longer text, be more selective
    const shortIndicators = ['step ', 'let me ', 'i\'ll ', 'first, ', 'next, ', 'then, '];
    return shortIndicators.some(indicator => lowerText.startsWith(indicator));
  }

  // Calculate content similarity between two strings
  calculateContentSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Normalize strings for comparison
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const norm1 = normalize(str1);
    const norm2 = normalize(str2);
    
    if (norm1 === norm2) return 1;
    
    // Simple similarity based on common words
    const words1 = norm1.split(' ').filter(w => w.length > 2);
    const words2 = norm2.split(' ').filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const commonWords = words1.filter(word => words2.includes(word));
    const similarity = (commonWords.length * 2) / (words1.length + words2.length);
    
    return similarity;
  }

  // Analyze content changes to determine significance and type
  analyzeContentChange(previousContent, currentContent) {
    const prevLength = previousContent.length;
    const currLength = currentContent.length;
    const lengthDiff = currLength - prevLength;
    const lengthRatio = prevLength > 0 ? currLength / prevLength : (currLength > 0 ? Infinity : 1);
    
    // Detect if this is a significant content expansion
    const isSignificantGrowth = lengthDiff > 100 || lengthRatio > 2;
    
    // Detect if previous content was likely a placeholder or partial response
    const wasPlaceholder = this.isPlaceholderContent(previousContent);
    const isNowComplete = this.isCompleteResponse(currentContent);
    
    // Detect if this is a complete replacement (not just addition)
    const isReplacement = prevLength > 50 && currLength > 50 && 
                         !currentContent.includes(previousContent.substring(0, Math.min(50, prevLength)));
    
    // Detect streaming/incremental updates
    const isIncremental = currentContent.startsWith(previousContent) && lengthDiff > 0;
    
    let changeType = 'minor';
    let isSignificant = false;
    
    if (isReplacement) {
      changeType = 'replacement';
      isSignificant = true;
    } else if (wasPlaceholder && isNowComplete) {
      changeType = 'placeholder-to-complete';
      isSignificant = true;
    } else if (isSignificantGrowth) {
      changeType = 'major-expansion';
      isSignificant = true;
    } else if (isIncremental && lengthDiff > 20) {
      changeType = 'incremental';
      isSignificant = lengthDiff > 50; // Only significant if substantial addition
    }
    
    return {
      type: changeType,
      isSignificant: isSignificant,
      isComplete: isNowComplete,
      lengthDiff: lengthDiff,
      lengthRatio: lengthRatio,
      wasPlaceholder: wasPlaceholder
    };
  }

  // Check if content appears to be a placeholder or partial response
  isPlaceholderContent(content) {
    if (!content || content.length < 10) return true;
    
    const lowerContent = content.toLowerCase().trim();
    
    // Common placeholder patterns
    const placeholderPatterns = [
      'i\'ll search for',
      'let me search',
      'searching for',
      'looking up',
      'let me find',
      'let me check',
      'i\'ll look up',
      'i\'ll find',
      'i\'ll check',
      'just a moment',
      'one moment',
      'please wait',
      'loading',
      'thinking',
      'processing',
      'generating',
      'just a second',
      'hold on'
    ];
    
    // Check if content starts with common placeholder phrases
    const startsWithPlaceholder = placeholderPatterns.some(pattern => 
      lowerContent.startsWith(pattern)
    );
    
    // Check if content is very short and ends with ellipsis or similar
    const isShortWithEllipsis = content.length < 50 && 
      (content.includes('...') || content.includes('…') || content.endsWith('.'));
    
    // Check if content appears to be an incomplete sentence
    const isIncomplete = content.length < 100 && 
      !content.trim().endsWith('.') && 
      !content.trim().endsWith('!') && 
      !content.trim().endsWith('?') &&
      !content.includes('\n');
    
    return startsWithPlaceholder || isShortWithEllipsis || isIncomplete;
  }

  // Check if content appears to be a complete response
  isCompleteResponse(content) {
    if (!content || content.length < 50) return false;
    
    // Special handling for ChatGPT streaming
    if (this.platform === 'chatgpt') {
      // If ChatGPT is still generating, response is incomplete
      if (this.isChatGPTGenerating()) {
        return false;
      }
      
      // Check for common ChatGPT completion indicators
      const chatGptCompletionIndicators = [
        // Ends with proper punctuation
        /[.!?]$/,
        // Ends with code block
        /```$/m,
        // Ends with list item
        /^\d+\.\s.+$/m,
        // Ends with bullet point
        /^[-*]\s.+$/m
      ];
      
      const trimmedContent = content.trim();
      const hasCompletionIndicator = chatGptCompletionIndicators.some(pattern => 
        pattern.test(trimmedContent));
      
      // If it has completion indicators and is reasonably long, likely complete
      if (hasCompletionIndicator && content.length > 100) {
        return true;
      }
      
      // If it's very long (over 500 chars) and not generating, probably complete
      if (content.length > 500 && !this.isChatGPTGenerating()) {
        return true;
      }
      
      // Otherwise, check generation status
      return !this.isChatGPTGenerating();
    }
    
    // Special handling for Claude research mode
    if (this.platform === 'claude') {
      const lowerContent = content.toLowerCase().trim();
      
      // Claude research mode indicators
      const claudeResearchIndicators = [
        'searching',
        'looking up',
        'finding information',
        'researching',
        'checking',
        'verifying',
        'let me search',
        'i\'ll look',
        'gathering information',
        'step 1',
        'step 2',
        'first, i need',
        'next, i\'ll'
      ];
      
      // If it contains research indicators, it might be incomplete
      const hasResearchIndicators = claudeResearchIndicators.some(indicator => 
        lowerContent.includes(indicator));
      
      if (hasResearchIndicators && content.length < 500) {
        // Short content with research indicators is likely incomplete
        return false;
      }
      
      // If it's longer and has research indicators, check if it has a conclusion
      if (hasResearchIndicators) {
        const conclusionIndicators = [
          'based on',
          'in conclusion',
          'to summarize',
          'therefore',
          'overall',
          'in summary',
          'the answer is',
          'here\'s what',
          'the result',
          'according to',
          'the information shows',
          'i found that'
        ];
        
        const hasConclusion = conclusionIndicators.some(indicator => 
          lowerContent.includes(indicator));
        
        // If it has research steps but no conclusion, might be incomplete
        if (!hasConclusion && content.length < 1000) {
          return false;
        }
      }
    }
    
    // Check for multiple sentences or paragraphs
    const hasMultipleSentences = (content.match(/[.!?]+/g) || []).length > 1;
    const hasMultipleParagraphs = content.includes('\n\n') || content.includes('\n');
    
    // Check for structured content (lists, code blocks, etc.)
    const hasStructuredContent = content.includes('```') || 
      content.includes('- ') || 
      content.includes('* ') || 
      content.includes('1. ') ||
      content.includes('\n•');
    
    // Check for reasonable length
    const hasReasonableLength = content.length > 100;
    
    // Check if it ends properly
    const endsWell = content.trim().endsWith('.') || 
      content.trim().endsWith('!') || 
      content.trim().endsWith('?') ||
      content.trim().endsWith('```') ||
      hasStructuredContent;
    
    return hasReasonableLength && (hasMultipleSentences || hasMultipleParagraphs || hasStructuredContent) && endsWell;
  }

  // Validate and fix response object structure
  validateResponseObject(response, index) {
    if (!response) {
      console.warn(`FloatingChat: Response ${index} is null/undefined, removing it`);
      return false;
    }

    let needsRepair = false;

    // Silently add defaults for missing properties
    if (!response.hasOwnProperty('answerElement')) {
      response.answerElement = null;
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('questionElement')) {
      response.questionElement = null;
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('timestamp')) {
      response.timestamp = Date.now();
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('content')) {
      response.content = 'Response';
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('index')) {
      response.index = index;
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('isComplete')) {
      response.isComplete = true;
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('initialContent')) {
      response.initialContent = response.content || '';
      needsRepair = true;
    }
    
    if (!response.hasOwnProperty('isGeminiPlaceholder')) {
      response.isGeminiPlaceholder = false;
      needsRepair = true;
    }

    // Check if answerElement still exists in DOM
    if (response.answerElement && !document.contains(response.answerElement)) {
      console.warn(`FloatingChat: Response ${index} answerElement no longer in DOM, setting to null`);
      response.answerElement = null;
      needsRepair = true;
    }

    // If answerElement is null, try to find it again
    if (!response.answerElement && response.content) {
      console.log(`FloatingChat: Attempting to restore answerElement for response ${index}`);
      const latestAnswer = this.findLatestAnswer();
      if (latestAnswer && latestAnswer.textContent && 
          latestAnswer.textContent.includes(response.content.substring(0, 50))) {
        response.answerElement = latestAnswer;
        console.log(`FloatingChat: Successfully restored answerElement for response ${index}`);
        needsRepair = true;
      }
    }

    if (needsRepair) {
      console.log(`FloatingChat: Repaired response ${index} properties`);
    }
    
    // Final validation - ensure critical properties exist
    const isValid = response.hasOwnProperty('content') && 
                   response.hasOwnProperty('timestamp') && 
                   response.hasOwnProperty('index');
    
    if (!isValid) {
      console.error(`FloatingChat: Response ${index} failed final validation - missing critical properties`);
      return false;
    }
    
    return true;
  }

    // Clean up and validate all stored responses
  validateAllResponses() {
    if (this.responses.length === 0) return;
    
    // Only run validation once every 30 seconds to prevent spam
    const now = Date.now();
    if (this.lastValidationTime && now - this.lastValidationTime < 30000) {
      return; // Skip validation if done recently
    }
    
    console.log(`FloatingChat: Validating ${this.responses.length} stored responses`);
    this.lastValidationTime = now;
    
    // First pass: fix all responses silently
    let fixedCount = 0;
    for (let i = 0; i < this.responses.length; i++) {
      const response = this.responses[i];
      if (!response) continue;
      
      let needsFix = false;
      
      // Check if answerElement still exists in the DOM
      if (!response.answerElement || !document.contains(response.answerElement)) {
        response.answerElement = null;
        needsFix = true;
      }
      
      // Ensure all required properties exist with proper defaults
      if (!response.hasOwnProperty('isComplete')) {
        response.isComplete = true; // Default to complete for old responses
        needsFix = true;
      }
      
      if (!response.hasOwnProperty('initialContent')) {
        response.initialContent = response.content || 'Response';
        needsFix = true;
      }
      
      if (!response.hasOwnProperty('isGeminiPlaceholder')) {
        response.isGeminiPlaceholder = false;
        needsFix = true;
      }
      
      if (!response.hasOwnProperty('timestamp')) {
        response.timestamp = Date.now() - (i * 1000); // Fake timestamps
        needsFix = true;
      }
      
      if (!response.hasOwnProperty('index')) {
        response.index = i;
        needsFix = true;
      }
      
      if (needsFix) {
        fixedCount++;
      }
    }

    // Remove any null/undefined responses
    const originalLength = this.responses.length;
    this.responses = this.responses.filter((response, index) => {
      return response !== null && response !== undefined;
    });

    if (this.responses.length !== originalLength) {
      console.log(`FloatingChat: Removed ${originalLength - this.responses.length} null responses`);
      
      // Update indices
      this.responses.forEach((response, index) => {
        response.index = index;
      });
      
      // Adjust current index if needed
      if (this.currentResponseIndex >= this.responses.length) {
        this.currentResponseIndex = this.responses.length - 1;
      }
    }
    
    if (fixedCount > 0) {
      console.log(`FloatingChat: Fixed ${fixedCount} responses with missing properties`);
    }
  }

  // Store new response for navigation
  storeNewResponse(answerElement) {
    const currentContent = answerElement.textContent ? answerElement.textContent.trim() : '';
    
    // For Gemini, check if this is the same element we're already tracking
    if (this.platform === 'gemini' && this.responses.length > 0) {
      const latestResponse = this.responses[this.responses.length - 1];
      
      // If this is the same answer element, update the existing response instead of creating new one
      if (latestResponse.answerElement === answerElement) {
        console.log('FloatingChat: Gemini - Same element, checking if we should update or create new');
        
        const lowerText = currentContent.toLowerCase();
        const isPlaceholder = lowerText === 'just a second...' || lowerText === 'just a second…' || lowerText === 'just a second';
        
        // If transitioning from placeholder to real content, update the response
        if (latestResponse.isGeminiPlaceholder && !isPlaceholder && currentContent.length > 10) {
          console.log('FloatingChat: Gemini - Updating placeholder with real content');
          latestResponse.content = currentContent.substring(0, 100) + '...';
          latestResponse.isGeminiPlaceholder = false;
          latestResponse.isComplete = this.isCompleteResponse(currentContent);
          latestResponse.initialContent = currentContent;
          return true; // Updated existing response
        }
        
        // If it's still a placeholder, don't update
        if (isPlaceholder) {
          console.log('FloatingChat: Gemini - Still placeholder, not updating');
          return false;
        }
        
        // Check if this is significantly different content (might be a new response)
        const contentSimilarity = this.calculateContentSimilarity(
          latestResponse.initialContent || latestResponse.content, 
          currentContent
        );
        
        if (contentSimilarity < 0.3) {
          // Very different content, treat as new response
          console.log('FloatingChat: Gemini - Content very different, treating as new response');
          // Don't return, let it fall through to create a new response
        } else {
          // Similar content, update existing response
          latestResponse.content = currentContent.substring(0, 100) + '...';
          latestResponse.isComplete = this.isCompleteResponse(currentContent);
          latestResponse.initialContent = currentContent;
          console.log('FloatingChat: Gemini - Updated existing response content');
          return true; // Updated existing response
        }
      }
    }
    
    // For Gemini, handle the "Just a second..." placeholder with special logic
    if (this.platform === 'gemini') {
      const lowerText = currentContent.toLowerCase();
      if (lowerText === 'just a second...' || lowerText === 'just a second…' || lowerText === 'just a second') {
        console.log('FloatingChat: Detected Gemini "Just a second..." placeholder');
        
        // If we already have responses stored, don't create a new one for placeholder
        if (this.responses.length > 0) {
          console.log('FloatingChat: Skipping placeholder as we already have responses');
          return false;
        }
        
        // If this is the first response, store it but mark it as placeholder
        const responseData = {
          answerElement: answerElement,
          questionElement: this.findCorrespondingQuestion(answerElement),
          timestamp: Date.now(),
          content: currentContent,
          index: this.responses.length,
          isComplete: false,
          initialContent: currentContent,
          isGeminiPlaceholder: true // Special flag for Gemini placeholders
        };
        
        this.responses.push(responseData);
        this.currentResponseIndex = this.responses.length - 1;
        
        console.log('FloatingChat: Stored Gemini placeholder response for later replacement');
        return true;
      }
    }
    
    // Only skip if content is extremely short or clearly a loading indicator
    if (currentContent.length < 3 || 
        currentContent.toLowerCase() === 'loading...' ||
        currentContent.toLowerCase() === 'thinking...' ||
        currentContent.toLowerCase() === 'processing...') {
      console.log('FloatingChat: Skipping very short or loading content:', currentContent);
      return false; // Return false to indicate no response was stored
    }
    
    // Check for duplicate content (especially important for Gemini)
    if (this.responses.length > 0) {
      const latestResponse = this.responses[this.responses.length - 1];
      const latestContent = latestResponse.initialContent || latestResponse.content || '';
      
      // If content is very similar to the latest response, don't create a duplicate
      if (latestContent.length > 10 && currentContent.length > 10) {
        const similarity = this.calculateContentSimilarity(latestContent, currentContent);
        if (similarity > 0.8) { // 80% similarity threshold
          console.log(`FloatingChat: Skipping duplicate content (${Math.round(similarity * 100)}% similar)`);
          return false;
        }
      }
    }
    
    // Try to find the corresponding question
    const questionElement = this.findCorrespondingQuestion(answerElement);
    
    const responseData = {
      answerElement: answerElement,
      questionElement: questionElement,
      timestamp: Date.now(),
      content: currentContent.substring(0, 100) + '...',
      index: this.responses.length,
      isComplete: this.isCompleteResponse(currentContent),
      initialContent: currentContent // Store initial content for comparison
    };
    
    this.responses.push(responseData);
    this.currentResponseIndex = this.responses.length - 1;
    
    console.log(`FloatingChat: Stored response ${this.currentResponseIndex}:`, responseData.content);
    console.log(`FloatingChat: Question found:`, !!questionElement);
    console.log(`FloatingChat: Response is complete:`, responseData.isComplete);
    
    // Enhanced debugging for DeepSeek
    if (this.platform === 'deepseek') {
      console.log(`FloatingChat: DeepSeek Debug - Answer element:`, answerElement);
      console.log(`FloatingChat: DeepSeek Debug - Answer classes:`, answerElement.className);
      console.log(`FloatingChat: DeepSeek Debug - Answer text preview:`, answerElement.textContent ? answerElement.textContent.substring(0, 200) : 'No text');
      
      if (questionElement) {
        console.log(`FloatingChat: DeepSeek Debug - Question element:`, questionElement);
        console.log(`FloatingChat: DeepSeek Debug - Question classes:`, questionElement.className);
        console.log(`FloatingChat: DeepSeek Debug - Question text:`, questionElement.textContent ? questionElement.textContent.trim() : 'No text');
      } else {
        console.log(`FloatingChat: DeepSeek Debug - No question found. Searching for all potential user messages...`);
        const allUserLike = document.querySelectorAll('div:not([class*="assistant"]):not([class*="ai"]):not([class*="model"])');
        console.log(`FloatingChat: DeepSeek Debug - Found ${allUserLike.length} potential user elements`);
        
        // Log first few potential user messages
        Array.from(allUserLike).slice(0, 5).forEach((el, i) => {
          const text = el.textContent ? el.textContent.trim() : '';
          if (text && text.length > 5 && text.length < 300) {
            console.log(`FloatingChat: DeepSeek Debug - Potential user message ${i}:`, text.substring(0, 100));
          }
        });
      }
    }
    
    // Update navigation controls if window exists
    if (this.floatingWindow) {
      this.updateNavigationControls();
    }
    
    return true; // Return true to indicate response was successfully stored
  }

  // Find the question that corresponds to this answer
  findCorrespondingQuestion(answerElement) {
    const questionSelectors = this.getQuestionSelectors();
    if (!questionSelectors) return null;

    // Find all questions on the page
    let questions = [];
    const questionSelectorList = questionSelectors.question.split(', ');
    
    for (const selector of questionSelectorList) {
      try {
        const found = document.querySelectorAll(selector.trim());
        if (found.length > 0) {
          questions = Array.from(found);
          break;
        }
      } catch (error) {
        continue;
      }
    }

    // If no questions found with primary selectors, try platform-specific fallbacks
    if (questions.length === 0 && this.platform === 'gemini') {
      console.log('FloatingChat: No questions found with primary selectors, trying Gemini fallbacks');
      
      const geminiFallbacks = [
        'div[class*="user"]',
        'div[class*="human"]', 
        'div[class*="query"]',
        '[data-testid*="user"]',
        '[data-testid*="human"]',
        '[role="user"]',
        'div:has(> div[class*="user"])',
        'div:has(> div[class*="human"])',
        'div p:not(:has(strong))', // Often user messages are simple paragraphs
        'div div:not([class*="model"]):not([class*="assistant"]):not([class*="response"])'
      ];
      
      for (const fallback of geminiFallbacks) {
        try {
          const found = document.querySelectorAll(fallback);
          console.log(`FloatingChat: Gemini question fallback "${fallback}" found ${found.length} elements`);
          if (found.length > 0) {
            // Filter to likely user messages
            questions = Array.from(found).filter(el => {
              const text = el.textContent.trim();
              const classes = el.className.toLowerCase();
              // Should have content, not be too long (likely not AI response), and not have AI indicators
              return text.length > 5 && 
                     text.length < 1000 && 
                     !classes.includes('model') && 
                     !classes.includes('assistant') && 
                     !classes.includes('response');
            });
            if (questions.length > 0) {
              console.log(`FloatingChat: Found ${questions.length} potential questions with fallback`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
    } else if (questions.length === 0 && this.platform === 'deepseek') {
      console.log('FloatingChat: No questions found with primary selectors, trying DeepSeek fallbacks');
      
      const deepSeekFallbacks = [
        // Try common DeepSeek user message patterns
        '[class*="user"]',
        '[class*="human"]',
        '[data-role="user"]',
        '[role="user"]',
        // Try CSS class patterns that might be used
        '._user',
        '.user',
        '.human',
        '.question',
        '.query',
        // Try generic message containers that might contain user messages
        'div[class*="message"]:not([class*="assistant"]):not([class*="ai"])',
        'div[class*="chat"]:not([class*="assistant"]):not([class*="ai"])',
        // Try looking for elements that precede assistant messages
        'div + div._4f9bf79',
        'div + div.dad65929',
        'div + div._7eb2358',
        // Generic patterns
        'div:not([class*="assistant"]):not([class*="ai"]):not([class*="model"]):not([class*="response"])',
        // Look for text containers that might be user messages
        'p:not([class*="assistant"]):not([class*="ai"])',
        'div > p:not([class*="assistant"])',
        'div[class] > div:not([class*="assistant"])'
      ];
      
      for (const fallback of deepSeekFallbacks) {
        try {
          const found = document.querySelectorAll(fallback);
          console.log(`FloatingChat: DeepSeek question fallback "${fallback}" found ${found.length} elements`);
          if (found.length > 0) {
            // Filter to likely user messages
            questions = Array.from(found).filter(el => {
              const text = el.textContent.trim();
              const classes = el.className.toLowerCase();
              const id = el.id.toLowerCase();
              
              // Should have meaningful content
              if (text.length < 5 || text.length > 2000) return false;
              
              // Exclude elements that are clearly AI responses
              if (classes.includes('assistant') || classes.includes('ai') || 
                  classes.includes('model') || classes.includes('response') ||
                  classes.includes('bot') || classes.includes('deepseek') ||
                  id.includes('assistant') || id.includes('ai')) {
                return false;
              }
              
              // Exclude elements that contain markdown or code (likely AI responses)
              if (el.querySelector('pre, code, .markdown, [class*="markdown"]')) {
                return false;
              }
              
              // Prefer elements that look like user input
              const looksLikeUserInput = text.includes('?') || 
                                       text.length < 500 || 
                                       classes.includes('user') || 
                                       classes.includes('human') ||
                                       classes.includes('question');
              
              return looksLikeUserInput || text.length < 200; // Short messages are likely user messages
            });
            
            if (questions.length > 0) {
              console.log(`FloatingChat: Found ${questions.length} potential DeepSeek questions with fallback`);
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
    }

    if (questions.length === 0) return null;

    // Find the question that comes immediately before this answer
    let questionElement = null;
    
    // Strategy 1: Look for the previous sibling or previous element
    let currentElement = answerElement;
    while (currentElement && currentElement.previousElementSibling) {
      currentElement = currentElement.previousElementSibling;
      if (questions.includes(currentElement)) {
        questionElement = currentElement;
        break;
      }
    }

    // Strategy 2: If no direct sibling, look at document order
    if (!questionElement) {
      const answerPosition = Array.from(document.querySelectorAll('*')).indexOf(answerElement);
      for (let i = questions.length - 1; i >= 0; i--) {
        const questionPosition = Array.from(document.querySelectorAll('*')).indexOf(questions[i]);
        if (questionPosition < answerPosition) {
          questionElement = questions[i];
          break;
        }
      }
    }

    // Strategy 3: For DeepSeek, try to find the most recent user message in the conversation
    if (!questionElement && this.platform === 'deepseek' && questions.length > 0) {
      console.log('FloatingChat: Using DeepSeek strategy 3 - finding most recent user message');
      // Just take the last question found, as it's likely the most recent
      questionElement = questions[questions.length - 1];
    }
    
    // Strategy 4: For DeepSeek, if still no question found, try a very broad search
    if (!questionElement && this.platform === 'deepseek') {
      console.log('FloatingChat: Using DeepSeek strategy 4 - broad search for any user input');
      
      // Look for any text elements that might be user messages
      const allTextElements = document.querySelectorAll('p, div, span');
      const potentialQuestions = Array.from(allTextElements).filter(el => {
        const text = el.textContent ? el.textContent.trim() : '';
        if (!text || text.length < 3 || text.length > 1000) return false;
        
        // Skip elements that are clearly AI responses
        const classes = el.className.toLowerCase();
                  const parentClasses = el.parentElement ? el.parentElement.className.toLowerCase() : '';
        
        if (classes.includes('assistant') || classes.includes('ai') || 
            classes.includes('model') || classes.includes('response') ||
            parentClasses.includes('assistant') || parentClasses.includes('ai') ||
            parentClasses.includes('model') || parentClasses.includes('response')) {
          return false;
        }
        
        // Skip elements with markdown or code (likely AI responses)
        if (el.querySelector('pre, code, .markdown') || 
            el.closest('pre, code, .markdown, [class*="markdown"]')) {
          return false;
        }
        
        // Prefer shorter texts that look like questions or commands
        return text.length < 300 && (
          text.includes('?') || 
          text.split(' ').length < 50 ||
          /^(what|how|why|when|where|can|could|would|should|is|are|do|does|did|tell|explain|help|show|give|make|create|write|generate)/i.test(text)
        );
      });
      
      if (potentialQuestions.length > 0) {
        // Find the one that appears closest before the answer element
        const answerPosition = Array.from(document.querySelectorAll('*')).indexOf(answerElement);
        let bestQuestion = null;
        let bestDistance = Infinity;
        
        for (const q of potentialQuestions) {
          const qPosition = Array.from(document.querySelectorAll('*')).indexOf(q);
          if (qPosition < answerPosition) {
            const distance = answerPosition - qPosition;
            if (distance < bestDistance) {
              bestDistance = distance;
              bestQuestion = q;
            }
          }
        }
        
        if (bestQuestion) {
          console.log('FloatingChat: DeepSeek strategy 4 found potential question:', bestQuestion.textContent ? bestQuestion.textContent.substring(0, 100) : 'No text');
          questionElement = bestQuestion;
        }
      }
    }

    return questionElement;
  }

  // Get selectors for user questions/messages
  getQuestionSelectors() {
    const selectors = {
      chatgpt: {
        question: '[data-message-author-role="user"], .group\\/conversation-turn:has([data-message-author-role="user"]), [data-testid*="user"], .user-message',
        content: '[data-message-author-role="user"] > div > div, .whitespace-pre-wrap, .user-message .whitespace-pre-wrap'
      },
      claude: {
        question: '[data-testid="user-message"], .user-message, .font-user-message',
        content: '[data-testid="user-message"] div, .user-message div, .font-user-message'
      },
      gemini: {
        question: '.user-message, .user-query, [data-role="user"], .human-message, [class*="user"], [class*="human"], [class*="query"], div[class*="message"]:has(div[class*="user"])',
        content: '.user-message-text, .query-content, .user-content, [class*="text"], [class*="content"], div p, div div'
      },
      deepseek: {
        question: '.user-message, [class*="user"], .human-message, [data-role="user"], [role="user"], ._user, .user, .human, .question, .query, div[class*="message"]:not([class*="assistant"]):not([class*="ai"]), div:not([class*="assistant"]):not([class*="ai"]):not([class*="model"])',
        content: '.user-content, .human-message-text, [class*="text"], [class*="content"], div p, div div, p'
      }
    };

    return selectors[this.platform];
  }

  // Navigate to a specific response
  navigateToResponse(index) {
    // Validate responses first
    this.validateAllResponses();
    
    if (index < 0 || index >= this.responses.length) {
      console.log(`FloatingChat: Invalid response index: ${index} (total: ${this.responses.length})`);
      return;
    }
    
    this.currentResponseIndex = index;
    const response = this.responses[index];
    
    // Safety check for response object
    if (!response) {
      console.error(`FloatingChat: Response at index ${index} is undefined`);
      return;
    }
    
    // Additional validation for response properties
    if (!this.validateResponseObject(response, index)) {
      console.error(`FloatingChat: Response at index ${index} failed validation`);
      return;
    }
    
    console.log(`FloatingChat: Navigating to response ${index}:`, response.content);
    
    // Try to update the floating window, with error handling
    try {
      this.updateFloatingWindowWithQA(response);
      this.updateNavigationControls();
    } catch (error) {
      console.error(`FloatingChat: Error updating floating window for response ${index}:`, error);
      
      // Show error in floating window if it exists
      if (this.floatingWindow) {
        const content = this.floatingWindow.querySelector('.floating-chat-content');
        if (content) {
          content.innerHTML = `
            <div class="error-message">
              <div>Error displaying response ${index + 1}</div>
              <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
                ${error.message || 'Unknown error occurred'}
              </div>
              <button onclick="location.reload()" style="
                margin-top: 12px;
                padding: 8px 16px;
                background: #007acc;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
              ">Reload Page</button>
            </div>
          `;
        }
      }
    }
  }



  // Update navigation controls state
  updateNavigationControls() {
    if (!this.floatingWindow) return;

    const prevBtn = this.floatingWindow.querySelector('.prev-btn');
    const nextBtn = this.floatingWindow.querySelector('.next-btn');
    const counter = this.floatingWindow.querySelector('.response-counter');

    if (prevBtn && nextBtn && counter) {
      // Update counter
      counter.textContent = `${this.currentResponseIndex + 1}/${this.responses.length}`;
      
      // Update button states
      prevBtn.disabled = this.currentResponseIndex <= 0;
      nextBtn.disabled = this.currentResponseIndex >= this.responses.length - 1;
    }
  }

  // Update window header based on state
  updateWindowHeader() {
    if (!this.floatingWindow) return;

    const titleText = this.floatingWindow.querySelector('.title-text');
    if (titleText) {
      titleText.textContent = 'FloatingChat';
    }
  }

  // New method to update floating window with both question and answer
  updateFloatingWindowWithQA(responseData) {
    if (!this.isEnabled) return;
    
    // Only ensure window if we don't have one at all
    if (!this.floatingWindow) {
      this.ensureFloatingWindow();
    }
    
    // If window still doesn't exist after ensuring, create it
    if (!this.floatingWindow) {
      console.warn('FloatingChat: Could not create/access floating window');
      return;
    }

    // Safety check for responseData
    if (!responseData) {
      console.error('FloatingChat: responseData is undefined in updateFloatingWindowWithQA');
      return;
    }

    // Ensure responseData has required properties
    if (!responseData.answerElement) {
      console.error('FloatingChat: responseData.answerElement is undefined');
      
      // Try multiple fallback strategies
      let fallbackElement = null;
      
      // Strategy 1: Try to find the latest answer element
      fallbackElement = this.findLatestAnswer();
      
      // Strategy 2: If we have stored responses, try to find their elements in DOM
      if (!fallbackElement && this.responses.length > 0) {
        for (let i = this.responses.length - 1; i >= 0; i--) {
          const response = this.responses[i];
          if (response.answerElement && document.contains(response.answerElement)) {
            fallbackElement = response.answerElement;
            console.log(`FloatingChat: Using answerElement from response ${i} as fallback`);
            break;
          }
        }
      }
      
      // Strategy 3: Search for any answer elements on the page
      if (!fallbackElement) {
        const selectors = this.getAnswerSelectors();
        if (selectors && selectors.answer) {
          const answerSelectors = selectors.answer.split(', ');
          for (const selector of answerSelectors) {
            try {
              const elements = document.querySelectorAll(selector.trim());
              if (elements.length > 0) {
                // Use the last element (most recent)
                fallbackElement = elements[elements.length - 1];
                console.log(`FloatingChat: Found fallback element with selector: ${selector}`);
                break;
              }
            } catch (error) {
              continue;
            }
          }
        }
      }
      
      if (fallbackElement) {
        console.log('FloatingChat: Using fallback element for display');
        responseData.answerElement = fallbackElement;
        
        // Update the response with the fallback element
        if (this.responses.length > 0) {
          const latestResponse = this.responses[this.responses.length - 1];
          if (!latestResponse.answerElement) {
            latestResponse.answerElement = fallbackElement;
          }
        }
      } else {
        console.error('FloatingChat: No answer element available after all fallback attempts');
        
        // Show helpful error message in floating window
        if (this.floatingWindow) {
          const content = this.floatingWindow.querySelector('.floating-chat-content');
          if (content) {
                            content.innerHTML = `
               <div class="error-message">
                 <div>No answer content available</div>
                 <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
                   Try asking a question or refreshing the page
                 </div>
                 <button id="recovery-button" style="
                   margin-top: 12px;
                   padding: 8px 16px;
                   background: #007acc;
                   color: white;
                   border: none;
                   border-radius: 6px;
                   cursor: pointer;
                   font-size: 12px;
                 ">Try Recovery</button>
               </div>
             `;
             
             // Add click handler for recovery button
             const recoveryButton = content.querySelector('#recovery-button');
             if (recoveryButton) {
               recoveryButton.addEventListener('click', () => {
                 console.log('FloatingChat: Manual recovery triggered');
                 this.attemptResponseRecovery();
                 
                 // Update the window if we found responses
                 if (this.responses.length > 0) {
                   this.currentResponseIndex = this.responses.length - 1;
                   this.updateFloatingWindowWithQA(this.responses[this.currentResponseIndex]);
                   this.updateNavigationControls();
                 } else {
                   recoveryButton.textContent = 'No responses found';
                   recoveryButton.style.background = '#666';
                   setTimeout(() => {
                     recoveryButton.textContent = 'Try Recovery';
                     recoveryButton.style.background = '#007acc';
                   }, 2000);
                 }
               });
             }
          }
        }
        return;
      }
    }

    console.log(`FloatingChat: Updating floating window with Q&A`);

    const content = this.floatingWindow.querySelector('.floating-chat-content');
    if (!content) return;
    content.innerHTML = '';

    // Create container for question and answer
    const qaContainer = document.createElement('div');
    qaContainer.className = 'qa-container';

    // Add question if available
    if (responseData.questionElement) {
      console.log(`FloatingChat: Adding question to floating window`);
      const questionContainer = document.createElement('div');
      questionContainer.className = 'question-container';
      
      const questionContent = this.extractContent(responseData.questionElement, 'question');
      if (questionContent) {
        const clonedQuestion = questionContent.cloneNode(true);
        this.cleanupClonedContent(clonedQuestion);
        questionContainer.appendChild(clonedQuestion);
        qaContainer.appendChild(questionContainer);

        // Add separator line
        const separator = document.createElement('div');
        separator.className = 'qa-separator';
        qaContainer.appendChild(separator);
      } else {
        // If extractContent returns null for question, still show a placeholder
        questionContainer.innerHTML = `
          <div style="font-style: italic; color: #666; font-size: 14px;">
            [Question content could not be extracted]
          </div>
        `;
        qaContainer.appendChild(questionContainer);

        // Add separator line
        const separator = document.createElement('div');
        separator.className = 'qa-separator';
        qaContainer.appendChild(separator);
      }
    }

    // Add answer - with additional safety check
    console.log(`FloatingChat: Adding answer to floating window`);
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';
    
    // Final safety check before extracting content
    if (!responseData.answerElement) {
      console.error('FloatingChat: answerElement is still undefined after fallback strategies');
      answerContainer.innerHTML = `
        <div class="error-message">
          <div>Answer content not available</div>
          <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
            The answer element could not be found or accessed
          </div>
        </div>
      `;
      qaContainer.appendChild(answerContainer);
    } else {
      const answerContent = this.extractContent(responseData.answerElement, 'answer');
      if (answerContent) {
        const clonedAnswer = answerContent.cloneNode(true);
        this.cleanupClonedContent(clonedAnswer);
        answerContainer.appendChild(clonedAnswer);
        qaContainer.appendChild(answerContainer);
      } else {
        // If extractContent returns null, show a fallback message
        answerContainer.innerHTML = `
          <div class="error-message">
            <div>Could not extract answer content</div>
            <div style="font-size: 12px; margin-top: 8px; opacity: 0.8;">
              The answer element exists but content could not be extracted
            </div>
          </div>
        `;
        qaContainer.appendChild(answerContainer);
      }
    }

    content.appendChild(qaContainer);
    content.scrollTop = 0;

    // Add visual feedback
    if (this.floatingWindow && this.floatingWindow.classList) {
      this.floatingWindow.classList.add('new-content');
      setTimeout(() => {
        if (this.floatingWindow && this.floatingWindow.classList) {
          this.floatingWindow.classList.remove('new-content');
        }
      }, 1000);
    }

    console.log(`FloatingChat: Q&A floating window updated successfully`);
  }

  // Extract content from question or answer element
  extractContent(element, type) {
    if (!element) return null;

    const selectors = type === 'question' ? this.getQuestionSelectors() : this.getAnswerSelectors();
    if (!selectors) return element;

    // Try to find the best content within the element
    let content = null;
    
    if (selectors.content) {
      const contentSelectors = selectors.content.split(', ');
      
      for (const selector of contentSelectors) {
        try {
          const found = element.querySelector(selector.trim());
          // Check for text content OR images/media content
          if (found && (found.textContent.trim().length > 0 || 
                       found.querySelector('img, video, svg, iframe, canvas'))) {
            content = found;
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Platform-specific content extraction fallback
    if (!content) {
      if (this.platform === 'claude') {
        // Enhanced Claude content extraction for research mode
        const fallbackSelectors = [
          '.font-claude-message',
          '.prose',
          '[data-testid="message"] > div > div',
          '.markdown',
          '.message-content',
          '[class*="content"]',
          '[class*="response"]',
          'div'
        ];
        
        for (const selector of fallbackSelectors) {
          const found = element.querySelector(selector);
          if (found && (found.textContent.trim().length > 10 || 
                       found.querySelector('img, video, svg, iframe, canvas'))) {
            
            // Special handling for Claude research mode
            // Look for the main answer content, not just research steps
            if (type === 'answer') {
              const claudeContent = this.extractClaudeResearchContent(found);
              if (claudeContent) {
                content = claudeContent;
                break;
              }
            }
            
            content = found;
            break;
          }
        }
      } else if (this.platform === 'gemini') {
        // Different fallback strategies for questions vs answers
        const fallbackSelectors = type === 'question' ? [
          'div p',
          '[class*="text"]',
          '[class*="content"]',
          'div div:not([class*="model"]):not([class*="assistant"])',
          'div span',
          'div'
        ] : [
          '.markdown',
          '[class*="markdown"]',
          '[class*="text"]',
          '[class*="content"]',
          'div p',
          'div div',
          'div'
        ];
        
        for (const selector of fallbackSelectors) {
          const found = element.querySelector(selector);
          if (found && (found.textContent.trim().length > 5 || // More lenient for Gemini
                       found.querySelector('img, video, svg, iframe, canvas'))) {
            content = found;
            break;
          }
        }
      } else if (this.platform === 'deepseek') {
        // Different fallback strategies for questions vs answers
        const fallbackSelectors = type === 'question' ? [
          // User message specific selectors
          '[class*="user-content"]',
          '[class*="user-text"]',
          '[class*="human-content"]',
          'div p',
          '[class*="text"]',
          '[class*="content"]',
          'p',
          'div div:not([class*="assistant"]):not([class*="ai"])',
          'div span',
          'div'
        ] : [
          // Assistant message specific selectors
          '.ds-markdown',
          '.ds-markdown-paragraph',
          '._7eb2358 svg + div',
          '._7eb2358',
          'div[class*="markdown"]',
          '[class*="assistant-content"]',
          '[class*="ai-content"]',
          '[class*="response-content"]',
          'div p',
          'div div',
          'div'
        ];
        
        for (const selector of fallbackSelectors) {
          const found = element.querySelector(selector);
          if (found && (found.textContent.trim().length > (type === 'question' ? 3 : 10) ||
                       found.querySelector('img, video, svg, iframe, canvas'))) {
            content = found;
            break;
          }
        }
      }
    }
    
    // Fallback to the entire element if no specific content found
    return content || element;
  }

  cleanupClonedContent(element) {
    if (!element) return;
    
    // Remove any absolute positioning
    element.style.position = 'relative';
    
    // Remove interactive elements that might interfere
    const buttonsToRemove = element.querySelectorAll('button, .copy-button, .edit-button, .download-button');
    buttonsToRemove.forEach(btn => btn.remove());
    
    // Handle images properly
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      // Ensure images are properly sized for floating window
      img.style.maxWidth = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.margin = '10px 0';
      
      // Handle loading states
      if (!img.complete) {
        img.addEventListener('load', () => {
          console.log('FloatingChat: Image loaded in floating window');
        });
        
        img.addEventListener('error', () => {
          console.warn('FloatingChat: Image failed to load in floating window');
          // Create a placeholder for failed images
          const placeholder = document.createElement('div');
          placeholder.className = 'image-placeholder';
          placeholder.textContent = '[Image could not be loaded]';
          placeholder.style.cssText = 'padding: 20px; background: #f0f0f0; border: 1px dashed #ccc; text-align: center; color: #666; margin: 10px 0;';
          img.parentNode.replaceChild(placeholder, img);
        });
      }
      
      // Preserve alt text and other important attributes
      if (img.alt) {
        img.title = img.alt; // Show alt text on hover
      }
      
      // Remove any click handlers that might interfere
      img.onclick = null;
      img.removeAttribute('onclick');
    });
    
    // Handle other media elements
    const videos = element.querySelectorAll('video');
    videos.forEach(video => {
      video.style.maxWidth = '100%';
      video.style.height = 'auto';
      video.controls = true; // Ensure video controls are available
    });
    
    const iframes = element.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.style.maxWidth = '100%';
      iframe.style.height = 'auto';
      iframe.style.minHeight = '200px';
    });
    
    // Handle SVG elements
    const svgs = element.querySelectorAll('svg');
    svgs.forEach(svg => {
      svg.style.maxWidth = '100%';
      svg.style.height = 'auto';
    });
    
    // Fix any broken relative URLs for images
    const allMediaElements = element.querySelectorAll('img, video, audio, source');
    allMediaElements.forEach(media => {
      if (media.src && media.src.startsWith('/')) {
        // Convert relative URLs to absolute URLs
        const baseUrl = window.location.origin;
        media.src = baseUrl + media.src;
      }
    });
    
    // Handle code blocks with syntax highlighting
    const codeBlocks = element.querySelectorAll('pre, code');
    codeBlocks.forEach(code => {
      code.style.maxWidth = '100%';
      code.style.overflow = 'auto';
      code.style.wordWrap = 'break-word';
    });
    
    // Handle tables
    const tables = element.querySelectorAll('table');
    tables.forEach(table => {
      table.style.maxWidth = '100%';
      table.style.overflow = 'auto';
      table.style.display = 'block';
      table.style.whiteSpace = 'nowrap';
    });
    
    // Remove any scripts for security
    const scripts = element.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // Remove any style elements that might interfere
    const styles = element.querySelectorAll('style');
    styles.forEach(style => style.remove());
    
    // Ensure proper styling for floating window
    if (element.classList) {
      element.classList.add('floating-content');
    }
    
    console.log(`FloatingChat: Cleaned up cloned content with ${images.length} images, ${videos.length} videos, ${tables.length} tables`);
  }

  handleMessage(request, sendResponse) {
    try {
      // Validate all responses before handling any requests
      this.validateAllResponses();
      
      switch (request.action) {
        case 'toggle':
          try {
            this.toggleWindow();
            sendResponse({ success: true, enabled: this.isEnabled });
          } catch (toggleError) {
            console.error('FloatingChat: Error toggling window:', toggleError);
            sendResponse({ success: false, error: 'Failed to toggle window: ' + toggleError.message });
          }
          break;
        case 'getStatus':
          try {
            // Attempt recovery if we have no responses but should have some
            if (this.responses.length === 0 && this.platform) {
              console.log('FloatingChat: No responses stored, attempting recovery...');
              this.attemptResponseRecovery();
            }
            
            const status = { 
              success: true,
              enabled: this.isEnabled, 
              platform: this.platform,
              hasAnswer: !!this.lastAnswerElement,
              totalResponses: this.responses.length,
              currentIndex: this.currentResponseIndex
            };
            
            // Additional validation for responses
            if (this.responses.length > 0) {
              const validResponses = this.responses.filter(r => r && r.answerElement && document.contains(r.answerElement));
              status.validResponses = validResponses.length;
              
              // If we have invalid responses, clean them up
              if (validResponses.length < this.responses.length) {
                console.log(`FloatingChat: Cleaning up ${this.responses.length - validResponses.length} invalid responses`);
                this.responses = validResponses;
                this.responses.forEach((response, index) => {
                  response.index = index;
                });
                if (this.currentResponseIndex >= this.responses.length) {
                  this.currentResponseIndex = this.responses.length - 1;
                }
              }
            }
            
            sendResponse(status);
          } catch (statusError) {
            console.error('FloatingChat: Error getting status:', statusError);
            sendResponse({ success: false, error: 'Failed to get status: ' + statusError.message });
          }
          break;
        case 'navigateResponse':
          try {
            this.navigateToResponse(request.index);
            sendResponse({ success: true, currentIndex: this.currentResponseIndex });
          } catch (navError) {
            console.error('FloatingChat: Error navigating response:', navError);
            sendResponse({ success: false, error: 'Failed to navigate: ' + navError.message });
          }
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action: ' + request.action });
      }
    } catch (error) {
      console.error('FloatingChat: Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  toggleWindow() {
    this.isEnabled = !this.isEnabled;
    
    if (this.isEnabled) {
      if (!this.floatingWindow || !document.contains(this.floatingWindow)) {
        console.log('FloatingChat: Creating new floating window');
        this.createFloatingWindow();
      } else {
        console.log('FloatingChat: Showing existing floating window');
        this.floatingWindow.style.display = 'block';
      }
      
      // Refresh content if we have an answer
      if (this.lastAnswerElement && this.responses.length > 0) {
        const latestResponse = this.responses[this.responses.length - 1];
        if (latestResponse) {
          this.updateFloatingWindowWithQA(latestResponse);
        }
      }
    } else {
      if (this.floatingWindow) {
        console.log('FloatingChat: Hiding floating window');
        this.floatingWindow.style.display = 'none';
      }
    }
    
    this.saveSettings();
  }

  destroy() {
    // Clean up observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    
    // Clean up content observer
    if (this.contentObserver) {
      this.contentObserver.disconnect();
      this.contentObserver = null;
    }
    
    // Clear timeouts
    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = null;
    }
    
    if (this.contentUpdateTimeout) {
      clearTimeout(this.contentUpdateTimeout);
      this.contentUpdateTimeout = null;
    }
    
    // Clear monitoring timers
    if (this.fastMonitoringTimer) {
      clearInterval(this.fastMonitoringTimer);
      this.fastMonitoringTimer = null;
    }
    
    if (this.generationMonitoringTimer) {
      clearInterval(this.generationMonitoringTimer);
      this.generationMonitoringTimer = null;
    }
    
    if (this.elementPollingTimer) {
      clearInterval(this.elementPollingTimer);
      this.elementPollingTimer = null;
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    if (this.historyCheckTimer) {
      clearInterval(this.historyCheckTimer);
      this.historyCheckTimer = null;
    }
    
    // Clear Gemini update timeout
    if (this.geminiUpdateTimeout) {
      clearTimeout(this.geminiUpdateTimeout);
      this.geminiUpdateTimeout = null;
    }
    
    // Clear Claude update timeout
    if (this.claudeUpdateTimeout) {
      clearTimeout(this.claudeUpdateTimeout);
      this.claudeUpdateTimeout = null;
    }
    
    // Clear ChatGPT update timeout
    if (this.chatgptUpdateTimeout) {
      clearTimeout(this.chatgptUpdateTimeout);
      this.chatgptUpdateTimeout = null;
    }
    
    // Clear settings save timeout
    if (this.saveSettingsTimeout) {
      clearTimeout(this.saveSettingsTimeout);
      this.saveSettingsTimeout = null;
    }
    
    // Clear stored responses
    this.responses = [];
    this.currentResponseIndex = -1;
    
    // Remove floating window
    if (this.floatingWindow) {
      this.floatingWindow.remove();
      this.floatingWindow = null;
    }
  }


}

// Initialize the extension
let floatingChatManager = null;
let messageListenerRegistered = false;

// Ensure message listener is registered
function ensureMessageListener() {
  if (messageListenerRegistered) return;
  
  console.log('FloatingChat: Registering message listener');
  
  // Test if chrome.runtime is available
  if (!chrome || !chrome.runtime || !chrome.runtime.onMessage) {
    console.error('FloatingChat: Chrome runtime not available, cannot register message listener');
    // Retry after a short delay
    setTimeout(() => {
      messageListenerRegistered = false;
      ensureMessageListener();
    }, 500);
    return;
  }
  
  try {
    // Remove any existing listeners first
    if (chrome.runtime.onMessage.hasListeners()) {
      console.log('FloatingChat: Removing existing message listeners');
      chrome.runtime.onMessage.removeListener();
    }
  } catch (error) {
    console.log('FloatingChat: Could not remove existing listeners:', error);
  }
  
  messageListenerRegistered = true;
  
  // Add connection health check
  let connectionHealthy = true;
  
  // Test connection periodically
  setInterval(() => {
    try {
      if (chrome && chrome.runtime && chrome.runtime.id) {
        if (!connectionHealthy) {
          console.log('FloatingChat: Connection restored');
          connectionHealthy = true;
        }
      } else {
        throw new Error('Runtime not available');
      }
    } catch (error) {
      if (connectionHealthy) {
        console.warn('FloatingChat: Connection lost, attempting recovery');
        connectionHealthy = false;
        
        // Attempt to re-register listener
        setTimeout(() => {
          messageListenerRegistered = false;
          ensureMessageListener();
        }, 1000);
      }
    }
  }, 5000); // Check every 5 seconds
  
  // Global message listener - works even if manager fails to initialize
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('FloatingChat: Received message:', request);
  
  // Handle ping test messages
  if (request.action === 'ping') {
    console.log('FloatingChat: Responding to ping');
    try {
      sendResponse({ success: true, message: 'pong', domain: currentDomain, supported: isSupported });
    } catch (error) {
      console.error('FloatingChat: Error sending ping response:', error);
    }
    return true;
  }
  
  // Ensure we always send a response
  let responseSent = false;
  const safeResponse = (response) => {
    if (!responseSent) {
      responseSent = true;
      try {
        sendResponse(response);
      } catch (error) {
        console.error('FloatingChat: Error sending response:', error);
      }
    }
  };
  
  try {
    // Check if we're on a supported domain first
    if (!isSupported) {
      safeResponse({ success: false, error: 'Unsupported domain: ' + currentDomain });
      return;
    }
    
    if (floatingChatManager && floatingChatManager.handleMessage) {
      floatingChatManager.handleMessage(request, safeResponse);
    } else {
      console.warn('FloatingChat: Manager not initialized, attempting to initialize...');
      
      // Try to initialize if not already done
      if (document.readyState === 'loading') {
        safeResponse({ success: false, error: 'Page still loading, please try again' });
      } else {
        // Attempt emergency initialization
        try {
          initializeExtension();
          // Wait a moment for initialization to complete
          setTimeout(() => {
            if (floatingChatManager && floatingChatManager.handleMessage) {
              floatingChatManager.handleMessage(request, safeResponse);
            } else {
              safeResponse({ success: false, error: 'Failed to initialize extension after retry' });
            }
          }, 100);
        } catch (initError) {
          console.error('FloatingChat: Emergency initialization failed:', initError);
          safeResponse({ success: false, error: 'Extension initialization failed: ' + initError.message });
        }
      }
    }
  } catch (error) {
    console.error('FloatingChat: Error in global message listener:', error);
    safeResponse({ success: false, error: error.message });
  }
  
  return true; // Keep message channel open for async response
});
}

// Debug helper - call window.enableFloatingChatDebug() in console to enable detailed logging
window.enableFloatingChatDebug = () => {
  if (floatingChatManager) {
    floatingChatManager.debugMode = true;
    console.log('FloatingChat: Debug mode enabled - you will see detailed logs for monitoring and updates');
  }
};

window.disableFloatingChatDebug = () => {
  if (floatingChatManager) {
    floatingChatManager.debugMode = false;
    console.log('FloatingChat: Debug mode disabled');
  }
};

// Check if we're on a supported domain
const supportedDomains = ['chatgpt.com', 'claude.ai', 'gemini.google.com', 'chat.deepseek.com'];
const currentDomain = window.location.hostname;
const isSupported = supportedDomains.some(domain => currentDomain.includes(domain));

console.log(`FloatingChat: Content script loaded on domain: ${currentDomain}, supported: ${isSupported}`);

// Always register message listener, even on unsupported domains
ensureMessageListener();

if (isSupported) {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    console.log('FloatingChat: DOM still loading, waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', initializeExtension);
  } else {
    console.log('FloatingChat: DOM ready, initializing immediately');
    initializeExtension();
  }
} else {
  console.log(`FloatingChat: Unsupported domain, extension will not initialize`);
}

function initializeExtension() {
  try {
    console.log('FloatingChat: Starting initialization...');
    
    // Clean up any existing instance
    if (floatingChatManager) {
      console.log('FloatingChat: Cleaning up existing instance');
      try {
        floatingChatManager.destroy();
      } catch (destroyError) {
        console.warn('FloatingChat: Error during cleanup:', destroyError);
      }
    }
    
    // Create new instance
    floatingChatManager = new FloatingChatManager();
    
    if (floatingChatManager) {
      // Initialize the manager
      floatingChatManager.init().then(() => {
        console.log('FloatingChat: Extension initialized successfully on', window.location.hostname);
      }).catch(initError => {
        console.error('FloatingChat: Initialization promise failed:', initError);
      });
    } else {
      throw new Error('Failed to create FloatingChatManager instance');
    }
  } catch (error) {
    console.error('FloatingChat: Failed to initialize extension:', error);
    floatingChatManager = null;
  }
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