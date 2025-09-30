/**
 * Type Sanitization Utilities
 *
 * Ensures proper type conversion and prevents string/boolean confusion
 */

/**
 * Sanitize boolean values from request data
 */
export function sanitizeBoolean(value, defaultValue = false) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const lower = value.toLowerCase();

        if (lower === 'true' || lower === '1' || lower === 'yes') {
            return true;
        }
        if (lower === 'false' || lower === '0' || lower === 'no' || lower === '') {
            return false;
        }
    }
    if (typeof value === 'number') {
        return value !== 0;
    }

    return defaultValue;
}

/**
 * Sanitize all boolean fields in an object
 */
export function sanitizeBooleanFields(obj, booleanFields = []) {
    const sanitized = { ...obj };

    for (const field of booleanFields) {
        if (field in sanitized) {
            sanitized[field] = sanitizeBoolean(sanitized[field]);
        }
    }

    return sanitized;
}

/**
 * Sanitize prompt options with proper boolean handling
 */
export function sanitizePromptOptions(options) {
    const booleanFields = [
        'mixup', 'mashup', 'autoPublic', 'autoEnhance'
    ];

    const sanitized = sanitizeBooleanFields(options, booleanFields);

    // Handle promptHelpers object separately
    if (options.promptHelpers && typeof options.promptHelpers === 'object') {
        sanitized.promptHelpers = {};
        Object.entries(options.promptHelpers).forEach(([key, value]) => {
            sanitized.promptHelpers[key] = sanitizeBoolean(value);
        });
    }

    return sanitized;
}

/**
 * Deep clone object to prevent mutation
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Create a safe copy for logging
 */
export function createLogSafeCopy(obj) {
    try {
        return deepClone(obj);
    } catch (error) {
        // Fallback for circular references
        return {
            _error: 'Could not clone object',
            _type: typeof obj,
            _keys: Object.keys(obj || {})
        };
    }
}
