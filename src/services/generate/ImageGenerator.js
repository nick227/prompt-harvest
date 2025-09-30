/**
 * ImageGenerator Service
 *
 * Handles all image generation operations including:
 * - OpenAI DALL-E image generation
 * - Dezgo API image generation
 * - Google Imagen image generation
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
import http from 'http';
import https from 'https';
import modelInterface from '../ModelInterface.js';

// Ensure dotenv is loaded
dotenv.config();

// ImageGenerator loaded with environment configuration

// ============================================================================
// DYNAMIC PROVIDER CONFIGURATION
// ============================================================================

/**
 * Get model configuration dynamically from database
 * Replaces static MODEL_CONFIG with dynamic loading
 */
const getModelConfig = async providerName => {
    try {
        const config = await modelInterface.getImageGeneratorConfig(providerName);

        if (!config) {
            throw new Error(`Model configuration not found for provider: ${providerName}`);
        }

        return config;
    } catch (error) {
        console.error(`❌ IMAGE-GENERATOR: Failed to get config for ${providerName}:`, error);
        throw error;
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
const validateImageParams = async (prompt, guidance, providerName) => {
    const errors = [];

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        errors.push('Invalid prompt: prompt must be a non-empty string');
    }

    if (typeof guidance !== 'number' || guidance < 0 || guidance > 20) {
        errors.push('Invalid guidance value (must be 0-20)');
    }

    // Validate provider exists in database
    const isValidProvider = await modelInterface.isModelValid(providerName);

    if (!providerName || !isValidProvider) {
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
 * Validate OpenAI API key
 * @returns {Object|null} Error object if key is missing, null if valid
 */
const validateOpenAIApiKey = () => {
    if (!process.env.OPENAI_API_KEY) {
        return { error: 'OpenAI API key not configured', skip: true };
    }

    return null;
};

/**
 * Generate image using OpenAI DALL-E
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by DALL-E)
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Object>} Generation result
 */
const generateDalleImage = async(prompt, guidance, userId = null) => {
    try {
        const keyValidation = validateOpenAIApiKey();

        if (keyValidation) {
            return keyValidation;
        }


        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            timeout: 120000, // 2 minutes timeout
            maxRetries: 2
        });

        const response = await openai.images.generate({
            prompt,
            n: 1,
            size: '1024x1024',
            response_format: 'b64_json',
            model: 'dall-e-3',
            user: userId,
            quality: 'standard' // Use standard quality for better performance
        });


        if (!response.data || !response.data[0] || !response.data[0].b64_json) {
            return { error: 'Invalid response from DALL-E', details: response };
        }

        const imageData = response.data[0].b64_json;


        return imageData;

    } catch (error) {
        console.error('❌ DALL-E: Error in generateDalleImage:', error.message);

        if (error.status === 400) {
            if (error.code === 'content_policy_violation') {
                return {
                    error: 'Content policy violation',
                    details: 'Your request was rejected due to a content policy violation. The prompt may contain text that is not allowed by the safety system.'
                };
            } else if (error.code === 'invalid_request_error') {
                return {
                    error: 'Invalid request to DALL-E',
                    details: error.message || 'Bad request parameters'
                };
            }
        } else if (error.status === 401) {
            return {
                error: 'DALL-E API authentication failed',
                details: 'Please check your OpenAI API key'
            };
        } else if (error.status === 429) {
            return {
                error: 'DALL-E API rate limit exceeded',
                details: 'Please try again later'
            };
        } else if (error.status === 500) {
            return {
                error: 'DALL-E API server error',
                details: 'OpenAI servers are experiencing issues'
            };
        }

        return {
            error: 'Error generating image with DALL-E',
            details: error.message || 'Unknown error'
        };
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
    // Validate URL parameter
    if (!url) {
        throw new Error('API URL is required for test parameters');
    }

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

        // Get all Dezgo models from database
        const dezgoModels = await modelInterface.getModelsByProvider('dezgo');
        const modelConfig = dezgoModels.find(dbModel => dbModel.apiModel === model);

        if (!modelConfig) {
            return false;
        }

        const { apiUrl: url } = modelConfig;

        if (!url) {
            console.error(`❌ DEZGO: No API URL configured for model: ${model}`);

            return false;
        }

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
    const dezgoModels = await modelInterface.getModelsByProvider('dezgo');

    return dezgoModels.map(dbModel => ({
        name: dbModel.name,
        model: dbModel.apiModel
    }));
};

const isRetryableError = error => {
    // Retry on network errors, timeouts, and 499 status codes
    if (error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return true;
    }

    if (error.response?.status === 499 || error.response?.status === 503) {
        return true;
    }

    return false;
};

const handleDezgoError = error => {
    console.error('❌ DEZGO: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data ? error.response.data.toString() : 'No data',
        message: error.message
    });

    if (error.response) {
        const { status, data } = error.response;

        if (status === 400) {
            return {
                error: 'Invalid request to Dezgo API',
                details: 'Bad request parameters or malformed prompt'
            };
        } else if (status === 401) {
            return {
                error: 'Dezgo API authentication failed',
                details: 'Please check your API key'
            };
        } else if (status === 403) {
            return {
                error: 'Dezgo API access forbidden',
                details: 'Check your API key permissions'
            };
        } else if (status === 429) {
            return {
                error: 'Dezgo API rate limit exceeded',
                details: 'Please try again later'
            };
        } else if (status === 500) {
            return {
                error: 'Dezgo API server error',
                details: 'Dezgo servers are experiencing issues'
            };
        } else if (status === 499) {
            return {
                error: 'Dezgo API client disconnected',
                details: 'Request was cancelled or client disconnected. This may be due to timeout or network issues.'
            };
        } else if (status === 503) {
            return {
                error: 'Dezgo API service unavailable',
                details: 'Service temporarily unavailable'
            };
        } else if (status >= 400 && status < 500) {
            return {
                error: `Dezgo API client error (${status})`,
                details: data ? data.toString() : 'Client request error'
            };
        } else if (status >= 500) {
            return {
                error: `Dezgo API server error (${status})`,
                details: data ? data.toString() : 'Server error'
            };
        }
    }

    if (error.code === 'ECONNABORTED') {
        return {
            error: 'Dezgo API request timeout',
            details: 'Request took too long to complete'
        };
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
            error: 'Dezgo API connection failed',
            details: 'Unable to connect to Dezgo servers'
        };
    }

    return {
        error: 'Error generating image with Dezgo',
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


const makeDezgoRequest = async (url, prompt, model, guidance) => {
    const startTime = Date.now();

    // Validate required parameters
    if (!url) {
        throw new Error('Dezgo API URL is required but not configured');
    }

    if (url.includes('text2image_flux')) {
        const formData = createFluxFormData(prompt);

        const response = await axios.post(url, formData, {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                accept: '*/*',
                ...formData.getHeaders()
            },
            responseType: 'arraybuffer',
            timeout: 120000,
            maxRedirects: 3
        });

        const duration = Date.now() - startTime;


        return response;
    } else {
        // Use legacy approach with form-urlencoded and model-specific guidance
        const params = {
            prompt,
            negative_prompt: '',
            seed: generateRandomNineCharNumber(),
            model
        };

        // Model-specific guidance handling with better defaults
        if (url.includes('text2image_sdxl_lightning') || model.includes('lightning')) {
            params.guidance = 1; // Minimal guidance for lightning models
        } else if (url.includes('text2image_sdxl')) {
            params.guidance = Math.min(Math.max(guidance || 7.5, 1), 20); // SDXL models
        } else if (model.includes('redshift')) {
            // Redshift models work better with lower guidance
            params.guidance = Math.min(Math.max(guidance || 5, 1), 15);
        } else {
            params.guidance = Math.min(Math.max(guidance || 7.5, 1), 20); // Standard models
        }

        const response = await axios.post(url, new URLSearchParams(params).toString(), {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Image-Harvest/1.0'
            },
            responseType: 'arraybuffer',
            timeout: model.includes('redshift') ? 600000 : 300000, // 10 minutes for redshift, 5 minutes for others
            maxRedirects: 3,
            // Add connection keep-alive and retry settings
            httpAgent: new http.Agent({
                keepAlive: true,
                timeout: model.includes('redshift') ? 600000 : 300000,
                maxSockets: 1
            }),
            httpsAgent: new https.Agent({
                keepAlive: true,
                timeout: model.includes('redshift') ? 600000 : 300000,
                maxSockets: 1
            })
        });

        const duration = Date.now() - startTime;


        return response;
    }
};

