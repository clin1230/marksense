// Side Panel Logic for MarkSense AI
// No network calls - 100% offline processing

console.log('🚀 ===== MARKSENSE SIDE PANEL LOADED =====');
console.log('MarkSense AI side panel loaded');

// State
let currentTab = null;
let extractedText = '';
let currentUrl = '';
let currentKeywords = []; // Store keywords for current article
let currentSessionStartTime = Date.now(); // Track when current session started

// DOM Elements
const summarizeBtn = document.getElementById('summarize');
const toneSelect = document.getElementById('tone');
const lengthSelect = document.getElementById('length');
const outputTextarea = document.getElementById('output');
const copyBtn = document.getElementById('copy');
const translateBtn = document.getElementById('translate-btn');
const translateToSelect = document.getElementById('translate-to');
const translateResultTextarea = document.getElementById('translate-result');
const copyTranslationBtn = document.getElementById('copy-translation');
const keywordsContainer = document.getElementById('keywords');
const marksList = document.getElementById('marks');
const relatedArticlesContainer = document.getElementById('related-articles');

/**
 * Get the active tab
 */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Extract text from page using Readability
 */
async function extractText() {
  try {
    extractBtn.disabled = true;
    extractBtn.textContent = '抽取中...';
    
    currentTab = await getActiveTab();
    if (!currentTab || !currentTab.id) {
      throw new Error('No active tab found');
    }
    
    currentUrl = currentTab.url;
    
    // Try to use Readability for better extraction
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: () => {
        try {
          // Try Readability if available
          if (typeof Readability !== 'undefined') {
            const documentClone = document.cloneNode(true);
            const reader = new Readability(documentClone);
            const article = reader.parse();
            
            if (article && article.textContent) {
              return {
                success: true,
                text: article.textContent,
                title: article.title || document.title,
                method: 'readability'
              };
            }
          }
          
          // Smart fallback: try to find main content
          let mainContent = null;
          
          // Try common article selectors
          const selectors = [
            'article',
            '[role="main"]',
            'main',
            '.mw-parser-output', // Wikipedia
            '.post-content',
            '.article-content',
            '.entry-content',
            '#content',
            '.content'
          ];
          
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
              mainContent = element;
              break;
            }
          }
          
          // If found main content, extract text from it
          if (mainContent) {
            // Remove navigation, sidebars, footers, and other junk
            const clone = mainContent.cloneNode(true);
            
            // Remove common non-content elements
            const removals = clone.querySelectorAll([
              'nav', 'aside', '.sidebar', '.navigation', 'footer', '.footer',
              '.toc', '.infobox', '.navbox', '.references', '.reflist',
              '.mw-editsection', '.mw-jump-link', '.printfooter',
              '.catlinks', '.mw-hidden-catlinks', '.noprint',
              '#toc', '.thumb', '.metadata', '.sistersitebox',
              '.ambox', '.hatnote', '.dablink', '.rellink',
              'style', 'script', 'noscript',
              '[role="navigation"]', '[role="complementary"]',
              '.navbox-styles', '.sister-projects', '.plainlinks'
            ].join(','));
            
            removals.forEach(el => el.remove());
            
            // Get only paragraph and heading text
            const paragraphs = Array.from(clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6'));
            const textParts = paragraphs
              .map(p => p.innerText.trim())
              .filter(t => t.length > 20); // Filter out short fragments
            
            const text = textParts.join('\n\n');
            
            if (text.length > 100) {
              return {
                success: true,
                text: text,
                title: document.title,
                method: 'smart-fallback'
              };
            }
          }
          
          // Last resort: body text
          const bodyText = document.body.innerText || document.body.textContent || '';
          return {
            success: true,
            text: bodyText,
            title: document.title,
            method: 'basic-fallback'
          };
          
        } catch (error) {
          return {
            success: false,
            error: error.message,
            text: document.body.innerText || ''
          };
        }
      }
    });
    
    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      extractedText = result.text || '';
      
      if (extractedText.trim().length === 0) {
        outputTextarea.value = '未能提取到內容。請確認頁面已完全加載。';
        extractedText = '';
      } else {
        outputTextarea.value = `# ${result.title || '未命名'}\n\n${extractedText}`;
        console.log(`Extracted ${extractedText.length} chars using ${result.method}`);
        
        // Kick off keyword extraction/UI update in parallel (don't block summarization)
        const keywordsTask = (async () => {
          try {
            console.log('⚡ Starting keywords task in background');
            await displayKeywords(extractedText);
            console.log('✅ Keywords task completed');
          } catch (e) {
            console.warn('Keywords task failed:', e);
          }
        })();
      }
    } else {
      throw new Error('No extraction result');
    }
    
  } catch (error) {
    console.error('Failed to extract text:', error);
    outputTextarea.value = `提取失敗: ${error.message}`;
    extractedText = '';
  } finally {
    extractBtn.disabled = false;
    extractBtn.textContent = '抽取正文';
  }
}

