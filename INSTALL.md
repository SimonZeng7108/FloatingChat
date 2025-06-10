# Installation Guide - FloatingChat Extension

## Quick Installation Steps

### 1. Prepare the Extension Files

Make sure you have all the required files in the FloatingChat directory:
- `manifest.json`
- `content.js`
- `background.js`
- `styles.css`
- `popup.html`
- `popup.js`
- `icons/` directory (with placeholder icons)

### 2. Open Chrome Extensions Page

1. Open Google Chrome
2. Navigate to `chrome://extensions/`
3. Or go to Menu → More Tools → Extensions

### 3. Enable Developer Mode

1. In the top-right corner of the extensions page
2. Toggle ON the "Developer mode" switch

### 4. Load the Extension

1. Click the "Load unpacked" button
2. Navigate to and select the FloatingChat folder
3. Click "Select Folder"

### 5. Verify Installation

1. You should see "FloatingChat - AI Platform Enhancer" in your extensions list
2. The extension icon should appear in your Chrome toolbar
3. Make sure the extension is enabled (toggle should be ON)

## Testing the Extension

### 1. Visit a Supported AI Platform

Navigate to one of these supported platforms:
- [ChatGPT](https://chatgpt.com/)
- [Claude](https://claude.ai/)
- [Gemini](https://gemini.google.com/app)
- [DeepSeek](https://chat.deepseek.com/)

### 2. Check Extension Status

1. Click the FloatingChat extension icon in your toolbar
2. You should see a popup showing the platform is detected
3. Ensure the toggle is enabled (green)

### 3. Start a Conversation

1. Ask the AI a question that will generate a response
2. When the AI responds, a floating window should appear
3. The floating window will show the latest AI response

### 4. Test Window Features

- **Drag**: Click and drag the window header to move it
- **Resize**: Drag the bottom-right corner to resize
- **Minimize**: Click the yellow minimize button
- **Close**: Click the red close button

## Troubleshooting

### Extension Not Loading

- Make sure Developer mode is enabled
- Check that all required files are present
- Try refreshing the extensions page and reloading

### No Floating Window Appearing

- Verify you're on a supported platform
- Check that the extension is enabled in the popup
- Try refreshing the page
- Open Developer Tools (F12) and check the Console for errors

### Window Not Responsive

- Try the "Reset Position" button in the extension popup
- The window might be positioned off-screen
- Refresh the page to reinitialize

## Updating the Extension

When you make changes to the code:

1. Go to `chrome://extensions/`
2. Find the FloatingChat extension
3. Click the refresh/reload button (circular arrow icon)
4. Refresh any open AI platform pages

## Uninstalling

To remove the extension:

1. Go to `chrome://extensions/`
2. Find the FloatingChat extension
3. Click "Remove"
4. Confirm the removal

## Icon Files (Optional)

The extension will work without icon files, but for a complete experience:

1. Create or download 16x16, 48x48, and 128x128 pixel PNG icons
2. Save them as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder
3. Reload the extension

---

**Need Help?** Check the main README.md file for detailed troubleshooting and usage information. 