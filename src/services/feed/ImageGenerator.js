/**
 * ImageGenerator Service
 *
 * Handles all image generation operations including:
 * - OpenAI DALL-E image generation
 * - Dezgo API image generation
 * - Provider configuration management
 * - Image generation orchestration
 *
 * This service centralizes all image generation logic and provides
 * a unified interface for different AI providers.
 */

import OpenAI from 'openai';
import axios from 'axios';
import dotenv from 'dotenv';
import FormData from 'form-data';

// Ensure dotenv is loaded
dotenv.config();

// ImageGenerator loaded with environment configuration

// ============================================================================
// PROVIDER CONFIGURATION
// ============================================================================

/**
 * Model configuration for different AI providers
 * Maps provider names to their API configurations
 */
const MODEL_CONFIG = {
    // OpenAI DALL-E models
    dalle: {
        type: 'openai',
        model: 'dall-e-3',
        size: '1024x1024'
    },

    // Dezgo models
    flux: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_flux',
        model: 'flux_1_schnell'
    },
    bluepencil: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'bluepencil'
    },
    ink: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'ink'
    },
    nightmareshaper: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'nightmareshaper'
    },
    openjourney: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'openjourney_2'
    },
    juggernautReborn: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'juggernaut_reborn'
    },
    redshift: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'redshift_diffusion_768px'
    },
    hasdx: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'hasdx'
    },
    realisticvision: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'realistic_vision_v5'
    },
    // Additional Dezgo models
    juggernaut: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'juggernaut_reborn'
    },
    absolute: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'absolute_reality_v1_8_1'
    },
    icbinp: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'icbinp'
    },
    icbinp_seco: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'icbinp_seco'
    },
    dreamshaper: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'dreamshaper_8'
    },
    analogmadness: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'analog_madness_v1'
    },
    portraitplus: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'portrait_plus_v1'
    },
    tshirt: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'tshirt_v1'
    },
    abyssorange: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'abyss_orange_mix_v2'
    },
    cyber: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'cyber_realistic_v1'
    },
    disco: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'disco_mix_v1'
    },
    synthwave: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'synthwave_punk_v2'
    },
    lowpoly: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'lowpoly_v1'
    }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a random ID for tracking requests
 * @returns {string} Random ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Validate image generation parameters
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} providerName - Provider name
 * @returns {Object} Validation result
 */
const validateImageParams = (prompt, guidance, providerName) => {
    const errors = [];

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        errors.push('Invalid prompt: prompt must be a non-empty string');
    }

    if (typeof guidance !== 'number' || guidance < 0 || guidance > 20) {
        errors.push('Invalid guidance value (must be 0-20)');
    }

    if (!providerName || !MODEL_CONFIG[providerName]) {
        errors.push(`Invalid provider: ${providerName}`);
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// ============================================================================
// OPENAI DALL-E GENERATION
// ============================================================================

/**
 * Generate image using OpenAI DALL-E
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by DALL-E)
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Object>} Generation result
 */
const generateDalleImage = async(prompt, guidance, userId = null) => {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        const response = await openai.images.generate({
            prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
            model: 'dall-e-3',
            user: userId
        });

        if (!response.data || !response.data[0] || !response.data[0].b64_json) {
            return { error: 'Invalid response', details: response };
        }

        return response.data[0].b64_json;
    } catch (error) {
        if (error.status === 400 && error.code === 'content_policy_violation') {
            return {
                error: 'Content policy violation',
                details: 'Your request was rejected due to a content policy violation. The prompt may contain text that is not allowed by the safety system.'
            };
        }

        return { error: 'Error generating image', details: error };
    }
};

// ============================================================================
// DEZGO API GENERATION
// ============================================================================

/**
 * Generate image using Dezgo API
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} url - Dezgo API URL
 * @param {string} model - Model name
 * @returns {Promise<Object>} Generation result
 */
const validateDezgoApiKey = () => {
    if (!process.env.DEZGO_API_KEY) {
        return { error: 'Dezgo API key not configured', skip: true };
    }

    return null;
};

const handleDezgoError = error => {
    if (error.response) {
        if (error.response.status === 401) {
            return {
                error: 'Dezgo API authentication failed. Please check your API key.',
                details: 'Invalid or expired API key'
            };
        } else if (error.response.status === 429) {
            return {
                error: 'Dezgo API rate limit exceeded. Please try again later.',
                details: 'Rate limit exceeded'
            };
        }
    }

    return {
        error: 'Error generating image',
        details: error.message || 'Unknown error'
    };
};

