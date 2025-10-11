/**
 * Validation Helpers
 *
 * Parameter and payload validation utilities
 */

import { getModelConfig } from '../core/ConfigCache.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PAYLOAD_SIZE = 20 * 1024 * 1024; // 20MB (supports up to 2048x2048 PNG base64)

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate image generation parameters
 * @param {string} prompt - Image generation prompt
 * @param {number} guidance - Guidance value (optional)
 * @param {string} providerKey - Provider key (model config name in DB)
 * @returns {Object} Validation result
 */
export const validateImageParams = async (prompt, guidance, providerKey) => {
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
 * Validate provider configuration has required fields
 * @param {Object} config - Provider configuration
 * @returns {Object} Validation result
 */
export const validateProviderConfig = config => {
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
 * Validate payload size for raw data
 * @param {*} data - Data to check
 * @throws {Error} If payload exceeds limit
 */
export const validatePayloadSize = data => {
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
export const validateBase64Size = base64String => {
    // Base64 is ~33% larger than raw, so check estimated size
    const estimatedSize = (base64String.length * 3) / 4;

    if (estimatedSize > MAX_PAYLOAD_SIZE) {
        throw new Error(`Base64 payload too large: ~${Math.round(estimatedSize)} bytes (max ${MAX_PAYLOAD_SIZE})`);
    }
};

export { MAX_PAYLOAD_SIZE };

export default {
    validateImageParams,
    validateProviderConfig,
    validatePayloadSize,
    validateBase64Size,
    MAX_PAYLOAD_SIZE
};

