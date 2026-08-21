# SocialShare - Blog & Article Extractor Browser Extension

A high-performance **Manifest V3 Browser Extension** that extracts titles, descriptions, preview images, and tags from any blog post or article and enables 1-click sharing across all major social media networks with customizable templates and instant copy utilities.

---

## ✨ Features

- ⚡ **Instant Active Tab Extraction**: Automatically pulls the title, description, high-resolution preview images, author, site name, and hashtags from the open blog post.
- 🌐 **External URL Scraper**: Paste any blog or news article link to fetch its metadata on the fly without navigating away.
- 🤖 **Hands-Free Background Auto-Post**:
  - **Global Keyboard Shortcut**: Press <kbd>Alt + Shift + S</kbd> on any blog post to immediately auto-extract and auto-post to all selected channels in the background!
  - **Right-Click Context Menu**: Right-click anywhere on an article -> *"⚡ Instant Auto-Post to Social Media"*.
  - **Auto-Post on Popup Open**: Toggle to automatically trigger the post sequence as soon as the extension is opened.
  - **Multi-Platform Batching**: Sequentially prepares posts for Twitter, LinkedIn, Threads, Reddit, Facebook, TikTok, YouTube, etc. with anti-duplicate variations.
- 📔 **Visual Note Card Maker (Like Viral Twitter/TikTok Posts)**:
  - Generate aesthetic downloadable/copyable image cards:
    - 📔 **Spiral Notebook** (lined paper with realistic spiral rings and handwriting font, perfect for riddles, logic hooks, and quotes!).
    - 🟨 **Sticky Note** (yellow paper note with pin and bold typography).
    - 🌌 **Dark Glassmorphic Card** (glowing cyber gradient with glass cards).
  - 1-Click **"Download Note Image"** and **"Copy Image"** to clipboard.
- 🧠 **Viral Hook & Engagement Templates**:
  - **Riddle / Logic Hook**: *"No hints. No clue. Just pure logic...! What's your answer? 👇"*
  - **Curiosity 99%**: *"99% of people get this wrong! 🤔"*
  - **Standard**, **Casual**, **Professional**, **Minimal**, **Hook 🔥**.
- 🎨 **Live Preview & Post Editor**:
  - Live preview card with editable title, description, and link.
  - Image selector carousel to pick between all detected images or paste a custom image URL.
  - Interactive hashtag manager (add, edit, or remove tags with 1-click).
  - Clean URL button to strip tracking parameters (`utm_*`, `fbclid`, etc.).
- 🚀 **1-Click Share to 12+ Platforms**:
  - **𝕏 / Twitter**
  - **LinkedIn**
  - **Facebook**
  - **WhatsApp**
  - **Telegram**
  - **Reddit**
  - **Threads**
  - **Pinterest**
  - **TikTok** (Auto-caption generator & upload portal)
  - **YouTube** (Community post & description generator)
  - **Bluesky**
  - **Email**
- 📋 **Quick Copy Utilities**:
  - **Copy Full Post**: Formatted with chosen template (Standard, Casual, Professional, Minimal, Hook).
  - **Copy Markdown**: Formatted as Markdown link / card.
  - **Copy HTML**: Embeddable HTML card.
  - **Copy Clean URL**: One-click URL copy.
- 🖱️ **Context Menu Integration**: Right-click on any page or link and click *"Share with SocialShare"*.
- 💎 **Modern Aesthetic UI**: Dark glassmorphic theme with glowing accents, micro-animations, and fast keyboard shortcuts.

---

## 🚀 How to Install & Load the Extension

### Google Chrome / Brave / Edge / Chromium Browsers

1. Open your browser and go to:
   - **Chrome**: `chrome://extensions`
   - **Brave**: `brave://extensions`
   - **Edge**: `edge://extensions`
2. Turn on **"Developer mode"** (toggle in top-right corner).
3. Click the **"Load unpacked"** button.
4. Select the extension directory:
   ```
   /home/khadka27/Desktop/social-extension
   ```
5. The extension icon will appear in your browser toolbar! Pin it for quick access.

### Mozilla Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Select `manifest.json` from `/home/khadka27/Desktop/social-extension`.

---

## 📁 Project Structure

```
social-extension/
├── manifest.json              # Manifest V3 extension configuration
├── popup/
│   ├── popup.html             # Popup user interface
│   ├── popup.css              # Dark glassmorphic styling & animations
│   └── popup.js               # UI controller & event handlers
├── scripts/
│   ├── extractor.js           # OpenGraph, Twitter Cards, Schema.org parser
│   ├── content.js             # Active tab content script
│   ├── background.js          # Service worker (context menus, external fetch)
│   └── social-share.js        # Share intent builders & formatters
├── icons/                     # Extension icons (16, 32, 48, 128 px)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── test/
│   ├── test-extractor.js      # Unit tests for scraper & sharing engines
│   └── test-page.html         # Test blog page fixture
└── generate-icons.js          # Icon generator script
```

---

## 🧪 Testing

Run the built-in automated test suite:
```bash
node test/test-extractor.js
```
