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

// ============================================================================
// SHARED AXIOS INSTANCES & AGENTS
// ============================================================================

const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

const dezgoAxios = axios.create({
    httpAgent,
    httpsAgent,
    headers: { 'User-Agent': 'Image-Harvest/1.0' }
});

const googleAxios = axios.create({
    httpAgent,
    httpsAgent
});

// ============================================================================
// CONSTANTS & CONFIG
// ============================================================================

const MAX_PAYLOAD_SIZE = 20 * 1024 * 1024; // 20MB (supports up to 2048x2048 PNG base64)
const MAX_CONCURRENT_MULTI_PROVIDER = 5;
const MODEL_CONFIG_CACHE_TTL = 60000; // 1 minute

// Simple cache for model configs
const modelConfigCache = new Map();

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} ImageResultSuccess
 * @property {boolean} ok - True for success
 * @property {string} imageBase64 - Base64 encoded image data
 * @property {Object} meta - Metadata about generation
 * @property {string} meta.provider - Provider name (openai, dezgo, google)
 * @property {string} [meta.model] - Model name used
 * @property {number} meta.durationMs - Generation duration in milliseconds
 * @property {number} meta.timestamp - Unix timestamp
 * @property {string} [meta.endpoint] - API endpoint used
 */

/**
 * @typedef {Object} ImageResultError
 * @property {boolean} ok - False for error
 * @property {string} code - Error code from ERROR_CODES
 * @property {string} message - Human-readable error message
 * @property {string} [details] - Additional error details
 * @property {boolean} retryable - Whether the operation can be retried
 * @property {Object} meta - Metadata about the attempt
 * @property {string} [meta.provider] - Provider name
 * @property {number} [meta.durationMs] - Attempt duration in milliseconds
 * @property {number} meta.timestamp - Unix timestamp
 */

/**
 * @typedef {ImageResultSuccess|ImageResultError} ImageResult
 */

/**
 * @typedef {'openai'|'dezgo'|'google'} ProviderType
 */

/**
 * @typedef {Object} ProviderConfig
 * @property {ProviderType} type - Provider type
 * @property {string} [model] - Model name
 * @property {string} [url] - API endpoint URL (required for dezgo)
 * @property {string} [size] - Default image size
 * @property {string} [quality] - Default quality setting (OpenAI only)
 */

/**
 * @typedef {Object} GenerationOptions
 * @property {string} [size] - Image size (e.g., '1024x1024'). Respected by: OpenAI, Google
 * @property {string} [quality] - Quality setting (e.g., 'standard', 'hd'). Respected by: OpenAI only
 * @property {number} [seed] - Random seed for deterministic selection
 * @property {AbortSignal} [signal] - AbortSignal for request cancellation
 */

// ============================================================================
// UNIFIED RESULT TYPE & ERROR CODES
// ============================================================================

/**
 * Standard error codes for image generation
 */
const ERROR_CODES = {
    MISSING_CREDENTIALS: 'MISSING_CREDENTIALS',
    INVALID_PARAMS: 'INVALID_PARAMS',
    CONTENT_POLICY: 'CONTENT_POLICY',
    AUTH_FAILED: 'AUTH_FAILED',
    RATE_LIMIT: 'RATE_LIMIT',
    TIMEOUT: 'TIMEOUT',
    SERVER_ERROR: 'SERVER_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    INVALID_RESPONSE: 'INVALID_RESPONSE',
    PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
    UNKNOWN: 'UNKNOWN'
};

/**
 * Create success result
 * @param {string} imageBase64 - Base64 encoded image
 * @param {Object} meta - Metadata about generation
 * @returns {ImageResultSuccess} Success result
 */
const createSuccessResult = (imageBase64, meta = {}) => ({
    ok: true,
    imageBase64,
    meta: {
        requestId: meta.requestId || generateId(),
        timestamp: Date.now(),
        ...meta
    }
});

/**
 * Create error result
 * @param {string} code - Error code from ERROR_CODES
 * @param {string} message - Human readable error message
 * @param {Object} options - Additional options
 * @returns {ImageResultError} Error result
 */
const createErrorResult = (code, message, options = {}) => ({
    ok: false,
    code,
    message,
    details: options.details,
    retryable: options.retryable || false,
    meta: {
        requestId: options.meta?.requestId || generateId(),
        timestamp: Date.now(),
        ...options.meta
    }
});

