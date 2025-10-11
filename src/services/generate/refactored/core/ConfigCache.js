/**
 * Config Cache
 *
 * Manages caching of model configurations from database
 */

import modelInterface from '../../../ModelInterface.js';

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

const MODEL_CONFIG_CACHE_TTL = 60000; // 1 minute
const modelConfigCache = new Map();

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Get model configuration dynamically from database with caching
 * @param {string} providerKey - Provider key (model config name in DB)
 * @returns {Promise<Object>} Model configuration
 */
export const getModelConfig = async providerKey => {
    const cacheKey = providerKey;
    const cached = modelConfigCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < MODEL_CONFIG_CACHE_TTL) {
        return cached.config;
    }

    try {
        const config = await modelInterface.getImageGeneratorConfig(providerKey);

        if (!config) {
            throw new Error(`Model configuration not found for provider: ${providerKey}`);
        }

        modelConfigCache.set(cacheKey, { config, timestamp: Date.now() });

        return config;
    } catch (error) {
        console.error(`❌ IMAGE-GENERATOR: Failed to get config for ${providerKey}:`, error);
        throw error;
    }
};

/**
 * Clear cache entry or entire cache
 * @param {string} providerKey - Optional provider key to clear
 */
export const clearConfigCache = providerKey => {
    if (providerKey) {
        modelConfigCache.delete(providerKey);
    } else {
        modelConfigCache.clear();
    }
};

/**
 * Get cache statistics
 * @returns {Object} Cache stats
 */
export const getCacheStats = () => ({
    size: modelConfigCache.size,
    ttl: MODEL_CONFIG_CACHE_TTL,
    entries: Array.from(modelConfigCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp
    }))
});

export default {
    getModelConfig,
    clearConfigCache,
    getCacheStats
};

