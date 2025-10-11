/**
 * Google Imagen Provider
 *
 * Handles Google Imagen image generation via Vertex AI
 */

import { assertCredentials } from '../core/CredentialValidator.js';
import { withRetry, isRetryableError } from '../core/RetryPolicy.js';
import { ERROR_CODES, createSuccessResult, createErrorResult, generateRequestId } from '../core/ResultTypes.js';
import { validateBase64Size } from '../utils/ValidationHelpers.js';
import { maskSensitiveHeaders, truncateErrorMessage } from '../utils/SecurityHelpers.js';
import { createGoogleAxios } from '../utils/HttpAgents.js';

// Shared axios instance
const googleAxios = createGoogleAxios();

// JWT token cache
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

/**
 * Generate image using Google Imagen API
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (not used by Imagen)
 * @param {string} _userId - User ID for tracking (not used by Imagen)
 * @param {Object} options - Optional generation options (size)
 * @returns {Promise<Object>} Generation result
 */
export const generateImage = async(prompt, guidance, _userId = null, options = {}) => {
    const startTime = Date.now();
    const requestId = generateRequestId();

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

        console.error('❌ IMAGEN: Error in generateImage:', truncateErrorMessage(error.message));

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

export default {
    generateImage
};

