/**
 * ImageGenerator Service - Refactored Orchestrator
 *
 * Main entry point for image generation operations.
 * Coordinates between different AI providers through a clean, modular architecture.
 */

import dotenv from 'dotenv';
import { ERROR_CODES, createErrorResult, createSuccessResult, generateRequestId } from './core/ResultTypes.js';
import { getModelConfig } from './core/ConfigCache.js';
import { validateImageParams, validateProviderConfig } from './utils/ValidationHelpers.js';
import * as OpenAIProvider from './providers/OpenAIProvider.js';
import * as DezgoProvider from './providers/DezgoProvider.js';
import * as GoogleImagenProvider from './providers/GoogleImagenProvider.js';
import * as GrokProvider from './providers/GrokProvider.js';
import modelInterface from '../../ModelInterface.js';

dotenv.config();

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_CONCURRENT_MULTI_PROVIDER = 5;

// ============================================================================
// CONCURRENCY HELPER
// ============================================================================

/**
 * Process array in batches with concurrency limit
 * @param {Array} items - Items to process
 * @param {Function} fn - Async function to apply to each item
 * @param {number} limit - Concurrency limit
 * @returns {Promise<Array>} Results
 */
const batchProcess = async (items, fn, limit) => {
    const results = [];

    // Handle edge case: no concurrency limit needed
    if (limit >= items.length) {
        return Promise.allSettled(items.map((item, index) => fn(item, index)));
    }

    const executing = [];

    for (const [index, item] of items.entries()) {
        const promise = Promise.resolve().then(() => fn(item, index));

        results.push(promise);

        // Create tracking promise BEFORE using it
        const trackingPromise = promise.then(() => {
            executing.splice(executing.indexOf(trackingPromise), 1);
        }).catch(() => {
            executing.splice(executing.indexOf(trackingPromise), 1);
        });

        executing.push(trackingPromise);

        if (executing.length >= limit) {
            await Promise.race(executing);
        }
    }

    return Promise.allSettled(results);
};

// ============================================================================
// PROVIDER ORCHESTRATION
// ============================================================================

/**
 * Generate image using specified provider
 * @param {Object} config - Provider configuration from database
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {Object} options - Optional generation options (size, quality)
 * @returns {Promise<Object>} Generation result
 */
const generateWithProvider = async(config, prompt, guidance, userId, options = {}) => {
    // Defensive config validation
    const configValidation = validateProviderConfig(config);

    if (!configValidation.valid) {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            `Invalid provider config: ${configValidation.error}`,
            { retryable: false }
        );
    }

    // Merge config options with passed options (passed options take precedence)
    // Use nullish coalescing so empty string/0 don't fall back to config
    const mergedOptions = {
        size: options.size ?? config.size,
        quality: options.quality ?? config.quality,
        signal: options.signal
    };

    if (config.type === 'openai') {
        return await OpenAIProvider.generateImage(prompt, guidance, config.model || 'dall-e-3', userId, mergedOptions);
    } else if (config.type === 'dezgo') {
        return await DezgoProvider.generateImage(prompt, guidance, config.url, config.model, mergedOptions);
    } else if (config.type === 'google') {
        return await GoogleImagenProvider.generateImage(prompt, guidance, userId, mergedOptions);
    } else if (config.type === 'grok') {
        return await GrokProvider.generateImage(prompt, guidance, config.model || 'grok-2-image', userId, mergedOptions);
    } else {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            `Unknown provider type: ${config.type}`,
            { retryable: false }
        );
    }
};

/**
 * Generate image from a single provider
 * @param {string} providerKey - Provider key (model config name in DB)
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {Object} options - Optional generation options
 * @returns {Promise<Object>} Generation result
 */
export const generateProviderImage = async(providerKey, prompt, guidance, userId = null, options = {}) => {
    const validation = await validateImageParams(prompt, guidance, providerKey);

    if (!validation.isValid) {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            `Invalid parameters: ${validation.errors.join(', ')}`,
            { retryable: false }
        );
    }

    try {
        const config = await getModelConfig(providerKey);

        return await generateWithProvider(config, prompt, guidance, userId, options);
    } catch (error) {
        return createErrorResult(
            ERROR_CODES.UNKNOWN,
            `Generation failed: ${error.message}`,
            { retryable: false }
        );
    }
};

/**
 * Generate images from multiple providers
 * @param {string[]} providers - Array of provider names
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {Object} options - Optional generation options
 * @returns {Promise<Array>} Array of unified generation results
 */
