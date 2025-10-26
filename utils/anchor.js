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