/**
 * Summarize text (automatically extracts text first if needed)
 */
async function summarizeText() {
  console.log("🚀 ===== SUMMARIZE FUNCTION CALLED =====");
  try {
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = 'Summarizing...';
    
    // Auto-extract text if not already extracted
    if (!extractedText || extractedText.trim().length === 0) {
      summarizeBtn.textContent = 'Extracting...';
      
      currentTab = await getActiveTab();
      if (!currentTab || !currentTab.id) {
        throw new Error('No active tab found');
      }
      
      // Check if we can access the page (chrome://, edge://, etc. may be restricted)
      if (currentTab.url.startsWith('chrome://') || 
          currentTab.url.startsWith('edge://') || 
          currentTab.url.startsWith('about:')) {
        throw new Error('Cannot extract content from system pages. Please navigate to a regular webpage.');
      }
      
      // Reset state for new article
      currentUrl = currentTab.url;
      currentKeywords = [];
      currentSessionStartTime = Date.now(); // Reset session time for new article
      
      // First, try to inject Readability library
      try {
        await chrome.scripting.executeScript({
          target: { tabId: currentTab.id },
          files: ['libs/readability.js']
        });
      } catch (error) {
        console.warn('Could not inject Readability, using fallback:', error);
      }
      
      // Extract text using the same method as extractText()
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        func: () => {
          try {
            // Try Readability if available
            if (typeof Readability !== 'undefined') {
              try {
                const documentClone = document.cloneNode(true);
                const reader = new Readability(documentClone);
                const article = reader.parse();
                
                if (article && article.textContent && article.textContent.trim().length > 100) {
                  return {
                    success: true,
                    text: article.textContent,
                    title: article.title || document.title,
                    method: 'readability'
                  };
                }
              } catch (e) {
                console.warn('Readability parse failed:', e);
              }
            }
            
            // Smart fallback: try to find main content
            let mainContent = null;
            const selectors = [
              'article',
              '[role="main"]',
              'main',
              '.mw-parser-output', // Wikipedia
              '.post-content',
              '.article-content',
              '.entry-content',
              '#content',
              '.content'
            ];
            
            for (const selector of selectors) {
              const element = document.querySelector(selector);
              if (element && element.textContent && element.textContent.trim().length > 100) {
                mainContent = element;
                break;
              }
            }
            
            if (mainContent) {
              // Remove navigation, sidebars, footers, and other junk
              const clone = mainContent.cloneNode(true);
              
              // Remove common non-content elements
              const removals = clone.querySelectorAll([
                'nav', 'aside', '.sidebar', '.navigation', 'footer', '.footer',
                '.toc', '.infobox', '.navbox', '.references', '.reflist',
                '.mw-editsection', '.mw-jump-link', '.printfooter',
                '.catlinks', '.mw-hidden-catlinks', '.noprint',
                '#toc', '.thumb', '.metadata', '.sistersitebox',
                '.ambox', '.hatnote', '.dablink', '.rellink',
                'style', 'script', 'noscript',
                '[role="navigation"]', '[role="complementary"]',
                '.navbox-styles', '.sister-projects', '.plainlinks'
              ].join(','));
              
              removals.forEach(el => el.remove());
              
              // Get only paragraph and heading text
              const paragraphs = Array.from(clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6'));
              const textParts = paragraphs
                .map(p => p.innerText.trim())
                .filter(t => t.length > 20); // Filter out short fragments
              
              const text = textParts.join('\n\n');
              
              if (text.length > 100) {
                return {
                  success: true,
                  text: text,
                  title: document.title,
                  method: 'smart-fallback'
                };
              }
            }
            
            // Last resort: body text (but filter out navigation, etc.)
            const body = document.body;
            if (body) {
              // Remove scripts, styles, nav, etc.
              const bodyClone = body.cloneNode(true);
              const junk = bodyClone.querySelectorAll('script, style, nav, aside, header, footer');
              junk.forEach(el => el.remove());
              
              const bodyText = bodyClone.innerText || bodyClone.textContent || '';
              const cleanedText = bodyText.split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 20)
                .join('\n\n');
              
              if (cleanedText.length > 100) {
                return {
                  success: true,
                  text: cleanedText,
                  title: document.title,
                  method: 'basic-fallback'
                };
              }
            }
            
            // If all else fails, return basic body text
            const bodyText = document.body.innerText || document.body.textContent || '';
            return {
              success: true,
              text: bodyText,
              title: document.title,
              method: 'body-text'
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
              text: document.body ? (document.body.innerText || document.body.textContent || '') : ''
            };
          }
        }
      });
      
      if (results && results[0] && results[0].result) {
        const result = results[0].result;
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to extract content');
        }
        
        extractedText = result.text || '';
        
        if (extractedText.trim().length === 0) {
          throw new Error('Failed to extract content. Please ensure the page is fully loaded and contains text.');
        }
        
        console.log(`Extracted ${extractedText.length} chars using ${result.method}`);
        
        // Extract and display keywords
        await displayKeywords(extractedText);
      } else {
        throw new Error('No extraction result received');
      }
    }
    
    summarizeBtn.textContent = 'Summarizing...';
    const tone = toneSelect.value;
    const lengthOption = lengthSelect.value;
    
    // Map length options to AISDK format
    let aiLength = 'medium';
    if (lengthOption === 'sentence') {
      aiLength = 'short';
    } else if (lengthOption === 'detailed') {
      aiLength = 'long';
    } else {
      aiLength = 'medium'; // bullets
    }
    
    // Load highlights for the current URL (for related reading and definitions)
    const allRecords = await Storage.loadAll();
    const allHighlights = allRecords.filter(record => record.url === currentUrl);
    console.log(`Loaded ${allHighlights.length} highlights`);
    
    // For related reading, only use highlights from current session (new highlights)
    const currentSessionHighlights = allHighlights.filter(
      record => record.timestamp >= currentSessionStartTime
    );
    console.log(`Current session highlights: ${currentSessionHighlights.length}`);
    
    // Chunk the text if it's too long
    const chunks = Chunking.chunkText(extractedText, 2000);
    console.log(`Split into ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      outputTextarea.value = 'Unable to split text';
      return;
    }
    
    // Summarize all chunks concurrently
    const summaries = (await Promise.all(
      chunks.map((chunk) =>
        AISDK.summarize(chunk, { tone: tone, length: aiLength }).catch((e) => {
          console.warn('Chunk summarize failed:', e);
          return '';
        })
      )
    )).filter(Boolean);
    
    // Merge results
    let finalSummary = '';
    if (summaries.length === 1) {
      finalSummary = summaries[0];
    } else if (summaries.length > 1) {
      // If multiple chunks, combine them
      finalSummary = summaries.join('\n\n');
      
      // Optionally re-summarize the combined summaries if still too long
      if (finalSummary.length > 3000) {
        finalSummary = await AISDK.summarize(finalSummary, {
          tone: tone,
          length: aiLength
        });
      }
    }
    
    // Generate definitions for confused highlights (use all highlights)
    const confusedHighlights = allHighlights.filter(h => h.type === 'confused');
    let definitionsText = '';
    
    if (confusedHighlights.length > 0) {
      console.log(`Generating definitions for ${confusedHighlights.length} confused highlights`);
      const definitions = await AISDK.generateDefinitions(confusedHighlights);
      
      if (definitions && definitions.length > 0) {
        definitionsText = '\n\n📘 Definitions\n━━━━━━━━━━━━━━━━━━━━\n\n';
        
        definitions.forEach((def, i) => {
          definitionsText += `${i + 1}. ${def.term}\n`;
          definitionsText += `   • Analogy: ${def.analogy}\n`;
          definitionsText += `   • Definition: ${def.definition}\n`;
          definitionsText += `   • Context: ${def.context}\n\n`;
        });
      }
    }
    
    // Display result (summary + definitions)
    const title = currentTab ? currentTab.title : 'Summary';
    outputTextarea.value = `# ${title}\n\n## Summary\n\n${finalSummary}${definitionsText}`;
    
    console.log('Summary generated successfully with definitions');
    
    // Generate related articles via Prompt API and render clickable cards
    try {
      relatedArticlesContainer.innerHTML = '<div class="loading">Generating related articles...</div>';
      const items = await AISDK.generateRelatedArticles(extractedText, 5);
      if (!items || items.length === 0) {
        relatedArticlesContainer.innerHTML = '<div class="empty-state">No related articles found</div>';
      } else {
        relatedArticlesContainer.innerHTML = '';
        for (const it of items) {
          const card = document.createElement('div');
          card.className = 'related-article';
          const t = document.createElement('div');
          t.className = 'related-article-title';
          t.textContent = it.title;
          const c = document.createElement('div');
          c.className = 'related-article-content';
          c.textContent = it.content;
          card.appendChild(t);
          card.appendChild(c);
          card.onclick = async () => {
            try { await chrome.tabs.create({ url: it.url }); } catch (e) { console.warn('Open related article failed:', e); }
          };
          relatedArticlesContainer.appendChild(card);
        }
        console.log(`Rendered ${items.length} related articles`);
      }
    } catch (error) {
      console.warn('Failed to generate related articles:', error);
      relatedArticlesContainer.innerHTML = '<div class="empty-state">Failed to generate related articles</div>';
    }
    
  } catch (error) {
    console.error('Failed to summarize:', error);
    outputTextarea.value = `Summary failed: ${error.message}`;
  } finally {
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = 'Summarize';
  }
}

