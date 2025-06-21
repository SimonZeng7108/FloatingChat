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
    this.windowSize = { width: 400, height: 500 };
    
    // Enhanced floating window state
    this.responses = []; // Store all responses
    this.currentResponseIndex = -1;
    this.contentObserver = null;
    this.contentUpdateTimeout = null;
    this.fastMonitoringTimer = null;
    this.generationMonitoringTimer = null;
    this.elementPollingTimer = null;
    this.debugMode = false; // Set to true for detailed logging
    
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
          <span class="title-text">Latest Answer</span>
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
    const resizeHandle = this.floatingWindow.querySelector('.floating-chat-resize-handle');
    
    // Navigation controls
    const prevBtn = this.floatingWindow.querySelector('.prev-btn');
    const nextBtn = this.floatingWindow.querySelector('.next-btn');

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
      const text = answer.textContent ? answer.textContent.trim() : '';
      return text && text.length > 10; // Must have meaningful content
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
      this.storeNewResponse(latestAnswer);
      
      // Always update floating window with latest response
      const latestResponse = this.responses[this.responses.length - 1];
      this.updateFloatingWindowWithQA(latestResponse);
      
      // Set up real-time content monitoring for this answer
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
        if (this.currentResponseIndex === this.responses.length - 1) {
          this.updateFloatingWindowWithQA(latestResponse);
        }
      }
    } else {
      console.log(`FloatingChat: No changes detected`);
    }
  }

  // Set up real-time content monitoring for the current answer element
  setupContentMonitoring(answerElement) {
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
    
    this.elementPollingTimer = setInterval(() => {
      this.handleContentUpdate(answerElement);
    }, 150); // Poll every 150ms for this specific answer element
  }

  // Handle content updates in real-time
  handleContentUpdate(answerElement) {
    if (!answerElement || !this.floatingWindow) return;
    
    const currentContent = answerElement.textContent || '';
    const currentInnerHTML = answerElement.innerHTML || '';
    
    // Check both text content and HTML structure changes
    const hasTextChanged = this.lastAnswerContent !== currentContent;
    const hasStructureChanged = this.lastAnswerHTML !== currentInnerHTML;
    
    if (hasTextChanged || hasStructureChanged) {
      console.log('FloatingChat: Real-time content update detected', {
        textChanged: hasTextChanged,
        structureChanged: hasStructureChanged,
        contentLength: currentContent.length
      });
      
      this.lastAnswerContent = currentContent;
      this.lastAnswerHTML = currentInnerHTML;
      
      // Update the stored response content
      if (this.responses.length > 0) {
        const latestResponse = this.responses[this.responses.length - 1];
        latestResponse.content = currentContent.substring(0, 100) + '...';
        latestResponse.answerElement = answerElement; // Update element reference
        
                 // Force update floating window if we're viewing the latest response
         if (this.currentResponseIndex === this.responses.length - 1 || this.currentResponseIndex === -1) {
           this.updateFloatingWindowWithQA(latestResponse);
           
           // Add visual indicator for real-time updates
           if (this.floatingWindow) {
             this.floatingWindow.classList.add('updating');
             setTimeout(() => {
               this.floatingWindow.classList.remove('updating');
             }, 200);
           }
         }
      }
    }
  }

  // Store new response for navigation
  storeNewResponse(answerElement) {
    // Try to find the corresponding question
    const questionElement = this.findCorrespondingQuestion(answerElement);
    
    const responseData = {
      answerElement: answerElement,
      questionElement: questionElement,
      timestamp: Date.now(),
      content: answerElement.textContent ? answerElement.textContent.substring(0, 100) + '...' : 'Response',
      index: this.responses.length
    };
    
    this.responses.push(responseData);
    this.currentResponseIndex = this.responses.length - 1;
    
    console.log(`FloatingChat: Stored response ${this.currentResponseIndex}:`, responseData.content);
    console.log(`FloatingChat: Question found:`, !!questionElement);
    
    // Update navigation controls if window exists
    if (this.floatingWindow) {
      this.updateNavigationControls();
    }
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
        question: '.user-message, .user-query, [data-role="user"], .human-message',
        content: '.user-message-text, .query-content, .user-content'
      },
      deepseek: {
        question: '.user-message, [class*="user"], .human-message',
        content: '.user-content, .human-message-text'
      }
    };

    return selectors[this.platform];
  }

  // Navigate to a specific response
  navigateToResponse(index) {
    if (index < 0 || index >= this.responses.length) {
      console.log(`FloatingChat: Invalid response index: ${index}`);
      return;
    }
    
    this.currentResponseIndex = index;
    const response = this.responses[index];
    
    console.log(`FloatingChat: Navigating to response ${index}:`, response.content);
    
    this.updateFloatingWindowWithQA(response);
    this.updateNavigationControls();
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
      titleText.textContent = 'Latest Answer';
    }
  }

  // New method to update floating window with both question and answer
  updateFloatingWindowWithQA(responseData) {
    if (!this.floatingWindow || !this.isEnabled) return;

    console.log(`FloatingChat: Updating floating window with Q&A`);

    const content = this.floatingWindow.querySelector('.floating-chat-content');
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
      }
    }

    // Add answer
    console.log(`FloatingChat: Adding answer to floating window`);
    const answerContainer = document.createElement('div');
    answerContainer.className = 'answer-container';
    
    const answerContent = this.extractContent(responseData.answerElement, 'answer');
    if (answerContent) {
      const clonedAnswer = answerContent.cloneNode(true);
      this.cleanupClonedContent(clonedAnswer);
      answerContainer.appendChild(clonedAnswer);
      qaContainer.appendChild(answerContainer);
    }

    content.appendChild(qaContainer);
    content.scrollTop = 0;

    // Add visual feedback
    this.floatingWindow.classList.add('new-content');
    setTimeout(() => {
      this.floatingWindow.classList.remove('new-content');
    }, 1000);

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
          if (found && found.textContent.trim().length > 0) {
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
        const fallbackSelectors = [
          '.font-claude-message',
          '.prose',
          '[data-testid="message"] > div > div',
          'div'
        ];
        
        for (const selector of fallbackSelectors) {
          const found = element.querySelector(selector);
          if (found && found.textContent.trim().length > 10) {
            content = found;
            break;
          }
        }
      } else if (this.platform === 'deepseek') {
        const fallbackSelectors = [
          '.ds-markdown',
          '.ds-markdown-paragraph',
          '._7eb2358 svg + div',
          'div[class*="markdown"]',
          'div'
        ];
        
        for (const selector of fallbackSelectors) {
          const found = element.querySelector(selector);
          if (found && found.textContent.trim().length > 10) {
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
          hasAnswer: !!this.lastAnswerElement,
          totalResponses: this.responses.length,
          currentIndex: this.currentResponseIndex
        });
        break;
      case 'navigateResponse':
        this.navigateToResponse(request.index);
        sendResponse({ success: true, currentIndex: this.currentResponseIndex });
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
      if (this.lastAnswerElement && this.responses.length > 0) {
        const latestResponse = this.responses[this.responses.length - 1];
        this.updateFloatingWindowWithQA(latestResponse);
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