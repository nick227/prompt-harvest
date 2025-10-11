/**
 * OpenAI Provider
 *
 * Handles DALL-E image generation via OpenAI API
 */

import OpenAI from 'openai';
import { assertCredentials } from '../core/CredentialValidator.js';
import { withRetry, isRetryableError } from '../core/RetryPolicy.js';
import { ERROR_CODES, createSuccessResult, createErrorResult, generateRequestId } from '../core/ResultTypes.js';
import { validateBase64Size } from '../utils/ValidationHelpers.js';
import { maskSensitiveHeaders, truncateErrorMessage } from '../utils/SecurityHelpers.js';

/**
 * Generate image using OpenAI DALL-E
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by DALL-E)
 * @param {string} model - Model name from config
 * @param {string} userId - User ID for tracking
 * @param {Object} options - Optional generation options (size, quality)
 * @returns {Promise<Object>} Generation result
 */
export const generateImage = async(prompt, guidance, model = 'dall-e-3', userId = null, options = {}) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

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
        console.error('❌ DALL-E: Error in generateImage:', truncateErrorMessage(error.message));

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

export default {
    generateImage
};

