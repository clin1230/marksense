// AI SDK Utility
// Handles AI processing (Chrome's built-in AI or local models)
// No network calls - uses local/offline AI capabilities
//
// =============================================================================
// 🎉 NOW USING: Chrome Built-in Summarizer API (Gemini Nano)
// =============================================================================
//
// ✅ SUMMARIZER API: Integrated! Uses Chrome 138+ Summarizer API when available
//    Falls back to offline rule-based if unavailable
//
// ⏳ TODO: Other APIs still use offline stubs (rewriter, translator, keywords)
//
// Requirements for Chrome Built-in AI:
// - Chrome Canary 138+ or Chrome Stable 138+ (current: 143 ✅)
// - Enable flags at chrome://flags/:
//   - #optimization-guide-on-device-model → Enabled BypassPerfRequirement
//   - #prompt-api-for-gemini-nano → Enabled
//   - #summarization-api-for-gemini-nano → Enabled (used by Summarizer API)
//   - #translation-api → Enabled
//   - #rewriter-api → Enabled
// - Download model at chrome://components/ → "Optimization Guide On Device Model"
//
// API Documentation: https://developer.chrome.com/docs/ai/summarizer-api
//
// =============================================================================
// MIGRATION GUIDE
// =============================================================================
//
// 1. summarize() → Chrome Summarizer API
//    TODO: Replace with window.ai.summarizer.create()
//    Docs: https://developer.chrome.com/docs/ai/summarizer-api
//
//    Example replacement:
//    ```javascript
//    async summarize(text, { tone = 'formal', length = 'medium' } = {}) {
//      if (!window.ai?.summarizer) {
//        return this._fallbackSummarize(text, { tone, length });
//      }
//      
//      const summarizer = await window.ai.summarizer.create({
//        type: length === 'short' ? 'tl;dr' : 'key-points',
//        format: 'markdown',
//        length: length
//      });
//      
//      const summary = await summarizer.summarize(text);
//      summarizer.destroy();
//      return summary;
//    }
//    ```
//
// 2. rewrite() → Chrome Writer API (Rewriter)
//    TODO: Replace with window.ai.rewriter.create()
//    Docs: https://developer.chrome.com/docs/ai/rewriter-api
//
//    Example replacement:
//    ```javascript
//    async rewrite(text, tone = 'formal') {
//      if (!window.ai?.rewriter) {
//        return this._fallbackRewrite(text, tone);
//      }
//      
//      const rewriter = await window.ai.rewriter.create({
//        tone: tone,
//        format: 'as-is',
//        length: 'as-is'
//      });
//      
//      const rewritten = await rewriter.rewrite(text);
//      rewriter.destroy();
//      return rewritten;
//    }
//    ```
//
// 3. translate() → Chrome Translator API
//    TODO: Replace with window.ai.translator.create()
//    Docs: https://developer.chrome.com/docs/ai/translator-api
//
//    Example replacement:
//    ```javascript
//    async translate(text, target = 'en') {
//      if (!window.ai?.translator) {
//        return this._fallbackTranslate(text, target);
//      }
//      
//      const canTranslate = await window.ai.translator.capabilities({
//        sourceLanguage: 'auto',
//        targetLanguage: target
//      });
//      
//      if (canTranslate === 'no') {
//        return this._fallbackTranslate(text, target);
//      }
//      
//      const translator = await window.ai.translator.create({
//        sourceLanguage: 'auto',
//        targetLanguage: target
//      });
//      
//      const translated = await translator.translate(text);
//      translator.destroy();
//      return translated;
//    }
//    ```
//
// 4. extractKeywords() → Chrome Prompt API (custom prompt)
//    TODO: Replace with window.ai.languageModel.create() + custom prompt
//    Docs: https://developer.chrome.com/docs/ai/prompt-api
//
//    Example replacement:
//    ```javascript
//    async extractKeywords(text, topN = 10) {
//      if (!window.ai?.languageModel) {
//        return this._fallbackExtractKeywords(text, topN);
//      }
//      
//      const model = await window.ai.languageModel.create({
//        temperature: 0.0,
//        topK: 1
//      });
//      
//      const prompt = `Extract ${topN} keywords from the following text. 
//                      Return ONLY a JSON array of objects with "word" and "count" fields.
//                      Text: ${text.substring(0, 2000)}`;
//      
//      const result = await model.prompt(prompt);
//      model.destroy();
//      
//      try {
//        return JSON.parse(result);
//      } catch (e) {
//        return this._fallbackExtractKeywords(text, topN);
//      }
//    }
//    ```
//
// =============================================================================
// IMPORTANT: Privacy & Security
// =============================================================================
//
// ✅ Chrome Built-in AI APIs are 100% OFFLINE and ON-DEVICE
// ✅ No data is sent to external servers
// ✅ No API keys required
// ✅ CSP `connect-src 'none'` remains valid
// ✅ All processing happens locally using Gemini Nano model
//
// The Gemini Nano model is downloaded once and runs entirely on the user's
// device. This maintains our privacy guarantee.
//
// =============================================================================
// TESTING
// =============================================================================
//
// Check if APIs are available:
// ```javascript
// console.log('Summarizer:', await ai?.summarizer?.capabilities());
// console.log('Rewriter:', await ai?.rewriter?.capabilities());
// console.log('Translator:', await ai?.translator?.capabilities());
// console.log('Language Model:', await ai?.languageModel?.capabilities());
// ```
//
// =============================================================================

