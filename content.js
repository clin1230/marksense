// Storage Utility
// Handles Chrome storage operations for MarkSense records
// No network calls - pure local storage

console.log('Storage utility loaded');

const STORAGE_KEY = 'marksense_records';

/**
 * Storage utility for managing MarkSense records
 * 
 * Record structure:
 * {
 *   id: string,
 *   url: string,
 *   quote: string,
 *   prefix: string,
 *   suffix: string,
 *   type: "important" | "confused",
 *   createdAt: number (timestamp)
 * }
 */
var Storage = {
  /**
   * Load all records from storage
   * @returns {Promise<Array>} Array of records (empty array if none exist)
   */
  async loadAll() {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const records = result[STORAGE_KEY];
      
      // Handle empty state gracefully
      if (!records || !Array.isArray(records)) {
        return [];
      }
      
      return records;
    } catch (error) {
      console.error('Failed to load records:', error);
      return [];
    }
  },

  /**
   * Save all records to storage (overwrites existing)
   * @param {Array} list - Array of record objects
   * @returns {Promise<void>}
   */
  async saveAll(list) {
    try {
      // Ensure we're saving an array
      const records = Array.isArray(list) ? list : [];
      await chrome.storage.local.set({ [STORAGE_KEY]: records });
      console.log(`Saved ${records.length} records`);
    } catch (error) {
      console.error('Failed to save records:', error);
      throw error;
    }
  },

  /**
   * Add a new record
   * @param {Object} rec - Record object to add
   * @returns {Promise<Object>} The added record with generated ID and timestamp
   */
  async addRecord(rec) {
    try {
      // Load existing records
      const records = await this.loadAll();
      
      // Create new record with ID and timestamp
      const newRecord = {
        ...rec,
        id: rec.id || this._generateId(),
        createdAt: rec.createdAt || Date.now()
      };
      
      // Validate required fields
      if (!newRecord.url || !newRecord.quote || !newRecord.type) {
        throw new Error('Missing required fields: url, quote, type');
      }
      
      if (!['important', 'confused'].includes(newRecord.type)) {
        throw new Error('Type must be "important" or "confused"');
      }
      
      // Add to beginning of array (newest first)
      records.unshift(newRecord);
      
      // Save updated list
      await this.saveAll(records);
      console.log('Record added:', newRecord.id);
      
      return newRecord;
    } catch (error) {
      console.error('Failed to add record:', error);
      throw error;
    }
  },

  /**
   * Update an existing record by ID
   * @param {string} id - Record ID to update
   * @param {Object} patch - Object with fields to update
   * @returns {Promise<Object|null>} Updated record or null if not found
   */
  async updateRecord(id, patch) {
    try {
      const records = await this.loadAll();
      
      // Find record index
      const index = records.findIndex(rec => rec.id === id);
      
      if (index === -1) {
        console.warn(`Record not found: ${id}`);
        return null;
      }
      
      // Apply patch (merge with existing record)
      records[index] = {
        ...records[index],
        ...patch,
        id: records[index].id, // Preserve original ID
        createdAt: records[index].createdAt // Preserve creation time
      };
      
      // Save updated list
      await this.saveAll(records);
      console.log('Record updated:', id);
      
      return records[index];
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  },

  /**
   * Get all records for a specific URL
   * @param {string} url - URL to filter by
   * @returns {Promise<Array>} Array of matching records (empty if none found)
   */
  async listByUrl(url) {
    try {
      const records = await this.loadAll();
      
      // Handle empty URL gracefully
      if (!url) {
        return [];
      }
      
      // Filter records by URL
      const filtered = records.filter(rec => rec.url === url);
      console.log(`Found ${filtered.length} records for URL: ${url}`);
      
      return filtered;
    } catch (error) {
      console.error('Failed to list records by URL:', error);
      return [];
    }
  },

  /**
   * Delete a record by ID
   * @param {string} id - Record ID to delete
   * @returns {Promise<boolean>} True if deleted, false if not found
   */
  async deleteRecord(id) {
    try {
      const records = await this.loadAll();
      const initialLength = records.length;
      
      // Filter out the record to delete
      const filtered = records.filter(rec => rec.id !== id);
      
      if (filtered.length === initialLength) {
        console.warn(`Record not found for deletion: ${id}`);
        return false;
      }
      
      await this.saveAll(filtered);
      console.log('Record deleted:', id);
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      throw error;
    }
  },

  /**
   * Generate a unique ID for a record
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Anchor Utility
// Handles text anchoring and positioning in documents
// No network calls - pure DOM manipulation

console.log('Anchor utility loaded');

var Anchor = {
  /**
   * Serialize a DOM Range into quote with prefix/suffix context
   * @param {Range} range - DOM Range object from selection
   * @param {number} ctxLen - Length of context before/after (default: 40)
   * @returns {Object} { quote, prefix, suffix }
   */
  serializeRange(range, ctxLen = 40) {
    if (!range || range.collapsed) {
      throw new Error('Invalid or collapsed range');
    }

    // Extract the selected text
    const quote = range.toString();
    
    if (!quote) {
      throw new Error('Empty selection');
    }

    // Get the container and text around the selection
    const startContainer = range.startContainer;
    const endContainer = range.endContainer;

    // Get prefix: text before the selection
    let prefix = '';
    if (startContainer.nodeType === Node.TEXT_NODE) {
      const textBefore = startContainer.textContent.substring(0, range.startOffset);
      prefix = textBefore.slice(-ctxLen);
    } else {
      // If not a text node, try to get text from previous siblings/parents
      prefix = this._getTextBefore(startContainer, ctxLen);
    }

    // Get suffix: text after the selection
    let suffix = '';
    if (endContainer.nodeType === Node.TEXT_NODE) {
      const textAfter = endContainer.textContent.substring(range.endOffset);
      suffix = textAfter.slice(0, ctxLen);
    } else {
      // If not a text node, try to get text from next siblings/parents
      suffix = this._getTextAfter(endContainer, ctxLen);
    }

    return {
      quote: quote,
      prefix: prefix,
      suffix: suffix
    };
  },

  /**
   * Find a text match in the document using quote and context
   * @param {Object} anchor - { quote, prefix, suffix }
   * @returns {Object|null} { node, offset } or null if not found
   */
  findMatch({ quote, prefix, suffix }) {
    if (!quote) {
      return null;
    }

    // Get all text nodes in the document
    const textNodes = this._getTextNodes(document.body);
    
    // Build full text content with node mapping
    let fullText = '';
    const nodeMap = []; // Maps character positions to text nodes
    
    for (const node of textNodes) {
      const text = node.textContent;
      const startPos = fullText.length;
      fullText += text;
      nodeMap.push({
        node: node,
        start: startPos,
        end: fullText.length,
        text: text
      });
    }

    // Search for quote with best matching context
    let bestMatch = null;
    let bestScore = -1;
    
    // Find all occurrences of the quote
    let searchStart = 0;
    while (true) {
      const quoteIndex = fullText.indexOf(quote, searchStart);
      if (quoteIndex === -1) break;
      
      // Calculate match score based on prefix/suffix
      const contextBefore = fullText.substring(Math.max(0, quoteIndex - prefix.length), quoteIndex);
      const contextAfter = fullText.substring(quoteIndex + quote.length, quoteIndex + quote.length + suffix.length);
      
      let score = 0;
      
      // Score prefix match
      if (prefix) {
        const prefixMatch = this._calculateSimilarity(contextBefore, prefix);
        score += prefixMatch;
      }
      
      // Score suffix match
      if (suffix) {
        const suffixMatch = this._calculateSimilarity(contextAfter, suffix);
        score += suffixMatch;
      }
      
      // Update best match
      if (score > bestScore) {
        bestScore = score;
        
        // Find which text node contains this position
        for (const mapping of nodeMap) {
          if (quoteIndex >= mapping.start && quoteIndex < mapping.end) {
            bestMatch = {
              node: mapping.node,
              offset: quoteIndex - mapping.start,
              length: quote.length
            };
            break;
          }
        }
      }
      
      searchStart = quoteIndex + 1;
    }
    
    return bestMatch;
  },

  /**
   * Highlight text at a match location by wrapping in a span
   * @param {Object} match - { node, offset, length } from findMatch
   * @param {string} quote - The text to highlight
   * @param {string} cssClass - CSS class name for the highlight span
   * @returns {HTMLElement|null} The created highlight span or null on failure
   */
  highlightAt(match, quote, cssClass) {
    if (!match || !match.node || !cssClass) {
      return null;
    }

    try {
      const textNode = match.node;
      const offset = match.offset || 0;
      const length = match.length || quote.length;

      // Verify this is a text node
      if (textNode.nodeType !== Node.TEXT_NODE) {
        console.warn('Match node is not a text node');
        return null;
      }

      // Verify the text matches
      const actualText = textNode.textContent.substring(offset, offset + length);
      if (actualText !== quote) {
        console.warn('Text mismatch at highlight location');
        // Continue anyway - text might have minor differences
      }

      // Create a Range for the exact text to highlight
      const range = document.createRange();
      range.setStart(textNode, offset);
      range.setEnd(textNode, offset + length);

      // Create highlight span
      const highlightSpan = document.createElement('span');
      highlightSpan.className = cssClass;
      
      // Wrap the range contents
      range.surroundContents(highlightSpan);

      console.log(`Highlighted text with class: ${cssClass}`);
      return highlightSpan;

    } catch (error) {
      console.error('Failed to highlight text:', error);
      return null;
    }
  },

  /**
   * Helper: Get all text nodes under an element
   * @private
   */
  _getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          // Skip empty or whitespace-only nodes
          if (node.textContent.trim().length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          // Skip script and style tags
          const parent = node.parentElement;
          if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node);
    }

    return textNodes;
  },

  /**
   * Helper: Get text before a node
   * @private
   */
  _getTextBefore(node, maxLen) {
    let text = '';
    let currentNode = node;
    
    while (text.length < maxLen && currentNode) {
      if (currentNode.previousSibling) {
        currentNode = currentNode.previousSibling;
        const nodeText = currentNode.textContent || '';
        text = nodeText + text;
      } else {
        currentNode = currentNode.parentNode;
      }
    }
    
    return text.slice(-maxLen);
  },

  /**
   * Helper: Get text after a node
   * @private
   */
  _getTextAfter(node, maxLen) {
    let text = '';
    let currentNode = node;
    
    while (text.length < maxLen && currentNode) {
      if (currentNode.nextSibling) {
        currentNode = currentNode.nextSibling;
        const nodeText = currentNode.textContent || '';
        text = text + nodeText;
      } else {
        currentNode = currentNode.parentNode;
      }
    }
    
    return text.slice(0, maxLen);
  },

  /**
   * Helper: Calculate similarity between two strings (0-1)
   * @private
   */
  _calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    // Simple character-by-character comparison
    const minLen = Math.min(str1.length, str2.length);
    let matches = 0;
    
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return matches / Math.max(str1.length, str2.length);
  }
};

