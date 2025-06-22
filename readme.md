<div align="center">

# 🚀 FloatingChat - AI History Navigator

**Never scroll back again - Navigate your complete AI conversation history instantly**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/SimonZeng7108/FloatingChat)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://chrome.google.com/webstore)
[![Platform Support](https://img.shields.io/badge/platforms-4%20supported-brightgreen.svg)](#supported-platforms)

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Platforms](#supported-platforms) • [Changelog](#version-history)

</div>

---

## 📋 Overview

FloatingChat is a **game-changing Chrome extension** that solves the biggest frustration with AI chats: **never having to scroll back again**. It creates floating windows that store your **complete Q&A history** with instant navigation, letting you access any previous response while continuing your conversation.

<div align="center">

![FloatingChat Demo](demo.gif)

*Watch FloatingChat in action - seamlessly integrates with AI platforms to provide floating response windows*

</div>

### 🎯 Why FloatingChat?

- **🔄 No More Scrolling Back!** - Access your entire Q&A history instantly without losing your place
- **📚 Complete Conversation Archive** - Every question and answer pair stored and navigable in the floating window
- **⚡ Stay in Context** - Continue asking new questions while reviewing previous responses
- **🎯 Focus on What Matters** - Keep important answers visible while the main chat continues
- **🎨 Seamless Integration** - Works natively with all major AI platforms without disrupting your workflow

---

## ✨ Features

### 📚 **Revolutionary History Navigation**
- **Complete Q&A Archive** - Every question and answer automatically stored and accessible
- **Instant Access** - Jump to any previous response without scrolling through long conversations
- **Context Preservation** - Continue asking new questions while reviewing old answers
- **Navigation Controls** - Simple ← → buttons to browse through your entire conversation history
- **Session Memory** - Responses persist throughout your chat session for easy reference

### 🤖 **Multi-Platform Support**
- **ChatGPT** (chatgpt.com) - Full conversation tracking with streaming detection
- **Claude** (claude.ai) - Research mode support with content extraction
- **Gemini** (gemini.google.com) - Smart placeholder handling and real-time updates
- **DeepSeek** (chat.deepseek.com) - Complete integration with question detection

### 🪟 **Smart Window Management**
- **Draggable & Resizable** - Position windows exactly where you need them
- **Auto-positioning** - Intelligent placement that doesn't interfere with your workflow
- **Memory** - Remembers your preferred window size and position
- **Multi-window Prevention** - Smart detection prevents duplicate windows

### 📱 **Responsive Design**
- **Light & Dark Mode** - Automatically adapts to your system theme
- **Clean Interface** - Apple-inspired design with smooth animations
- **Accessibility** - High contrast and keyboard navigation support
- **Mobile-friendly** - Works on touch interfaces

### ⚡ **Performance Optimized**
- **Real-time Monitoring** - Efficient DOM observation with minimal overhead
- **Smart Debouncing** - Prevents unnecessary updates during AI generation
- **Error Recovery** - Automatic recovery from connection issues
- **Validation System** - Ensures data integrity across sessions

---

## 🚀 Installation

### Quick Install (Recommended)

1. **Download the Extension**
   ```bash
   git clone https://github.com/SimonZeng7108/FloatingChat.git
   cd FloatingChat
   ```

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked" and select the FloatingChat folder
   - The extension icon should appear in your toolbar

3. **Verify Installation**
   - Visit any [supported AI platform](#supported-platforms)
   - Click the FloatingChat icon to ensure it's detecting the platform
   - Start a conversation to see the floating window in action

### Alternative: Chrome Web Store
*Coming soon - Extension is currently in review*

---

## 📖 Usage

### 🎬 See It In Action

The demo above shows FloatingChat's **game-changing history navigation feature**. Notice how you can:

- 🔄 **Browse Complete Q&A History** - Use ← → buttons to navigate through all previous question-answer pairs
- ⚡ **No Scrolling Required** - Access any previous response instantly without losing your current position
- 🎯 **Seamless Context Switching** - Review old answers while continuing to ask new questions
- 📚 **Complete Conversation Archive** - Every question and AI response is automatically captured and stored
- 🖱️ **Effortless Navigation** - Simple previous/next controls make browsing your conversation history intuitive

### Getting Started

1. **Enable the Extension**
   - Click the FloatingChat icon in your Chrome toolbar
   - Ensure the toggle is enabled (green)
   - The status should show "Active"

2. **Start Chatting**
   - Visit any supported AI platform
   - Ask a question or start a conversation
   - A floating window will automatically appear with the AI's response

3. **Navigate Your Q&A History**
   - **Browse History**: Use ← → buttons to navigate through ALL your previous questions and answers
   - **No More Scrolling**: Access any response instantly without losing your place in the main chat
   - **Move & Resize**: Drag the window by its header, resize by dragging the corner
   - **Close**: Click the × button or toggle off in the popup

### Advanced Features

#### 🔄 **The Game Changer: History Navigation**
- **Zero Scrolling** - Never scroll back through long conversations again
- **Instant Q&A Access** - Jump to any previous question-answer pair with one click
- **Complete Archive** - Every response automatically captured and indexed
- **Context Switching** - Review old answers while continuing to ask new questions
- **Content Preservation** - Images, code blocks, and formatting perfectly maintained

#### 🎛️ Window Controls
- **Smart Positioning** - Windows avoid overlapping with platform UI
- **Persistent Settings** - Size and position remembered across sessions
- **Multi-response Support** - Handle multiple AI responses seamlessly

#### 🔧 Troubleshooting
- **Auto-recovery** - Extension automatically recovers from errors
- **Manual Reset** - Use the popup to reset window position if needed
- **Debug Mode** - Console logging available for troubleshooting

---

## 🌐 Supported Platforms

<table align="center">
  <tr>
    <th>Platform</th>
    <th>URL</th>
    <th>Features</th>
    <th>Status</th>
  </tr>
  <tr>
    <td><strong>ChatGPT</strong></td>
    <td>chatgpt.com</td>
    <td>Full support, streaming detection</td>
    <td>✅ Fully Supported</td>
  </tr>
  <tr>
    <td><strong>Claude</strong></td>
    <td>claude.ai</td>
    <td>Research mode, content extraction</td>
    <td>✅ Fully Supported</td>
  </tr>
  <tr>
    <td><strong>Gemini</strong></td>
    <td>gemini.google.com</td>
    <td>Placeholder handling, real-time updates</td>
    <td>✅ Fully Supported</td>
  </tr>
  <tr>
    <td><strong>DeepSeek</strong></td>
    <td>chat.deepseek.com</td>
    <td>Question detection, response tracking</td>
    <td>✅ Fully Supported</td>
  </tr>
</table>

---

## 🛠️ Technical Details

### Architecture
- **Content Script**: Main functionality and DOM manipulation
- **Background Script**: Extension lifecycle and tab management  
- **Popup Interface**: User controls and status display
- **Storage System**: Chrome sync storage for settings persistence

### Browser Compatibility
- **Chrome**: Fully supported (88+)
- **Edge**: Compatible with Chrome extensions
- **Firefox**: Not currently supported (Chrome extension APIs)

### Performance
- **Memory Usage**: < 5MB typical
- **CPU Impact**: Minimal (<1% on average)
- **Network**: No external requests (fully local)

---

## 📊 Version History

### Version 1.0.0 (Current)
**Release Date**: *Latest*
- 🎉 **Initial Release**
- ✅ Support for 4 major AI platforms
- ✅ Draggable and resizable floating windows
- ✅ Response navigation system
- ✅ Error recovery and validation
- ✅ Dark/light mode support
- ✅ Performance optimizations

---

## 🤝 Contributing

**We actively welcome and encourage contributions!** Whether you're fixing bugs, adding features, improving documentation, or enhancing performance, your help makes FloatingChat better for everyone.

### 🎯 Ways to Contribute

#### 🐛 **Bug Reports & Issues**
Found a bug? We want to know about it!
- 📋 Check [existing issues](https://github.com/SimonZeng7108/FloatingChat/issues) first
- 🔍 Provide detailed reproduction steps
- 💻 Include browser version, platform, and error messages
- 📸 Screenshots or screen recordings are super helpful!

#### 💡 **Feature Requests & Ideas**
Have an idea to make FloatingChat even better?
- 🔍 Search existing feature requests to avoid duplicates
- 🎯 Explain the use case and how it would benefit users
- 💭 Consider implementation complexity and scope
- 🗳️ Vote on existing features you'd like to see

#### 🚀 **Pull Requests Welcome!**
Ready to contribute code? We'd love your PR!

**Popular contribution areas:**
- 🌐 **New Platform Support** - Add support for additional AI platforms
- 🎨 **UI/UX Improvements** - Enhance design, animations, or user experience
- ⚡ **Performance Optimizations** - Make the extension faster and lighter
- 🔧 **Bug Fixes** - Fix existing issues or edge cases
- 📝 **Documentation** - Improve README, code comments, or help content
- 🧪 **Testing** - Add tests or improve test coverage

#### 🛠️ **Getting Started with Development**

1. **Fork & Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/FloatingChat.git
   cd FloatingChat
   ```

2. **Make Your Changes**
   - Create a feature branch: `git checkout -b feature/your-feature-name`
   - Make your improvements
   - Test on all supported platforms (ChatGPT, Claude, Gemini, DeepSeek)

3. **Submit Your PR**
   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   git push origin feature/your-feature-name
   ```
   Then open a Pull Request on GitHub!

### 📋 **PR Guidelines**

✅ **Before submitting:**
- ✔️ Test on all supported AI platforms
- ✔️ Follow existing code style and patterns
- ✔️ Add JSDoc comments for new functions
- ✔️ Update documentation if needed
- ✔️ Ensure no breaking changes to existing functionality

📝 **In your PR description:**
- Clearly describe what your changes do
- Link any related issues
- Include screenshots/GIFs for UI changes
- Mention any potential breaking changes

### 🏆 **Recognition**

All contributors will be:
- 🌟 Listed in our contributors section
- 🎉 Mentioned in release notes for significant contributions
- 💝 Given full credit for their work

**First-time contributor?** We're especially excited to help you get started! Don't hesitate to ask questions in issues or discussions.

---

## 📞 Support & Contact

### 🆘 Getting Help
- **Issues**: [GitHub Issues](https://github.com/SimonZeng7108/FloatingChat/issues)
- **Discussions**: [GitHub Discussions](https://github.com/SimonZeng7108/FloatingChat/discussions)
- **Email**: simon7108528@gmail.com

### 📬 Author
**Simon Zeng**
- GitHub: [@SimonZeng7108](https://github.com/SimonZeng7108)
- Email: simon7108528@gmail.com

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Thanks to the Chrome Extensions team for excellent API documentation
- Inspired by the need for better AI chat management tools
- Built with ❤️ for the AI community

---

<div align="center">

**⭐ Star this repo if FloatingChat enhances your AI experience!**

[⬆ Back to Top](#-floatingchat---ai-platform-enhancer)

</div> 