export default {
    server: {
        port: 3200,
        host: 'localhost',
        environment: 'development'
    },
    database: {
        path: './data',
        autoLoad: true,
        autocompactionInterval: 5000
    },
    auth: {
        sessionSecret: 'dev-secret-key-change-in-production',
        sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
        bcryptRounds: 10 // Lower for development
    },
    ai: {
        openaiModel: 'gpt-3.5-turbo-16k',
        openaiModel4: 'gpt-4',
        maxTokens: 15555,
        maxTokens4: 3600,
        temperature: 0.7
    },
    imageGeneration: {
        defaultProviders: ['flux'],
        maxConcurrentGenerations: 3,
        generationTimeout: 30000,
        maxRetries: 2
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 200, // Higher for development
        imageGenerationWindowMs: 60 * 1000, // 1 minute
        imageGenerationMaxRequests: 20, // Higher for development
        authWindowMs: 15 * 60 * 1000,
        authMaxRequests: 10
    },
    cache: {
        wordTypeCacheSize: 50, // Smaller for development
        cacheTtl: 1800, // 30 minutes
        enableCache: true
    },
    logging: {
        level: 'debug',
        enableRequestLogging: true,
        enableErrorLogging: true,
        enablePerformanceLogging: true,
        slowRequestThreshold: 500 // 500ms for development
    },
    security: {
        enableCors: true,
        enableHelmet: false, // Disable for development
        enableRateLimit: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif']
    }
};