// Content Script for MarkSense AI
// Runs on all pages - no network calls
// Storage and Anchor utilities are defined above (inline)

console.log('MarkSense AI content script loaded');
console.log('✅ Utilities available - Storage:', typeof Storage, 'Anchor:', typeof Anchor);

// Utilities are always ready (they're inline)
let utilitiesReady = true;

const waitForUtilities = () => {
  return Promise.resolve(); // Utilities are already loaded inline
};

// Global toolbar reference
let floatingToolbar = null;
let currentRange = null;

/**
 * Create the floating toolbar UI
 */
function createToolbar() {
  const toolbar = document.createElement('div');
  toolbar.className = 'marksense-toolbar';
  toolbar.style.display = 'none';
  toolbar.style.position = 'absolute';
  toolbar.style.zIndex = '999999';

  // Important button (⭐)
  const importantBtn = document.createElement('button');
  importantBtn.className = 'marksense-btn';
  importantBtn.innerHTML = '⭐';
  importantBtn.title = 'Mark as important (Alt+I)';
  importantBtn.onclick = () => handleMarkSelection('important');

  // Confused button (❓)
  const confusedBtn = document.createElement('button');
  confusedBtn.className = 'marksense-btn';
  confusedBtn.innerHTML = '❓';
  confusedBtn.title = 'Mark as confused (Alt+?)';
  confusedBtn.onclick = () => handleMarkSelection('confused');

  toolbar.appendChild(importantBtn);
  toolbar.appendChild(confusedBtn);

  document.body.appendChild(toolbar);
  return toolbar;
}

