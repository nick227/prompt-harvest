export default {
    server: {
        port: process.env.PORT || 3200,
        host: process.env.HOST || '0.0.0.0',
        environment: 'production'
    },
    database: {
        path: process.env.DB_PATH || './data',
        autoLoad: true,
        autocompactionInterval: 30000 // Higher for production
    },
    auth: {
        sessionSecret: process.env.SESSION_SECRET, // Must be set in production
        sessionMaxAge: 24 * 60 * 60 * 1000, // 24 hours
        bcryptRounds: 12 // Higher for production
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
        maxConcurrentGenerations: 10,
        generationTimeout: 60000, // 1 minute
        maxRetries: 3
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100,
        imageGenerationWindowMs: 60 * 1000, // 1 minute
        imageGenerationMaxRequests: 10,
        authWindowMs: 15 * 60 * 1000,
        authMaxRequests: 5
    },
    cache: {
        wordTypeCacheSize: 200, // Larger for production
        cacheTtl: 3600, // 1 hour
        enableCache: true
    },
    logging: {
        level: 'info',
        enableRequestLogging: true,
        enableErrorLogging: true,
        enablePerformanceLogging: true,
        slowRequestThreshold: 2000 // 2 seconds for production
    },
    security: {
        enableCors: true,
        enableHelmet: true, // Enable for production
        enableRateLimit: true,
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['jpg', 'jpeg', 'png', 'gif']
    }
};
