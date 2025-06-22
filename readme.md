<div align="center">

# FloatingChat
## AI History Navigator

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/SimonZeng7108/FloatingChat)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-yellow.svg)](https://chrome.google.com/webstore)
[![Platforms](https://img.shields.io/badge/platforms-4%20supported-brightgreen.svg)](#supported-platforms)

**Navigate your AI conversation history without scrolling**

</div>

---

## 📖 Overview

FloatingChat creates floating windows that capture questions and answers from your AI conversations. Instead of scrolling up through long chats to find previous responses, you can use navigation buttons to browse through your Q&A history.

<div align="center">

![FloatingChat Demo](demo.gif)

*Seamless history navigation across AI platforms*

</div>

## 🚀 Features

<table>
<tr>
<td width="50%">

**📱 Smart Window Management**
- Draggable and resizable interface
- Remembers position and size
- Auto-positioning to avoid UI conflicts

</td>
<td width="50%">

**🔄 History Navigation**
- Navigate with ← → buttons
- No scrolling through long conversations
- Instant access to any Q&A pair

</td>
</tr>
<tr>
<td>

**🎨 Theme Support**
- Works with dark and light themes
- Consistent styling across platforms
- Clean, modern interface

</td>
<td>

**⚡ Performance**
- Lightweight DOM observation
- Minimal overhead
- Fast response capture

</td>
</tr>
</table>

## 🌐 Supported Platforms

<div align="center">

| Platform | URL | Status |
|----------|-----|---------|
| **ChatGPT** | chatgpt.com | ✅ Fully Supported |
| **Claude** | claude.ai | ✅ Fully Supported |
| **Gemini** | gemini.google.com | ✅ Fully Supported |
| **DeepSeek** | chat.deepseek.com | ✅ Fully Supported |

</div>

## 📥 Installation

```bash
# Clone the repository
git clone https://github.com/SimonZeng7108/FloatingChat.git
```

**Chrome Setup:**
1. Open `chrome://extensions/`
2. Enable "Developer mode" 
3. Click "Load unpacked"
4. Select the FloatingChat folder
5. Visit any supported AI platform

## 🎯 Usage

<table>
<tr>
<td width="30%">

**1. Enable Extension**
Click the FloatingChat icon in your toolbar

</td>
<td width="30%">

**2. Start Chatting**
Visit any supported platform and ask questions

</td>
<td width="30%">

**3. Navigate History**
Use ← → buttons to browse responses

</td>
</tr>
</table>

### Window Controls
- **Move:** Drag the window header
- **Resize:** Drag from the bottom-right corner
- **Navigate:** Use arrow buttons for history
- **Close:** Click the × button

## 🔧 Technical Details

<details>
<summary><b>Architecture Overview</b></summary>

| Component | Purpose |
|-----------|---------|
| **Content Script** | Main functionality and DOM manipulation |
| **Background Script** | Extension lifecycle management |
| **Popup Interface** | User controls and status display |
| **Storage System** | Chrome sync for preferences |

</details>

<details>
<summary><b>Performance Metrics</b></summary>

- **Memory Usage:** < 5MB typical
- **CPU Impact:** Minimal overhead
- **Storage:** Local Chrome sync only
- **Network:** No external requests

</details>

## 🤝 Contributing

We welcome contributions! Here's how to get started:

<table>
<tr>
<td width="33%">

**🐛 Bug Reports**
- Check existing issues first
- Provide reproduction steps
- Include browser/platform info

</td>
<td width="33%">

**💡 Feature Requests**
- Search existing requests
- Explain the use case
- Consider implementation scope

</td>
<td width="33%">

**🔨 Pull Requests**
- Fork and create feature branch
- Test on all platforms
- Follow existing code style

</td>
</tr>
</table>

### Development Setup
```bash
git checkout -b feature/your-feature
# Make changes and test
git commit -m "feat: description"
git push origin feature/your-feature
```

## 📋 Version History

| Version | Features |
|---------|----------|
| **1.0.0** | Initial release with multi-platform support, floating windows, and history navigation |

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

### 📧 Contact

**Simon Zeng**

[![GitHub](https://img.shields.io/badge/GitHub-SimonZeng7108-blue?logo=github)](https://github.com/SimonZeng7108)
[![Email](https://img.shields.io/badge/Email-simon7108528@gmail.com-red?logo=gmail)](mailto:simon7108528@gmail.com)

</div> 