// ============================================================================
// CREDENTIAL VALIDATION
// ============================================================================

/**
 * Centralized credential validation
 * @param {string} providerType - Provider type (openai, dezgo, google)
 * @throws {Error} If credentials are missing
 */
const assertCredentials = providerType => {
    const checks = {
        openai: () => {
            if (!process.env.OPENAI_API_KEY) {
                throw new Error('OpenAI API key not configured');
            }
        },
        dezgo: () => {
            if (!process.env.DEZGO_API_KEY) {
                throw new Error('Dezgo API key not configured');
            }
        },
        google: () => {
            if (!process.env.GOOGLE_CLOUD_PROJECT_ID) {
                throw new Error('GOOGLE_CLOUD_PROJECT_ID not configured');
            }
            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_API_KEY) {
                throw new Error('Google Cloud credentials not configured');
            }
        }
    };

    const check = checks[providerType];

    if (!check) {
        throw new Error(`Unknown provider type: ${providerType}`);
    }

    check();
};

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Check if error is retryable
 * @param {Object} error - Error object
 * @returns {boolean} True if error should be retried
 */
const isRetryableError = error => {
    // Network errors
    const retryableCodes = ['ECONNABORTED', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'];

    if (retryableCodes.includes(error.code)) {
        return true;
    }

    // HTTP errors (including 408 Request Timeout)
    const retryableStatuses = [408, 429, 499, 500, 502, 503, 504];

    if (error.response?.status && retryableStatuses.includes(error.response.status)) {
        return true;
    }

    return false;
};

/**
 * Execute function with retry logic
 * @param {Function} fn - Function to execute
 * @param {Object} options - Retry options
 * @returns {Promise<*>} Function result
 */
const withRetry = async(fn, options = {}) => {
    const {
        maxAttempts = 3,
        baseDelay = 500,
        factor = 2,
        jitter = 0.2
    } = options;

    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn(attempt);
        } catch (error) {
            lastError = error;

            // Don't retry on non-retryable errors
            if (!isRetryableError(error)) {
                throw error;
            }

            // Don't wait after last attempt
            if (attempt < maxAttempts) {
                const baseWait = baseDelay * Math.pow(factor, attempt - 1);
                const jitterAmount = baseWait * jitter * (Math.random() * 2 - 1);
                const waitTime = Math.max(0, baseWait + jitterAmount);

                console.log(`⏳ Retry attempt ${attempt}/${maxAttempts} after ${Math.round(waitTime)}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }

    throw lastError;
};

// ============================================================================
// DYNAMIC PROVIDER CONFIGURATION
// ============================================================================

/**
 * Get model configuration dynamically from database with caching
 * Replaces static MODEL_CONFIG with dynamic loading
 */
const getModelConfig = async providerName => {
    const cacheKey = providerName;
    const cached = modelConfigCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < MODEL_CONFIG_CACHE_TTL) {
        return cached.config;
    }

    try {
        const config = await modelInterface.getImageGeneratorConfig(providerName);

        if (!config) {
            throw new Error(`Model configuration not found for provider: ${providerName}`);
        }

        modelConfigCache.set(cacheKey, { config, timestamp: Date.now() });

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

// Generate a random 9-digit number (100000000 to 999999999)
const generateRandomNineDigitNumber = () => Math.floor(Math.random() * 900000000) + 100000000;

/**
 * Validate image generation parameters
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (optional)
 * @param {string} providerKey - Provider key (model config name in DB)
 * @returns {Object} Validation result
 */
const validateImageParams = async (prompt, guidance, providerKey) => {
    const errors = [];

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        errors.push('Invalid prompt: prompt must be a non-empty string');
    }

    // Guidance is optional - only validate if provided
    if (guidance !== undefined && guidance !== null && (typeof guidance !== 'number' || guidance < 0 || guidance > 20)) {
        errors.push('Invalid guidance value (must be 0-20 if provided)');
    }

    // Validate provider config exists in database
    if (!providerKey) {
        errors.push('Provider key is required');
    } else {
        try {
            await getModelConfig(providerKey);
        } catch (error) {
            errors.push(`Invalid provider key: ${providerKey} - ${error.message}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Model feature detection helpers (null-safe, case-insensitive)
 */
const isLightningModel = (url, model) => (url && url.toLowerCase().includes('text2image_sdxl_lightning')) || (model && model.toLowerCase().includes('lightning'));

const isRedshiftModel = model => model && model.toLowerCase().includes('redshift');

const isSDXLModel = url => url && url.toLowerCase().includes('text2image_sdxl');

const isFluxModel = url => url && url.toLowerCase().includes('text2image_flux');

/**
 * Compute optimal guidance for Dezgo model
 * @param {string} url - API endpoint URL
 * @param {string} model - Model name
 * @param {number} requestedGuidance - User-requested guidance (optional)
 * @returns {number} Clamped guidance value
 */
const computeDezgoGuidance = (url, model, requestedGuidance) => {
    if (isLightningModel(url, model)) {
        return 1; // Lightning models need minimal guidance
    }

    if (isRedshiftModel(model)) {
        return Math.min(Math.max(requestedGuidance ?? 5, 1), 15);
    }

    if (isSDXLModel(url)) {
        return Math.min(Math.max(requestedGuidance ?? 7.5, 1), 20);
    }

    return Math.min(Math.max(requestedGuidance ?? 7.5, 1), 20);
};

// ============================================================================
// OPENAI DALL-E GENERATION
// ============================================================================

/**
 * Generate image using OpenAI DALL-E
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by DALL-E)
 * @param {string} model - Model name from config
 * @param {string} userId - User ID for tracking
 * @param {GenerationOptions} options - Optional generation options (size, quality)
 * @returns {Promise<ImageResult>} Generation result
 */
const generateDalleImage = async(prompt, guidance, model = 'dall-e-3', userId = null, options = {}) => {
    const startTime = Date.now();
    const requestId = generateId();

    try {
        assertCredentials('openai');

        const result = await withRetry(async _attempt => {
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
                timeout: 120000,
                maxRetries: 0 // We handle retries ourselves
            });

            const response = await openai.images.generate({
                prompt,
                n: 1,
                size: options.size ?? '1024x1024',
                response_format: 'b64_json',
                model,
                user: userId,
                quality: options.quality ?? 'standard'
            });
            // Note: OpenAI SDK doesn't support AbortSignal for images.generate
            // To implement cancellation, would need to use fetch() directly

            if (!response.data?.[0]?.b64_json) {
                throw new Error('Invalid response from DALL-E API');
            }

            const base64Result = response.data[0].b64_json;

            validateBase64Size(base64Result);

            return base64Result;
        }, { maxAttempts: 2 });

        const duration = Date.now() - startTime;

        return createSuccessResult(result, {
            requestId,
            provider: 'openai',
            model,
            durationMs: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;

        maskSensitiveHeaders(error);
        console.error('❌ DALL-E: Error in generateDalleImage:', truncateErrorMessage(error.message));

        if (error.message.includes('not configured')) {
            return createErrorResult(
                ERROR_CODES.MISSING_CREDENTIALS,
                error.message,
                { retryable: false, meta: { requestId, provider: 'openai', durationMs: duration } }
            );
        }

        // OpenAI SDK surfaces errors via error.status OR error.response?.status
        const status = error.status || error.response?.status;
        const errorData = error.response?.data?.error || {};
        const code = error.code || errorData.code;
        const errorType = errorData.type;

        if (status === 400) {
            if (code === 'content_policy_violation' || errorType === 'invalid_request_error') {
                if (error.message?.includes('content policy')) {
                    return createErrorResult(
                        ERROR_CODES.CONTENT_POLICY,
                        'Content policy violation',
                        { details: 'Prompt rejected by safety system', retryable: false, meta: { requestId, provider: 'openai', durationMs: duration } }
                    );
                }
            }

            return createErrorResult(
                ERROR_CODES.INVALID_PARAMS,
                'Invalid request to DALL-E',
                { details: error.message, retryable: false, meta: { requestId, provider: 'openai', durationMs: duration } }
            );
        }

        if (status === 401) {
            return createErrorResult(
                ERROR_CODES.AUTH_FAILED,
                'DALL-E API authentication failed',
                { details: 'Invalid API key', retryable: false, meta: { requestId, provider: 'openai', durationMs: duration } }
            );
        }

        if (status === 429) {
            return createErrorResult(
                ERROR_CODES.RATE_LIMIT,
                'DALL-E API rate limit exceeded',
                { retryable: true, meta: { requestId, provider: 'openai', durationMs: duration } }
            );
        }

        if (status >= 500) {
            return createErrorResult(
                ERROR_CODES.SERVER_ERROR,
                'DALL-E API server error',
                { details: 'OpenAI servers experiencing issues', retryable: true, meta: { requestId, provider: 'openai', durationMs: duration } }
            );
        }

        const retryable = isRetryableError(error);

        return createErrorResult(
            ERROR_CODES.UNKNOWN,
            'Error generating image with DALL-E',
            { details: error.message, retryable, meta: { requestId, provider: 'openai', durationMs: duration } }
        );
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

    const response = await dezgoAxios.post(url, formData, {
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

    const response = await dezgoAxios.post(url, testParams, {
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
        assertCredentials('dezgo');

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

const getSafeErrorData = responseData => {
    if (!responseData) {
        return 'No data';
    }

    if (Buffer.isBuffer(responseData) || responseData instanceof ArrayBuffer) {
        return '<binary data>';
    }

    return String(responseData).substring(0, 500);
};

/**
 * Mask sensitive headers in error config (case-insensitive)
 * @param {Object} error - Error object
 */
const maskSensitiveHeaders = error => {
    const headers = error.config?.headers;

    if (headers) {
        const sensitiveKeyPatterns = ['authorization', 'x-dezgo-key'];

        Object.keys(headers).forEach(key => {
            const lowerKey = key.toLowerCase();
            const value = headers[key];

            // Delete headers with sensitive key names
            if (sensitiveKeyPatterns.some(pattern => lowerKey.includes(pattern))) {
                delete headers[key];

                return;
            }

            // Mask values that look like bearer tokens
            if (typeof value === 'string') {
                const lowerValue = value.toLowerCase();

                if (lowerValue.startsWith('bearer ')) {
                    headers[key] = 'Bearer [REDACTED]';
                }
            }
        });
    }
};

/**
 * Safely truncate error message for logging
 * @param {string} message - Error message
 * @param {number} maxLength - Maximum length (default 500)
 * @returns {string} Truncated message
 */
const truncateErrorMessage = (message, maxLength = 500) => {
    if (!message || typeof message !== 'string') {
        return String(message || 'Unknown error');
    }

    if (message.length <= maxLength) {
        return message;
    }

    return `${message.substring(0, maxLength)}... (truncated ${message.length - maxLength} chars)`;
};

const handleDezgoError = (error, meta = {}) => {
    maskSensitiveHeaders(error);
    const safeData = getSafeErrorData(error.response?.data);

    console.error('❌ DEZGO: Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: safeData,
        message: truncateErrorMessage(error.message)
    });

    if (error.response) {
        const { status } = error.response;

        if (status === 400) {
            return createErrorResult(
                ERROR_CODES.INVALID_PARAMS,
                'Invalid request to Dezgo API',
                { details: 'Bad request parameters', retryable: false, meta }
            );
        }

        if (status === 401) {
            return createErrorResult(
                ERROR_CODES.AUTH_FAILED,
                'Dezgo API authentication failed',
                { details: 'Invalid API key', retryable: false, meta }
            );
        }

        if (status === 403) {
            return createErrorResult(
                ERROR_CODES.AUTH_FAILED,
                'Dezgo API access forbidden',
                { details: 'Check API key permissions', retryable: false, meta }
            );
        }

        if (status === 429) {
            return createErrorResult(
                ERROR_CODES.RATE_LIMIT,
                'Dezgo API rate limit exceeded',
                { retryable: true, meta }
            );
        }

        if (status === 499) {
            return createErrorResult(
                ERROR_CODES.TIMEOUT,
                'Dezgo API client disconnected',
                { details: 'Request cancelled or timeout', retryable: true, meta }
            );
        }

        if (status >= 500) {
            return createErrorResult(
                ERROR_CODES.SERVER_ERROR,
                'Dezgo API server error',
                { details: `Status ${status}`, retryable: true, meta }
            );
        }
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return createErrorResult(
            ERROR_CODES.TIMEOUT,
            'Dezgo API request timeout',
            { retryable: true, meta }
        );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
        return createErrorResult(
            ERROR_CODES.NETWORK_ERROR,
            'Dezgo API connection failed',
            { retryable: true, meta }
        );
    }

    const retryable = isRetryableError(error);

    return createErrorResult(
        ERROR_CODES.UNKNOWN,
        'Error generating image with Dezgo',
        { details: error.message, retryable, meta }
    );
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


/**
 * Safe ArrayBuffer/Buffer to base64 conversion
 * Handles different buffer types returned by axios/node
 * @param {ArrayBuffer|Buffer|Uint8Array} data - Data to convert
 * @returns {string} Base64 string
 */
const arrayBufferToBase64 = data => {
    // Node.js Buffer (most common)
    if (Buffer.isBuffer(data)) {
        return data.toString('base64');
    }

    // Browser/axios ArrayBuffer
    if (data instanceof ArrayBuffer) {
        return Buffer.from(new Uint8Array(data)).toString('base64');
    }

    // TypedArray (Uint8Array, etc.)
    if (ArrayBuffer.isView(data)) {
        return Buffer.from(data).toString('base64');
    }

    // Fallback: try to convert
    return Buffer.from(data).toString('base64');
};

/**
 * Validate payload size for raw data
 * @param {*} data - Data to check
 * @throws {Error} If payload exceeds limit
 */
const validatePayloadSize = data => {
    const size = data?.byteLength || data?.length || 0;

    if (size > MAX_PAYLOAD_SIZE) {
        throw new Error(`Payload too large: ${size} bytes (max ${MAX_PAYLOAD_SIZE})`);
    }
};

/**
 * Validate base64 string size
 * @param {string} base64String - Base64 string to check
 * @throws {Error} If base64 exceeds limit
 */
const validateBase64Size = base64String => {
    // Base64 is ~33% larger than raw, so check estimated size
    const estimatedSize = (base64String.length * 3) / 4;

    if (estimatedSize > MAX_PAYLOAD_SIZE) {
        throw new Error(`Base64 payload too large: ~${Math.round(estimatedSize)} bytes (max ${MAX_PAYLOAD_SIZE})`);
    }
};

const makeDezgoRequest = async (url, prompt, model, guidance, signal) => {
    // Validate required parameters
    if (!url) {
        throw new Error('Dezgo API URL is required but not configured');
    }

    if (isFluxModel(url)) {
        const formData = createFluxFormData(prompt);

        const response = await dezgoAxios.post(url, formData, {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                Accept: 'image/*',
                ...formData.getHeaders()
            },
            responseType: 'arraybuffer',
            timeout: 120000,
            maxRedirects: 3,
            signal
        });

        validatePayloadSize(response.data);

        return response;
    } else {
        // Use centralized guidance computation
        const computedGuidance = computeDezgoGuidance(url, model, guidance);

        const params = {
            prompt,
            negative_prompt: '',
            seed: generateRandomNineDigitNumber(),
            model,
            guidance: computedGuidance
        };

        const timeout = isRedshiftModel(model) ? 600000 : 300000;

        const response = await dezgoAxios.post(url, new URLSearchParams(params).toString(), {
            headers: {
                'X-Dezgo-Key': process.env.DEZGO_API_KEY,
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'image/*'
            },
            responseType: 'arraybuffer',
            timeout,
            maxRedirects: 3,
            signal
        });

        validatePayloadSize(response.data);

        return response;
    }
};

const generateDezgoImage = async(prompt, guidance, url, model = 'flux_1_schnell', options = {}) => {
    const startTime = Date.now();
    const requestId = generateId();
    const maxRetries = (isRedshiftModel(model) || model.includes('abyss')) ? 3 : 2;

    try {
        assertCredentials('dezgo');

        const imageBase64 = await withRetry(async _attempt => {
            const response = await makeDezgoRequest(url, prompt, model, guidance, options.signal);

            if (!response.data) {
                throw new Error('Invalid response from Dezgo API - no data');
            }

            const base64Result = arrayBufferToBase64(response.data);

            validateBase64Size(base64Result);

            return base64Result;
        }, { maxAttempts: maxRetries });

        const duration = Date.now() - startTime;

        return createSuccessResult(imageBase64, {
            requestId,
            provider: 'dezgo',
            model,
            endpoint: url,
            durationMs: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;

        if (error.message.includes('not configured')) {
            return createErrorResult(
                ERROR_CODES.MISSING_CREDENTIALS,
                error.message,
                { retryable: false, meta: { requestId, provider: 'dezgo', model, durationMs: duration } }
            );
        }

        if (error.message.includes('Payload too large') || error.message.includes('Base64 payload too large')) {
            return createErrorResult(
                ERROR_CODES.INVALID_RESPONSE,
                'Response payload too large',
                { details: error.message, retryable: false, meta: { requestId, provider: 'dezgo', model, durationMs: duration } }
            );
        }

        return handleDezgoError(error, { requestId, provider: 'dezgo', model, endpoint: url, durationMs: duration });
    }
};

// ============================================================================
// GOOGLE IMAGEN GENERATION
// ============================================================================

// JWT token cache for Google API
let googleJwtTokenCache = null;

/**
 * Get Google JWT access token with caching
 * @returns {Promise<string>} Access token
 */
const getGoogleAccessToken = async () => {
    // Check cache
    if (googleJwtTokenCache && Date.now() < googleJwtTokenCache.expiresAt) {
        return googleJwtTokenCache.token;
    }

    // Import Google Auth Library for JWT authentication
    const { JWT } = await import('google-auth-library');

    let client;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS.startsWith('{')) {
            let credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS;

            credentialsJson = credentialsJson.replace(/\\n/g, '\n');

            const credentials = JSON.parse(credentialsJson);

            client = new JWT({
                credentials,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
        } else {
            // It's a file path - verify it exists
            const { existsSync } = await import('fs');
            const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

            if (!existsSync(credPath)) {
                const tip = 'Ensure the file exists or use JSON credentials string.';

                throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credPath}. ${tip}`);
            }

            client = new JWT({
                keyFile: credPath,
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
        }
    } else {
        throw new Error('API key authentication not yet implemented for Imagen');
    }

    const { token } = await client.getAccessToken();

    // Cache token for 50 minutes (tokens valid for 1 hour)
    googleJwtTokenCache = {
        token,
        expiresAt: Date.now() + (50 * 60 * 1000)
    };

    return token;
};

/**
 * Generate image using Google Imagen API
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by Imagen)
 * @param {string} _userId - User ID for tracking (not used by Imagen)
 * @param {Object} options - Optional generation options (size)
 * @returns {Promise<Object>} Generation result
 */
const generateImagenImage = async(prompt, guidance, _userId = null, options = {}) => {
    const startTime = Date.now();
    const requestId = generateId();

    try {
        assertCredentials('google');

        const imageBase64 = await withRetry(async _attempt => {
            const token = await getGoogleAccessToken();
            const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
            const apiEndpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration:predict`;

            const requestData = {
                instances: [{ prompt }],
                parameters: {
                    sampleCount: 1,
                    imageSize: options.size ?? '1024x1024'
                }
            };

            const response = await googleAxios.post(apiEndpoint, requestData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000,
                signal: options.signal
            });

            if (!response.data?.predictions?.[0]?.bytesBase64Encoded) {
                throw new Error('Invalid response from Imagen API');
            }

            const base64Result = response.data.predictions[0].bytesBase64Encoded;

            validateBase64Size(base64Result);

            return base64Result;
        }, { maxAttempts: 2 });

        const duration = Date.now() - startTime;

        return createSuccessResult(imageBase64, {
            requestId,
            provider: 'google',
            model: 'imagen',
            durationMs: duration
        });

    } catch (error) {
        const duration = Date.now() - startTime;

        console.error('❌ IMAGEN: Error in generateImagenImage:', truncateErrorMessage(error.message));

        if (error.message.includes('not configured') || error.message.includes('file not found')) {
            const details = error.message.includes('file not found')
                ? 'File not found. Tip: For serverless/cloud deployments, use JSON credentials string in GOOGLE_APPLICATION_CREDENTIALS env var instead of a file path.'
                : undefined;

            return createErrorResult(
                ERROR_CODES.MISSING_CREDENTIALS,
                error.message,
                { retryable: false, details, meta: { requestId, provider: 'google', durationMs: duration } }
            );
        }

        return handleImagenError(error, duration, requestId);
    }
};

/**
 * Handle Imagen API errors
 * @param {Object} error - Error object from axios
 * @param {number} duration - Duration in milliseconds
 * @param {string} requestId - Request ID
 * @returns {Object} Formatted error response
 */
const handleImagenError = (error, duration, requestId) => {
    maskSensitiveHeaders(error);
    const meta = { requestId, provider: 'google', model: 'imagen', durationMs: duration };

    if (error.response) {
        const { status, data } = error.response;

        if (status === 400) {
            return createErrorResult(
                ERROR_CODES.INVALID_PARAMS,
                'Invalid request to Imagen API',
                { details: data?.error?.message || 'Bad request', retryable: false, meta }
            );
        }

        if (status === 401) {
            return createErrorResult(
                ERROR_CODES.AUTH_FAILED,
                'Imagen API authentication failed',
                { details: 'Invalid or expired credentials', retryable: false, meta }
            );
        }

        if (status === 429) {
            return createErrorResult(
                ERROR_CODES.RATE_LIMIT,
                'Imagen API rate limit exceeded',
                { retryable: true, meta }
            );
        }

        if (status === 403) {
            return createErrorResult(
                ERROR_CODES.AUTH_FAILED,
                'Imagen API access forbidden',
                { details: data?.error?.message || 'Access denied', retryable: false, meta }
            );
        }

        if (status === 404) {
            return createErrorResult(
                ERROR_CODES.PROVIDER_UNAVAILABLE,
                'Imagen model not found',
                { details: 'Check Google Cloud project configuration', retryable: false, meta }
            );
        }

        if (status >= 500) {
            return createErrorResult(
                ERROR_CODES.SERVER_ERROR,
                'Imagen API server error',
                { retryable: true, meta }
            );
        }
    }

    const retryable = isRetryableError(error);

    return createErrorResult(
        ERROR_CODES.UNKNOWN,
        'Error generating image with Imagen',
        { details: error.message, retryable, meta }
    );
};

// ============================================================================
// PROVIDER ORCHESTRATION
// ============================================================================

/**
 * Validate provider configuration has required fields
 * @param {Object} config - Provider configuration
 * @returns {Object} Validation result
 */
const validateProviderConfig = config => {
    if (!config || typeof config !== 'object') {
        return { valid: false, error: 'Config is null or not an object' };
    }

    if (!config.type) {
        return { valid: false, error: 'Config missing required field: type' };
    }

    // Type-specific validation
    if (config.type === 'dezgo') {
        if (!config.url) {
            return { valid: false, error: 'Dezgo config missing required field: url' };
        }
        if (!config.model) {
            return { valid: false, error: 'Dezgo config missing required field: model' };
        }
    }

    return { valid: true };
};

/**
 * Generate image using specified provider
 * @param {ProviderConfig} config - Provider configuration from database
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {GenerationOptions} options - Optional generation options (size, quality)
 * @returns {Promise<ImageResult>} Generation result
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
        return await generateDalleImage(prompt, guidance, config.model || 'dall-e-3', userId, mergedOptions);
    } else if (config.type === 'dezgo') {
        return await generateDezgoImage(prompt, guidance, config.url, config.model, mergedOptions);
    } else if (config.type === 'google') {
        return await generateImagenImage(prompt, guidance, userId, mergedOptions);
    } else {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            `Unknown provider type: ${config.type}`,
            { retryable: false }
        );
    }
};

const generateProviderImage = async(providerName, prompt, guidance, userId = null, options = {}) => {
    const validation = await validateImageParams(prompt, guidance, providerName);

    if (!validation.isValid) {
        return createErrorResult(
            ERROR_CODES.INVALID_PARAMS,
            `Invalid parameters: ${validation.errors.join(', ')}`,
            { retryable: false }
        );
    }

    try {
        const config = await getModelConfig(providerName);

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

/**
 * Generate images from multiple providers
 * @param {string[]} providers - Array of provider names
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} userId - User ID for tracking
 * @param {GenerationOptions} options - Optional generation options
 * @returns {Promise<ImageResult[]>} Array of unified generation results
 */
const generateMultipleProviderImages = async(providers, prompt, guidance, userId = null, options = {}) => {
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
 * @param {GenerationOptions|number} optionsOrSeed - Either options object or seed number (backwards compat)
 * @returns {Promise<ImageResult>} Generation result (unified result type)
 */
const generateRandomProviderImage = async(providers, prompt, guidance, userId = null, optionsOrSeed = null) => {
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
    // Constants
    ERROR_CODES,

    // Result helpers
    createSuccessResult,
    createErrorResult,

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
    ERROR_CODES,
    createSuccessResult,
    createErrorResult,
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
