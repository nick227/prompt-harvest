/**
 * FeedUtils
 *
 * Utility functions for the feed system including:
 * - ID generation
 * - File system operations
 * - Common validation functions
 * - Error handling utilities
 *
 * This module provides shared utility functions used across
 * the feed system components.
 */

import { fileSystemManager } from './FileSystemManager.js';

// ============================================================================
// ID GENERATION
// ============================================================================

/**
 * Generate a random ID for tracking requests
 * @returns {string} Random ID
 */
const generateId = () => Math.random().toString(36).substr(2, 9);

/**
 * Generate a unique request ID with timestamp
 * @returns {string} Unique request ID
 */
const generateRequestId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);

    return `req_${timestamp}_${random}`;
};

// ============================================================================
// FILE SYSTEM OPERATIONS
// ============================================================================

/**
 * Save image data to file system
 * @param {string} imageData - Base64 image data
 * @param {string} filename - Filename to save as
 * @returns {Promise<string>} File path
 */
const saveImageToFileSystem = async(imageData, filename) => {
    try {
        console.log('💾 Saving image to file system:', filename);

        const filePath = await fileSystemManager.saveImage(imageData, filename);

        console.log('✅ Image saved to file system:', filePath);

        return filePath;
    } catch (error) {
        console.error('❌ Error saving image to file system:', error);
        throw new Error(`File system save failed: ${error.message}`);
    }
};

/**
 * Get image from file system
 * @param {string} filePath - File path
 * @returns {Promise<Buffer>} Image data
 */
const getImageFromFileSystem = async filePath => {
    try {
        console.log('📁 Reading image from file system:', filePath);

        const imageData = await fileSystemManager.getImage(filePath);

        console.log('✅ Image read from file system');

        return imageData;
    } catch (error) {
        console.error('❌ Error reading image from file system:', error);
        throw new Error(`File system read failed: ${error.message}`);
    }
};

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * Validate image generation parameters
 * @param {Object} params - Parameters to validate
 * @param {string} params.prompt - Image generation prompt
 * @param {Array} params.providers - Provider names
 * @param {number} params.guidance - Guidance value
 * @returns {Object} Validation result
 */
