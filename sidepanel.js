// Side Panel Logic for MarkSense AI
// No network calls - 100% offline processing

console.log('MarkSense AI side panel loaded');

// State
let currentTab = null;
let extractedText = '';
let currentUrl = '';

// DOM Elements
const extractBtn = document.getElementById('extract');
const summarizeBtn = document.getElementById('summarize');
const toneSelect = document.getElementById('tone');
const lengthSelect = document.getElementById('length');
const outputTextarea = document.getElementById('output');
const copyBtn = document.getElementById('copy');
const downloadBtn = document.getElementById('download');
const keywordsContainer = document.getElementById('keywords');
const marksList = document.getElementById('marks');

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
        
        // Extract and display keywords
        await displayKeywords(extractedText);
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
 * Summarize extracted text
 */
async function summarizeText() {
  if (!extractedText || extractedText.trim().length === 0) {
    outputTextarea.value = '請先抽取正文';
    return;
  }
  
  try {
    summarizeBtn.disabled = true;
    summarizeBtn.textContent = '生成中...';
    
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
    
    // Chunk text if it's too long
    const chunks = Chunking.chunkText(extractedText, 2000);
    console.log(`Split into ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      outputTextarea.value = '無法分割文本';
      return;
    }
    
    // Summarize each chunk
    const summaries = [];
    for (const chunk of chunks) {
      const summary = await AISDK.summarize(chunk, {
        tone: tone,
        length: aiLength
      });
      if (summary) {
        summaries.push(summary);
      }
    }
    
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
    
    // Display result
    const title = currentTab ? currentTab.title : '摘要';
    outputTextarea.value = `# ${title}\n\n## 摘要\n\n${finalSummary}`;
    
    console.log('Summary generated successfully');
    
  } catch (error) {
    console.error('Failed to summarize:', error);
    outputTextarea.value = `摘要失敗: ${error.message}`;
  } finally {
    summarizeBtn.disabled = false;
    summarizeBtn.textContent = '產生摘要';
  }
}

/**
 * Extract and display keywords
 */
async function displayKeywords(text) {
  if (!text || text.trim().length === 0) {
    keywordsContainer.innerHTML = '<div class="empty-state">尚無關鍵字</div>';
    return;
  }
  
  try {
    const keywords = await AISDK.extractKeywords(text, 15);
    
    if (keywords.length === 0) {
      keywordsContainer.innerHTML = '<div class="empty-state">尚無關鍵字</div>';
      return;
    }
    
    // Render keywords as pills
    keywordsContainer.innerHTML = '';
    for (const kw of keywords) {
      const pill = document.createElement('span');
      pill.className = 'keyword';
      pill.textContent = `${kw.word} (${kw.count})`;
      keywordsContainer.appendChild(pill);
    }
    
    console.log(`Displayed ${keywords.length} keywords`);
    
  } catch (error) {
    console.error('Failed to extract keywords:', error);
    keywordsContainer.innerHTML = '<div class="empty-state">關鍵字提取失敗</div>';
  }
}

/**
 * Load and display marks for current URL
 */
async function loadMarks(url) {
  if (!url) {
    marksList.innerHTML = '<li class="empty-state">尚無標註</li>';
    return;
  }
  
  try {
    const marks = await Storage.listByUrl(url);
    
    if (marks.length === 0) {
      marksList.innerHTML = '<li class="empty-state">尚無標註</li>';
      return;
    }
    
    // Sort by creation time (newest first)
    marks.sort((a, b) => b.createdAt - a.createdAt);
    
    // Render marks
    marksList.innerHTML = '';
    for (const mark of marks) {
      const li = document.createElement('li');
      li.className = `mark-item ${mark.type}`;
      
      const quote = document.createElement('div');
      quote.className = 'mark-quote';
      quote.textContent = mark.quote.substring(0, 100) + (mark.quote.length > 100 ? '...' : '');
      
      const meta = document.createElement('div');
      meta.className = 'mark-meta';
      const date = new Date(mark.createdAt);
      const typeLabel = mark.type === 'important' ? '⭐ 重要' : '❓ 疑問';
      meta.textContent = `${typeLabel} • ${date.toLocaleDateString('zh-TW')} ${date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
      
      li.appendChild(quote);
      li.appendChild(meta);
      
      // Click to scroll to mark in page
      li.addEventListener('click', () => {
        scrollToMark(mark);
      });
      
      marksList.appendChild(li);
    }
    
    console.log(`Loaded ${marks.length} marks for URL`);
    
  } catch (error) {
    console.error('Failed to load marks:', error);
    marksList.innerHTML = '<li class="empty-state">載入標註失敗</li>';
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
 * Copy output to clipboard as Markdown
 */
async function copyToClipboard() {
  const text = outputTextarea.value;
  
  if (!text || text.trim().length === 0) {
    alert('沒有內容可複製');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(text);
    
    // Visual feedback
    const originalText = copyBtn.textContent;
    copyBtn.textContent = '✓ 已複製';
    setTimeout(() => {
      copyBtn.textContent = originalText;
    }, 2000);
    
    console.log('Copied to clipboard');
    
  } catch (error) {
    console.error('Failed to copy:', error);
    alert('複製失敗: ' + error.message);
  }
}

/**
 * Download output as Markdown file
 */
function downloadMarkdown() {
  const text = outputTextarea.value;
  
  if (!text || text.trim().length === 0) {
    alert('沒有內容可下載');
    return;
  }
  
  try {
    // Create Blob with UTF-8 encoding
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    
    // Generate filename from title or timestamp
    let filename = 'smartnote';
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
    downloadBtn.textContent = '✓ 已下載';
    setTimeout(() => {
      downloadBtn.textContent = originalText;
    }, 2000);
    
    console.log('Downloaded as:', filename);
    
  } catch (error) {
    console.error('Failed to download:', error);
    alert('下載失敗: ' + error.message);
  }
}

/**
 * Initialize side panel
 */
async function initialize() {
  console.log('Initializing side panel');
  
  // Get current tab
  currentTab = await getActiveTab();
  if (currentTab) {
    currentUrl = currentTab.url;
    await loadMarks(currentUrl);
  }
  
  // Set up event listeners
  extractBtn.addEventListener('click', extractText);
  summarizeBtn.addEventListener('click', summarizeText);
  copyBtn.addEventListener('click', copyToClipboard);
  downloadBtn.addEventListener('click', downloadMarkdown);
  
  // Listen for storage changes to update marks
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.smartnote_records) {
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

