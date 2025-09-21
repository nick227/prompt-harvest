/**
 * ResponseFormatter Utility
 *
 * Provides standardized API response formatting for consistent
 * response structure across all controllers.
 *
 * Features:
 * - Success response formatting
 * - Error response formatting with proper HTTP status codes
 * - Request metadata inclusion (duration, requestId, timestamp)
 * - Consistent error type mapping
 */

import { createErrorResponse as _createErrorResponse } from './errorResponse.js';

// ============================================================================
// SUCCESS RESPONSE FORMATTING
// ============================================================================

/**
 * Format a successful API response
 * @param {Object} data - Response data
 * @param {string} requestId - Request ID for tracking
 * @param {number} duration - Request duration in milliseconds
 * @param {string} message - Optional success message
 * @returns {Object} Formatted success response
 */
export const formatSuccessResponse = (data, requestId, duration, message = 'Success') => ({
    success: true,
    requestId,
    data,
    message,
    duration,
    timestamp: new Date().toISOString()
});

/**
 * Format a successful response with pagination
 * @param {Array} items - Array of items
 * @param {Object} pagination - Pagination metadata
 * @param {string} requestId - Request ID for tracking
 * @param {number} duration - Request duration in milliseconds
 * @returns {Object} Formatted success response with pagination
 */
export const formatPaginatedResponse = (items, pagination, requestId, duration) => ({
    success: true,
    requestId,
    data: {
        items,
        pagination: {
            limit: pagination.limit,
            page: pagination.page,
            count: items.length,
            total: pagination.total || items.length
        }
    },
    duration,
    timestamp: new Date().toISOString()
});

// ============================================================================
// ERROR RESPONSE FORMATTING
// ============================================================================

/**
 * Format an error response with proper HTTP status codes
 * @param {Error} error - Error object
 * @param {string} requestId - Request ID for tracking
 * @param {number} duration - Request duration in milliseconds
 * @returns {Object} Formatted error response with status code
 */
// eslint-disable-next-line max-lines-per-function
export const formatErrorResponse = (error, requestId, duration = 0) => {
    const baseResponse = {
        success: false,
        requestId,
        duration,
        timestamp: new Date().toISOString()
    };

    // Map error types to HTTP status codes and response formats
    switch (error.name) {
        case 'ValidationError':
            return {
                ...baseResponse,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: error.message,
                    details: error.details || null,
                    field: error.field || null
                },
                statusCode: 400
            };

        case 'NotFoundError':
            return {
                ...baseResponse,
                error: {
                    type: 'NOT_FOUND',
                    message: error.message,
                    resource: error.resource || 'unknown'
                },
                statusCode: 404
            };

        case 'DatabaseError':
            return {
                ...baseResponse,
                error: {
                    type: 'DATABASE_ERROR',
                    message: error.message,
                    operation: error.operation || 'unknown'
                },
                statusCode: 500
            };

        case 'CircuitBreakerOpenError':
            return {
                ...baseResponse,
                error: {
                    type: 'SERVICE_UNAVAILABLE',
                    message: error.message,
                    service: error.service,
                    retryAfter: error.retryAfter
                },
                statusCode: 503
            };

        case 'ProviderUnavailableError':
            return {
                ...baseResponse,
                error: {
                    type: 'PROVIDER_ERROR',
                    message: error.message,
                    provider: error.provider,
                    reason: error.reason
                },
                statusCode: 503
            };

        case 'ImageGenerationTimeoutError':
            return {
                ...baseResponse,
                error: {
                    type: 'TIMEOUT_ERROR',
                    message: error.message,
                    provider: error.provider,
                    timeout: error.timeout
                },
                statusCode: 408
            };

        case 'AuthenticationError':
            return {
                ...baseResponse,
                error: {
                    type: 'AUTHENTICATION_ERROR',
                    message: error.message || 'Authentication required'
                },
                statusCode: 401
            };

        case 'AuthorizationError':
            return {
                ...baseResponse,
                error: {
                    type: 'AUTHORIZATION_ERROR',
                    message: error.message || 'Access denied'
                },
                statusCode: 403
            };

        case 'RateLimitError':
            return {
                ...baseResponse,
                error: {
                    type: 'RATE_LIMIT_EXCEEDED',
                    message: error.message || 'Rate limit exceeded',
                    retryAfter: error.retryAfter
                },
                statusCode: 429
            };

        default:
            // Debug logging for unknown errors
            console.error('🔍 UNKNOWN ERROR DEBUG:', {
                error,
                errorType: typeof error,
                errorKeys: error ? Object.keys(error) : 'null/undefined',
                errorMessage: error?.message,
                errorName: error?.name,
                errorStringified: JSON.stringify(error, null, 2)
            });

            return {
                ...baseResponse,
                error: {
                    type: 'UNKNOWN_ERROR',
                    message: error?.message || 'An unexpected error occurred',
                    name: error?.name || 'Unknown',
                    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
                    debug: process.env.NODE_ENV === 'development'
                        ? {
                            errorType: typeof error,
                            errorKeys: error ? Object.keys(error) : 'null/undefined',
                            errorStringified: JSON.stringify(error, null, 2)
                        }
                        : undefined
                },
                statusCode: 500
            };
    }
};

// ============================================================================
// HEALTH CHECK RESPONSE FORMATTING
// ============================================================================

/**
 * Format a health check response
 * @param {Object} healthData - Health check data
 * @returns {Object} Formatted health response
 */
export const formatHealthResponse = healthData => ({
    success: true,
    data: healthData,
    timestamp: new Date().toISOString()
});

// ============================================================================
// VALIDATION RESPONSE FORMATTING
// ============================================================================

/**
 * Format a validation error response
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} requestId - Request ID for tracking
 * @returns {Object} Formatted validation error response
 */
export const formatValidationErrorResponse = (validationErrors, requestId) => ({
    success: false,
    requestId,
    error: {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: validationErrors
    },
    statusCode: 400,
    timestamp: new Date().toISOString()
});

// ============================================================================
// EXPORTS
// ============================================================================

export default {
    formatSuccessResponse,
    formatPaginatedResponse,
    formatErrorResponse,
    formatHealthResponse,
    formatValidationErrorResponse
};
