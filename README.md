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

### User Experience:

#### Summarize Section

1. The user turns on the extension.

2. The user selects a context and clicks “Generate Summary.” The extension uses the **Summarizer API** to summarize the selected content.

3. The user can adjust the tone and length of the summary using dropdown controls.

4. By clicking “Copy Markdown,” the user can copy the summary in Markdown format.

5. By clicking “Download .md,” the user can export the summary directly as a Markdown file.

#### Keywords Section
After generating the summary, the extension automatically identifies important keywords. When the user clicks a keyword, the extension fetches three related articles along with their URLs. The user can then navigate to these external resources to learn more about the topic. This functionality is powered by the **Prompt API**.

#### My Highlights Section
1. The user can highlight words or phrases that they find important or confusing. These highlights are stored in this section. For confusing keywords, the extension also generates definitions using the Prompt API and displays them here.

2. When the user hovers over a highlight, a delete button appears, allowing them to easily remove it.


### User Interface:

#### Highlighting Text

**Method 1: Mouse Selection + Toolbar**


1. Select text on any webpage
2. Floating toolbar appears above selection
3. Click ⭐ (important) or ❓ (confused)
4. If users click ⭐, the text would be highlighted in yellow color. 
5. If users click ❓, the text would be highlighted in red color. 
6. These highlight keywords will show on //to be continue
7. Text is highlighted and saved locally

//Additional features
8. The generated summary becomes more tailored as the user highlights important content. The more important highlights the user adds, the more the summary will focus on and expand upon those key points.

**Method 2: Keyboard Shortcuts**

1. Select text on any webpage
2. Press `Alt+I` for important or `Alt+?` for confused
3. Text is highlighted and saved locally

### Summarize Section

1. **Open side panel** - Click extension icon
1. **Generate summary** - Click "產生摘要"
   - Choose tone: 簡潔/專業/學術
   - Choose length: 單句/重點/詳細
1. **Export** - Copy as Markdown or download `.md` file
1. **Google Built-in API** - Summarizer API

### Keywords Section
1. **View keywords** - Automatically generated after summarizing.
1. **Related articles** - Automatically generated 3 articles after users select a keyword.

### Managing Highlights

- **View highlights** - Open side panel → "我的標註" section. Each keyword shows their definitions and 
- **Filter by page** - Only shows highlights for current URL
- **Click to navigate** - Click a highlight to scroll to it on the page
- **Persistent storage** - Highlights restore on page reload
- **Google Built-in API** - Prompt API: 


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

**✅ INTEGRATED: Prompt API (Chrome 138+)**

The extension also uses Chrome's on-device Prompt API for custom prompting tasks:

- **Used for**: Generating keyword-related articles and concise definitions in `Keywords` and `我的標註`
- **On-Device AI**: Runs locally with Gemini Nano
- **Zero Network Calls**: Fully offline; respects strict CSP
- **Smart Fallback**: Falls back to deterministic templates if API unavailable
- **No API Keys**: Works out-of-the-box once enabled

**How to enable:**

1. Use Chrome 138+ (Canary, Dev, or Stable with on-device model)
2. Enable flags at `chrome://flags/`:
   - `#optimization-guide-on-device-model` → Enabled BypassPerfRequirement
   - `#prompt-api-for-gemini-nano` → Enabled
3. Download model at `chrome://components/` → "Optimization Guide On Device Model"

**Prompt usage in this extension:**

- For a selected keyword, the Prompt API is asked to return:
  - A brief definition suitable for tooltips
  - Three related article titles with short descriptions and URLs (when context permits)
- Prompts are concise and grounded in the page/context selection; outputs are sanitized before rendering.

**API Status:**

- ✅ Summarizer API - Integrated (Chrome 138+)
- ✅ Prompt API - Integrated (Chrome 138+)
- ⏳ Rewriter API - Planned
- ⏳ Translator API - Planned

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
