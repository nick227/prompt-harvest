/**
 * Security Helpers
 *
 * Security utilities for safe logging and credential protection
 */

/**
 * Get safe error data for logging (prevents binary dumps)
 * @param {*} responseData - Response data to sanitize
 * @returns {string} Safe string representation
 */
export const getSafeErrorData = responseData => {
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
export const maskSensitiveHeaders = error => {
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
export const truncateErrorMessage = (message, maxLength = 500) => {
    if (!message || typeof message !== 'string') {
        return String(message || 'Unknown error');
    }

    if (message.length <= maxLength) {
        return message;
    }

    return `${message.substring(0, maxLength)}... (truncated ${message.length - maxLength} chars)`;
};

/**
 * Safe ArrayBuffer/Buffer to base64 conversion
 * Handles different buffer types returned by axios/node
 * @param {ArrayBuffer|Buffer|Uint8Array} data - Data to convert
 * @returns {string} Base64 string
 */
export const arrayBufferToBase64 = data => {
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

export default {
    getSafeErrorData,
    maskSensitiveHeaders,
    truncateErrorMessage,
    arrayBufferToBase64
};