const generateDezgoImage = async(prompt, guidance, url, model = 'flux_1_schnell') => {
    const maxRetries = model.includes('redshift') || model.includes('abyss') ? 2 : 1;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
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
            lastError = error;
            console.error(`❌ DEZGO: Error in generateDezgoImage (attempt ${attempt}/${maxRetries}):`, error.message);
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

            // If this is a retryable error and we have attempts left, wait before retrying
            if (attempt < maxRetries && isRetryableError(error)) {
                const waitTime = attempt * 5000; // 5s, 10s

                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
            }

            return handleDezgoError(error);
        }
    }

    return handleDezgoError(lastError);
};

// ============================================================================
// GOOGLE IMAGEN GENERATION
// ============================================================================

/**
 * Validate Google Cloud credentials
 * @returns {Object|null} Error object if credentials are missing, null if valid
 */
const validateGoogleCloudCredentials = () => {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return { error: 'GOOGLE_CLOUD_PROJECT_ID not configured', skip: true };
    }
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
        return { error: 'Google Cloud credentials not configured (need GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY)', skip: true };
    }

    return null;
};

/**
 * Generate image using Google Imagen API
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by Imagen)
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Object>} Generation result
 */
const generateImagenImage = async(prompt, guidance, userId = null) => {
    try {
        const keyValidation = validateGoogleCloudCredentials();

        if (keyValidation) {
            return keyValidation;
        }


        // Import Google Auth Library for JWT authentication
        const { JWT } = await import('google-auth-library');

        // Initialize JWT client with service account credentials
        // Handle both file path and JSON string credentials
        let client;

        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            // Check if it's a file path or JSON string
            if (process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
                // It's a JSON string, parse it and use credentials directly
                let credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;

                // Handle escaped newlines in private keys (common in cloud deployments)
                credentialsJson = credentialsJson.replace(/\\n/g, '\n');

                try {
                    const credentials = JSON.parse(credentialsJson);

                    client = new JWT({
                        credentials,
                        scopes: ['https://www.googleapis.com/auth/cloud-platform']
                    });
                } catch (parseError) {
                    console.error('❌ IMAGEN: Failed to parse Google credentials JSON:', parseError.message);
                    throw new Error(`Invalid Google credentials JSON format: ${parseError.message}`);
                }
            } else {
                // It's a file path
                client = new JWT({
                    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                    scopes: ['https://www.googleapis.com/auth/cloud-platform']
                });
            }
        } else if (process.env.GOOGLE_CLOUD_API_KEY) {
            // Use API key authentication instead
            throw new Error('API key authentication not yet implemented for Imagen');
        } else {
            throw new Error('No Google Cloud credentials configured');
        }

        // Obtain access token
        const { token } = await client.getAccessToken();


        const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;

        // Use the correct API endpoint for Imagen
        const apiEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration:predict`;

        // Google Imagen API request payload
        const requestData = {
            instances: [{
                prompt
            }],
            parameters: {
                sampleCount: 1,
                imageSize: '1024x1024'
            }
        };


        // Make the request using axios with proper authentication
        const response = await axios.post(apiEndpoint, requestData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 120000
        });

        if (!response.data || !response.data.predictions || response.data.predictions.length === 0) {
            return { error: 'Invalid response from Imagen API', details: response.data };
        }

        const [prediction] = response.data.predictions;

        // Extract image data from Imagen response
        if (!prediction.bytesBase64Encoded) {
            return { error: 'No image data found in response', details: response.data };
        }

        return prediction.bytesBase64Encoded;

    } catch (error) {
        console.error('❌ IMAGEN: Error in generateImagenImage:', error.message);
        console.error('❌ IMAGEN: Full error details:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            config: {
                url: error.config?.url,
                method: error.config?.method
            }
        });

        return handleImagenError(error);
    }
};

/**
 * Handle Imagen API errors
 * @param {Object} error - Error object from axios
 * @returns {Object} Formatted error response
 */
const handleImagenError = error => {
    if (error.response) {
        const { status, data } = error.response;

        if (status === 400) {
            return {
                error: 'Invalid request to Imagen API',
                details: data?.error?.message || 'Bad request'
            };
        } else if (status === 401) {
            return {
                error: 'Imagen API authentication failed. Please check your Google Cloud credentials.',
                details: 'Invalid or expired credentials'
            };
        } else if (status === 429) {
            return {
                error: 'Imagen API rate limit exceeded. Please try again later.',
                details: 'Rate limit exceeded'
            };
        } else if (status === 403) {
            return {
                error: 'Imagen API access forbidden',
                details: data?.error?.message || 'Access denied'
            };
        } else if (status === 404) {
            return {
                error: 'Imagen model not found',
                details: 'Check your Google Cloud project configuration'
            };
        }
    }

    return {
        error: 'Error generating image with Imagen',
        details: error.message || 'Unknown error'
    };
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
    const startTime = Date.now();


    let result;

    if (config.type === 'openai') {
        result = await generateDalleImage(prompt, guidance, userId);
    } else if (config.type === 'dezgo') {
        result = await generateDezgoImage(prompt, guidance, config.url, config.model);
    } else if (config.type === 'google') {
        result = await generateImagenImage(prompt, guidance, userId);
    } else {
        return { error: `Unknown provider type: ${config.type}` };
    }

    const duration = Date.now() - startTime;


    // Handle skip conditions
    if (result && result.skip) {
        const errorMessage = {
            openai: 'OpenAI API key not configured',
            dezgo: 'Dezgo API key not configured',
            google: 'Google Cloud credentials not configured'
        }[config.type] || 'API credentials not configured';

        return { error: errorMessage, skip: true };
    }

    // Check if result is an error object
    if (result && typeof result === 'object' && result.error) {
        return { error: result.error, details: result.details };
    }

    return result;
};

const generateProviderImage = async(providerName, prompt, guidance, userId = null) => {
    const validation = await validateImageParams(prompt, guidance, providerName);

    if (!validation.isValid) {
        return { error: `Invalid parameters: ${validation.errors.join(', ')}` };
    }

    const config = await getModelConfig(providerName);

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

/**
 * Generate image from a randomly selected provider
 * @param {Array} providers - Array of provider names to choose from
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @returns {Promise<Object>} Generation result with selected provider info
 */
const generateRandomProviderImage = async(providers, prompt, guidance, userId = null) => {
    // Randomly select one provider from the list
    const selectedProvider = providers[Math.floor(Math.random() * providers.length)];


    // Generate image from the selected provider
    const result = await generateProviderImage(selectedProvider, prompt, guidance, userId);

    return {
        provider: selectedProvider,
        success: result && !result.error,
        data: result,
        error: result?.error || null
    };
};

// ============================================================================
// CONFIGURATION ACCESS
// ============================================================================

/**
 * Get available providers
 * @returns {Promise<Array>} Array of available provider names
 */
const getAvailableProviders = async () => await modelInterface.getValidModelNames();

/**
 * Get provider configuration
 * @param {string} providerName - Provider name
 * @returns {Promise<Object|null>} Provider configuration or null if not found
 */
const getProviderConfig = async providerName => {
    try {
        return await getModelConfig(providerName);
    } catch (error) {
        return null;
    }
};

/**
 * Check if provider is available
 * @param {string} providerName - Provider name
 * @returns {Promise<boolean>} True if provider is available
 */
const isProviderAvailable = async providerName => await modelInterface.isModelValid(providerName);

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // Main generation functions
    generateProviderImage,
    generateMultipleProviderImages,
    generateRandomProviderImage,
    generateDalleImage,
    generateDezgoImage,
    generateImagenImage,

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

    // Dynamic configuration access
    getModelConfig
};

export default {
    generateProviderImage,
    generateMultipleProviderImages,
    generateRandomProviderImage,
    generateDalleImage,
    generateDezgoImage,
    generateImagenImage,
    getAvailableProviders,
    getProviderConfig,
    isProviderAvailable,
    generateId,
    validateImageParams,
    testDezgoModelAvailability,
    getAvailableDezgoModels,
    getModelConfig
};
