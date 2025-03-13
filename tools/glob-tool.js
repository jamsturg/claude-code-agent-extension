/**
 * Glob tool for pattern-based file discovery
 * Efficient file matching with support for complex patterns
 */
class GlobTool {
  constructor(config = {}) {
    this.name = 'glob';
    this.description = 'Find files matching a pattern';
    this.config = config;
    this.defaultIgnorePatterns = config.defaultIgnorePatterns || [];
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
   * Execute the glob tool to find files matching a pattern
   * @param {string} pattern - Glob pattern
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async execute(pattern, options = {}) {
    try {
      // Basic validation
      if (!pattern || typeof pattern !== 'string') {
        throw new Error('Invalid pattern: must be a non-empty string');
      }

      // Merge options with defaults
      const resolvedOptions = {
        includeDirectories: options.includeDirectories !== false,
        maxResults: options.maxResults || 1000,
        baseDir: options.baseDir || '.',
        ignorePatterns: [...this.defaultIgnorePatterns, ...(options.ignorePatterns || [])],
        ...options
      };

      this.logger.debug(`Executing glob pattern: ${pattern} from ${resolvedOptions.baseDir}`);

      // Match files using appropriate method (browser environment)
      let matches = [];
      try {
        matches = await this._findMatches(pattern, resolvedOptions);
      } catch (matchError) {
        throw new Error(`Failed to match files: ${matchError.message}`);
      }

      // Apply result limits
      const limitedMatches = matches.slice(0, resolvedOptions.maxResults);

      return {
        success: true,
        data: limitedMatches,
        metadata: {
          pattern,
          baseDir: resolvedOptions.baseDir,
          count: limitedMatches.length,
          truncated: limitedMatches.length < matches.length,
          timestamp: Date.now()
        }
      };
    } catch (error) {
      this.logger.error(`GlobTool error for ${pattern}:`, error);
      return {
        success: false,
        error: error.message,
        metadata: {
          pattern,
          timestamp: Date.now()
        }
      };
    }
  }

  /**
   * Find files matching a glob pattern
   * @private
   * @param {string} pattern - Glob pattern
   * @param {Object} options - Matching options
   * @returns {Promise<string[]>} Matching file paths
   */
  async _findMatches(pattern, options) {
    // In browser environment, we'd implement a custom glob matcher
    // This is a simplified implementation to demonstrate the approach
    
    // Convert pattern to regex for matching
    const regex = this._globToRegex(pattern);
    
    // Get all files from the filesystem
    const allFiles = await this._getAllFiles(options.baseDir);
    
    // Filter files by pattern
    const matches = allFiles.filter(file => {
      // Normalize path for matching
      const relativePath = file.startsWith(options.baseDir) ? 
        file.slice(options.baseDir.length).replace(/^\/+/, '') : 
        file;
      
      // Check if file matches pattern  
      const isMatch = regex.test(relativePath);
      
      // Check if file should be ignored
      const isIgnored = options.ignorePatterns.some(ignorePattern => {
        const ignoreRegex = this._globToRegex(ignorePattern);
        return ignoreRegex.test(relativePath);
      });
      
      // Include directories if requested
      const isDirectory = file.endsWith('/');
      const includeFile = (!isDirectory || options.includeDirectories) && !isIgnored;
      
      return isMatch && includeFile;
    });
    
    return matches;
  }

  /**
   * Convert glob pattern to regex
   * @private
   * @param {string} pattern - Glob pattern
   * @returns {RegExp} Regular expression
   */
  _globToRegex(pattern) {
    // Escape special regex characters
    let regexStr = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    
    // Convert glob patterns to regex equivalents
    regexStr = regexStr
      // ** matches zero or more directories
      .replace(/\*\*/g, '.*')
      // * matches zero or more characters except directory separator
      .replace(/\*/g, '[^/\\\\]*')
      // ? matches a single character except directory separator
      .replace(/\?/g, '[^/\\\\]')
      // {a,b,c} matches any of a, b, or c
      .replace(/\{([^{}]*)\}/g, (match, contents) => {
        return `(${contents.split(',').map(c => c.trim()).join('|')})`;
      });
    
    // Create regex with start/end anchors
    return new RegExp(`^${regexStr}$`, 'i');
  }

  /**
   * Get all files from the filesystem
   * @private
   * @param {string} baseDir - Base directory
   * @returns {Promise<string[]>} All file paths
   */
  async _getAllFiles(baseDir) {
    // This would need to be implemented using the browser's file system API
    // For now, return a placeholder implementation
    return [
      `${baseDir}/src/index.js`,
      `${baseDir}/src/components/App.js`,
      `${baseDir}/src/utils/helpers.js`,
      `${baseDir}/public/index.html`,
      `${baseDir}/package.json`
    ];
  }
}

module.exports = GlobTool;