/**
 * Extract and display keywords
 */
async function displayKeywords(text) {
  console.log("🚀 ===== displayKeywords CALLED =====");
  console.log("📊 Text length:", text?.length || 0);
  
  if (!text || text.trim().length === 0) {
    console.log("❌ Empty text, returning early");
    keywordsContainer.innerHTML = '<div class="empty-state">No keywords yet</div>';
    return;
  }
  
  try {
    console.log("🔍 displayKeywords: Starting keyword extraction...");
    console.log("🔍 Calling AISDK.extractKeywords...");
    const result = await AISDK.extractKeywords(text, 15);
    console.log("🔍 displayKeywords: Got result:", result);
    console.log("🔍 Result method:", result.method);
    console.log("🔍 Result keywords count:", result.keywords?.length || 0);
    
    const keywords = result.keywords;
    const method = result.method;
    
    // Store keywords for current article (used for finding related articles)
    currentKeywords = keywords;
    
    // Display extraction method indicator
    console.log(`✅ Keywords extracted using: ${method}`);
    console.log(`📊 Extracted ${keywords.length} keywords`);
    
    if (keywords.length === 0) {
      keywordsContainer.innerHTML = '<div class="empty-state">No keywords yet</div>';
      return;
    }
    
    // Render keywords as pills (no delete buttons)
    keywordsContainer.innerHTML = '';
    
    const pillsWrapper = document.createElement('div');
    pillsWrapper.style.display = 'flex';
    pillsWrapper.style.flexWrap = 'wrap';
    pillsWrapper.style.gap = '8px';
    
    for (const kw of keywords) {
      const pill = document.createElement('span');
      pill.className = 'keyword';
      pill.textContent = `${kw.word} (${kw.count})`;
      pillsWrapper.appendChild(pill);
    }
    
    keywordsContainer.appendChild(pillsWrapper);
    
    console.log(`Displayed ${keywords.length} keywords`);
    
  } catch (error) {
    console.error('Failed to extract keywords:', error);
    keywordsContainer.innerHTML = '<div class="empty-state">Failed to extract keywords</div>';
  }
}

