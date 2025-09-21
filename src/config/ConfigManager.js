import dotenv from 'dotenv';
import systemSettingsService from '../services/SystemSettingsService.js';

dotenv.config();

class ConfigManager {
    constructor() {
        this.config = this.loadConfiguration();
    }

    // eslint-disable-next-line max-lines-per-function
    loadConfiguration() {
        const _env = process.env.NODE_ENV || 'development';

        return {
            // Server Configuration
            server: {
                port: parseInt(process.env.PORT) || 3200,
                host: process.env.HOST || 'localhost',
                environment: process.env.NODE_ENV || 'development',
                cors: {
                    origin: process.env.CORS_ORIGIN || '*',
                    credentials: true
                }
            },

            // Database Configuration
            database: {
                path: process.env.DB_PATH || './data',
                autoLoad: process.env.DB_AUTO_LOAD !== 'false',
                autocompactionInterval: parseInt(process.env.DB_AUTOCOMPACTION_INTERVAL) || 5000
            },

            // Authentication Configuration
            auth: {
                sessionSecret: process.env.SESSION_SECRET,
                sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE) || 24 * 60 * 60 * 1000, // 24 hours
                bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
                google: {
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.FRONTEND_URL || 'http://localhost:3200'}/api/auth/google/callback`
                }
            },

            // AI/OpenAI Configuration
            ai: {
                openaiApiKey: process.env.OPENAI_API_KEY,
                openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo-16k',
                openaiModel4: process.env.OPENAI_MODEL_4 || 'gpt-4',
                maxTokens: parseInt(process.env.MAX_TOKENS) || 15555,
                maxTokens4: parseInt(process.env.MAX_TOKENS_4) || 3600,
                temperature: parseFloat(process.env.AI_TEMPERATURE) || 0.7
            },

            // Image Generation Configuration
            imageGeneration: {
                defaultProviders: process.env.DEFAULT_PROVIDERS?.split(',') || ['flux'],
                maxConcurrentGenerations: parseInt(process.env.MAX_CONCURRENT_GENERATIONS) || 5,
                generationTimeout: parseInt(process.env.GENERATION_TIMEOUT) || 30000, // 30 seconds
                maxRetries: parseInt(process.env.MAX_RETRIES) || 3
            },

            // Rate Limiting Configuration
            rateLimit: {
                windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
                maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
                imageGenerationWindowMs: parseInt(process.env.IMAGE_GENERATION_RATE_LIMIT_WINDOW_MS) ||
                    60 * 1000, // 1 minute
                imageGenerationMaxRequests: parseInt(process.env.IMAGE_GENERATION_RATE_LIMIT_MAX_REQUESTS) || 10,
                authWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
                authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS) || 5
            },

            // Cache Configuration
            cache: {
                wordTypeCacheSize: parseInt(process.env.WORD_TYPE_CACHE_SIZE) || 100,
                cacheTtl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
                enableCache: process.env.ENABLE_CACHE !== 'false'
            },

            // Logging Configuration
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== 'false',
                enableErrorLogging: process.env.ENABLE_ERROR_LOGGING !== 'false',
                enablePerformanceLogging: process.env.ENABLE_PERFORMANCE_LOGGING !== 'false',
                slowRequestThreshold: parseInt(process.env.SLOW_REQUEST_THRESHOLD) || 1000 // 1 second
            },

            // Security Configuration
            security: {
                enableCors: process.env.ENABLE_CORS !== 'false',
                enableHelmet: process.env.ENABLE_HELMET !== 'false',
                enableRateLimit: process.env.ENABLE_RATE_LIMIT !== 'false',
                maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
                allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['jpg', 'jpeg', 'png', 'gif']
            },

            // External Services Configuration
            externalServices: {
                stripe: {
                    secretKey: process.env.STRIPE_SECRET_KEY,
                    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
                    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
                },
                cdn: {
                    url: process.env.CDN_URL,
                    apiKey: process.env.CDN_API_KEY
                }
            },

            // System Settings (loaded from database)
            system: {
                newUserWelcomeCredits: 100, // Default fallback
                maxImageGenerationsPerHour: 10,
                maintenanceMode: false,
                defaultImageProvider: 'flux'
            }
        };
    }

    // Getter methods for easy access
    get server() {
        return this.config.server;
    }

    get database() {
        return this.config.database;
    }

    get auth() {
        return this.config.auth;
    }

    get ai() {
        return this.config.ai;
    }

    get imageGeneration() {
        return this.config.imageGeneration;
    }

    get rateLimit() {
        return this.config.rateLimit;
    }

    get cache() {
        return this.config.cache;
    }

    get logging() {
        return this.config.logging;
    }

    get security() {
        return this.config.security;
    }

    get externalServices() {
        return this.config.externalServices;
    }

    get system() {
        return this.config.system;
    }

    // Get specific configuration value
    get(key) {
        const keys = key.split('.');
        let value = this.config;

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            } else {
                return undefined;
            }
        }

        return value;
    }

    // Set configuration value (for testing or runtime updates)
    set(key, value) {
        const keys = key.split('.');
        let current = this.config;

        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];

            if (!(k in current) || typeof current[k] !== 'object') {
                current[k] = {};
            }
            current = current[k];
        }

        current[keys[keys.length - 1]] = value;
    }

    // Validate required configuration
    validate() {
        const required = [
            'ai.openaiApiKey',
            'auth.sessionSecret'
        ];

        const missing = [];

        for (const key of required) {
            const value = this.get(key);

            if (!value || (typeof value === 'string' && value.trim() === '')) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            throw new Error(`Missing required configuration: ${missing.join(', ')}`);
        }

        return true;
    }

    // Get configuration for specific environment
    getEnvironmentConfig() {
        const env = this.config.server.environment;

        return {
            ...this.config,
            environment: env,
            isDevelopment: env === 'development',
            isProduction: env === 'production',
            isTest: env === 'test'
        };
    }

    // Load system settings from database
    async loadSystemSettings() {
        try {
            const welcomeCredits = await systemSettingsService.get('new_user_welcome_credits', 100);
            const maxGenerations = await systemSettingsService.get('max_image_generations_per_hour', 10);
            const maintenanceMode = await systemSettingsService.get('maintenance_mode', false);
            const defaultProvider = await systemSettingsService.get('default_image_provider', 'flux');

            this.config.system = {
                newUserWelcomeCredits: welcomeCredits,
                maxImageGenerationsPerHour: maxGenerations,
                maintenanceMode,
                defaultImageProvider: defaultProvider
            };

            console.log('✅ CONFIG: System settings loaded from database');
        } catch (error) {
            console.error('❌ CONFIG: Failed to load system settings:', error);
            // Keep default values
        }
    }

    // Get system setting with fallback
    async getSystemSetting(key, defaultValue = null) {
        try {
            return await systemSettingsService.get(key, defaultValue);
        } catch (error) {
            console.error(`❌ CONFIG: Failed to get system setting "${key}":`, error);

            return defaultValue;
        }
    }

    // Export configuration for external use
    export() {
        return { ...this.config };
    }
}

// Create singleton instance
const configManager = new ConfigManager();

export default configManager;