const validateImageGenerationParams = params => {
    const errors = [];

    if (!params.prompt || typeof params.prompt !== 'string') {
        errors.push('Invalid prompt');
    }

    if (!Array.isArray(params.providers) || params.providers.length === 0) {
        errors.push('Invalid providers array');
    }

    if (typeof params.guidance !== 'number' || params.guidance < 0 || params.guidance > 20) {
        errors.push('Invalid guidance value (must be 0-20)');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Validate prompt processing parameters
 * @param {Object} params - Parameters to validate
 * @param {string} params.prompt - Prompt to process
 * @param {string} params.multiplier - Multiplier (optional)
 * @param {boolean} params.mixup - Mixup flag (optional)
 * @param {boolean} params.mashup - Mashup flag (optional)
 * @returns {Object} Validation result
 */
const validatePromptProcessingParams = params => {
    const errors = [];

    if (!params.prompt || typeof params.prompt !== 'string') {
        errors.push('Invalid prompt');
    }

    if (params.multiplier && typeof params.multiplier !== 'string') {
        errors.push('Invalid multiplier type');
    }

    if (params.mixup && typeof params.mixup !== 'boolean') {
        errors.push('Invalid mixup type');
    }

    if (params.mashup && typeof params.mashup !== 'boolean') {
        errors.push('Invalid mashup type');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Create a standardized error response
 * @param {string} message - Error message
 * @param {string} type - Error type
 * @param {Object} details - Additional error details
 * @returns {Object} Standardized error response
 */
const createErrorResponse = (message, type = 'UNKNOWN_ERROR', details = {}) => ({
    error: true,
    message,
    type,
    details,
    timestamp: new Date().toISOString()
});

/**
 * Handle and log errors with context
 * @param {Error} error - Error object
 * @param {string} context - Error context
 * @param {Object} additionalInfo - Additional information
 * @returns {Object} Processed error response
 */
const handleError = (error, context, additionalInfo = {}) => {
    const errorMessage = error?.message || 'Unknown error occurred';
    const errorType = error?.constructor?.name || 'Unknown';
    const errorStack = error?.stack || 'No stack trace available';

    console.error(`❌ ${context}:`, {
        message: errorMessage,
        type: errorType,
        stack: errorStack,
        ...additionalInfo
    });

    return createErrorResponse(errorMessage, errorType, {
        context,
        stack: errorStack,
        ...additionalInfo
    });
};

/**
 * Safe error message extraction
 * @param {Error} error - Error object
 * @returns {string} Safe error message
 */
const getSafeErrorMessage = error => {
    if (!error) {
        return 'Unknown error occurred';
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error.message) {
        return error.message;
    }
    if (error.toString) {
        return error.toString();
    }

    return 'Unknown error occurred';
};

// ============================================================================
// RESPONSE FORMATTING
// ============================================================================

/**
 * Create a standardized success response
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Object} Standardized success response
 */
const createSuccessResponse = (data, message = 'Success') => ({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
});

/**
 * Format image generation response
 * @param {Object} result - Generation result
 * @param {string} requestId - Request ID
 * @returns {Object} Formatted response
 */
const formatImageGenerationResponse = (result, requestId) => {
    if (result.error) {
        return createErrorResponse(result.error, 'GENERATION_ERROR', {
            requestId,
            details: result.details
        });
    }

    return createSuccessResponse({
        imageData: result,
        requestId
    }, 'Image generated successfully');
};

// ============================================================================
// LOGGING UTILITIES
// ============================================================================

/**
 * Log request start
 * @param {string} requestId - Request ID
 * @param {Object} params - Request parameters
 */
const logRequestStart = (requestId, params) => {
    console.log(`🚀 Request started [${requestId}]:`, {
        prompt: `${params.prompt?.substring(0, 50)}...`,
        providers: params.providers,
        guidance: params.guidance,
        userId: params.userId || 'anonymous'
    });
};

/**
 * Log request completion
 * @param {string} requestId - Request ID
 * @param {number} duration - Request duration in ms
 * @param {boolean} success - Whether request was successful
 */
const logRequestCompletion = (requestId, duration, success) => {
    const status = success ? '✅' : '❌';
    const message = success ? 'completed' : 'failed';

    console.log(`${status} Request ${message} [${requestId}] after ${duration}ms`);
};

/**
 * Log request error
 * @param {string} requestId - Request ID
 * @param {Error} error - Error object
 * @param {number} duration - Request duration in ms
 */
const logRequestError = (requestId, error, duration) => {
    console.error(`❌ Request failed [${requestId}] after ${duration}ms:`, {
        error: getSafeErrorMessage(error),
        type: error?.constructor?.name || 'Unknown',
        stack: error?.stack || 'No stack trace available'
    });
};

// ============================================================================
// EXPORTS
// ============================================================================

export {
    // ID generation
    generateId,
    generateRequestId,

    // File system operations
    saveImageToFileSystem,
    getImageFromFileSystem,

    // Validation
    validateImageGenerationParams,
    validatePromptProcessingParams,

    // Error handling
    createErrorResponse,
    handleError,
    getSafeErrorMessage,

    // Response formatting
    createSuccessResponse,
    formatImageGenerationResponse,

    // Logging
    logRequestStart,
    logRequestCompletion,
    logRequestError
};

export default {
    generateId,
    generateRequestId,
    saveImageToFileSystem,
    getImageFromFileSystem,
    validateImageGenerationParams,
    validatePromptProcessingParams,
    createErrorResponse,
    handleError,
    getSafeErrorMessage,
    createSuccessResponse,
    formatImageGenerationResponse,
    logRequestStart,
    logRequestCompletion,
    logRequestError
};