/**
 * Find and display related reading content based on keywords and highlights
 * 100% offline - finds similar paragraphs within current article and provides concept extensions
 */
async function findAndDisplayRelatedReading(extractedText, keywords, highlights) {
  try {
    // Clear existing content
    relatedArticlesContainer.innerHTML = '<div class="loading">Finding related reading...</div>';
    
    if (!extractedText || extractedText.trim().length === 0) {
      relatedArticlesContainer.innerHTML = '<div class="empty-state">No text extracted yet</div>';
      return;
    }
    
    const relatedItems = [];
    
    // Step 1: Extract key terms from highlights (especially Important ones)
    const importantHighlights = highlights.filter(h => h.type === 'important');
    const keyTerms = [];
    
    // Get terms from important highlights
    for (const h of importantHighlights) {
      const terms = h.quote
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4)
        .filter(w => !['these', 'those', 'there', 'their', 'which', 'where', 'about', 'could', 'would', 'should', 'other', 'after', 'before', 'being'].includes(w));
      keyTerms.push(...terms);
    }
    
    // Add top keywords if not enough from highlights
    if (keyTerms.length < 5 && keywords && keywords.length > 0) {
      const topKeywords = keywords.slice(0, 5).map(k => k.word.toLowerCase());
      keyTerms.push(...topKeywords);
    }
    
    // Deduplicate
    const uniqueKeyTerms = [...new Set(keyTerms)].slice(0, 8);
    console.log(`Key terms for related reading:`, uniqueKeyTerms);
    
    if (uniqueKeyTerms.length === 0) {
      relatedArticlesContainer.innerHTML = '<div class="empty-state">No key terms found. Try highlighting important concepts!</div>';
      return;
    }
    
    // Step 2: Find similar paragraphs in the same article
    const paragraphs = extractedText
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 100); // At least 100 chars to be meaningful
    
    console.log(`Analyzing ${paragraphs.length} paragraphs`);
    
    const scoredParagraphs = paragraphs.map((para, idx) => {
      const paraWords = para.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4);
      
      const paraWordsSet = new Set(paraWords);
      
      // Count how many key terms appear in this paragraph
      let matchCount = 0;
      for (const term of uniqueKeyTerms) {
        if (paraWordsSet.has(term)) {
          matchCount++;
        }
      }
      
      return {
        text: para,
        index: idx,
        matchCount: matchCount,
        length: para.length
      };
    });
    
    // Filter paragraphs that match at least 1 key term but are not the highlights themselves
    const highlightTexts = highlights.map(h => h.quote.toLowerCase());
    const relatedParagraphs = scoredParagraphs
      .filter(p => p.matchCount > 0)
      .filter(p => !highlightTexts.some(h => p.text.toLowerCase().includes(h)))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 3);
    
    // Add related paragraphs to results
    for (const para of relatedParagraphs) {
      const preview = para.text.length > 150 ? para.text.slice(0, 150) + '...' : para.text;
      relatedItems.push({
        type: 'paragraph',
        title: 'Related section in this article',
        content: preview,
        matchCount: para.matchCount
      });
    }
    
    // Step 3: Local topics dictionary (concept extensions)
    const topicsDictionary = {
      // Machine Learning / AI
      'machine': { extends: ['algorithm', 'training', 'model', 'optimization'], desc: 'automated learning from data' },
      'learning': { extends: ['training', 'optimization', 'generalization'], desc: 'process of improving through experience' },
      'neural': { extends: ['networks', 'layers', 'neurons', 'backpropagation'], desc: 'brain-inspired computational models' },
      'model': { extends: ['training', 'testing', 'validation', 'overfitting'], desc: 'mathematical representation of a system' },
      'training': { extends: ['optimization', 'gradient', 'learning rate'], desc: 'process of teaching a model' },
      'algorithm': { extends: ['complexity', 'efficiency', 'optimization'], desc: 'step-by-step problem-solving procedure' },
      'data': { extends: ['dataset', 'features', 'preprocessing'], desc: 'information used for analysis' },
      'overfitting': { extends: ['regularization', 'validation', 'cross-validation'], desc: 'model too specific to training data' },
      
      // Politics / Government
      'government': { extends: ['policy', 'legislation', 'administration'], desc: 'system of governing a state' },
      'congress': { extends: ['senate', 'house', 'legislation'], desc: 'legislative branch of government' },
      'president': { extends: ['executive', 'administration', 'cabinet'], desc: 'head of state and government' },
      'senate': { extends: ['filibuster', 'cloture', 'legislation'], desc: 'upper chamber of legislature' },
      'legislation': { extends: ['bill', 'law', 'congress'], desc: 'process of making laws' },
      'election': { extends: ['campaign', 'voting', 'democracy'], desc: 'process of choosing leaders' },
      'policy': { extends: ['regulation', 'reform', 'implementation'], desc: 'course of action by government' },
      
      // General Academic
      'research': { extends: ['methodology', 'hypothesis', 'analysis'], desc: 'systematic investigation' },
      'analysis': { extends: ['methodology', 'interpretation', 'results'], desc: 'detailed examination' },
      'theory': { extends: ['hypothesis', 'framework', 'model'], desc: 'explanation based on principles' },
      'method': { extends: ['methodology', 'approach', 'technique'], desc: 'systematic way of doing something' },
      'system': { extends: ['framework', 'architecture', 'design'], desc: 'organized set of components' },
      'process': { extends: ['workflow', 'procedure', 'methodology'], desc: 'series of actions toward a goal' }
    };
    
    // Find concept extensions for key terms
    const conceptExtensions = new Set();
    for (const term of uniqueKeyTerms) {
      if (topicsDictionary[term]) {
        const entry = topicsDictionary[term];
        for (const ext of entry.extends) {
          if (!uniqueKeyTerms.includes(ext)) {
            conceptExtensions.add(ext);
          }
        }
      }
    }
    
    // Add concept extensions to results
    for (const concept of conceptExtensions) {
      if (relatedItems.length >= 5) break;
      
      let description = 'related concept to explore further';
      // Try to find description from dictionary
      if (topicsDictionary[concept]) {
        description = topicsDictionary[concept].desc;
      }
      
      relatedItems.push({
        type: 'concept',
        title: concept.charAt(0).toUpperCase() + concept.slice(1),
        content: description,
        matchCount: 0
      });
    }
    
    // Display results
    if (relatedItems.length === 0) {
      relatedArticlesContainer.innerHTML = '<div class="empty-state">No related content found</div>';
      return;
    }
    
    relatedArticlesContainer.innerHTML = '';
    
    for (const item of relatedItems) {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'related-article';
      
      const titleDiv = document.createElement('div');
      titleDiv.className = 'related-article-title';
      
      const emoji = item.type === 'paragraph' ? '📄' : '💡';
      titleDiv.textContent = `${emoji} ${item.title}`;
      
      const contentDiv = document.createElement('div');
      contentDiv.className = 'related-article-content';
      contentDiv.textContent = item.content;
      
      itemDiv.appendChild(titleDiv);
      itemDiv.appendChild(contentDiv);
      relatedArticlesContainer.appendChild(itemDiv);
    }
    
    console.log(`Found ${relatedItems.length} related reading items`);
    
  } catch (error) {
    console.error('Failed to find related reading:', error);
    relatedArticlesContainer.innerHTML = '<div class="empty-state">Failed to find related reading</div>';
  }
}

