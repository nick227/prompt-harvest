/**
 * Model Configuration Service
 * Single source of truth for all model configurations
 * Now uses unified ModelInterface for consistent database/fallback access
 */

import modelInterface from './ModelInterface.js';

class ModelConfigurationService {
    /**
     * Get all active models
     * @returns {Promise<Array>} Array of model configurations
     */
    async getAllModels() {
        return await modelInterface.getAllModels();
    }

    /**
     * Get models by provider
     * @param {string} provider - Provider name (e.g., 'openai', 'dezgo')
     * @returns {Promise<Array>} Array of models for the provider
     */
    async getModelsByProvider(provider) {
        return await modelInterface.getModelsByProvider(provider);
    }

    /**
     * Get specific model by name
     * @param {string} modelName - Model name (e.g., 'flux', 'dalle3')
     * @returns {Promise<Object|null>} Model configuration or null if not found
     */
    async getModelByName(modelName) {
        return await modelInterface.getModel(modelName);
    }

    /**
     * Get model configuration for ImageGenerator
     * Returns the format expected by ImageGenerator.js MODEL_CONFIG
     * @param {string} modelName - Model name
     * @returns {Promise<Object|null>} ImageGenerator-compatible config
     */
    async getImageGeneratorConfig(modelName) {
        return await modelInterface.getImageGeneratorConfig(modelName);
    }

    /**
     * Get credit cost for a model
     * @param {string} modelName - Model name
     * @returns {Promise<number>} Credit cost (default: 1)
     */
    async getCreditCost(modelName) {
        return await modelInterface.getCreditCost(modelName);
    }

    /**
     * Get all model names for validation
     * Used by ImageGenerationContract.js
     * @returns {Promise<Array>} Array of valid model names
     */
    async getValidModelNames() {
        return await modelInterface.getValidModelNames();
    }

    /**
     * Get models for frontend provider selection
     * Returns format expected by provider-manager.js
     * @returns {Promise<Array>} Array of {value, label} objects
     */
    async getFrontendProviderList() {
        return await modelInterface.getFrontendProviderList();
    }

    /**
     * Get models grouped by provider for admin interface
     * @returns {Promise<Object>} Object with providers as keys
     */
    async getModelsByProviderGrouped() {
        return await modelInterface.getModelsByProviderGrouped();
    }

    /**
     * Get cost breakdown for admin pricing calculator
     * @returns {Promise<Object>} Object with model costs
     */
    async getCostBreakdown() {
        return await modelInterface.getCostBreakdown();
    }

    /**
     * Check if a model exists and is active
     * @param {string} modelName - Model name
     * @returns {Promise<boolean>} True if model exists and is active
     */
    async isModelValid(modelName) {
        return await modelInterface.isModelValid(modelName);
    }

    /**
     * Force refresh the model cache
     * Useful for testing or manual cache refresh
     * @returns {Promise<Array>} Refreshed models
     */
    async forceRefresh() {
        return await modelInterface.forceRefresh();
    }

    /**
     * Get cache status for debugging
     * @returns {Object} Cache status information
     */
    getCacheStatus() {
        return modelInterface.getCacheStatus();
    }

    /**
     * Enable/disable database usage (useful for testing)
     * @param {boolean} enabled - Whether to use database
     */
    setDatabaseEnabled(enabled) {
        modelInterface.setDatabaseEnabled(enabled);
    }
}

// Export singleton instance
export default new ModelConfigurationService();
