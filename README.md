# MarkSense

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://developer.chrome.com/docs/extensions/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline-green)](https://github.com/clin1230/marksense)

## ✨ Features

### Core Capabilities

- 📝 **Text Highlighting** - Mark important passages or confusing sections with visual highlights
- ⌨️ **Keyboard Shortcuts** - Quick marking with Alt+I (important) and Alt+Q (confused)
- 📄 **Content Extraction** - Extract clean text from articles using Mozilla Readability
- 🤖 **Chrome Built-in AI** - Powered by Gemini Nano for intelligent summarization (Chrome 138+)
- 🔄 **Smart Fallback** - Automatic fallback to rule-based processing if AI unavailable
- 🔍 **Keyword Analysis** - Frequency-based keyword extraction supporting English and Chinese
- 💾 **Persistent Notes** - All highlights and notes saved locally, restored on page revisit
- 📤 **Markdown Export** - Copy or download your notes as Markdown files
- 🎯 **No Build Step** - Pure HTML/CSS/JS for transparency and easy auditing

### Security Features

- 🔐 **Strict CSP** - `connect-src 'none'` blocks all network access
- 🚫 **No Host Permissions** - Minimal permissions, maximum privacy
- 🛡️ **Content Sanitization** - DOMPurify prevents XSS attacks
- 📦 **Local Libraries Only** - All dependencies are local static files

---

## 📦 Installation

### Method 1: Load Unpacked (Development)

1. **Download or clone this repository**

   ```bash
   git clone https://github.com/yourusername/smartnote_ai.git
   cd smartnote_ai
   ```

