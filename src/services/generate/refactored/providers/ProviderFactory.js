/**
 * Provider Factory
 *
 * Centralized factory for creating and managing image generation provider instances
 */

import { GrokProvider } from './GrokProvider.js';

/**
 * Provider registry mapping provider names to their classes
 */
const PROVIDER_REGISTRY = {
    grok: GrokProvider
    // Note: Other providers (openai, google, dezgo) will be refactored to use this pattern
};

/**
 * Create a provider instance by name
 * @param {string} providerName - Name of the provider (e.g., 'grok', 'openai')
 * @returns {Object} Provider instance
 * @throws {Error} If provider is not found
 */
export const createProvider = providerName => {
    const ProviderClass = PROVIDER_REGISTRY[providerName.toLowerCase()];

    if (!ProviderClass) {
        throw new Error(`Unknown provider: ${providerName}. Available providers: ${Object.keys(PROVIDER_REGISTRY).join(', ')}`);
    }

    return new ProviderClass();
};

/**
 * Get list of registered provider names
 * @returns {Array<string>} Array of provider names
 */
export const getRegisteredProviders = () => Object.keys(PROVIDER_REGISTRY);

/**
 * Check if a provider is registered
 * @param {string} providerName - Name of the provider
 * @returns {boolean} True if provider is registered
 */
export const isProviderRegistered = providerName => Object.prototype.hasOwnProperty.call(PROVIDER_REGISTRY, providerName.toLowerCase());

/**
 * Register a new provider class
 * @param {string} name - Provider name
 * @param {Function} ProviderClass - Provider class constructor
 */
export const registerProvider = (name, ProviderClass) => {
    if (PROVIDER_REGISTRY[name.toLowerCase()]) {
        console.warn(`Provider '${name}' is already registered. Overwriting...`);
    }
    PROVIDER_REGISTRY[name.toLowerCase()] = ProviderClass;
};

export default {
    createProvider,
    getRegisteredProviders,
    isProviderRegistered,
    registerProvider
};