export const generateMultipleProviderImages = async(providers, prompt, guidance, userId = null, options = {}) => {
    const startTime = Date.now();

    // Apply concurrency guard
    const results = await batchProcess(
        providers,
        provider => generateProviderImage(provider, prompt, guidance, userId, options),
        MAX_CONCURRENT_MULTI_PROVIDER
    );

    return results.map((result, index) => {
        const provider = providers[index];

        if (result.status === 'rejected') {
            const duration = Date.now() - startTime;

            return createErrorResult(
                ERROR_CODES.UNKNOWN,
                result.reason?.message || 'Promise rejected',
                {
                    retryable: false,
                    meta: {
                        provider,
                        durationMs: duration
                    }
                }
            );
        }

        // Result is already a unified result type
        return result.value;
    });
};

/**
 * Generate image from a randomly selected provider
 * @param {string[]} providers - Array of provider names to choose from
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {Object|number} optionsOrSeed - Either options object or seed number (backwards compat)
 * @returns {Promise<Object>} Generation result (unified result type)
 */
export const generateRandomProviderImage = async(providers, prompt, guidance, userId = null, optionsOrSeed = null) => {
    // Validate providers array is non-empty
    if (!Array.isArray(providers) || providers.length === 0) {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            'No providers supplied for image generation',
            {
                retryable: false,
                meta: {
                    providerCount: (providers || []).length,
                    requestId: generateRequestId()
                }
            }
        );
    }

    // Handle backwards compatibility: if optionsOrSeed is a number, treat as seed
    let seed = null;
    let options = {};

    if (typeof optionsOrSeed === 'number') {
        seed = optionsOrSeed;
    } else if (optionsOrSeed && typeof optionsOrSeed === 'object') {
        const { seed: seedFromOptions, ...rest } = optionsOrSeed;

        options = rest;
        seed = seedFromOptions;
    }

    let index;

    if (seed !== null && seed !== undefined) {
        // Deterministic selection for testing
        index = Math.abs(seed) % providers.length;
    } else {
        // Random selection
        index = Math.floor(Math.random() * providers.length);
    }

    const selectedProvider = providers[index];

    return await generateProviderImage(selectedProvider, prompt, guidance, userId, options);
};

// ============================================================================
// CONFIGURATION ACCESS
// ============================================================================

/**
 * Get available providers
 * @returns {Promise<Array>} Array of available provider names
 */
export const getAvailableProviders = async () => await modelInterface.getValidModelNames();

/**
 * Get provider configuration
 * @param {string} providerKey - Provider key
 * @returns {Promise<Object|null>} Provider configuration or null if not found
 */
export const getProviderConfig = async providerKey => {
    try {
        return await getModelConfig(providerKey);
    } catch (error) {
        return null;
    }
};

/**
 * Check if provider is available
 * @param {string} providerKey - Provider key
 * @returns {Promise<boolean>} True if provider is available
 */
export const isProviderAvailable = async providerKey => await modelInterface.isModelValid(providerKey);

// ============================================================================
// LEGACY/TESTING EXPORTS
// ============================================================================

// Re-export provider-specific functions for backwards compatibility and testing
export const generateDalleImage = OpenAIProvider.generateImage;
export const generateDezgoImage = DezgoProvider.generateImage;
export const generateImagenImage = GoogleImagenProvider.generateImage;
export const testDezgoModelAvailability = DezgoProvider.testModelAvailability;
export const getAvailableDezgoModels = DezgoProvider.getAvailableModels;

// Re-export core utilities
export { ERROR_CODES, createSuccessResult, createErrorResult } from './core/ResultTypes.js';
export { getModelConfig } from './core/ConfigCache.js';
export { validateImageParams } from './utils/ValidationHelpers.js';
export { generateRequestId as generateId } from './core/ResultTypes.js';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
    // Main generation functions
    generateProviderImage,
    generateMultipleProviderImages,
    generateRandomProviderImage,

    // Provider-specific functions
    generateDalleImage,
    generateDezgoImage,
    generateImagenImage,

    // Configuration functions
    getAvailableProviders,
    getProviderConfig,
    isProviderAvailable,

    // Testing functions
    testDezgoModelAvailability,
    getAvailableDezgoModels,

    // Utilities
    getModelConfig,
    validateImageParams,
    generateId: generateRequestId,

    // Result builders
    createSuccessResult,
    createErrorResult,

    // Constants
    ERROR_CODES
};