/**
 * Load and display marks for current URL
 */
async function loadMarks(url) {
  if (!url) {
    marksList.innerHTML = '<li class="empty-state">No highlights yet</li>';
    return;
  }
  
  try {
    const marks = await Storage.listByUrl(url);
    
    if (marks.length === 0) {
      marksList.innerHTML = '<li class="empty-state">No highlights yet</li>';
      return;
    }
    
    // Sort by creation time (newest first)
    marks.sort((a, b) => b.createdAt - a.createdAt);
    
    // Render marks
    marksList.innerHTML = '';
    for (const mark of marks) {
      const li = document.createElement('li');
      li.className = `mark-item ${mark.type}`;
      
      const contentWrapper = document.createElement('div');
      contentWrapper.style.flex = '1';
      
      const quote = document.createElement('div');
      quote.className = 'mark-quote';
      quote.textContent = mark.quote.substring(0, 100) + (mark.quote.length > 100 ? '...' : '');
      
      const meta = document.createElement('div');
      meta.className = 'mark-meta';
      const date = new Date(mark.createdAt);
      const typeLabel = mark.type === 'important' ? '⭐ Important' : '❓ Confused';
      meta.textContent = `${typeLabel} • ${date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/')} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`;
      
      contentWrapper.appendChild(quote);
      contentWrapper.appendChild(meta);
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'mark-delete';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Delete highlight';
      deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this highlight?')) {
          await deleteMark(mark);
        }
      };
      
      li.style.display = 'flex';
      li.style.alignItems = 'flex-start';
      li.style.gap = '8px';
      li.appendChild(contentWrapper);
      li.appendChild(deleteBtn);
      
      // Click to scroll to mark in page (but not if clicking delete button)
      li.addEventListener('click', (e) => {
        if (e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
          scrollToMark(mark);
        }
      });
      
      marksList.appendChild(li);
    }
    
    console.log(`Loaded ${marks.length} marks for URL`);
    
  } catch (error) {
    console.error('Failed to load marks:', error);
    marksList.innerHTML = '<li class="empty-state">Failed to load highlights</li>';
  }
}

