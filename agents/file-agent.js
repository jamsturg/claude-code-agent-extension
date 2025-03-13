/**
 * File Agent specialized for file operations
 * Optimized for efficient file management and content analysis
 */
class FileAgent {
  constructor(toolRegistry, embeddingService, memoryEngine) {
    this.toolRegistry = toolRegistry;
    this.embeddingService = embeddingService;
    this.memoryEngine = memoryEngine;
    this.fileCache = new Map(); // Simple LRU cache for file contents
    this.cacheTTL = 1800000; // 30 minutes cache TTL
    this.logger = console; // Replace with structured logger in production
  }

  /**
   * Execute file-related tasks
   * @param {Object} task - Task description
   * @returns {Promise<Object>} Task result
   */
  async executeTask(task) {
    this.logger.info(`FileAgent executing task: ${JSON.stringify(task)}`);

    try {
      // Validate task input
      if (!task || typeof task !== 'object') {
        throw new Error('Invalid task: must be an object');
      }

      // Extract task parameters
      const { operation, path, pattern, content } = task;

      if (!operation) {
        throw new Error('Missing required task parameter: operation');
      }

      // Execute appropriate operation
      switch (operation) {
        case 'read':
          return await this.readFile(path);

        case 'search':
          return await this.searchFiles(pattern || path);

        case 'list':
          return await this.listDirectory(path);

        case 'analyze':
          return await this.analyzeFile(path);

        case 'index':
          return await this.indexFiles(pattern || path);

        default:
          throw new Error(`Unknown file operation: ${operation}`);
      }
    } catch (error) {
      this.logger.error('FileAgent task execution failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Read file contents
   * @param {string} path - File path
   * @returns {Promise<Object>} File content and metadata
   */
  async readFile(path) {
    if (!path) {
      throw new Error('Missing required parameter: path');
    }

    this.logger.debug(`Reading file: ${path}`);

    // Check cache first
    if (this.fileCache.has(path)) {
      const cachedFile = this.fileCache.get(path);
      
      // Return cached content if not expired
      if (Date.now() - cachedFile.timestamp < this.cacheTTL) {
        this.logger.debug(`Cache hit for file: ${path}`);
        
        return {
          success: true,
          data: {
            path,
            content: cachedFile.content,
            metadata: cachedFile.metadata,
            fromCache: true
          },
          timestamp: Date.now()
        };
      }
      
      // Remove expired cache entry
      this.fileCache.delete(path);
    }

    // Get ViewTool from registry
    const viewTool = this.toolRegistry.getTool('view');

    // Read file using View tool
    const result = await viewTool.execute(path);

    if (!result.success) {
      throw new Error(`Failed to read file ${path}: ${result.error}`);
    }

    // Cache the file content
    this.fileCache.set(path, {
      content: result.data.content,
      metadata: result.data.metadata,
      timestamp: Date.now()
    });

    return {
      success: true,
      data: {
        path,
        content: result.data.content,
        metadata: result.data.metadata,
        fromCache: false
      },
      timestamp: Date.now()
    };
  }

  /**
   * Search for files matching a pattern
   * @param {string} pattern - Search pattern
   * @returns {Promise<Object>} Matching files
   */
  async searchFiles(pattern) {
    if (!pattern) {
      throw new Error('Missing required parameter: pattern');
    }

    this.logger.debug(`Searching for files: ${pattern}`);

    // Get GlobTool from registry
    const globTool = this.toolRegistry.getTool('glob');

    // Find files matching pattern
    const result = await globTool.execute(pattern);

    if (!result.success) {
      throw new Error(`Failed to search for files matching ${pattern}: ${result.error}`);
    }

    return {
      success: true,
      data: {
        pattern,
        matches: result.data,
        count: result.data.length,
        metadata: result.metadata
      },
      timestamp: Date.now()
    };
  }

  /**
   * List directory contents
   * @param {string} path - Directory path
   * @returns {Promise<Object>} Directory contents
   */
  async listDirectory(path) {
    if (!path) {
      throw new Error('Missing required parameter: path');
    }

    this.logger.debug(`Listing directory: ${path}`);

    // Get LSTool from registry
    const lsTool = this.toolRegistry.getTool('ls');

    // List directory contents
    const result = await lsTool.execute(path, { detailed: true });

    if (!result.success) {
      throw new Error(`Failed to list directory ${path}: ${result.error}`);
    }

    return {
      success: true,
      data: {
        path,
        contents: result.data,
        count: result.data.length,
        metadata: result.metadata
      },
      timestamp: Date.now()
    };
  }

  /**
   * Analyze file content
   * @param {string} path - File path
   * @returns {Promise<Object>} File analysis
   */
  async analyzeFile(path) {
    if (!path) {
      throw new Error('Missing required parameter: path');
    }

    this.logger.debug(`Analyzing file: ${path}`);

    // Read file content
    const readResult = await this.readFile(path);

    if (!readResult.success) {
      throw new Error(`Failed to read file for analysis: ${readResult.error || 'unknown error'}`);
    }

    const content = readResult.data.content;

    // Generate embedding for content if embedding service is available
    let embedding = null;
    if (this.embeddingService) {
      try {
        embedding = await this.embeddingService.generateEmbedding(content);
      } catch (error) {
        this.logger.warn(`Failed to generate embedding for ${path}:`, error);
      }
    }

    // Basic file analysis
    const analysis = {
      path,
      size: content.length,
      lineCount: content.split('\n').length,
      hasEmbedding: embedding !== null,
      topKeywords: this._extractKeywords(content),
      fileType: this._determineFileType(path, content),
      summary: this._summarizeContent(content)
    };

    // Store analysis result in memory if available
    if (this.memoryEngine) {
      try {
        await this.memoryEngine.storeMemory(`file_analysis:${path}`, analysis, {
          type: 'file_analysis',
          path,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger.warn(`Failed to store file analysis in memory: ${error.message}`);
      }
    }

    return {
      success: true,
      data: analysis,
      timestamp: Date.now()
    };
  }

  /**
   * Index files matching a pattern for semantic search
   * @param {string} pattern - File pattern to match
   * @returns {Promise<Object>} Indexing results
   */
  async indexFiles(pattern) {
    if (!pattern) {
      throw new Error('Missing required parameter: pattern');
    }

    // Validate services required for indexing
    if (!this.embeddingService) {
      throw new Error('Embedding service required for file indexing');
    }

    if (!this.memoryEngine) {
      throw new Error('Memory engine required for file indexing');
    }

    this.logger.info(`Indexing files matching pattern: ${pattern}`);

    // Find files matching pattern
    const searchResult = await this.searchFiles(pattern);

    if (!searchResult.success) {
      throw new Error(`Failed to find files for indexing: ${searchResult.error || 'unknown error'}`);
    }

    const files = searchResult.data.matches;
    this.logger.info(`Found ${files.length} files to index`);

    // Initialize results object
    const results = {
      pattern,
      totalFiles: files.length,
      processedFiles: 0,
      failedFiles: 0,
      details: []
    };

    // Process files in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(file => this._indexSingleFile(file));

      const batchResults = await Promise.allSettled(batchPromises);

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const filePath = batch[j];

        if (result.status === 'fulfilled') {
          results.processedFiles++;
          results.details.push(result.value);
        } else {
          results.failedFiles++;
          results.details.push({
            path: filePath,
            success: false,
            error: result.reason.message || 'Unknown error'
          });
        }
      }

      // Status update for long-running indexing
      this.logger.info(`Indexed ${results.processedFiles}/${files.length} files (${results.failedFiles} failed)`);
    }

    // Store indexing result in memory
    if (this.memoryEngine) {
      try {
        await this.memoryEngine.storeMemory(`file_indexing:${pattern}`, results, {
          type: 'file_indexing',
          pattern,
          timestamp: Date.now()
        });
      } catch (error) {
        this.logger.warn(`Failed to store indexing results in memory: ${error.message}`);
      }
    }

    return {
      success: true,
      data: results,
      timestamp: Date.now()
    };
  }

  /**
   * Index a single file
   * @private
   * @param {string} path - File path
   * @returns {Promise<Object>} Indexing result
   */
  async _indexSingleFile(path) {
    try {
      // Read file content
      const readResult = await this.readFile(path);

      if (!readResult.success) {
        throw new Error(`Failed to read file: ${readResult.error || 'unknown error'}`);
      }

      const content = readResult.data.content;

      // Generate embedding
      const embedding = await this.embeddingService.generateEmbedding(content);

      // Store in memory with embedding
      await this.memoryEngine.storeMemory(`file_content:${path}`, {
        path,
        content,
        embedding
      }, {
        type: 'file_content',
        path,
        timestamp: Date.now()
      });

      return {
        path,
        success: true,
        size: content.length,
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error(`Failed to index file ${path}:`, error);
      throw error;
    }
  }

  /**
   * Extract keywords from text content
   * @private
   * @param {string} text - Text content
   * @param {number} limit - Maximum number of keywords
   * @returns {Array<{word: string, count: number}>} Top keywords
   */
  _extractKeywords(text, limit = 10) {
    // Define common stop words to filter out
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
      'this', 'that', 'these', 'those', 'with', 'for', 'from', 'to', 'at',
      'by', 'about', 'as', 'into', 'like', 'through', 'over', 'after', 'before',
      'between', 'under', 'above', 'below', 'since', 'during', 'until', 'unless',
      'although', 'how', 'what', 'when', 'where', 'who', 'which', 'why',
      'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'will'
    ]);

    // Tokenize and normalize text
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .split(/\s+/) // Split on whitespace
      .filter(word => (
        word.length > 2 && // Filter out very short words
        !stopWords.has(word) && // Filter out stop words
        !/^\d+$/.test(word) // Filter out numbers
      ));

    // Count word frequencies
    const wordCounts = {};
    for (const word of words) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }

    // Sort by frequency (descending) and limit results
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word, count]) => ({ word, count }));
  }

  /**
   * Determine file type based on extension and content
   * @private
   * @param {string} path - File path
   * @param {string} content - File content
   * @returns {string} File type
   */
  _determineFileType(path, content) {
    // Check file extension first
    const extension = path.split('.').pop().toLowerCase();
    
    // Common file types by extension
    const extensionMap = {
      'js': 'JavaScript',
      'jsx': 'React JSX',
      'ts': 'TypeScript',
      'tsx': 'React TSX',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'md': 'Markdown',
      'py': 'Python',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'h': 'C/C++ Header',
      'rb': 'Ruby',
      'go': 'Go',
      'php': 'PHP',
      'sql': 'SQL',
      'sh': 'Shell Script',
      'bat': 'Batch Script',
      'ps1': 'PowerShell Script',
      'yml': 'YAML',
      'yaml': 'YAML',
      'xml': 'XML',
      'csv': 'CSV',
      'txt': 'Plain Text'
    };
    
    // If extension is recognized, return the mapped type
    if (extensionMap[extension]) {
      return extensionMap[extension];
    }
    
    // Further content-based detection for common file types
    if (content.startsWith('<?xml')) {
      return 'XML';
    } else if (content.startsWith('<!DOCTYPE html>') || /<html[\s>]/i.test(content)) {
      return 'HTML';
    } else if (/^\s*[{\[]/.test(content) && /[}\]]\s*$/.test(content)) {
      try {
        JSON.parse(content);
        return 'JSON';
      } catch (e) {
        // Not valid JSON
      }
    }
    
    // Default to plain text if type cannot be determined
    return 'Plain Text';
  }

  /**
   * Summarize file content
   * @private
   * @param {string} content - File content
   * @param {number} [maxLength=500] - Maximum summary length
   * @returns {string} Content summary
   */
  _summarizeContent(content, maxLength = 500) {
    if (!content || typeof content !== 'string') {
      return 'No content available';
    }
    
    // Truncate if content is very short
    if (content.length <= maxLength) {
      return content;
    }
    
    // For structured text like code, extract top sections
    const lines = content.split('\n');
    
    // Try to extract structured info first
    const summarizationStrategies = [
      this._summarizeCodeFile,
      this._summarizeMarkdownFile,
      this._summarizeGenericText
    ];
    
    // Try each strategy until one returns a valid summary
    for (const strategy of summarizationStrategies) {
      const summary = strategy.call(this, content, lines, maxLength);
      if (summary && summary.length > 0) {
        return summary;
      }
    }
    
    // Fallback to a simple truncation with ellipsis
    return content.substring(0, maxLength - 3) + '...';
  }
  
  /**
   * Summarize code file content
   * @private
   * @param {string} content - File content
   * @param {string[]} lines - Content split into lines
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Code summary
   */
  _summarizeCodeFile(content, lines, maxLength) {
    // Look for file header comments, imports, and class/function definitions
    const importLines = [];
    const definitionLines = [];
    const commentBlocks = [];
    
    let inCommentBlock = false;
    let commentBlock = [];
    
    // Process each line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Handle comment blocks
      if (line.startsWith('/**') || line.startsWith('/*')) {
        inCommentBlock = true;
        commentBlock = [line];
        continue;
      }
      
      if (inCommentBlock) {
        commentBlock.push(line);
        if (line.includes('*/')) {
          inCommentBlock = false;
          commentBlocks.push(commentBlock.join('\n'));
          commentBlock = [];
        }
        continue;
      }
      
      // Collect import statements
      if (line.startsWith('import ') || line.startsWith('require(') || 
          line.startsWith('using ') || line.startsWith('#include ')) {
        importLines.push(line);
        continue;
      }
      
      // Collect function and class definitions
      if (line.startsWith('function ') || line.startsWith('class ') || 
          line.startsWith('def ') || line.match(/^\s*(public|private|protected|export)\s+(class|function|interface)/)) {
        definitionLines.push(line);
        
        // If this line ends with an opening brace, include the next line
        if (line.endsWith('{')) {
          let braceCount = 1;
          let j = i + 1;
          const maxContextLines = 3;
          let contextLines = 0;
          
          // Extract a few lines of the definition for context
          while (j < lines.length && contextLines < maxContextLines) {
            const nextLine = lines[j].trim();
            if (nextLine) {
              definitionLines.push(`  ${nextLine}`);
              contextLines++;
            }
            j++;
          }
          
          // Add ellipsis to indicate truncation
          definitionLines.push('  ...');
        }
      }
    }
    
    // Build summary from collected components
    let summary = '';
    
    // Add first comment block if available
    if (commentBlocks.length > 0) {
      summary += commentBlocks[0] + '\n\n';
    }
    
    // Add import statements (limited)
    if (importLines.length > 0) {
      summary += importLines.slice(0, 5).join('\n');
      if (importLines.length > 5) {
        summary += '\n// ... more imports';
      }
      summary += '\n\n';
    }
    
    // Add definitions (limited)
    if (definitionLines.length > 0) {
      summary += definitionLines.slice(0, 10).join('\n');
      if (definitionLines.length > 10) {
        summary += '\n// ... more definitions';
      }
    }
    
    // Ensure the summary doesn't exceed the maximum length
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }
  
  /**
   * Summarize Markdown file content
   * @private
   * @param {string} content - File content
   * @param {string[]} lines - Content split into lines
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Markdown summary
   */
  _summarizeMarkdownFile(content, lines, maxLength) {
    // Detect if this is likely a markdown file
    const hasMdSyntax = lines.some(line => 
      line.startsWith('#') || 
      line.startsWith('>') || 
      line.match(/^\s*[-*+]\s/) || 
      line.match(/^\s*\d+\.\s/) ||
      line.includes('](') ||
      line.match(/\*\*.*\*\*/)
    );
    
    if (!hasMdSyntax) {
      return '';
    }
    
    // Extract headings for table of contents
    const headings = [];
    const firstParagraphs = [];
    let paragraphCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Collect headings
      if (line.startsWith('#')) {
        headings.push(line);
      }
      
      // Collect first few paragraphs
      if (line && !line.startsWith('#') && paragraphCount < 2) {
        let paragraph = line;
        let j = i + 1;
        
        // Collect lines until end of paragraph
        while (j < lines.length && lines[j].trim()) {
          paragraph += ' ' + lines[j].trim();
          j++;
        }
        
        if (paragraph.length > 0) {
          firstParagraphs.push(paragraph);
          paragraphCount++;
          i = j; // Skip to end of paragraph
        }
      }
      
      // Limit collection to avoid excessive processing
      if (headings.length >= 10 && paragraphCount >= 2) {
        break;
      }
    }
    
    // Build the summary
    let summary = '';
    
    // Add table of contents if headings are available
    if (headings.length > 0) {
      summary += '## Table of Contents\n\n';
      summary += headings.slice(0, 8).join('\n');
      if (headings.length > 8) {
        summary += '\n...more headings';
      }
      summary += '\n\n';
    }
    
    // Add first paragraphs for content preview
    if (firstParagraphs.length > 0) {
      summary += '## Content Preview\n\n';
      summary += firstParagraphs.join('\n\n');
    }
    
    // Ensure the summary doesn't exceed the maximum length
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }
    
    return summary;
  }
  
  /**
   * Summarize generic text content
   * @private
   * @param {string} content - File content
   * @param {string[]} lines - Content split into lines
   * @param {number} maxLength - Maximum summary length
   * @returns {string} Text summary
   */
  _summarizeGenericText(content, lines, maxLength) {
    // Simple approach for generic text
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    
    if (nonEmptyLines.length === 0) {
      return 'Empty file';
    }
    
    // Get the first few non-empty lines
    const previewLines = nonEmptyLines.slice(0, 10);
    let preview = previewLines.join('\n');
    
    // Truncate if necessary
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength - 3) + '...';
    } else if (nonEmptyLines.length > 10) {
      preview += '\n...';
    }
    
    return preview;
  }
}

module.exports = FileAgent;