/**
 * Position toolbar above the selection
 */
function positionToolbar(range) {
  if (!floatingToolbar || !range) return;

  const rect = range.getBoundingClientRect();
  const scrollX = window.scrollX || window.pageXOffset;
  const scrollY = window.scrollY || window.pageYOffset;

  // Position above selection
  const left = rect.left + scrollX + (rect.width / 2) - 50; // Center toolbar (approx 100px wide)
  const top = rect.top + scrollY - 60; // 60px above selection

  floatingToolbar.style.left = `${left}px`;
  floatingToolbar.style.top = `${top}px`;
  floatingToolbar.style.display = 'flex';
}

/**
 * Hide the toolbar
 */
function hideToolbar() {
  if (floatingToolbar) {
    floatingToolbar.style.display = 'none';
  }
  currentRange = null;
}

/**
 * Handle marking selection (important or confused)
 */
async function handleMarkSelection(type) {
  if (!currentRange || currentRange.collapsed) {
    console.warn('No valid selection');
    hideToolbar();
    return;
  }

  try {
    // Wait for utilities to be loaded
    if (!utilitiesReady) {
      console.log('⏳ Waiting for utilities before marking...');
      await waitForUtilities();
    }

    // Serialize the range
    const anchor = Anchor.serializeRange(currentRange);
    console.log('Serialized selection:', anchor);

    // Create record
    const record = {
      url: window.location.href,
      quote: anchor.quote,
      prefix: anchor.prefix,
      suffix: anchor.suffix,
      type: type
    };

    // Save to storage
    await Storage.addRecord(record);
    console.log('Record saved:', record);

    // Highlight immediately
    const cssClass = type === 'important' 
      ? 'marksense-highlight-important' 
      : 'marksense-highlight-confused';

    const match = Anchor.findMatch(anchor);
    if (match) {
      Anchor.highlightAt(match, anchor.quote, cssClass);
      console.log(`Highlighted as ${type}`);
    } else {
      console.warn('Could not find match for highlighting');
    }

    // Hide toolbar
    hideToolbar();

    // Clear selection
    window.getSelection().removeAllRanges();

  } catch (error) {
    console.error('Failed to mark selection:', error);
  }
}

