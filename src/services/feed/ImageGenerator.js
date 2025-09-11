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

    // Dezgo models - Updated with correct model names
    flux: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_flux',
        model: 'flux_1_schnell'
    },
    dreamshaperLighting: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_sdxl_lightning',
        model: 'dreamshaperxl_lightning_1024px'
    },
    juggernaut: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_sdxl',
        model: 'juggernautxl_1024px'
    },
    absolute: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'absolute_reality_1_8_1'
    },
    tshirt: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_sdxl',
        model: 'tshirtdesignredmond_1024px'
    },
    lowpoly: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'lowpoly_world'
    },
    cyber: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'cyberrealistic_3_1'
    },
    disco: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'disco_diffusion_style'
    },
    synthwave: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'synthwavepunk_v2'
    },
    ink: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'inkpunk_diffusion'
    },
    dreamshaper: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_sdxl',
        model: 'dreamshaperxl_1024px'
    },
    bluepencil: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image_sdxl',
        model: 'bluepencilxl_1024px'
    },
    abyssorange: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'abyss_orange_mix_2'
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
    analogmadness: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'analogmadness_7'
    },
    portraitplus: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'portrait_plus'
    },
    realisticvision: {
        type: 'dezgo',
        url: 'https://api.dezgo.com/text2image',
        model: 'realistic_vision_5_1'
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

const generateRandomNineCharNumber = () => Math.floor(Math.random() * 900000000) + 100000000;

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

/**
 * Create test parameters for different model types
 * @param {string} url - API endpoint URL
 * @param {string} model - Model name
 * @returns {Object} Test parameters
 */
const createTestParams = (url, model) => {
    if (url.includes('text2image_sdxl_lightning')) {
        return {
            prompt: 'test',
            model,
            width: 1024,
            height: 1024,
            steps: 4,
            guidance: 1,
            seed: 1,
            output_format: 'jpeg'
        };
    } else if (url.includes('text2image_sdxl')) {
        return {
            prompt: 'test',
            model,
            width: 1024,
            height: 1024,
            steps: 20,
            guidance: 7.5,
            seed: 1,
            output_format: 'jpeg'
        };
    } else {
        return {
            prompt: 'test',
            model,
            width: 512,
            height: 512,
            steps: 20,
            guidance: 7.5,
            seed: 1,
            output_format: 'jpeg'
        };
    }
};

/**
 * Test Flux model availability
 * @param {string} url - API endpoint URL
 * @returns {Promise<boolean>} True if model is available
 */
const testFluxModel = async url => {
    const formData = new FormData();

    formData.append('prompt', 'test');
    formData.append('width', '512');
    formData.append('height', '512');
    formData.append('steps', '4');
    formData.append('seed', '1');
    formData.append('format', 'png');
    formData.append('transparent_background', 'false');

    const response = await axios.post(url, formData, {
        headers: {
            'X-Dezgo-Key': process.env.DEZGO_API_KEY,
            accept: '*/*',
            ...formData.getHeaders()
        },
        responseType: 'arraybuffer',
        timeout: 30000
    });

    return response.status === 200;
};

/**
 * Test standard model availability
 * @param {string} url - API endpoint URL
 * @param {string} model - Model name
 * @returns {Promise<boolean>} True if model is available
 */
const testStandardModel = async (url, model) => {
    const testParams = createTestParams(url, model);

    const response = await axios.post(url, testParams, {
        headers: {
            'X-Dezgo-Key': process.env.DEZGO_API_KEY,
            'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer',
        timeout: 30000
    });

    return response.status === 200;
};

/**
 * Test if a specific Dezgo model is available
 * @param {string} model - Model name to test
 * @returns {Promise<boolean>} True if model is available
 */
const testDezgoModelAvailability = async model => {
    try {
        const keyValidation = validateDezgoApiKey();

        if (keyValidation) {
            return false;
        }

        const modelConfig = Object.values(MODEL_CONFIG).find(config => config.type === 'dezgo' && config.model === model
        );

        if (!modelConfig) {
            return false;
        }

        const { url } = modelConfig;

        if (url.includes('text2image_flux')) {
            return await testFluxModel(url);
        } else {
            return await testStandardModel(url, model);
        }
    } catch (error) {
        return false;
    }
};

/**
 * Get list of available Dezgo models
 * @returns {Promise<Array>} Array of available model names
 */
const getAvailableDezgoModels = async () => {
    const dezgoModels = Object.entries(MODEL_CONFIG)
        .filter(([_, config]) => config.type === 'dezgo')
        .map(([name, config]) => ({ name, model: config.model }));

    const availableModels = [];

    for (const { name, model } of dezgoModels) {
        const isAvailable = await testDezgoModelAvailability(model);

        if (isAvailable) {
            availableModels.push(name);
        }
    }

    return availableModels;
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


const makeDezgoRequest = async (url, prompt, model, _guidance) => {
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
        // Use legacy approach with form-urlencoded and model-specific guidance
        const params = {
            prompt,
            negative_prompt: '',
            seed: generateRandomNineCharNumber(),
            model
        };

        // Model-specific guidance handling
        if (url.includes('text2image_sdxl_lightning') || model.includes('lightning')) {
            // Lightning models have different guidance limits
            params.guidance = 1; // Use minimal guidance for lightning models
        } else {
            params.guidance = 8; // Standard guidance for other models
        }

        console.log('🔍 DEZGO: Making request with params:', {
            url,
            model,
            prompt: prompt.substring(0, 50) + '...',
            guidance: params.guidance,
            seed: params.seed
        });

        return await axios.post(url, new URLSearchParams(params).toString(), {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded'
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
            console.error('❌ DEZGO: Invalid response - no data:', response);

            return { error: 'Invalid response', details: response };
        }


        return Buffer.from(response.data).toString('base64');
    } catch (error) {
        console.error('❌ DEZGO: Error in generateDezgoImage:', error.message);
        console.error('❌ DEZGO: Full error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data ? error.response.data.toString() : 'No data',
            config: {
                url: error.config?.url,
                method: error.config?.method,
                data: error.config?.data
            }
        });

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

        // Check if result is an error object
        if (result && typeof result === 'object' && result.error) {
            return { error: result.error, details: result.details };
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

    return results.map((result, index) => {
        let error = null;

        if (result.status === 'rejected') {
            error = result.reason;
        } else if (result.status === 'fulfilled' && result.value?.error) {
            const { error: valueError } = result.value;

            error = valueError;
        }

        return {
            provider: providers[index],
            success: result.status === 'fulfilled' && result.value && !result.value.error,
            data: result.status === 'fulfilled' ? result.value : null,
            error
        };
    });
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

    // Model testing functions
    testDezgoModelAvailability,
    getAvailableDezgoModels,

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
    testDezgoModelAvailability,
    getAvailableDezgoModels,
    MODEL_CONFIG
};
