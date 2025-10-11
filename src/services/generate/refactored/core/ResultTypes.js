/**
 * Result Types & Error Codes
 *
 * Defines unified result types and error codes for image generation
 */

// ============================================================================
// TYPE DEFINITIONS (JSDoc)
// ============================================================================

/**
 * @typedef {Object} ImageResultSuccess
 * @property {boolean} ok - True for success
 * @property {string} imageBase64 - Base64 encoded image data
 * @property {Object} meta - Metadata about generation
 * @property {string} meta.requestId - Unique request identifier
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
 * @property {string} meta.requestId - Unique request identifier
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
// ERROR CODES
// ============================================================================

/**
 * Standard error codes for image generation
 */
export const ERROR_CODES = {
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

// ============================================================================
// RESULT BUILDERS
// ============================================================================

/**
 * Generate a random ID for tracking requests
 * @returns {string} Random ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Create success result
 * @param {string} imageBase64 - Base64 encoded image
 * @param {Object} meta - Metadata about generation
 * @returns {ImageResultSuccess} Success result
 */
export const createSuccessResult = (imageBase64, meta = {}) => ({
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
export const createErrorResult = (code, message, options = {}) => ({
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

/**
 * Generate request ID
 * @returns {string} Unique request ID
 */
export const generateRequestId = generateId;

export default {
    ERROR_CODES,
    createSuccessResult,
    createErrorResult,
    generateRequestId
};

