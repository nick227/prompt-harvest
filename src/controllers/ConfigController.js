import configManager from '../config/ConfigManager.js';

export class ConfigController {
    constructor() {
        this.configManager = configManager;
    }

    // Get configuration (filtered for security)
    // eslint-disable-next-line max-lines-per-function
    async getConfig(req, res) {
        try {
            if (!this.configManager) {
                return res.status(500).json({ error: 'Configuration manager not initialized' });
            }

            const config = this.configManager.export();

            // Remove sensitive information
            const safeConfig = {
                server: {
                    port: config.server.port,
                    host: config.server.host,
                    environment: config.server.environment
                },
                database: {
                    path: config.database.path,
                    autoLoad: config.database.autoLoad
                },
                ai: {
                    openaiModel: config.ai.openaiModel,
                    openaiModel4: config.ai.openaiModel4,
                    maxTokens: config.ai.maxTokens,
                    maxTokens4: config.ai.maxTokens4,
                    temperature: config.ai.temperature
                },
                imageGeneration: {
                    defaultProviders: config.imageGeneration.defaultProviders,
                    maxConcurrentGenerations: config.imageGeneration.maxConcurrentGenerations,
                    generationTimeout: config.imageGeneration.generationTimeout,
                    maxRetries: config.imageGeneration.maxRetries
                },
                rateLimit: {
                    windowMs: config.rateLimit.windowMs,
                    maxRequests: config.rateLimit.maxRequests,
                    imageGenerationWindowMs: config.rateLimit.imageGenerationWindowMs,
                    imageGenerationMaxRequests: config.rateLimit.imageGenerationMaxRequests,
                    authWindowMs: config.rateLimit.authWindowMs,
                    authMaxRequests: config.rateLimit.authMaxRequests
                },
                cache: {
                    wordTypeCacheSize: config.cache.wordTypeCacheSize,
                    cacheTtl: config.cache.cacheTtl,
                    enableCache: config.cache.enableCache
                },
                logging: {
                    level: config.logging.level,
                    enableRequestLogging: config.logging.enableRequestLogging,
                    enableErrorLogging: config.logging.enableErrorLogging,
                    enablePerformanceLogging: config.logging.enablePerformanceLogging,
                    slowRequestThreshold: config.logging.slowRequestThreshold
                },
                security: {
                    enableCors: config.security.enableCors,
                    enableHelmet: config.security.enableHelmet,
                    enableRateLimit: config.security.enableRateLimit,
                    maxFileSize: config.security.maxFileSize,
                    allowedFileTypes: config.security.allowedFileTypes
                }
            };

            res.json(safeConfig);
        } catch (error) {
            console.error('❌ Get config error:', error);
            res.status(500).json({ error: 'Failed to retrieve configuration' });
        }
    }

    // Get environment information
    async getEnvironment(req, res) {
        try {
            const envConfig = this.configManager.getEnvironmentConfig();

            res.json({
                environment: envConfig.environment,
                isDevelopment: envConfig.isDevelopment,
                isProduction: envConfig.isProduction,
                isTest: envConfig.isTest,
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            });
        } catch (error) {
            console.error('❌ Get environment error:', error);
            res.status(500).json({ error: 'Failed to retrieve environment information' });
        }
    }

    // Validate configuration
    async validateConfig(req, res) {
        try {
            const isValid = this.configManager.validate();

            res.json({
                valid: isValid,
                message: 'Configuration is valid'
            });
        } catch (error) {
            res.status(400).json({
                valid: false,
                message: error.message
            });
        }
    }

    // Get specific configuration value
    async getConfigValue(req, res) {
        try {
            const { key } = req.params;

            if (!key) {
                return res.status(400).json({ error: 'Configuration key is required' });
            }

            const value = this.configManager.get(key);

            if (value === undefined) {
                return res.status(404).json({ error: 'Configuration key not found' });
            }

            res.json({ key, value });
        } catch (error) {
            console.error('❌ Get config value error:', error);
            res.status(500).json({ error: 'Failed to retrieve configuration value' });
        }
    }
}
