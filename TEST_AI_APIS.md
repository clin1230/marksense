# Testing Chrome Built-in AI APIs Locally

## Prerequisites

### 1. Chrome Version

You need **Chrome Canary or Dev channel (version 127+)**

Check your version:

- Open Chrome → Menu → Help → About Chrome
- Or navigate to `chrome://version/`

Download Chrome Canary: https://www.google.com/chrome/canary/

### 2. Enable Required Flags

Navigate to `chrome://flags/` and enable these flags:

```
chrome://flags/#optimization-guide-on-device-model
  → Set to: "Enabled BypassPerfRequirement"

chrome://flags/#prompt-api-for-gemini-nano
  → Set to: "Enabled"

chrome://flags/#summarization-api-for-gemini-nano
  → Set to: "Enabled"

chrome://flags/#translation-api
  → Set to: "Enabled"

chrome://flags/#rewriter-api
  → Set to: "Enabled"
```

**Restart Chrome** after enabling flags.

---

## Quick API Availability Check

### Method 1: Console Test (Fastest)

1. Open any webpage in Chrome
2. Open DevTools (F12)
3. Go to Console tab
4. Paste this code:

```javascript
// Check if AI namespace exists
console.log(
  "AI namespace:",
  "ai" in window ? "✅ Available" : "❌ Not available"
);

// Check individual APIs
if ("ai" in window) {
  // Summarizer API
  if (ai.summarizer) {
    ai.summarizer.capabilities().then((caps) => {
      console.log("📝 Summarizer:", caps);
    });
  } else {
    console.log("📝 Summarizer: ❌ Not available");
  }

  // Rewriter API
  if (ai.rewriter) {
    ai.rewriter.capabilities().then((caps) => {
      console.log("✏️ Rewriter:", caps);
    });
  } else {
    console.log("✏️ Rewriter: ❌ Not available");
  }

  // Translator API
  if (ai.translator) {
    ai.translator.capabilities().then((caps) => {
      console.log("🌍 Translator:", caps);
    });
  } else {
    console.log("🌍 Translator: ❌ Not available");
  }

  // Language Model (Prompt API)
  if (ai.languageModel) {
    ai.languageModel.capabilities().then((caps) => {
      console.log("🤖 Language Model:", caps);
    });
  } else {
    console.log("🤖 Language Model: ❌ Not available");
  }
} else {
  console.log("❌ window.ai is not available. Check Chrome version and flags.");
}
```

### Expected Output

**If APIs are available:**

```
AI namespace: ✅ Available
📝 Summarizer: {available: "readily", defaultTemperature: 0.7, ...}
✏️ Rewriter: {available: "readily", ...}
🌍 Translator: {available: "readily", ...}
🤖 Language Model: {available: "readily", defaultTemperature: 0.8, ...}
```

**If APIs are NOT available:**

```
AI namespace: ❌ Not available
❌ window.ai is not available. Check Chrome version and flags.
```

**If partially available:**

```
AI namespace: ✅ Available
📝 Summarizer: {available: "after-download", ...}
✏️ Rewriter: ❌ Not available
```

---

## Method 2: Test in Extension Context

Since MarkSense AI runs as an extension, test in the side panel:

1. Load the extension in Chrome
2. Open side panel (click extension icon)
3. Right-click inside side panel → **Inspect**
4. In the DevTools Console, run:

```javascript
// Check if AISDK can detect APIs
await AISDK.isAvailable();
// Returns: true if available, false otherwise

// Check window.ai directly
console.log("window.ai:", window.ai);
```

---

## Method 3: Full API Test

Test each API with actual operations:

### Test Summarizer API

```javascript
async function testSummarizer() {
  if (!window.ai?.summarizer) {
    console.log("❌ Summarizer not available");
    return;
  }

  try {
    const summarizer = await window.ai.summarizer.create({
      type: "key-points",
      format: "markdown",
      length: "medium",
    });

    const text = `
      Artificial intelligence is transforming how we interact with technology.
      Machine learning models can now understand natural language, generate images,
      and even write code. This revolution is making computers more accessible
      and useful for everyday tasks.
    `;

    const summary = await summarizer.summarize(text);
    console.log("✅ Summarizer works!");
    console.log("Summary:", summary);

    summarizer.destroy();
  } catch (error) {
    console.error("❌ Summarizer test failed:", error);
  }
}

testSummarizer();
```

### Test Language Model (Prompt API)

```javascript
async function testLanguageModel() {
  if (!window.ai?.languageModel) {
    console.log("❌ Language Model not available");
    return;
  }

  try {
    const model = await window.ai.languageModel.create({
      temperature: 0.0,
      topK: 1,
    });

    const result = await model.prompt("What is 2+2?");
    console.log("✅ Language Model works!");
    console.log("Response:", result);

    model.destroy();
  } catch (error) {
    console.error("❌ Language Model test failed:", error);
  }
}

testLanguageModel();
```

### Test Translator API