const createFluxFormData = prompt => {
    const formData = new FormData();

    formData.append('prompt', prompt);
    formData.append('width', '1024');
    formData.append('height', '1024');
    formData.append('steps', '4');
    formData.append('seed', '');
    formData.append('format', 'png');
    formData.append('transparent_background', 'false');
    formData.append('lora1', '');
    formData.append('lora1_strength', '0.7');
    formData.append('lora2', '');
    formData.append('lora2_strength', '0.7');

    return formData;
};

const createStandardParams = (prompt, model, guidance) => ({
    prompt,
    model,
    width: 1024,
    height: 1024,
    steps: 20,
    guidance: guidance || 10,
    seed: -1,
    output_format: 'jpeg'
});

const makeDezgoRequest = async (url, prompt, model, guidance) => {
    if (url.includes('text2image_flux')) {
        const formData = createFluxFormData(prompt);

        return await axios.post(url, formData, {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                accept: '*/*',
                ...formData.getHeaders()
            },
            responseType: 'arraybuffer',
            timeout: 120000
        });
    } else {
        const params = createStandardParams(prompt, model, guidance);

        return await axios.post(url, params, {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                'Content-Type': 'application/json'
            },
            responseType: 'arraybuffer',
            timeout: 120000
        });
    }
};

const generateDezgoImage = async(prompt, guidance, url, model = 'flux_1_schnell') => {
    try {
        const keyValidation = validateDezgoApiKey();

        if (keyValidation) {
            return keyValidation;
        }

        const response = await makeDezgoRequest(url, prompt, model, guidance);

        if (!response.data) {
            return { error: 'Invalid response', details: response };
        }

        return Buffer.from(response.data).toString('base64');
    } catch (error) {
        return handleDezgoError(error);
    }
};

// ============================================================================
// PROVIDER ORCHESTRATION
// ============================================================================

/**
 * Generate image using specified provider
 * @param {string} providerName - Name of the provider to use
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Object>} Generation result
 */
const generateWithProvider = async(config, prompt, guidance, userId) => {
    if (config.type === 'openai') {
        return await generateDalleImage(prompt, guidance, userId);
    } else if (config.type === 'dezgo') {
        const result = await generateDezgoImage(prompt, guidance, config.url, config.model);

        if (result.skip) {
            return { error: 'Dezgo API key not configured', skip: true };
        }

        return result;
    } else {
        return { error: `Unknown provider type: ${config.type}` };
    }
};

const generateProviderImage = async(providerName, prompt, guidance, userId = null) => {
    const validation = validateImageParams(prompt, guidance, providerName);

    if (!validation.isValid) {
        return { error: `Invalid parameters: ${validation.errors.join(', ')}` };
    }

    const config = MODEL_CONFIG[providerName];

    try {
        return await generateWithProvider(config, prompt, guidance, userId);
    } catch (error) {
        return { error: `Generation failed: ${error.message}` };
    }
};

/**
 * Generate images from multiple providers
 * @param {Array} providers - Array of provider names
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Array>} Array of generation results
 */
const generateMultipleProviderImages = async(providers, prompt, guidance, userId = null) => {
    const results = await Promise.allSettled(
        providers.map(provider => generateProviderImage(provider, prompt, guidance, userId))
    );

    return results.map((result, index) => ({
        provider: providers[index],
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
    }));
};

// ============================================================================
// CONFIGURATION ACCESS
// ============================================================================

/**
 * Get available providers
 * @returns {Array} Array of available provider names
 */
const getAvailableProviders = () => Object.keys(MODEL_CONFIG);

/**
 * Get provider configuration
 * @param {string} providerName - Provider name
 * @returns {Object|null} Provider configuration or null if not found
 */
const getProviderConfig = providerName => MODEL_CONFIG[providerName] || null;

/**
 * Check if provider is available
 * @param {string} providerName - Provider name
 * @returns {boolean} True if provider is available
 */
const isProviderAvailable = providerName => providerName in MODEL_CONFIG;

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Main generation functions
    generateProviderImage,
    generateMultipleProviderImages,
    generateDalleImage,
    generateDezgoImage,

    // Configuration functions
    getAvailableProviders,
    getProviderConfig,
    isProviderAvailable,

    // Utility functions
    generateId,
    validateImageParams,

    // Configuration
    MODEL_CONFIG
};

export default {
    generateProviderImage,
    generateMultipleProviderImages,
    generateDalleImage,
    generateDezgoImage,
    getAvailableProviders,
    getProviderConfig,
    isProviderAvailable,
    generateId,
    validateImageParams,
    MODEL_CONFIG
};