console.log('AI SDK utility loaded');

const AISDK = {
  /**
   * Check if Chrome's built-in Summarizer API is available
   * @returns {Promise<boolean>}
   */
  async isAvailable() {
    // Check for new Summarizer API (Chrome 138+)
    // https://developer.chrome.com/docs/ai/summarizer-api
    if ('Summarizer' in self) {
      try {
        const availability = await Summarizer.availability();
        return availability === 'readily' || availability === 'after-download';
      } catch (e) {
        console.warn('Error checking Summarizer availability:', e);
        return false;
      }
    }
    return false;
  },

  /**
   * Summarize text using Chrome's built-in Summarizer API or fallback to rule-based
   * 
   * Uses Chrome 138+ Summarizer API when available
   * API: Summarizer.create()
   * Docs: https://developer.chrome.com/docs/ai/summarizer-api
   * 
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @param {string} options.tone - Tone: 'formal', 'casual', 'technical' (mapped to type)
   * @param {string} options.length - Length: 'short', 'medium', 'long'
   * @returns {Promise<string>} Summary text
   */
  async summarize(text, { tone = 'formal', length = 'medium' } = {}) {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Try Chrome's built-in Summarizer API first (Chrome 138+)
    if ('Summarizer' in self) {
      try {
        const availability = await Summarizer.availability();
        
        if (availability === 'readily' || availability === 'after-download') {
          console.log('🤖 Using Chrome built-in Summarizer API');
          
          // Map our options to Summarizer API options
          const summarizerOptions = {
            type: 'key-points', // key-points, tldr, teaser, headline
            format: 'markdown',
            length: length, // short, medium, long
          };

          // Create summarizer
          const summarizer = await Summarizer.create(summarizerOptions);
          
          // Get summary
          const summary = await summarizer.summarize(text);
          
          // Clean up
          summarizer.destroy();
          
          return summary;
        }
      } catch (e) {
        console.warn('Chrome Summarizer API failed, falling back to offline:', e.message);
        // Fall through to offline stub
      }
    }

    // FALLBACK: Offline rule-based implementation
    console.log('📝 Using offline rule-based summarization');
    
    // Determine how many sentences or bullets based on length
    let targetCount;
    switch (length) {
      case 'short':
        targetCount = 2;
        break;
      case 'long':
        targetCount = 5;
        break;
      case 'medium':
      default:
        targetCount = 3;
        break;
    }

    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // If text is already short, return as-is
    if (sentences.length <= targetCount) {
      return text.trim();
    }

    // Extract first N sentences
    const summary = sentences.slice(0, targetCount).join(' ').trim();

    // Convert to bullet points if multiple sentences
    if (targetCount > 1 && sentences.length > 1) {
      const bullets = sentences
        .slice(0, targetCount)
        .map(s => '• ' + s.trim())
        .join('\n');
      return bullets;
    }

    return summary;
  },

  /**
   * Rewrite text in a different tone (placeholder)
   * 
   * TODO: Replace with Chrome Rewriter API (see migration guide at top of file)
   * API: window.ai.rewriter.create()
   * Docs: https://developer.chrome.com/docs/ai/rewriter-api
   * 
   * @param {string} text - Text to rewrite
   * @param {string} tone - Target tone: 'formal', 'casual', 'professional', 'friendly'
   * @returns {Promise<string>} Rewritten text (currently returns input)
   */
  async rewrite(text, tone = 'formal') {
    // STUB IMPLEMENTATION - See migration guide above for Chrome Built-in AI replacement
    if (!text) {
      return '';
    }

    // Placeholder: return input as-is
    // TODO: Integrate Chrome Gemini Nano rewriting when available
    console.log(`[Placeholder] Rewrite with tone: ${tone}`);
    return text;
  },

  /**
   * Translate text to target language (placeholder)
   * 
   * TODO: Replace with Chrome Translator API (see migration guide at top of file)
   * API: window.ai.translator.create()
   * Docs: https://developer.chrome.com/docs/ai/translator-api
   * 
   * @param {string} text - Text to translate
   * @param {string} target - Target language code: 'en', 'zh', 'es', 'fr', etc.
   * @returns {Promise<string>} Translated text (currently returns input)
   */
  async translate(text, target = 'en') {
    // STUB IMPLEMENTATION - See migration guide above for Chrome Built-in AI replacement
    if (!text) {
      return '';
    }

    // Placeholder: return input as-is
    // TODO: Integrate Chrome Gemini Nano translation when available
    console.log(`[Placeholder] Translate to: ${target}`);
    return text;
  },

  /**
   * Extract keywords from text using frequency analysis
   * Supports Chinese and English alphanumeric words (length ≥ 2)
   * 
   * TODO: Replace with Chrome Prompt API (see migration guide at top of file)
   * API: window.ai.languageModel.create() + custom prompt for JSON output
   * Docs: https://developer.chrome.com/docs/ai/prompt-api
   * 
   * @param {string} text - Text to extract keywords from
   * @param {number} topN - Number of top keywords to return (default: 10)
   * @returns {Promise<Array<{word: string, count: number}>>} Array of keywords with counts
   */
  async extractKeywords(text, topN = 10) {
    // STUB IMPLEMENTATION - See migration guide above for Chrome Built-in AI replacement
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Normalize text: lowercase for English
    const normalizedText = text.toLowerCase();

    // Extract words: alphanumeric + Chinese characters
    // Match English words (a-z, 0-9) and Chinese characters (Unicode range)
    const wordPattern = /[\u4e00-\u9fa5]+|[a-z0-9]+/gi;
    const words = normalizedText.match(wordPattern) || [];

    // Filter: length >= 2, exclude common stop words
    const stopWords = new Set([
      // English stop words
      'the', 'be', 'to', 'of', 'and', 'in', 'that', 'have', 'it',
      'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
      'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
      'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
      'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
      'which', 'go', 'me', 'when', 'make', 'can', 'like', 'no', 'just',
      'him', 'know', 'take', 'into', 'your', 'some', 'could', 'them',
      // Common Chinese function words
      '的', '了', '是', '在', '我', '有', '和', '就', '不', '人',
      '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去',
      '你', '会', '着', '没有', '看', '好', '自己', '这'
    ]);

    const filteredWords = words.filter(word => {
      return word.length >= 2 && !stopWords.has(word);
    });

    // Count frequency
    const frequency = {};
    for (const word of filteredWords) {
      frequency[word] = (frequency[word] || 0) + 1;
    }

    // Convert to array and sort by frequency
    const keywords = Object.entries(frequency)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    console.log(`Extracted ${keywords.length} keywords from text`);
    return keywords;
  }
};