```javascript
async function testTranslator() {
  if (!window.ai?.translator) {
    console.log("❌ Translator not available");
    return;
  }

  try {
    const canTranslate = await window.ai.translator.capabilities({
      sourceLanguage: "en",
      targetLanguage: "es",
    });

    console.log("Translation capability (en→es):", canTranslate);

    if (canTranslate !== "no") {
      const translator = await window.ai.translator.create({
        sourceLanguage: "en",
        targetLanguage: "es",
      });

      const translated = await translator.translate("Hello, world!");
      console.log("✅ Translator works!");
      console.log("Translation:", translated);

      translator.destroy();
    }
  } catch (error) {
    console.error("❌ Translator test failed:", error);
  }
}

testTranslator();
```

---

## Troubleshooting

### Issue: `window.ai` is undefined

**Possible causes:**

1. ❌ Wrong Chrome version (need 127+ Canary/Dev)
2. ❌ Flags not enabled
3. ❌ Chrome needs restart after enabling flags

**Solution:**

- Verify Chrome version at `chrome://version/`
- Double-check flags at `chrome://flags/`
- Restart Chrome completely (quit and reopen)

---

### Issue: APIs show `available: "after-download"`

**Meaning:** The Gemini Nano model needs to be downloaded first.

**Solution:**

1. Ensure you have stable internet connection
2. Wait for Chrome to download the model (can take 10-30 minutes)
3. Chrome downloads in the background
4. Check download status:
   ```javascript
   await ai.languageModel.capabilities();
   // If "readily" → downloaded
   // If "after-download" → still downloading
   ```

---

### Issue: APIs available but create() fails

**Possible causes:**

1. Model not fully downloaded yet
2. Insufficient disk space (model is ~1.5GB)
3. Chrome needs restart

**Solution:**

- Check disk space
- Wait for full download
- Restart Chrome
- Try a simple prompt first

---

### Issue: Works in console but not in extension

**Possible causes:**

1. Extension context vs page context difference
2. CSP blocking (shouldn't be an issue with our setup)

**Solution:**

- Test in side panel DevTools specifically
- Check that scripts are loaded in correct context
- Verify manifest.json permissions

---

## Model Download Status

### Check if Gemini Nano is downloaded:

```javascript
// Method 1: Check capabilities
await ai?.languageModel?.capabilities();
// Result: {available: "readily"} → Downloaded ✅
// Result: {available: "after-download"} → Downloading... ⏳
// Result: {available: "no"} → Not available ❌

// Method 2: Force download (if needed)
const model = await ai.languageModel.create();
// This will start download if not already downloaded
```

### Monitor download progress:

Chrome downloads the model in the background. You can:

1. Check DevTools → Network tab (may not show internal downloads)
2. Check `chrome://components/` → Look for "Optimization Guide On Device Model"
3. Wait and check capabilities() every few minutes

---

## Integration with MarkSense AI

Once APIs are confirmed working, update `utils/aisdk.js`:

1. Open `utils/aisdk.js`
2. Replace stub functions with code from migration guide (lines 28-134)
3. Keep fallback to stubs if `window.ai` not available
4. Test in side panel

Example pattern:

```javascript
async summarize(text, { tone = 'formal', length = 'medium' } = {}) {
  // Try Chrome Built-in AI first
  if (window.ai?.summarizer) {
    try {
      const summarizer = await window.ai.summarizer.create({
        type: length === 'short' ? 'tl;dr' : 'key-points',
        format: 'markdown',
        length: length
      });
      const summary = await summarizer.summarize(text);
      summarizer.destroy();
      return summary;
    } catch (error) {
      console.warn('Gemini Nano failed, using fallback:', error);
    }
  }

  // Fallback to rule-based stub
  return this._fallbackSummarize(text, { tone, length });
}
```

---

## Privacy Verification

After enabling APIs, verify no network calls:

1. Open DevTools → Network tab
2. Use all extension features
3. **Confirm:** Network tab shows ZERO requests
4. All AI processing happens locally

---

## Resources

- **Chrome AI APIs Overview**: https://developer.chrome.com/docs/ai/built-in-apis
- **Summarizer API**: https://developer.chrome.com/docs/ai/summarizer-api
- **Prompt API**: https://developer.chrome.com/docs/ai/prompt-api
- **Early Preview Program**: https://developer.chrome.com/docs/ai/built-in-apis#get_an_early_preview

---

## Quick Reference Card

```bash
# 1. Install Chrome Canary
https://www.google.com/chrome/canary/

# 2. Enable flags at chrome://flags/
- optimization-guide-on-device-model: Enabled BypassPerfRequirement
- prompt-api-for-gemini-nano: Enabled
- summarization-api-for-gemini-nano: Enabled
- translation-api: Enabled
- rewriter-api: Enabled

# 3. Restart Chrome

# 4. Test in console
console.log('ai' in window);
await ai?.summarizer?.capabilities();

# 5. Wait for model download (if needed)
# Check: await ai.languageModel.capabilities()
# Status: "readily" = ready, "after-download" = downloading

# 6. Update MarkSense AI
# Replace stubs in utils/aisdk.js with real API calls
```
