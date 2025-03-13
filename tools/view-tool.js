/**
 * View tool for file content retrieval
 * Optimized for efficient file access and content rendering
 */
class ViewTool {
  constructor(config = {}) {
    this.name = 'view';
    this.description = 'View the contents of a file';
    this.config = config;
    this.logger = console; // Replace with structured logger in production
  }

  /**
   * Get tool name
   * @returns {string} Tool name
   */
  getName() {
    return this.name;
  }

  /**
   * Get tool description
   * @returns {string} Tool description
   */
  getDescription() {
    return this.description;
  }

  /**
   * Execute the view tool to retrieve file contents
   * @param {string} filePath - Path to the file
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(filePath, options = {}) {
    try {
      // Basic validation
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path: must be a non-empty string');
      }

      // Merge options with defaults
      const resolvedOptions = {
        encoding: 'utf8',
        maxSize: this.config.maxSize || 5 * 1024 * 1024, // 5MB default
        ...options
      };

      this.logger.debug(`Viewing file: ${filePath}`);

      // Read file content via the appropriate method (browser FileSystem API)
      let content;
      try {
        content = await this._readFile(filePath, resolvedOptions);
      } catch (readError) {
        throw new Error(`Failed to read file: ${readError.message}`);
      }

      // Format response
      const result = {
        path: filePath,
        content,
        metadata: {
          size: content.length,
          encoding: resolvedOptions.encoding,
          timestamp: Date.now()
        }
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(`ViewTool error for ${filePath}:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          path: filePath,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Read file from the filesystem
   * @private
   * @param {string} filePath - Path to the file
   * @param {Object} options - Read options
   * @returns {Promise<string>} File contents
   */
  async _readFile(filePath, options) {
    try {
      // For browser environment, use the FileSystem API
      if (typeof window !== 'undefined' && window.fs && window.fs.readFile) {
        const result = await window.fs.readFile(filePath, { encoding: options.encoding });
        return result;
      }
      
      // If running in Node.js (rare for this extension), use fs module
      if (typeof require === 'function') {
        const fs = require('fs').promises;
        return await fs.readFile(filePath, { encoding: options.encoding });
      }

      throw new Error('File system API not available');
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ViewTool;