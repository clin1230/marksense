// AI SDK Utility
// Handles AI processing (Chrome's built-in AI or local models)
// No network calls - uses local/offline AI capabilities
//
// =============================================================================
// 🎉 NOW USING: Chrome Built-in Summarizer API + Prompt API (Gemini Nano)
// =============================================================================
//
// ✅ Works with Chrome 138+ and Gemini Nano
// ✅ 100% offline, privacy-preserving
// ✅ Automatically falls back to local rule-based logic
//
// =============================================================================
// REQUIREMENTS
// =============================================================================
//
// - Chrome 138+ (preferably 143+)
// - Enable these flags in chrome://flags
//   • #optimization-guide-on-device-model → Enabled BypassPerfRequirement
//   • #prompt-api-for-gemini-nano → Enabled
//   • #summarization-api-for-gemini-nano → Enabled
//   • #translation-api → Enabled
//   • #rewriter-api → Enabled
// - Download model via chrome://components → “Optimization Guide On Device Model”
//
// =============================================================================

console.log("🚀 ===== AI SDK UTILITY LOADED =====");
console.log("AI SDK utility loaded ✅");

const AISDK = {
  /**
   * Check if Summarizer API is available
   */
  async isAvailable() {
    if ("ai" in self && "summarizer" in self.ai) {
      try {
        const capabilities = await self.ai.summarizer.capabilities();
        return capabilities && capabilities.available !== "no";
      } catch (e) {
        console.warn("Error checking Summarizer availability:", e);
        return false;
      }
    }
    return false;
  },

  /**
   * Summarize text using Chrome's built-in Summarizer API
   * @param {string} text - Text to summarize
   * @param {Object} options - Summarization options
   * @param {string} options.tone - Tone: 'concise', 'professional', 'academic' (maps to type)
   * @param {string} options.length - Length: 'short', 'medium', 'long'
   */
  async summarize(text, { tone = "concise", length = "medium" } = {}) {
    if (!text || !text.trim()) return "";

    console.log(`🔍 Summarize called with tone: ${tone}, length: ${length}`);

    if ("ai" in self && "summarizer" in self.ai) {
      try {
        const availability = await self.ai.summarizer.capabilities();
        console.log("📊 Summarizer capabilities:", availability);
        
        if (availability && availability.available !== "no") {
          console.log("✅ Using Chrome built-in Summarizer API");

          // Map our options to Summarizer API format
          const summarizerOptions = {
            sharedContext: "",
            type: tone === "concise" ? "tl;dr" : "key-points",
            format: "markdown",
            length: length === "short" ? "short" : length === "long" ? "long" : "medium"
          };

          console.log("Summarizer options:", summarizerOptions);

          const summarizer = await self.ai.summarizer.create(summarizerOptions);
          const summary = await summarizer.summarize(text);
          summarizer.destroy();
          
          console.log("✅ Summarization completed via Summarizer API");
          return summary;
        }
      } catch (e) {
        console.warn("❌ Summarizer API failed → fallback:", e);
      }
    } else {
      console.log("⚠️ Summarizer API not available");
    }

    // Offline rule-based fallback
    console.log("📝 Using offline summarization fallback");
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const targetCount =
      length === "short" ? 2 : length === "long" ? 5 : 3;

    if (sentences.length <= targetCount) return text.trim();

    const summary = sentences.slice(0, targetCount).map((s) => s.trim());
    return "• " + summary.join("\n• ");
  },

  /**
   * Rewrite (stub)
   */
  async rewrite(text, tone = "formal") {
    if (!text) return "";
    console.log(`[Placeholder] Rewrite with tone: ${tone}`);
    return text;
  },

  /**
   * Translate (stub)
   */
  async translate(text, target = "en") {
    if (!text) return "";
    console.log(`[Placeholder] Translate to: ${target}`);
    return text;
  },

  /**
   * Extract keywords using Chrome Prompt API (Gemini Nano) or fallback frequency method
   */
  async extractKeywords(text, topN = 10) {
    console.log("🔍 extractKeywords called with text length:", text?.length || 0);
    
    if (!text || !text.trim()) {
      console.log("❌ Empty text, returning empty keywords");
      return { keywords: [], method: "none" };
    }

    // ✅ Updated check — direct support for LanguageModel
    console.log("🔍 Checking LanguageModel availability...");
    console.log("LanguageModel in self:", "LanguageModel" in self);
    console.log("LanguageModel in window:", "LanguageModel" in window);
    
    if ("LanguageModel" in self) {
      try {
        const availability = await LanguageModel.availability();
        console.log("Prompt API availability:", availability);

        console.log("📊 Availability check result:", availability);
        
        if (
          availability === "available" ||
          availability === "readily" ||
          availability === "after-download"
        ) {
          console.log("✅ Availability check passed - Using Chrome Prompt API for keyword extraction");

          const session = await LanguageModel.create({
            systemPrompt:
              "You are a keyword extraction expert. Extract the most important and meaningful English keywords from text. Return ONLY a JSON array of objects with 'word' and 'count'.",
            language: "en",
          });

          const truncatedText =
            text.length > 2000 ? text.slice(0, 2000) + "..." : text;
          const prompt = `Extract the top ${topN} most important keywords from this text. 

Return ONLY a JSON array of objects with "word" and "count" fields. Example format:
[{"word":"keyword1","count":5},{"word":"keyword2","count":3}]

Text:
${truncatedText}`;

          const result = await session.prompt(prompt);
          console.log("Prompt API raw result:", result);

          session.destroy();

          // Clean and parse JSON
          let clean = result.trim();
          // Remove markdown code blocks
          clean = clean.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          
          // Try to extract JSON array from the response
          const jsonMatch = clean.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            clean = jsonMatch[0];
          }
          
          let keywords = JSON.parse(clean);
          console.log("Parsed keywords:", keywords);

          // Handle different response formats
          if (Array.isArray(keywords)) {
            // Case 1: Array of objects with word and count
            if (keywords.length > 0 && keywords[0]?.word) {
              console.log(`✅ Extracted ${keywords.length} keywords using Prompt API (object format)`);
              return { keywords: keywords.slice(0, topN), method: "prompt-api" };
            }
            
            // Case 2: Array of strings - convert to objects with count=1
            if (keywords.length > 0 && typeof keywords[0] === 'string') {
              console.log("⚠️ Prompt API returned string array, converting to objects...");
              const convertedKeywords = keywords.map(word => ({
                word: word.trim(),
                count: 1 // Default count since we don't know the actual frequency
              }));
              console.log(`✅ Extracted ${convertedKeywords.length} keywords using Prompt API (converted from strings)`);
              return { keywords: convertedKeywords.slice(0, topN), method: "prompt-api" };
            }
          }
          
          console.warn("⚠️ Prompt API response format not recognized, falling back to rule-based");
        }
      } catch (err) {
        console.warn("❌ Prompt API failed → fallback:", err);
        console.warn("Error details:", err.message, err.stack);
      }
    } else {
      console.log("⚠️ LanguageModel not available in self, using fallback");
    }

    // 🧩 Fallback: Rule-based frequency analysis
    console.log("📝 FALLBACK: Using rule-based keyword extraction");
    const normalizedText = text.toLowerCase();
    const words = normalizedText.match(/[a-z0-9]+/gi) || [];

    const stopWords = new Set([
      "the","be","to","of","and","a","in","that","have","i","it","for","not",
      "on","with","he","as","you","do","at","this","but","his","by","from",
      "they","we","say","her","she","or","an","will","my","one","all","would",
      "there","their","what","so","up","out","if","about","who","get","which",
      "go","me","when","make","can","like","time","no","just","him","know",
      "take","people","into","year","your","good","some","could","them","see",
      "other","than","then","now","look","only","come","its","over","think",
      "also","back","after","use","two","how","our","work","first","well",
      "way","even","new","want","because","any","these","give","day","most",
      "us","is","was","are","been","has","had","were","said","did","having",
      "may","should","am","does","more","very","such","where","much","through",
      "before","between","both","each","few","under","while","those","many",
      "most","own","same","too","cannot","being","here","during","still",
      "down","off","against","why","among","since","within","around","upon",
      "however","another","himself","herself","itself","themselves","myself",
      "yourself","ourselves","yourselves",
    ]);

    const filteredWords = words.filter(
      (w) => w.length >= 3 && !stopWords.has(w)
    );

    const freq = {};
    for (const w of filteredWords) freq[w] = (freq[w] || 0) + 1;

    const keywords = Object.entries(freq)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, topN);

    console.log(`📊 Extracted ${keywords.length} keywords (rule-based)`);
    return { keywords, method: "rule-based" };
  },

  /**
   * Generate definitions for confused highlights
   */
  async generateDefinitions(confusedHighlights) {
    if (!Array.isArray(confusedHighlights) || !confusedHighlights.length)
      return [];

    const confused = confusedHighlights.filter((h) => h.type === "confused");
    if (!confused.length) return [];

    const defs = [];
    for (const h of confused) {
      const term = h.quote?.trim() || h.term?.trim();
      if (!term) continue;

      const words = term.split(/\s+/);
      const isSingle = words.length === 1;

      defs.push({
        term,
        analogy: isSingle
          ? `Think of "${term}" as a key concept.`
          : `Think of "${term}" as a phrase describing an idea.`,
        definition: isSingle
          ? `${term} refers to an important term in this context.`
          : `"${term}" represents a key idea discussed in the text.`,
        context: isSingle
          ? `${term} appears where understanding it clarifies the main point.`
          : `"${term}" appears in context requiring further explanation.`,
      });
    }

    console.log(`📘 Generated ${defs.length} definitions`);
    return defs;
  },

  /**
   * Generate related articles suggestions from original content using Prompt API
   * Returns up to topN items: { title: string, content: string, url: string }
   */
  async generateRelatedArticles(text, topN = 5) {
    if (!text || !text.trim()) return [];

    // Prefer Prompt API when available
    try {
      if ("LanguageModel" in self) {
        const availability = await LanguageModel.availability();
        if (
          availability === "available" ||
          availability === "readily" ||
          availability === "after-download"
        ) {
          const session = await LanguageModel.create({
            systemPrompt:
              "You are a research assistant. Propose concise related article recommendations based on the provided text. Return ONLY JSON.",
            language: "en",
          });

          const truncated = text.length > 4000 ? text.slice(0, 4000) + "..." : text;
          const prompt = `From the following article content, suggest ${topN} related articles that would help a reader explore similar or extended topics. For each item, include:
{"title": string, "content": string (1-2 sentences), "url": string (if known; otherwise empty)}
Return ONLY a JSON array (no extra text). Text:\n\n${truncated}`;

          const result = await session.prompt(prompt);
          session.destroy();

          // Clean and parse
          let clean = result.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
          const match = clean.match(/\[[\s\S]*\]/);
          if (match) clean = match[0];
          let items = [];
          try {
            items = JSON.parse(clean);
          } catch (e) {
            console.warn('Related articles JSON parse failed, falling back:', e);
            items = [];
          }

          if (Array.isArray(items)) {
            // Normalize and fill url if missing (use Google search)
            const normalized = items
              .filter(it => it && (it.title || it.content))
              .map(it => {
                const title = (it.title || '').toString().trim().slice(0, 160);
                const content = (it.content || '').toString().trim().slice(0, 400);
                let url = (it.url || '').toString().trim();
                if (!url && title) {
                  url = `https://www.google.com/search?q=${encodeURIComponent(title)}`;
                }
                return { title, content, url };
              })
              .filter(it => it.title && it.content && it.url)
              .slice(0, topN);

            if (normalized.length) {
              console.log(`🔗 Generated ${normalized.length} related articles via Prompt API`);
              return normalized;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Prompt API related articles failed:', err);
    }

    // Fallback: build simple suggestions from top keywords → Google search
    try {
      const { keywords } = await this.extractKeywords(text, topN);
      const suggestions = (keywords || []).map(k => {
        const title = `About ${k.word}`;
        const content = `Explore more on \"${k.word}\" based on this article's context.`;
        const url = `https://www.google.com/search?q=${encodeURIComponent(k.word)}`;
        return { title, content, url };
      }).slice(0, topN);
      console.log(`🔗 Generated ${suggestions.length} related articles via fallback`);
      return suggestions;
    } catch (e) {
      console.warn('Fallback related articles failed:', e);
      return [];
    }
  },

  /**
   * Translate text using Chrome's built-in Translation API
   * @param {string} text - Text to translate
   * @param {string} targetLang - Target language code (e.g., 'zh', 'es', 'fr')
   * @param {string} sourceLang - Source language code (default: 'en')
   * @returns {Promise<string>} Translated text
   */
  async translate(text, targetLang, sourceLang = 'en') {
    if (!text || !text.trim()) {
      return '';
    }

    console.log(`🌐 Translating from ${sourceLang} to ${targetLang}...`);

    try {
      // Check if Chrome's Translation API is available
      if ('translation' in self && 'createTranslator' in self.translation) {
        console.log('✅ Using Chrome Translation API');
        
        const canTranslate = await self.translation.canTranslate({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        
        console.log(`Translation availability: ${canTranslate}`);
        
        if (canTranslate === 'no') {
          throw new Error('Translation not available for this language pair');
        }
        
        const translator = await self.translation.createTranslator({
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        });
        
        // If download is needed, wait for it
        if (canTranslate === 'after-download') {
          console.log('⏳ Downloading translation model...');
        }
        
        const result = await translator.translate(text);
        console.log('✅ Translation completed');
        return result;
      } else {
        throw new Error('Chrome Translation API not available');
      }
    } catch (error) {
      console.warn('Translation API failed, using fallback:', error);
      
      // Fallback: Use Prompt API to translate
      try {
        if ('LanguageModel' in self) {
          const availability = await LanguageModel.availability();
          if (
            availability === 'available' ||
            availability === 'readily' ||
            availability === 'after-download'
          ) {
            console.log('🔄 Using Prompt API as fallback for translation');
            const session = await LanguageModel.create({
              systemPrompt: `You are a professional translator. Translate the given text accurately while preserving meaning and tone.`,
              language: targetLang
            });
            
            const langNames = {
              zh: 'Chinese',
              es: 'Spanish',
              fr: 'French',
              de: 'German',
              ja: 'Japanese',
              ko: 'Korean',
              pt: 'Portuguese',
              ru: 'Russian',
              ar: 'Arabic',
              hi: 'Hindi'
            };
            
            const prompt = `Translate the following text to ${langNames[targetLang] || targetLang}. Return ONLY the translation, no explanations:\n\n${text}`;
            const result = await session.prompt(prompt);
            session.destroy();
            
            console.log('✅ Translation completed via Prompt API fallback');
            return result.trim();
          }
        }
      } catch (fallbackError) {
        console.error('Prompt API fallback also failed:', fallbackError);
      }
      
      throw new Error('Translation failed: No available translation method');
    }
  },
};

console.log("✅ AISDK ready");
