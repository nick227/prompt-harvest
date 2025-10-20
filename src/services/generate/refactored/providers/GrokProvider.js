/**
 * Grok Provider
 *
 * Handles Grok (xAI) image generation via xAI API
 */

import { assertCredentials } from '../core/CredentialValidator.js';
import { withRetry, isRetryableError } from '../core/RetryPolicy.js';
import { ERROR_CODES, createSuccessResult, createErrorResult, generateRequestId } from '../core/ResultTypes.js';
import { validateBase64Size } from '../utils/ValidationHelpers.js';
import { maskSensitiveHeaders, truncateErrorMessage } from '../utils/SecurityHelpers.js';
import { BaseProvider } from './BaseProvider.js';
import axios from 'axios';

const GROK_API_BASE_URL = 'https://api.x.ai/v1';

/**
 * Grok Image Generation Provider
 * Implements the BaseProvider interface for xAI's Grok models
 */
export class GrokProvider extends BaseProvider {
    constructor() {
        super('grok');
        this.apiKey = process.env.GROK_API_KEY;
        this.baseUrl = process.env.GROK_API_URL || GROK_API_BASE_URL;
    }

    /**
     * Generate image using Grok API
     * @param {string} prompt - Image generation prompt
     * @param {number} guidance - Guidance value (not used by Grok)
     * @param {string} model - Model name (use 'grok-2-image' for image generation)
     * @param {string} userId - User ID for tracking
     * @param {Object} options - Generation options
     * @returns {Promise<Object>} Generation result
     */
    async generateImage(prompt, guidance, model = 'grok-2-image', userId = null, options = {}) {
        const startTime = Date.now();
        const requestId = generateRequestId();

        try {
            assertCredentials('grok');

            const result = await withRetry(async _attempt => {
                // Grok image generation endpoint
                const endpoint = `${this.baseUrl}/images/generations`;

                // Grok API request format
                // Note: size, style, quality are NOT supported by Grok
                const requestData = {
                    prompt,
                    model,
                    n: options.n ?? 1,
                    response_format: options.response_format ?? 'b64_json'
                };

                const response = await axios.post(endpoint, requestData, {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: options.timeout ?? 120000,
                    signal: options.signal
                });

                // Extract image from response
                let base64Result;

                // Grok API returns: { data: [{ b64_json: "...", revised_prompt: "..." }] }
                if (response.data?.data?.[0]?.b64_json) {
                    base64Result = response.data.data[0].b64_json;
                } else if (response.data?.data?.[0]?.image) {
                    base64Result = response.data.data[0].image;
                } else {
                    throw new Error('Invalid response from Grok API - no image data found');
                }

                validateBase64Size(base64Result);

                return base64Result;
            }, { maxAttempts: 2 });

            const duration = Date.now() - startTime;

            return createSuccessResult(result, {
                requestId,
                provider: 'grok',
                model,
                durationMs: duration
            });

        } catch (error) {
            const duration = Date.now() - startTime;

            return this.handleError(error, { requestId, model, duration });
        }
    }

    /**
     * Handle Grok API errors
     * @param {Object} error - Error object
     * @param {Object} meta - Error metadata
     * @returns {Object} Formatted error response
     */
    handleError(error, meta = {}) {
        maskSensitiveHeaders(error);
        console.error('❌ GROK: Error in generateImage:', truncateErrorMessage(error.message));

        const errorMeta = {
            requestId: meta.requestId,
            provider: 'grok',
            model: meta.model,
            durationMs: meta.duration
        };

        if (error.message.includes('not configured')) {
            return createErrorResult(
                ERROR_CODES.MISSING_CREDENTIALS,
                error.message,
                { retryable: false, meta: errorMeta }
            );
        }

        if (error.response) {
            const { status, data } = error.response;
            const errorMessage = data?.error || data?.message;

            if (status === 400) {
                // Check for content policy violations
                if (errorMessage?.includes('content_policy') || errorMessage?.includes('safety')) {
                    return createErrorResult(
                        ERROR_CODES.CONTENT_POLICY,
                        'Content policy violation',
                        {
                            details: 'Prompt rejected by safety system',
                            retryable: false,
                            meta: errorMeta
                        }
                    );
                }

                return createErrorResult(
                    ERROR_CODES.INVALID_PARAMS,
                    'Invalid request to Grok API',
                    {
                        details: errorMessage || 'Bad request',
                        retryable: false,
                        meta: errorMeta
                    }
                );
            }

            if (status === 401) {
                return createErrorResult(
                    ERROR_CODES.AUTH_FAILED,
                    'Grok API authentication failed',
                    {
                        details: 'Invalid API key',
                        retryable: false,
                        meta: errorMeta
                    }
                );
            }

            if (status === 403) {
                return createErrorResult(
                    ERROR_CODES.AUTH_FAILED,
                    'Grok API access forbidden',
                    {
                        details: errorMessage || 'Access denied',
                        retryable: false,
                        meta: errorMeta
                    }
                );
            }

            if (status === 429) {
                return createErrorResult(
                    ERROR_CODES.RATE_LIMIT,
                    'Grok API rate limit exceeded',
                    { retryable: true, meta: errorMeta }
                );
            }

            if (status >= 500) {
                return createErrorResult(
                    ERROR_CODES.SERVER_ERROR,
                    'Grok API server error',
                    {
                        details: 'xAI servers experiencing issues',
                        retryable: true,
                        meta: errorMeta
                    }
                );
            }
        }

        // Handle network errors
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return createErrorResult(
                ERROR_CODES.TIMEOUT,
                'Grok API request timeout',
                { retryable: true, meta: errorMeta }
            );
        }

        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return createErrorResult(
                ERROR_CODES.NETWORK_ERROR,
                'Grok API connection failed',
                { retryable: true, meta: errorMeta }
            );
        }

        const retryable = isRetryableError(error);

        return createErrorResult(
            ERROR_CODES.UNKNOWN,
            'Error generating image with Grok',
            { details: error.message, retryable, meta: errorMeta }
        );
    }

    /**
     * Test if Grok API is available
     * @returns {Promise<boolean>} True if available
     */
    async testAvailability() {
        try {
            assertCredentials('grok');

            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`
                },
                timeout: 10000
            });

            return response.status === 200;
        } catch (error) {
            console.error('Grok availability test failed:', error.message);

            return false;
        }
    }

    /**
     * Get available Grok models
     * @returns {Promise<Array>} Array of available models
     */
    async getAvailableModels() {
        try {
            assertCredentials('grok');

            const response = await axios.get(`${this.baseUrl}/models`, {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`
                },
                timeout: 10000
            });

            // Filter for image generation models
            const models = response.data?.data || [];

            return models
                .filter(m => m.capabilities?.includes('image_generation'))
                .map(m => ({
                    id: m.id,
                    name: m.name || m.id,
                    type: 'image'
                }));
        } catch (error) {
            console.error('Failed to fetch Grok models:', error.message);

            return [];
        }
    }
}

// Legacy function-based export for compatibility with existing code
export const generateImage = async (prompt, guidance, model, userId, options) => {
    const provider = new GrokProvider();

    return provider.generateImage(prompt, guidance, model, userId, options);
};

export default {
    GrokProvider,
    generateImage
};