/**
 * Scroll to mark in page (send message to content script)
 */
async function scrollToMark(mark) {
  if (!currentTab || !currentTab.id) {
    return;
  }
  
  try {
    await chrome.tabs.sendMessage(currentTab.id, {
      type: 'SCROLL_TO_MARK',
      mark: mark
    });
  } catch (error) {
    console.error('Failed to scroll to mark:', error);
  }
}

/**
 * Delete a mark (remove from storage and update UI)
 */
async function deleteMark(mark) {
  if (!mark || !mark.id) {
    console.warn('Cannot delete mark: missing ID');
    return;
  }
  
  try {
    // Remove highlight from page FIRST (immediate visual feedback)
    if (currentTab && currentTab.id) {
      try {
        await chrome.tabs.sendMessage(currentTab.id, {
          type: 'REMOVE_HIGHLIGHT',
          recordId: mark.id
        });
        console.log('Highlight removed from page:', mark.id);
      } catch (error) {
        console.warn('Could not remove highlight from page:', error);
        // Continue with deletion even if page removal fails
      }
    }
    
    // Delete from storage
    await Storage.deleteRecord(mark.id);
    console.log('Mark deleted from storage:', mark.id);
    
    // Reload marks to update UI
    await loadMarks(currentUrl);
    
  } catch (error) {
    console.error('Failed to delete mark:', error);
    alert('Delete failed: ' + error.message);
  }
}

