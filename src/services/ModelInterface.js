/**
 * Unified Model Interface
 * Provides a consistent interface for both database and static fallback
 * Abstracts away the complexity of switching between data sources
 */

import databaseClient from '../database/PrismaClient.js';
import {
    getAllStaticModels,
    getStaticModel,
    getStaticModelsByProvider,
    getStaticImageGeneratorConfig,
    getStaticCreditCost,
    getStaticValidModelNames,
    getStaticFrontendProviderList,
    isStaticModelValid,
    getStaticCostBreakdown
} from '../config/static-models.js';

class ModelInterface {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.cache = new Map();
        this.lastCacheUpdate = 0;
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.useDatabase = true;
        this.fallbackActive = false;
    }

    /**
     * Get all models with automatic fallback
     * @returns {Promise<Array>} Array of model configurations
     */
    async getAllModels() {
        try {
            if (this.shouldUseDatabase()) {
                return await this.getDatabaseModels();
            } else {
                return this.getStaticModels();
            }
        } catch (error) {
            console.warn('⚠️ MODEL-INTERFACE: Database unavailable, using static fallback:', error.message);
            this.fallbackActive = true;

            return this.getStaticModels();
        }
    }

    /**
     * Get specific model by name
     * @param {string} modelName - Model name
     * @returns {Promise<Object|null>} Model configuration or null
     */
    async getModel(modelName) {
        try {
            if (this.shouldUseDatabase()) {
                return await this.getDatabaseModel(modelName);
            } else {
                return this.getStaticModel(modelName);
            }
        } catch (error) {
            console.warn(`⚠️ MODEL-INTERFACE: Database unavailable for ${modelName}, using static fallback:`, error.message);
            this.fallbackActive = true;

            return this.getStaticModel(modelName);
        }
    }

    /**
     * Get models by provider
     * @param {string} provider - Provider name
     * @returns {Promise<Array>} Array of models for the provider
     */
    async getModelsByProvider(provider) {
        try {
            if (this.shouldUseDatabase()) {
                return await this.getDatabaseModelsByProvider(provider);
            } else {
                return this.getStaticModelsByProvider(provider);
            }
        } catch (error) {
            console.warn(`⚠️ MODEL-INTERFACE: Database unavailable for ${provider}, using static fallback:`, error.message);
            this.fallbackActive = true;

            return this.getStaticModelsByProvider(provider);
        }
    }

    /**
     * Get ImageGenerator configuration for a model
     * @param {string} modelName - Model name
     * @returns {Promise<Object|null>} ImageGenerator config or null
     */
    async getImageGeneratorConfig(modelName) {
        const model = await this.getModel(modelName);

        if (!model || !model.isActive) {
            return null;
        }

        // Map provider names to provider types for ImageGenerator
        const providerTypeMap = {
            openai: 'openai',
            dezgo: 'dezgo',
            google: 'google'
        };

        const providerType = providerTypeMap[model.provider] || model.provider;

        return {
            type: providerType,
            url: model.apiUrl,
            model: model.apiModel,
            size: model.apiSize
        };
    }

    /**
     * Get credit cost for a model
     * @param {string} modelName - Model name
     * @returns {Promise<number>} Credit cost (default: 1)
     */
    async getCreditCost(modelName) {
        const model = await this.getModel(modelName);

        return model ? model.costPerImage : 1;
    }

    /**
     * Check if model exists and is active
     * @param {string} modelName - Model name
     * @returns {Promise<boolean>} True if model exists and is active
     */
    async isModelValid(modelName) {
        const model = await this.getModel(modelName);

        return model && model.isActive;
    }

    /**
     * Get all valid model names
     * @returns {Promise<Array>} Array of valid model names
     */
    async getValidModelNames() {
        const models = await this.getAllModels();

        return models.map(model => model.name);
    }

    /**
     * Get frontend provider list
     * @returns {Promise<Array>} Array of {value, label} objects
     */
    async getFrontendProviderList() {
        const models = await this.getAllModels();

        return models.map(model => ({
            value: model.name,
            label: model.displayName
        }));
    }

    /**
     * Get cost breakdown for admin
     * @returns {Promise<Object>} Object with model costs
     */
    async getCostBreakdown() {
        const models = await this.getAllModels();
        const breakdown = {};

        models.forEach(model => {
            const usdCost = model.costPerImage * 0.0228; // Flux baseline

            breakdown[model.name] = {
                credits: model.costPerImage,
                usd: usdCost,
                provider: model.provider
            };
        });

        return breakdown;
    }

    /**
     * Get models grouped by provider
     * @returns {Promise<Object>} Object with providers as keys
     */
    async getModelsByProviderGrouped() {
        const models = await this.getAllModels();

        return models.reduce((acc, model) => {
            if (!acc[model.provider]) {
                acc[model.provider] = [];
            }
            acc[model.provider].push(model);

            return acc;
        }, {});
    }

    /**
     * Check if we should use database (not in fallback mode and cache not expired)
     * @returns {boolean} True if should use database
     */
    shouldUseDatabase() {
        return this.useDatabase && !this.fallbackActive && this.shouldRefreshCache();
    }

    /**
     * Check if cache should be refreshed
     * @returns {boolean} True if cache should be refreshed
     */
    shouldRefreshCache() {
        return !this.cache.has('models') || (Date.now() - this.lastCacheUpdate > this.cacheTimeout);
    }

    /**
     * Get models from database
     * @private
     */
    async getDatabaseModels() {
        if (this.shouldRefreshCache()) {
            await this.refreshDatabaseCache();
        }

        return Array.from(this.cache.values());
    }

    /**
     * Get specific model from database
     * @private
     */
    async getDatabaseModel(modelName) {
        const models = await this.getDatabaseModels();

        return models.find(model => model.name === modelName) || null;
    }

    /**
     * Get models by provider from database
     * @private
     */
    async getDatabaseModelsByProvider(provider) {
        const models = await this.getDatabaseModels();

        return models.filter(model => model.provider === provider);
    }

    /**
     * Get models from static configuration
     * @private
     */
    getStaticModels() {
        return getAllStaticModels();
    }

    /**
     * Get specific model from static configuration
     * @private
     */
    getStaticModel(modelName) {
        return getStaticModel(modelName);
    }

    /**
     * Get models by provider from static configuration
     * @private
     */
    getStaticModelsByProvider(provider) {
        return getStaticModelsByProvider(provider);
    }

    /**
     * Refresh database cache
     * @private
     */
    async refreshDatabaseCache() {
        try {
            const models = await this.prisma.model.findMany({
                where: { isActive: true },
                orderBy: [
                    { provider: 'asc' },
                    { name: 'asc' }
                ]
            });

            this.cache.clear();
            models.forEach(model => {
                this.cache.set(model.name, model);
            });

            this.lastCacheUpdate = Date.now();
            this.fallbackActive = false;
        } catch (error) {
            console.error('❌ MODEL-INTERFACE: Failed to refresh database cache:', error);
            throw error;
        }
    }

    /**
     * Force refresh cache (useful for testing)
     * @public
     */
    async forceRefresh() {
        this.cache.clear();
        this.lastCacheUpdate = 0;
        this.fallbackActive = false;

        return await this.getAllModels();
    }

    /**
     * Get cache status for debugging
     * @returns {Object} Cache status information
     */
    getCacheStatus() {
        return {
            cacheSize: this.cache.size,
            lastUpdate: this.lastCacheUpdate,
            fallbackActive: this.fallbackActive,
            useDatabase: this.useDatabase,
            cacheTimeout: this.cacheTimeout
        };
    }

    /**
     * Enable/disable database usage (useful for testing)
     * @param {boolean} enabled - Whether to use database
     */
    setDatabaseEnabled(enabled) {
        this.useDatabase = enabled;
        if (!enabled) {
            this.fallbackActive = true;
        }
    }

    /**
     * Validate interface health and connectivity
     * @returns {Promise<Object>} Validation results
     */
    async validateInterface() {
        const results = {
            database: { status: 'unknown', error: null },
            static: { status: 'unknown', error: null },
            cache: { status: 'unknown', error: null },
            overall: 'unknown'
        };

        try {
            // Test database connectivity
            if (this.useDatabase && !this.fallbackActive) {
                try {
                    const models = await this.getDatabaseModels();

                    results.database = { status: 'healthy', count: models.length };
                } catch (error) {
                    results.database = { status: 'failed', error: error.message };
                }
            } else {
                results.database = { status: 'disabled', reason: 'Using fallback mode' };
            }

            // Test static configuration
            try {
                const staticModels = this.getStaticModels();

                results.static = { status: 'healthy', count: staticModels.length };
            } catch (error) {
                results.static = { status: 'failed', error: error.message };
            }

            // Test cache
            const cacheStatus = this.getCacheStatus();

            results.cache = {
                status: cacheStatus.cacheSize > 0 ? 'populated' : 'empty',
                size: cacheStatus.cacheSize,
                lastUpdate: cacheStatus.lastUpdate
            };

            // Determine overall health
            if (results.database.status === 'healthy' || results.static.status === 'healthy') {
                results.overall = 'healthy';
            } else {
                results.overall = 'degraded';
            }

        } catch (error) {
            results.overall = 'failed';
            results.error = error.message;
        }

        return results;
    }
}

// Export singleton instance
export default new ModelInterface();
