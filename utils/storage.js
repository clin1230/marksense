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

