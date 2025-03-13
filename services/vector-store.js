/**
 * Vector store for semantic search capabilities
 * Optimized for high-throughput embedding storage and similarity search
 */
class VectorStore {
  constructor(config) {
    this.config = config;
    this.dimensions = null; // Will be set dynamically on first insert
    this.vectors = new Map(); // Maps id -> vector
    this.metadata = new Map(); // Maps id -> metadata
    this.initialized = false;
    this.logger = console; // Replace with structured logger in production
  }

  /**
   * Initialize the vector store
   */
  async initialize() {
    if (this.initialized) {
      this.logger.warn('Vector store already initialized');
      return;
    }

    try {
      this.logger.info('Initializing vector store...');
      
      // Load persisted vectors if available
      await this._loadFromPersistence();
      
      this.initialized = true;
      this.logger.info(`Vector store initialized with ${this.vectors.size} vectors`);
    } catch (error) {
      this.logger.error('Failed to initialize vector store:', error);
      throw new Error(`Vector store initialization failed: ${error.message}`);
    }
  }

  /**
   * Store a vector embedding with associated metadata
   * @param {string} id - Unique identifier for the vector
   * @param {number[]} vector - Embedding vector
   * @param {Object} metadata - Associated metadata
   * @returns {Promise<Object>} Operation result
   */
  async storeVector(id, vector, metadata = {}) {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    // Validate inputs
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid id: must be a non-empty string');
    }

    if (!Array.isArray(vector) || vector.length === 0) {
      throw new Error('Invalid vector: must be a non-empty array of numbers');
    }

    // Set dimensions if not yet determined
    if (this.dimensions === null) {
      this.dimensions = vector.length;
      this.logger.info(`Vector dimensions set to ${this.dimensions}`);
    }

    // Validate vector dimensions
    if (vector.length !== this.dimensions) {
      throw new Error(`Vector dimension mismatch: expected ${this.dimensions}, got ${vector.length}`);
    }

    // Store vector and metadata
    this.vectors.set(id, vector);
    this.metadata.set(id, {
      ...metadata,
      timestamp: Date.now()
    });

    // Persist to storage if available
    try {
      await this._persistVector(id, vector, metadata);
    } catch (error) {
      this.logger.warn(`Failed to persist vector ${id}:`, error);
    }

    return { id, success: true };
  }

  /**
   * Find vectors similar to the query vector
   * @param {number[]} queryVector - Query embedding vector
   * @param {number} limit - Maximum number of results
   * @param {number} [threshold] - Minimum similarity threshold
   * @returns {Promise<Array<{id: string, similarity: number, metadata: Object}>>} Similar vectors
   */
  async findSimilar(queryVector, limit = 10, threshold = this.config.similarityThreshold) {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    // Validate query vector
    if (!Array.isArray(queryVector) || queryVector.length === 0) {
      throw new Error('Invalid query vector: must be a non-empty array of numbers');
    }

    if (this.dimensions !== null && queryVector.length !== this.dimensions) {
      throw new Error(`Query vector dimension mismatch: expected ${this.dimensions}, got ${queryVector.length}`);
    }

    // Calculate similarity for all vectors
    const similarities = [];
    for (const [id, vector] of this.vectors.entries()) {
      const similarity = this._calculateCosineSimilarity(queryVector, vector);
      
      // Only include results above threshold
      if (similarity >= threshold) {
        similarities.push({
          id,
          similarity,
          metadata: this.metadata.get(id) || {}
        });
      }
    }

    // Sort by similarity (descending) and limit results
    similarities.sort((a, b) => b.similarity - a.similarity);
    return similarities.slice(0, limit);
  }

  /**
   * Delete a vector from the store
   * @param {string} id - Vector identifier
   * @returns {Promise<Object>} Operation result
   */
  async deleteVector(id) {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    const exists = this.vectors.has(id);
    
    if (exists) {
      this.vectors.delete(id);
      this.metadata.delete(id);
      
      // Remove from persistence if available
      try {
        await this._deletePersistedVector(id);
      } catch (error) {
        this.logger.warn(`Failed to delete persisted vector ${id}:`, error);
      }
    }

    return { id, success: true, deleted: exists };
  }

  /**
   * Get all stored vectors
   * @returns {Promise<Array<{id: string, vector: number[], metadata: Object}>>} All vectors
   */
  async getAllVectors() {
    if (!this.initialized) {
      throw new Error('Vector store not initialized');
    }

    const result = [];
    for (const [id, vector] of this.vectors.entries()) {
      result.push({
        id,
        vector,
        metadata: this.metadata.get(id) || {}
      });
    }

    return result;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @private
   * @param {number[]} vectorA - First vector
   * @param {number[]} vectorB - Second vector
   * @returns {number} Cosine similarity (0-1)
   */
  _calculateCosineSimilarity(vectorA, vectorB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    const length = Math.min(vectorA.length, vectorB.length);
    
    for (let i = 0; i < length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }

  /**
   * Load vectors from persistence storage
   * @private
   */
  async _loadFromPersistence() {
    // In a production implementation, this would load from IndexedDB or similar
    // For this example, we'll start with an empty store
    return true;
  }

  /**
   * Persist vector to storage
   * @private
   * @param {string} id - Vector identifier
   * @param {number[]} vector - Vector data
   * @param {Object} metadata - Associated metadata
   */
  async _persistVector(id, vector, metadata) {
    // In a production implementation, this would save to IndexedDB or similar
    // For this example, we'll just log the operation
    this.logger.debug(`Would persist vector ${id} to storage`);
    return true;
  }

  /**
   * Delete persisted vector from storage
   * @private
   * @param {string} id - Vector identifier
   */
  async _deletePersistedVector(id) {
    // In a production implementation, this would delete from IndexedDB or similar
    // For this example, we'll just log the operation
    this.logger.debug(`Would delete vector ${id} from storage`);
    return true;
  }
}

module.exports = VectorStore;