/**
 * Handle mouseup events to show/hide toolbar
 */
document.addEventListener('mouseup', (event) => {
  // Don't show toolbar if clicking on the toolbar itself
  if (event.target.closest('.marksense-toolbar')) {
    return;
  }

  // Small delay to ensure selection is finalized
  setTimeout(() => {
    const selection = window.getSelection();

    // Hide toolbar if selection is collapsed or empty
    if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
      hideToolbar();
      return;
    }

    try {
      // Store the current range
      currentRange = selection.getRangeAt(0);

      // Create toolbar if it doesn't exist
      if (!floatingToolbar) {
        floatingToolbar = createToolbar();
      }

      // Position and show toolbar
      positionToolbar(currentRange);
    } catch (error) {
      console.error('Error showing toolbar:', error);
      hideToolbar();
    }
  }, 10);
});

/**
 * Hide toolbar on scroll or resize
 */
document.addEventListener('scroll', hideToolbar);
window.addEventListener('resize', hideToolbar);

/**
 * Listen for COMMAND messages from service worker
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);

  if (request.type === 'COMMAND') {
    handleCommand(request.command);
    sendResponse({ status: 'ok', command: request.command });
  } else {
    sendResponse({ status: 'ok' });
  }

  return true;
});

/**
 * Handle keyboard command shortcuts
 */
async function handleCommand(command) {
  console.log('Handling command:', command);

  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) {
    console.warn('No text selected for command:', command);
    return;
  }

  try {
    const range = selection.getRangeAt(0);

    switch (command) {
      case 'mark_important':
        currentRange = range;
        await handleMarkSelection('important');
        break;

      case 'mark_confused':
        currentRange = range;
        await handleMarkSelection('confused');
        break;

      case 'translate_block':
        // Future: implement translation
        console.log('[Placeholder] Translate selected text');
        // Could show a popup with translation when AISDK.translate is ready
        break;

      default:
        console.warn('Unknown command:', command);
    }
  } catch (error) {
    console.error('Error handling command:', error);
  }
}

/**
 * Restore highlights on page load
 */
async function restoreHighlights() {
  try {
    // Wait for utilities to load
    console.log('⏳ Waiting for utilities to restore highlights...');
    await waitForUtilities();

    if (typeof Storage === 'undefined' || typeof Anchor === 'undefined') {
      console.warn('Utilities not loaded, skipping highlight restoration');
      return;
    }

    const currentUrl = window.location.href;
    const records = await Storage.listByUrl(currentUrl);
    
    console.log(`Restoring ${records.length} highlights for current page`);

    for (const record of records) {
      const match = Anchor.findMatch({
        quote: record.quote,
        prefix: record.prefix,
        suffix: record.suffix
      });

      if (match) {
        const cssClass = record.type === 'important'
          ? 'marksense-highlight-important'
          : 'marksense-highlight-confused';
        
        Anchor.highlightAt(match, record.quote, cssClass);
      }
    }
  } catch (error) {
    console.error('Failed to restore highlights:', error);
  }
}

// Restore highlights when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', restoreHighlights);
} else {
  restoreHighlights();
}

