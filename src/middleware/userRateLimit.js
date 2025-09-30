/**
 * Per-User Rate Limiting Middleware
 *
 * Handles rate limiting per authenticated user
 * Should be applied before requests reach the queue system
 */

import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Create per-user rate limiter for image generation
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
export const createUserRateLimit = (options = {}) => {
    const {
        windowMs = 60000,           // 1 minute window
        maxRequests = 10,           // 10 requests per user per minute
        message = 'Too many image generation requests. Please try again later.',
        skipSuccessfulRequests = false, // Count successful requests
        skipFailedRequests = true   // Don't count failed requests
    } = options;

    return rateLimit({
        windowMs,
        max: maxRequests,
        message: {
            error: message,
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,      // Return rate limit info in headers
        legacyHeaders: false,       // Disable X-RateLimit-* headers
        keyGenerator: req =>
            // Use user ID for authenticated users, IP for anonymous
            req.user?.id || ipKeyGenerator(req),
        skip: req =>
            // Skip rate limiting for admin users
            req.user?.isAdmin === true,
        skipSuccessfulRequests,
        skipFailedRequests,
        handler: (req, res) => {
            const retryAfter = Math.ceil(windowMs / 1000);

            res.status(429).json({
                error: message,
                retryAfter,
                limit: maxRequests,
                windowMs
            });
        }
    });
};

/**
 * Default per-user rate limiter for image generation
 * Very generous limit - only protects against obvious attacks/accidents
 */
export const userImageGenerationRateLimit = createUserRateLimit({
    windowMs: 60000,               // 1 minute
    maxRequests: 120,              // 120 requests per user per minute (2 per second)
    message: 'Rate limit exceeded. Please slow down your requests.'
});

/**
 * No rate limiting - for when you want to allow unlimited requests
 * Only use this if you have other protection mechanisms
 */
export const noRateLimit = (req, res, next) => {
    // No rate limiting applied - pass through
    next();
};

/**
 * Stricter rate limiter for heavy operations
 */
export const userHeavyOperationRateLimit = createUserRateLimit({
    windowMs: 300000,              // 5 minutes
    maxRequests: 5,                // 5 requests per user per 5 minutes
    message: 'Too many heavy operations. Please wait before trying again.'
});

/**
 * Lenient rate limiter for lightweight operations
 */
export const userLightOperationRateLimit = createUserRateLimit({
    windowMs: 60000,               // 1 minute
    maxRequests: 30,               // 30 requests per user per minute
    message: 'Too many requests. Please slow down.'
});

export default {
    createUserRateLimit,
    userImageGenerationRateLimit,
    userHeavyOperationRateLimit,
    userLightOperationRateLimit,
    noRateLimit
};
