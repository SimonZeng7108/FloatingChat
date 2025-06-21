# FloatingChat - AI Platform Enhancer

A Chrome extension that enhances usability on AI chat platforms by providing floating answer windows that display the latest AI responses independently of the main chat interface.

## Features

- **Automatic Platform Detection**: Automatically detects and works with ChatGPT, Claude, Gemini, and DeepSeek
- **Floating Answer Window**: Shows the latest AI response in a resizable, draggable floating window
- **Independent Scrolling**: Read long answers without affecting your main chat position
- **Response Pinning & Navigation**: Pin any response to read while asking new questions
- **Multi-Response History**: Navigate through all conversation responses with controls
- **Elegant Design**: Apple-inspired UI with light/dark mode support
- **Seamless Integration**: Works without interfering with normal platform operation
- **Persistent Settings**: Remembers window position, size, and preferences

## Supported Platforms

- **ChatGPT** (chatgpt.com) - Enhanced with scroll prevention
- **Claude** (claude.ai) 
- **Gemini** (gemini.google.com)
- **DeepSeek** (chat.deepseek.com)

## Enhanced Features

### Response Pinning & Navigation
This powerful feature allows you to multitask effectively:

**Pin Responses**: 
- Click the 📌 pin button to "freeze" the current response in the floating window
- Continue reading long responses while asking new questions
- Pinned responses won't be replaced by new ones

**Navigate Response History**:
- Use ◀ ▶ buttons to browse through all conversation responses
- See response counter (e.g., "3/7") showing current position
- Jump to any previous response instantly

**Auto-Update Mode** (default):
- Shows the latest response automatically
- Unpin to resume following the latest responses

### How It Works
1. **Response Storage**: Every AI response is automatically stored for navigation
2. **Independent Display**: Floating window operates independently from main chat scrolling
3. **Smart Multitasking**: Read long responses while continuing the conversation
4. **Visual Feedback**: Clear indicators show pinned state and navigation position

### Use Cases
- **Long Code Explanations**: Pin a code example while asking follow-up questions
- **Research Sessions**: Reference previous answers while exploring new topics  
- **Complex Tutorials**: Keep instructions visible while asking for clarification
- **Comparison Tasks**: Compare multiple responses side-by-side mentally

## Installation

### Option 1: Load as Unpacked Extension (For Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the extension directory
4. The FloatingChat extension should now appear in your extensions list

### Option 2: Chrome Web Store (Coming Soon)

The extension will be available on the Chrome Web Store once published.

## Usage

1. **Visit a Supported Platform**: Navigate to any of the supported AI chat platforms
2. **Start a Conversation**: Begin chatting with the AI as you normally would
3. **Automatic Detection**: The extension automatically detects the platform and monitors for responses
4. **Floating Window**: When the AI responds, a floating window appears with the latest answer
5. **Window Controls**:
   - **Drag**: Click and drag the header to reposition the window
   - **Resize**: Drag the corner handle to resize the window
   - **Minimize**: Click the yellow minimize button to collapse the window
   - **Close**: Click the red close button to hide the window

## Extension Controls

- **Popup Interface**: Click the extension icon to access settings
- **Toggle On/Off**: Enable or disable the floating window feature
- **Refresh**: Reload the extension status
- **Reset Position**: Reset window position and size to defaults
- **Help**: View usage instructions and troubleshooting tips

## File Structure

```
FloatingChat/
├── manifest.json          # Extension configuration
├── content.js             # Main content script
├── background.js          # Service worker
├── styles.css             # Floating window styles
├── popup.html             # Extension popup interface
├── popup.js               # Popup functionality
├── icons/                 # Extension icons
├── README.md              # This file
└── reference files/       # Platform layout references
    ├── chatgpt_layout.html
    ├── claude_layout.html
    ├── gemini_layout.html
    └── deepseek_layout.html
```

## Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension manifest version
- **Content Scripts**: Injected into supported AI platforms for DOM monitoring
- **Service Worker**: Handles background tasks and extension lifecycle
- **Storage API**: Persists user settings across sessions

### Platform Detection

The extension detects platforms by examining:
- Current URL hostname
- DOM structure patterns
- Platform-specific selectors

### Answer Monitoring

- Uses `MutationObserver` to detect new AI responses
- Fallback polling every 5 seconds for missed changes
- Multiple selector patterns for robustness across platform updates

### Floating Window Features

- **Draggable**: Click header to drag window anywhere on screen
- **Resizable**: Drag corner handle to adjust size
- **Minimizable**: Collapse to header-only view
- **Responsive**: Adapts to screen size and platform themes
- **Persistence**: Remembers position and size between sessions

## Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support required)
- **Edge**: Version 88+ (Chromium-based)
- **Other Chromium browsers**: Should work with Manifest V3 support

## Privacy & Permissions

The extension requires minimal permissions:

- **activeTab**: Access to current tab for platform detection
- **storage**: Save user preferences
- **host_permissions**: Access to supported AI platforms only

**No data collection**: The extension operates entirely locally and does not collect, store, or transmit any personal data or conversation content.

## Troubleshooting

### Common Issues

1. **Extension not working on supported site**:
   - Refresh the page
   - Check that the extension is enabled
   - Verify you're on a supported platform URL

2. **Floating window not appearing**:
   - Ensure the extension is toggled on in the popup
   - Start a new conversation to trigger AI response
   - Check browser console for error messages

3. **Window position lost**:
   - Use the "Reset Position" button in the popup
   - The window may be positioned off-screen

4. **Performance issues**:
   - The extension uses minimal resources
   - Try refreshing the page if performance degrades

### Advanced Debugging

1. Open Chrome DevTools (F12)
2. Check the Console tab for FloatingChat messages
3. Examine the extension popup for status information
4. Use `chrome://extensions/` to reload the extension if needed

## Development

### Prerequisites

- Chrome/Chromium browser with Developer mode enabled
- Basic knowledge of JavaScript, HTML, and CSS
- Understanding of Chrome Extension APIs

### Setup

1. Clone or download the extension files
2. Open `chrome://extensions/` in Chrome
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Make changes to the code
6. Click the refresh button in the extensions page to reload

### Testing

Test the extension on all supported platforms:
- Create conversations and verify floating window appears
- Test window dragging, resizing, and controls
- Verify settings persistence
- Check light/dark mode compatibility

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly on all supported platforms
5. Submit a pull request with a clear description

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Changelog

### Version 1.0.0 (Initial Release)
- Automatic platform detection for ChatGPT, Claude, Gemini, and DeepSeek
- Floating answer window with drag and resize functionality
- Light/dark mode support
- Settings persistence
- Popup interface for controls

## Support

For issues, questions, or feature requests:
- Check the troubleshooting section above
- Review the browser console for error messages
- Ensure you're using a supported platform and browser version

---

**FloatingChat** - Enhancing AI chat experiences with floating answer windows.