2. **Download required libraries** (see [Library Setup](#library-setup) below)

3. **Open Chrome Extensions page**

   - Navigate to `chrome://extensions/`
   - Or: Menu → Extensions → Manage Extensions

4. **Enable Developer Mode**

   - Toggle the switch in the top-right corner

5. **Load the extension**

   - Click **"Load unpacked"**
   - Select the `smartnote_ai` folder
   - Extension icon should appear in your toolbar

6. **Verify installation**
   - Click the extension icon
   - Side panel should open on the right
   - Check browser console for "SmartNote AI" logs

### Method 2: Chrome Web Store (Coming Soon)

_Extension will be published to the Chrome Web Store after third-party library integration._

---

## 📚 Library Setup

The `libs/` folder contains placeholder files. Download these open-source libraries manually for full functionality:

### 1. Mozilla Readability

Extract clean article text from web pages.

- **Source**: https://github.com/mozilla/readability/releases
- **File**: `Readability.js` (standalone version)
- **Save as**: `libs/readability.js`
- **License**: Apache 2.0

### 2. PDF.js

Parse and process PDF documents.

- **Source**: https://github.com/mozilla/pdf.js/releases
- **Files**: `pdf.min.js` and `pdf.worker.min.js`
- **Save as**: `libs/pdf.min.js` and `libs/pdf.worker.min.js`
- **License**: Apache 2.0

### 3. DOMPurify

Sanitize HTML to prevent XSS attacks.

- **Source**: https://github.com/cure53/DOMPurify/releases
- **File**: `purify.min.js`
- **Save as**: `libs/dompurify.min.js`
- **License**: Apache 2.0 / MPL 2.0

**Note**: Extension works without these libraries but with reduced functionality (falls back to basic text extraction).

---

## 🚀 Usage Guide

### Highlighting Text

**Method 1: Mouse Selection + Toolbar**

1. Select text on any webpage
2. Floating toolbar appears above selection
3. Click ⭐ (important) or ❓ (confused)
4. Text is highlighted and saved locally

**Method 2: Keyboard Shortcuts**

1. Select text on any webpage
2. Press `Alt+I` for important or `Alt+?` for confused
3. Text is highlighted and saved locally

### Extracting & Summarizing Content

1. **Open side panel** - Click extension icon
2. **Extract text** - Click "抽取正文" button
   - Uses Readability for clean article extraction
   - Falls back to basic text if Readability unavailable
3. **View keywords** - Automatically generated after extraction
4. **Generate summary** - Click "產生摘要"
   - Choose tone: 簡潔/專業/學術
   - Choose length: 單句/重點/詳細
5. **Export** - Copy as Markdown or download `.md` file

### Managing Highlights

- **View highlights** - Open side panel → "我的標註" section
- **Filter by page** - Only shows highlights for current URL
- **Click to navigate** - Click a highlight to scroll to it on the page
- **Persistent storage** - Highlights restore on page reload

---

## 🔧 Technical Architecture

### Project Structure

```
smartnote_ai/
├── manifest.json           # MV3 manifest with strict CSP
├── sw.js                   # Service worker (background script)
├── content.js              # Content script (page interaction)
├── content.css             # Highlight styles
├── sidepanel.html          # Side panel UI (Traditional Chinese)
├── sidepanel.js            # Side panel logic
├── libs/                   # Third-party local libraries
│   ├── readability.js      # Mozilla Readability
│   ├── pdf.min.js          # PDF.js library
│   ├── pdf.worker.min.js   # PDF.js worker
│   └── dompurify.min.js    # DOMPurify sanitizer
└── utils/                  # Utility modules
    ├── anchor.js           # Text anchoring & highlighting
    ├── chunking.js         # Smart text chunking
    ├── storage.js          # chrome.storage.local wrapper
    └── aisdk.js            # AI processing (Chrome Built-in + fallback)
```

### Content Security Policy

```json
"content_security_policy": {
  "extension_pages": "default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; worker-src 'self' blob:"
}
```

**Key restrictions:**

- `connect-src 'none'` - Blocks all network requests (fetch, XHR, WebSocket)
- `default-src 'self'` - Only loads resources from extension itself
- `script-src 'self'` - No inline scripts or external JS
- No eval(), no remote code execution

### AI Processing - Chrome Built-in (Gemini Nano)

**✅ INTEGRATED: Summarizer API (Chrome 138+)**

The extension now uses Chrome's built-in Summarizer API when available:

- **On-Device AI**: Gemini Nano runs entirely on your device
- **Zero Network Calls**: Model downloaded once, processes locally forever
- **Smart Fallback**: Automatically uses rule-based summarization if API unavailable
- **No API Keys**: No external AI services, no authentication required
- **Privacy-Preserving**: All inference happens locally

**How to enable:**

1. Use Chrome 138+ (Canary, Dev, or Stable)
2. Enable flags at `chrome://flags/`:
   - `#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
   - `#summarization-api-for-gemini-nano` → Enabled
3. Download model at `chrome://components/` → "Optimization Guide On Device Model"

**API Status:**

- ✅ Summarizer API - Integrated (Chrome 138+)
- ⏳ Rewriter API - Planned
- ⏳ Translator API - Planned
- ⏳ Prompt API - Planned

---

## 🐛 Troubleshooting

### Extension not loading

- **Check file integrity**: Ensure all required files exist
- **Review errors**: `chrome://extensions/` → "Errors" button
- **Browser console**: Look for JavaScript errors

### Side panel not opening

- **Chrome version**: Requires Chrome 114+ for Side Panel API
- **Permissions**: Verify `sidePanel` permission in manifest
- **Restart Chrome**: Sometimes needed after installation

### Libraries not working

- **Verify downloads**: Check `libs/` folder has actual library files (not placeholders)
- **File names**: Must match exactly (`readability.js`, not `Readability.js`)
- **Console errors**: Check for 404s in DevTools → Console

### Highlights not persisting

- **Storage permissions**: Verify `storage` permission in manifest
- **Check storage**: DevTools → Application → Storage → Extension Storage
- **Clear and retry**: Remove extension, reinstall, test again

### CSP errors

- **Expected behavior**: CSP blocks network calls by design
- **Check Network tab**: Should show zero requests
- **If seeing CSP violations**: This is the security working correctly

### No keywords extracted

- **Text length**: Ensure extracted text is substantial (>100 chars)
- **Language support**: Works best with English and Chinese
- **Stop words**: Very common words are filtered out

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/smartnote_ai/issues)
- **Security**: Report vulnerabilities privately to security@example.com
- **Privacy**: Read our [Privacy Policy](PRIVACY.md)

---

## 🙏 Acknowledgments

- [Mozilla Readability](https://github.com/mozilla/readability) - Article extraction
- [PDF.js](https://github.com/mozilla/pdf.js) - PDF processing
- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitization
- Chrome Extensions Team - MV3 and Side Panel API
