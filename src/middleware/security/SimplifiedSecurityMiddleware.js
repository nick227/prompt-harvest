/**
 * Simplified Security Middleware
 * Clean orchestration of focused security modules
 */

import {
    generalRateLimit,
    strictRateLimit,
    paymentRateLimit
} from './RateLimitMiddleware.js';

import {
    validateContentType,
    validateRequestSize,
    sanitizeRequestBody,
    validateRequiredFields,
    validateFieldTypes,
    validateStringLength,
    validateEmail,
    validateUrl
} from './ValidationMiddleware.js';

import {
    securityHeaders,
    apiSecurityHeaders,
    contentSecurityPolicy,
    comprehensiveSecurityHeaders
} from './SecurityHeadersMiddleware.js';

// ===== RATE LIMITING =====
export {
    generalRateLimit,
    strictRateLimit,
    paymentRateLimit
};

// ===== VALIDATION =====
export {
    validateContentType,
    validateRequestSize,
    sanitizeRequestBody,
    validateRequiredFields,
    validateFieldTypes,
    validateStringLength,
    validateEmail,
    validateUrl
};

// ===== SECURITY HEADERS =====
export {
    securityHeaders,
    apiSecurityHeaders,
    contentSecurityPolicy,
    comprehensiveSecurityHeaders
};

// ===== COMBINED MIDDLEWARE STACKS =====

/**
 * Basic API security stack
 */
export const basicApiSecurity = [
    apiSecurityHeaders,
    generalRateLimit,
    validateRequestSize(50), // 50KB max
    sanitizeRequestBody
];

/**
 * Strict API security stack (for sensitive operations)
 */
export const strictApiSecurity = [
    apiSecurityHeaders,
    strictRateLimit,
    validateRequestSize(10), // 10KB max
    validateContentType('application/json'),
    sanitizeRequestBody
];

/**
 * Payment API security stack
 */
export const paymentApiSecurity = [
    apiSecurityHeaders,
    paymentRateLimit,
    validateRequestSize(5), // 5KB max
    validateContentType('application/json'),
    sanitizeRequestBody
];

/**
 * Public API security stack (for unauthenticated endpoints)
 */
export const publicApiSecurity = [
    securityHeaders,
    generalRateLimit,
    validateRequestSize(100), // 100KB max
    sanitizeRequestBody
];

/**
 * Create custom validation stack
 */
export const createValidationStack = (options = {}) => {
    const {
        requiredFields = [],
        fieldTypes = {},
        stringLimits = {},
        emailFields = [],
        urlFields = []
    } = options;

    const stack = [];

    if (requiredFields.length > 0) {
        stack.push(validateRequiredFields(requiredFields));
    }

    if (Object.keys(fieldTypes).length > 0) {
        stack.push(validateFieldTypes(fieldTypes));
    }

    if (Object.keys(stringLimits).length > 0) {
        stack.push(validateStringLength(stringLimits));
    }

    if (emailFields.length > 0) {
        emailFields.forEach(field => {
            stack.push(validateEmail(field));
        });
    }

    if (urlFields.length > 0) {
        stack.push(validateUrl(urlFields));
    }

    return stack;
};

/**
 * Apply middleware stack to router
 */
export const applySecurityStack = (router, stack) => {
    stack.forEach(middleware => {
        router.use(middleware);
    });

    return router;
};