/**
 * Copy output to clipboard as Markdown
 */
async function copyToClipboard() {
  const text = outputTextarea.value;
  
  if (!text || text.trim().length === 0) {
    alert('No content to copy');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const textSpan = copyBtn.querySelector('span');
    const originalText = textSpan.textContent;
    textSpan.textContent = '✓ Copied!';
    copyBtn.classList.add('copied');
    
    setTimeout(() => {
      textSpan.textContent = originalText;
      copyBtn.classList.remove('copied');
    }, 2000);
    
    console.log('Copied to clipboard');
    
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('Copy failed: ' + error.message);
  }
}

/**
 * Download output as Markdown file
 */
function downloadMarkdown() {
  const text = outputTextarea.value;
  
  if (!text || text.trim().length === 0) {
    alert('No content to download');
    return;
  }
  
  try {
    // Create Blob with UTF-8 encoding
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    
    // Generate filename from title or timestamp
    let filename = 'marksense';
    if (currentTab && currentTab.title) {
      filename = currentTab.title
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '_')
        .substring(0, 50);
    }
    filename += `_${Date.now()}.md`;
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
    
    // Visual feedback
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = '✓ Downloaded';
    setTimeout(() => {
      downloadBtn.textContent = originalText;
    }, 2000);
    
    console.log('Downloaded as:', filename);
    
  } catch (error) {
    console.error('Failed to download:', error);
    alert('Download failed: ' + error.message);
  }
}

