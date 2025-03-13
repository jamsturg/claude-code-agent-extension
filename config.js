/**
 * Global configuration for Claude Code Agent system
 * Production-ready configuration with performance optimizations
 */
const config = {
    system: {
        name: 'Claude Code Agent',
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        debug: process.env.DEBUG === 'true' || false
    },
    
    huggingface: {
        modelId: 'sentence-transformers/all-mpnet-base-v2',
        apiEndpoint: 'https://api-inference.huggingface.co/models/sentence-transformers/all-mpnet-base-v2',
        dimensions: 768,
        batchSize: 64,
        apiKey: process.env.HUGGINGFACE_API_KEY || '',
        requestTimeout: 30000
    },
    
    agents: {
        maxConcurrent: 4,
        taskTimeout: 60000,
        defaultPriority: 5,
        retryLimit: 3,
        retryDelay: 1000
    },
    
    memory: {
        retention: {
            days: 7,
            maxItems: 10000
        },
        vector: {
            similarityThreshold: 0.8,
            maxResults: 20
        }
    },
    
    tools: {
        glob: {
            defaultIgnorePatterns: ['node_modules/**', '.git/**', '.vscode/**']
        },
        grep: {
            maxContextLines: 3,
            maxResults: 1000
        },
        view: {
            maxSize: 5 * 1024 * 1024 // 5MB
        }
    },
    
    storage: {
        dbName: 'claude_agent_db',
        storeNames: {
            memories: 'memories',
            vectors: 'vectors',
            tasks: 'tasks'
        },
        compression: true
    },
    
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        format: 'json',
        timestamps: true
    }
};

module.exports = config;