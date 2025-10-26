# MarkSense

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://developer.chrome.com/docs/extensions/)
[![Privacy](https://img.shields.io/badge/Privacy-100%25%20Offline-green)](https://github.com/clin1230/marksense)
[![AI](https://img.shields.io/badge/AI-Gemini%20Nano-orange)](https://developer.chrome.com/docs/ai/built-in)

**100% Offline Smart Note-Taking Chrome Extension**

A privacy-first Chrome Extension (Manifest V3) for capturing, highlighting, and processing web content entirely offline using Chrome's built-in Gemini Nano AI. No external servers, no tracking, no data collection.

---

## 🔒 Privacy & Security Statement

**Copy this for Chrome Web Store listing:**

> MarkSense is committed to absolute user privacy. This extension:
>
> - **100% Offline Processing** - All text extraction, summarization, and keyword analysis happens locally on your device using Chrome's built-in Gemini Nano AI (integrated for summarization) and local rule-based algorithms
> - **Zero Network Calls** - Enforced by strict Content Security Policy (`connect-src 'none'`). The extension cannot and will not make any network requests
> - **No Data Collection** - We do not collect, transmit, or store any user data on external servers
> - **No Tracking or Analytics** - No usage statistics, no telemetry, no third-party analytics services
> - **Local Storage Only** - All your notes, highlights, and preferences are stored exclusively on your device using `chrome.storage.local` and IndexedDB
> - **No Remote Code Execution** - All code is bundled locally; no external scripts are loaded
> - **On-Device AI** - When available, uses Chrome's Gemini Nano running entirely on your device (Chrome 138+)
> - **Open Source** - Fully transparent codebase for security audits
>
> Your data stays on your device. Period.

---

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

## ✅ Manual Test Checklist

### Pre-Installation Tests

- [ ] Download all three libraries to `libs/` folder
- [ ] Verify file names match exactly
- [ ] Check browser version (Chrome 114+ for Side Panel API)

### Installation Tests

- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] Extension icon appears in toolbar
- [ ] No errors in browser console
- [ ] Side panel opens when clicking icon

### Text Highlighting Tests

- [ ] Select text on a webpage
- [ ] Floating toolbar appears above selection
- [ ] Click ⭐ button - text highlights in gold
- [ ] Click ❓ button - text highlights in red
- [ ] Toolbar disappears when selection collapses
- [ ] Highlights persist after page reload

### Keyboard Shortcut Tests

- [ ] Select text and press `Alt+I` - highlights as important
- [ ] Select text and press `Alt+?` - highlights as confused
- [ ] Works without toolbar visible
- [ ] No conflicts with browser shortcuts

### Content Extraction Tests

- [ ] Open side panel on a news article
- [ ] Click "抽取正文" - extracts clean article text
- [ ] Keywords appear in "關鍵字（本地）" section
- [ ] Works on blog posts and documentation pages
- [ ] Handles pages without article structure (fallback mode)
- [ ] Shows error message if page is empty or unsupported

### Summarization Tests

- [ ] Extract text first
- [ ] Click "產生摘要" - generates summary
- [ ] Try different tone options (簡潔/專業/學術)
- [ ] Try different length options (單句/重點/詳細)
- [ ] Works with long articles (>2000 chars)
- [ ] Handles short texts gracefully

### Marks Management Tests

- [ ] Create highlights on a page
- [ ] Open side panel - highlights appear in "我的標註"
- [ ] Shows correct type icons (⭐/❓)
- [ ] Displays creation timestamp
- [ ] Only shows marks for current URL
- [ ] Updates immediately when new highlight is added

### Export Tests

- [ ] Extract or summarize content
- [ ] Click "複製 Markdown" - copies to clipboard
- [ ] Button shows "✓ 已複製" confirmation
- [ ] Click "下載 .md" - downloads Markdown file
- [ ] File has correct filename (title + timestamp)
- [ ] UTF-8 encoding preserved (Chinese characters)

### Privacy & Security Tests

- [ ] Open DevTools → Network tab
- [ ] Use all extension features
- [ ] **Verify ZERO network requests are made**
- [ ] Check `chrome://extensions/` for errors related to CSP
- [ ] Inspect `chrome.storage.local` in DevTools → Application
- [ ] All data stored locally, no external API calls

### Edge Case Tests

- [ ] Use on PDF pages (with PDF.js)
- [ ] Use on pages with complex layouts (Twitter, Reddit)
- [ ] Use on dynamic content (SPAs, React apps)
- [ ] Test with very long selections (>10,000 chars)
- [ ] Test on pages with existing highlights
- [ ] Reload extension and verify data persists

### Browser Compatibility

- [ ] Chrome 114+ (for Side Panel API)
- [ ] Edge 114+ (Chromium-based)
- [ ] Brave (Chromium-based)
- [ ] Test on macOS, Windows, Linux

---

## 🛠️ Development

### Making Changes

Since this is a **no-build-step project**, development is straightforward:

1. Edit any `.js`, `.html`, or `.css` file
2. Go to `chrome://extensions/`
3. Click the **↻ Reload** button on SmartNote AI
4. Test your changes immediately

### Code Constraints

**Enforced by design and CSP:**

- ❌ No `fetch()` or `XMLHttpRequest`
- ❌ No WebSocket connections
- ❌ No npm/yarn/pnpm packages
- ❌ No build tools (webpack, vite, etc.)
- ❌ No remote fonts or assets
- ✅ Pure HTML/CSS/JS only
- ✅ Local libraries only
- ✅ Chrome APIs for functionality
- ✅ Transparent, auditable code

### Debugging

**Service Worker (sw.js):**

- `chrome://extensions/` → SmartNote AI → "Inspect views: service worker"

**Content Script (content.js):**

- Open any webpage → F12 DevTools → Console
- Look for "SmartNote AI content script loaded"

**Side Panel (sidepanel.js):**

- Open side panel → Right-click → "Inspect"
- Separate DevTools window for side panel

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

## 🔮 Roadmap

### v1.0 (Current)

- ✅ Text highlighting with visual markers
- ✅ Keyboard shortcuts (Alt+I, Alt+?)
- ✅ Content extraction with Readability
- ✅ Rule-based summarization and keywords
- ✅ Local storage and persistence
- ✅ Markdown export

### v1.1 (Planned)

- [ ] Chrome Gemini Nano integration for true AI summarization
- [ ] Translation feature (Alt+T) using local models
- [ ] PDF annotation support with PDF.js
- [ ] Bulk export all notes as ZIP
- [ ] Note search and filtering

### v1.2 (Future)

- [ ] Sync across devices via Chrome Sync (optional, user-controlled)
- [ ] Custom highlight colors and styles
- [ ] Note tagging and categorization
- [ ] Full-text search across all notes
- [ ] Browser history integration

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Keep code pure JS (no build step)
4. Ensure no network calls (verify with DevTools)
5. Test manually using checklist above
6. Submit pull request

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

---

## ✅ Quick Manual QA Checklist

**For developers testing the extension:**

### 1. Load & Setup

```bash
# Load extension at chrome://extensions/ (Developer mode → Load unpacked)
# Open any article page (e.g., news site, blog post, Medium)
```

### 2. Text Highlighting

- **Select text** on the page
- **Verify**: Floating toolbar appears with ⭐ / ❓ buttons
- **Click ⭐** (important) → Gold highlight applied
- **Click ❓** (confused) → Red highlight applied
- **Verify**: Highlight persists after page reload
- **Check storage**: DevTools → Application → Storage → Extension Storage → `smartnote_records`

### 3. Side Panel - Content Extraction

- **Open side panel** (click extension icon)
- **Click "抽取正文"** button
- **Verify**:
  - Article text appears in textarea
  - Keywords render in "關鍵字（本地）" section
  - No errors in console

### 4. Side Panel - Summarization

- **Click "產生摘要"** button
- **Verify**:
  - Bullet points appear in textarea
  - Summary is coherent
  - Tone/length controls work

### 5. Export Functions

- **Click "複製 Markdown"**
  - Button shows "✓ 已複製"
  - Paste anywhere → Markdown formatted text
- **Click "下載 .md"**
  - File downloads with `.md` extension
  - Opens correctly in text editor
  - UTF-8 encoding preserved

### 6. Privacy Verification (CRITICAL)

- **Open side panel DevTools**: Right-click side panel → Inspect
- **Go to Network tab**
- **Perform ALL actions**: Extract, summarize, copy, download, highlight
- **✅ PASS**: Network tab remains **completely empty** (zero requests)
- **❌ FAIL**: Any network activity detected

### 7. Permissions Check

- **Go to** `chrome://extensions/` → SmartNote AI → Details
- **Verify**:
  - ✅ Site access: "On click" or "On specific sites" (NOT "On all sites")
  - ✅ No host permissions requested
  - ✅ No analytics or tracking libraries
  - ✅ Permissions list: storage, scripting, activeTab, sidePanel, contextMenus, commands

### 8. Keyboard Shortcuts

- **Select text** on page
- **Press Alt+I** → Highlights as important (gold)
- **Press Alt+?** (Alt+Shift+/) → Highlights as confused (red)
- **Verify**: Works without toolbar visible

### Quick Pass/Fail

```
[ ] Highlights work (⭐ gold, ❓ red)
[ ] Highlights persist after reload
[ ] Text extraction works
[ ] Keywords display
[ ] Summary generates
[ ] Copy Markdown works
[ ] Download .md works
[ ] Network tab is EMPTY (0 requests)
[ ] No host permissions
[ ] Keyboard shortcuts work
```

---

**Made with privacy in mind. Your data is yours alone.**
