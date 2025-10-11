/**
 * Dezgo Provider
 *
 * Handles Dezgo API image generation (Flux, SDXL, etc.)
 */

import FormData from 'form-data';
import { assertCredentials } from '../core/CredentialValidator.js';
import { withRetry, isRetryableError } from '../core/RetryPolicy.js';
import { ERROR_CODES, createSuccessResult, createErrorResult, generateRequestId } from '../core/ResultTypes.js';
import { validatePayloadSize, validateBase64Size } from '../utils/ValidationHelpers.js';
import { maskSensitiveHeaders, truncateErrorMessage, getSafeErrorData, arrayBufferToBase64 } from '../utils/SecurityHelpers.js';
import { isFluxModel, isRedshiftModel, isLightningModel, isSDXLModel, computeDezgoGuidance, generateRandomNineDigitNumber } from '../utils/ModelFeatureDetection.js';
import { createDezgoAxios } from '../utils/HttpAgents.js';
import modelInterface from '../../../ModelInterface.js';

// Shared axios instance with keep-alive
const dezgoAxios = createDezgoAxios();

/**
 * Create form data for Flux models
 * @param {string} prompt - Image generation prompt
 * @returns {FormData} Configured form data
 */
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
 * Make Dezgo API request
 * @param {string} url - API endpoint
 * @param {string} prompt - Prompt
 * @param {string} model - Model name
 * @param {number} guidance - Guidance value
 * @param {AbortSignal} signal - Abort signal
 * @returns {Promise<Object>} Axios response
 */
const makeDezgoRequest = async (url, prompt, model, guidance, signal) => {
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

/**
 * Handle Dezgo API errors
 * @param {Object} error - Error object
 * @param {Object} meta - Error metadata
 * @returns {Object} Error result
 */
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

/**
 * Generate image using Dezgo API
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value
 * @param {string} url - Dezgo API URL
 * @param {string} model - Model name
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result
 */
export const generateImage = async(prompt, guidance, url, model = 'flux_1_schnell', options = {}) => {
    const startTime = Date.now();
    const requestId = generateRequestId();
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

/**
 * Create test parameters for different model types
 * @param {string} url - API endpoint URL
 * @param {string} model - Model name
 * @returns {Object} Test parameters
 */
const createTestParams = (url, model) => {
    if (!url) {
        throw new Error('API URL is required for test parameters');
    }

    if (isLightningModel(url, model)) {
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
    } else if (isSDXLModel(url)) {
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
    const formData = createFluxFormData('test');

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
 * Get list of available Dezgo models
 * @returns {Promise<Array>} Array of available model names
 */
export const getAvailableModels = async () => {
    const dezgoModels = await modelInterface.getModelsByProvider('dezgo');

    return dezgoModels.map(dbModel => ({
        name: dbModel.name,
        model: dbModel.apiModel
    }));
};

/**
 * Test if a specific Dezgo model is available
 * @param {string} model - Model name to test
 * @returns {Promise<boolean>} True if model is available
 */
export const testModelAvailability = async model => {
    try {
        assertCredentials('dezgo');

        const dezgoModels = await modelInterface.getModelsByProvider('dezgo');
        const modelConfig = dezgoModels.find(dbModel => dbModel.apiModel === model);

        if (!modelConfig?.apiUrl) {
            return false;
        }

        const url = modelConfig.apiUrl;

        if (isFluxModel(url)) {
            return await testFluxModel(url);
        } else {
            return await testStandardModel(url, model);
        }
    } catch (error) {
        return false;
    }
};

export default {
    generateImage,
    getAvailableModels,
    testModelAvailability
};

