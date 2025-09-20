/**
 * Validation Middleware
 * Input validation and sanitization
 */

/**
 * Sanitize string input
 */
export const sanitizeString = str => {
    if (typeof str !== 'string') {
        return str;
    }

    return str
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        // eslint-disable-next-line no-control-regex
        .replace(/[\u0000-\u001f\u007f]/g, '') // Remove control characters
        .substring(0, 1000); // Limit length
};

/**
 * Validate request content type
 */
export const validateContentType = (expectedType = 'application/json') => (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'DELETE') {
        const contentType = req.headers['content-type'];

        if (!contentType || !contentType.includes(expectedType)) {
            return res.status(400).json({
                error: `Invalid content type. Expected: ${expectedType}`,
                received: contentType || 'none'
            });
        }
    }
    next();
};

/**
 * Validate request size
 */
export const validateRequestSize = (maxSizeKB = 100) => (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || 0);
    const maxSizeBytes = maxSizeKB * 1024;

    if (contentLength > maxSizeBytes) {
        return res.status(413).json({
            error: 'Request payload too large',
            maxSize: `${maxSizeKB}KB`,
            received: `${Math.round(contentLength / 1024)}KB`
        });
    }
    next();
};

/**
 * Sanitize request body recursively
 */
export const sanitizeRequestBody = (req, res, next) => {
    if (!req.body || typeof req.body !== 'object') {
        return next();
    }

    const sanitize = obj => {
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }

        if (obj && typeof obj === 'object') {
            const sanitized = {};

            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'string') {
                    sanitized[key] = sanitizeString(value);
                } else if (typeof value === 'object') {
                    sanitized[key] = sanitize(value);
                } else {
                    sanitized[key] = value;
                }
            }

            return sanitized;
        }

        return obj;
    };

    req.body = sanitize(req.body);
    next();
};

/**
 * Validate required fields
 */
export const validateRequiredFields = requiredFields => (req, res, next) => {
    const missingFields = [];

    for (const field of requiredFields) {
        if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
            missingFields.push(field);
        }
    }

    if (missingFields.length > 0) {
        return res.status(400).json({
            error: 'Missing required fields',
            missingFields
        });
    }

    next();
};

/**
 * Validate field types
 */
export const validateFieldTypes = fieldTypes => (req, res, next) => {
    const typeErrors = [];

    for (const [field, expectedType] of Object.entries(fieldTypes)) {
        const value = req.body[field];

        if (value !== undefined) {
            const actualType = typeof value;

            if (actualType !== expectedType) {
                typeErrors.push({
                    field,
                    expected: expectedType,
                    actual: actualType
                });
            }
        }
    }

    if (typeErrors.length > 0) {
        return res.status(400).json({
            error: 'Invalid field types',
            typeErrors
        });
    }

    next();
};

/**
 * Validate string length
 */
export const validateStringLength = fieldLimits => (req, res, next) => {
    const lengthErrors = [];

    for (const [field, limits] of Object.entries(fieldLimits)) {
        const value = req.body[field];

        if (typeof value === 'string') {
            const { min = 0, max = Infinity } = limits;

            if (value.length < min || value.length > max) {
                lengthErrors.push({
                    field,
                    length: value.length,
                    min,
                    max
                });
            }
        }
    }

    if (lengthErrors.length > 0) {
        return res.status(400).json({
            error: 'String length validation failed',
            lengthErrors
        });
    }

    next();
};

/**
 * Validate email format
 */
export const validateEmail = (emailField = 'email') => (req, res, next) => {
    const email = req.body[emailField];

    if (email && typeof email === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: `Invalid email format for field: ${emailField}`
            });
        }
    }
    next();
};

/**
 * Validate URL format
 */
export const validateUrl = urlFields => (req, res, next) => {
    const urlErrors = [];

    for (const field of urlFields) {
        const url = req.body[field];

        if (url && typeof url === 'string') {
            try {
                new URL(url);
            } catch (error) {
                urlErrors.push(field);
            }
        }
    }

    if (urlErrors.length > 0) {
        return res.status(400).json({
            error: 'Invalid URL format',
            invalidFields: urlErrors
        });
    }

    next();
};
