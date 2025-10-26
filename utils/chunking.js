// Chunking Utility
// Handles text chunking for processing
// No network calls - pure text manipulation

console.log('Chunking utility loaded');

const Chunking = {
  /**
   * Split text into paragraph-aware chunks without breaking words
   * @param {string} text - Text to chunk
   * @param {number} maxChars - Maximum characters per chunk (default: 2000)
   * @returns {Array<string>} Array of text chunks
   */
  chunkText(text, maxChars = 2000) {
    // Handle empty or null text
    if (!text || text.trim().length === 0) {
      return [];
    }

    // Split text into paragraphs (on blank lines)
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);

    const chunks = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const trimmedParagraph = paragraph.trim();

      // If paragraph itself is larger than maxChars, split it
      if (trimmedParagraph.length > maxChars) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split large paragraph into smaller pieces
        const subChunks = this._splitLargeParagraph(trimmedParagraph, maxChars);
        chunks.push(...subChunks);
        continue;
      }

      // Check if adding this paragraph would exceed maxChars
      const potentialChunk = currentChunk
        ? currentChunk + '\n\n' + trimmedParagraph
        : trimmedParagraph;

      if (potentialChunk.length > maxChars) {
        // Current chunk is full, save it and start new chunk
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedParagraph;
      } else {
        // Add paragraph to current chunk
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  },

  /**
   * Split a large paragraph that exceeds maxChars
   * @private
   * @param {string} paragraph - Large paragraph to split
   * @param {number} maxChars - Maximum characters per chunk
   * @returns {Array<string>} Array of sub-chunks
   */
  _splitLargeParagraph(paragraph, maxChars) {
    const chunks = [];
    
    // Try splitting by sentences first
    const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
    
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();

      // If a single sentence is too large, split by words
      if (trimmedSentence.length > maxChars) {
        // Save current chunk if it has content
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split sentence by words
        const wordChunks = this._splitByWords(trimmedSentence, maxChars);
        chunks.push(...wordChunks);
        continue;
      }

      // Check if adding this sentence would exceed maxChars
      const potentialChunk = currentChunk
        ? currentChunk + ' ' + trimmedSentence
        : trimmedSentence;

      if (potentialChunk.length > maxChars) {
        // Current chunk is full, save it and start new chunk
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        // Add sentence to current chunk
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  },

  /**
   * Split text by words when sentences are too large
   * @private
   * @param {string} text - Text to split
   * @param {number} maxChars - Maximum characters per chunk
   * @returns {Array<string>} Array of word-based chunks
   */
  _splitByWords(text, maxChars) {
    const chunks = [];
    const words = text.split(/\s+/);
    
    let currentChunk = '';

    for (const word of words) {
      // If a single word is larger than maxChars, we have to break it
      if (word.length > maxChars) {
        // Save current chunk
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        // Split the long word into character chunks
        for (let i = 0; i < word.length; i += maxChars) {
          chunks.push(word.substring(i, i + maxChars));
        }
        continue;
      }

      // Check if adding this word would exceed maxChars
      const potentialChunk = currentChunk
        ? currentChunk + ' ' + word
        : word;

      if (potentialChunk.length > maxChars) {
        // Current chunk is full, save it and start new chunk
        if (currentChunk.trim().length > 0) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = word;
      } else {
        // Add word to current chunk
        currentChunk = potentialChunk;
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
};

