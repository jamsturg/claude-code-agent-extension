/**
 * Embedding service for semantic representations
 * Integrates with Hugging Face model: sentence-transformers/all-mpnet-base-v2
 */
class EmbeddingService {
  constructor(config) {
    this.config = config;
    this.modelId = config.modelId;
    this.apiEndpoint = config.apiEndpoint;
    this.dimensions = config.dimensions;
    this.maxBatchSize = config.batchSize;
    this.apiKey = config.apiKey;
    this.requestTimeout = config.requestTimeout;
    this.maxTextLength = 8192; // Model-specific constraint
    this.initialized = false;
    this.logger = console; // Replace with structured logger in production
  }

  /**
   * Initialize the embedding service
   */
  async initialize() {
    if (this.initialized) {
      this.logger.warn('Embedding service already initialized');
      return;
    }

    if (!this.apiKey) {
      throw new Error('Hugging Face API key not configured');
    }

    try {
      // Test connection with a simple embedding request
      const testResult = await this._callApi('test connection');
      if (!testResult || !Array.isArray(testResult)) {
        throw new Error('Invalid response from Hugging Face API');
      }

      this.initialized = true;
      this.logger.info(`Embedding service initialized with model: ${this.modelId}`);
    } catch (error) {
      this.logger.error('Failed to initialize embedding service:', error);
      throw new Error(`Embedding service initialization failed: ${error.message}`);
    }
  }

  /**
   * Generate embedding for a single text input
   * @param {string} text - Text to generate embedding for
   * @returns {Promise<number[]>} Embedding vector
   */
  async generateEmbedding(text) {
    if (!this.initialized) {
      throw new Error('Embedding service not initialized');
    }

    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    try {
      // Truncate text if too long
      const processedText = this._preprocessText(text);
      
      // Generate embedding
      const embedding = await this._callApi(processedText);
      return embedding;
    } catch (error) {
      this.logger.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {string[]} texts - Array of texts to generate embeddings for
   * @returns {Promise<number[][]>} Array of embedding vectors
   */
  async generateBatchEmbeddings(texts) {
    if (!this.initialized) {
      throw new Error('Embedding service not initialized');
    }

    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Invalid input: texts must be a non-empty array');
    }

    // Process in chunks if batch exceeds max size
    if (texts.length > this.maxBatchSize) {
      this.logger.info(`Splitting batch of ${texts.length} texts into chunks of ${this.maxBatchSize}`);
      
      const results = [];
      for (let i = 0; i < texts.length; i += this.maxBatchSize) {
        const chunk = texts.slice(i, i + this.maxBatchSize);
        const chunkResults = await this.generateBatchEmbeddings(chunk);
        results.push(...chunkResults);
      }
      
      return results;
    }

    // Process each text and truncate if necessary
    const processedTexts = texts.map(text => this._preprocessText(text));
    
    try {
      // Call API with batch
      const embeddings = await this._callApi(processedTexts);
      return embeddings;
    } catch (error) {
      this.logger.error('Error generating batch embeddings:', error);
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
  }

  /**
   * Preprocess text for embedding generation
   * @private
   * @param {string} text - Raw text input
   * @returns {string} Processed text
   */
  _preprocessText(text) {
    if (typeof text !== 'string') {
      return '';
    }
    
    // Truncate text if too long
    const truncated = text.substring(0, this.maxTextLength);
    
    // Normalize whitespace
    return truncated.trim().replace(/\s+/g, ' ');
  }

  /**
   * Call Hugging Face API for embedding generation
   * @private
   * @param {string|string[]} input - Text or array of texts
   * @returns {Promise<number[]|number[][]>} Embedding vector(s)
   */
  async _callApi(input) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);
    
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: input,
          options: {
            wait_for_model: true
          }
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`API request timed out after ${this.requestTimeout}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

module.exports = EmbeddingService;