/**
 * Translate the summary to selected language
 */
async function translateSummary() {
  console.log('🌐 Translate button clicked');
  
  const summaryText = outputTextarea.value;
  if (!summaryText || summaryText.trim().length === 0) {
    translateResultTextarea.value = 'Please generate a summary first.';
    return;
  }
  
  const targetLang = translateToSelect.value;
  
  try {
    translateBtn.disabled = true;
    translateBtn.textContent = 'Translating...';
    translateResultTextarea.value = 'Translating...';
    
    console.log(`Translating to: ${targetLang}`);
    const translation = await AISDK.translate(summaryText, targetLang, 'en');
    
    translateResultTextarea.value = translation;
    console.log('Translation completed successfully');
    
  } catch (error) {
    console.error('Translation failed:', error);
    translateResultTextarea.value = `Translation failed: ${error.message}`;
  } finally {
    translateBtn.disabled = false;
    translateBtn.textContent = '⭐ Translate';
  }
}

/**
 * Copy translation to clipboard
 */
async function copyTranslation() {
  const text = translateResultTextarea.value;
  if (!text || text.trim().length === 0) {
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const span = copyTranslationBtn.querySelector('span');
    const originalText = span.textContent;
    span.textContent = 'Copied!';
    copyTranslationBtn.classList.add('copied');
    
    setTimeout(() => {
      span.textContent = originalText;
      copyTranslationBtn.classList.remove('copied');
    }, 2000);
    
    console.log('Translation copied to clipboard');
  } catch (error) {
    console.error('Failed to copy translation:', error);
    alert('Failed to copy translation');
  }
}

/**
 * Initialize side panel
 */
async function initialize() {
  console.log('Initializing side panel');
  
  // Get current tab and reset state
  currentTab = await getActiveTab();
  if (currentTab) {
    currentUrl = currentTab.url;
    extractedText = ''; // Reset extracted text
    currentKeywords = []; // Reset keywords for new tab
    currentSessionStartTime = Date.now(); // Reset session time for new tab
    await loadMarks(currentUrl);
  }
  
  // Set up event listeners
  summarizeBtn.addEventListener('click', summarizeText);
  copyBtn.addEventListener('click', copyToClipboard);
  translateBtn.addEventListener('click', translateSummary);
  copyTranslationBtn.addEventListener('click', copyTranslation);
  
  // Listen for storage changes to update marks
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.marksense_records || changes.smartnote_records)) {
      console.log('Storage changed, reloading marks');
      loadMarks(currentUrl);
    }
  });
  
  console.log('Side panel initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

