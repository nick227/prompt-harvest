/**
 * Rate Limiting Middleware
 * Provides proper rate limiting for various endpoints
 */

import databaseClient from '../database/PrismaClient.js';

// In-memory store for rate limiting (can be replaced with Redis in production)
const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
    const now = Date.now();

    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.lastAttempt > data.windowMs) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiting middleware
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.maxRequests - Maximum requests per window
 * @param {string} options.message - Error message when limit exceeded
 * @param {Function} options.keyGenerator - Function to generate rate limit key
 * @returns {Function} Express middleware
 */
export const createRateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes default
        maxRequests = 100, // 100 requests default
        message = 'Too many requests, please try again later',
        keyGenerator = req => `rate_limit_${req.ip || 'unknown'}`
    } = options;

    return async (req, res, next) => {
        try {
            const key = keyGenerator(req);
            const now = Date.now();

            // Get or create rate limit data
            let rateLimitData = rateLimitStore.get(key);

            if (!rateLimitData) {
                rateLimitData = {
                    count: 0,
                    firstAttempt: now,
                    lastAttempt: now,
                    windowMs
                };
                rateLimitStore.set(key, rateLimitData);
            }

            // Reset window if expired
            if (now - rateLimitData.firstAttempt > windowMs) {
                rateLimitData.count = 0;
                rateLimitData.firstAttempt = now;
            }

            // Check if limit exceeded
            if (rateLimitData.count >= maxRequests) {
                const resetTime = new Date(rateLimitData.firstAttempt + windowMs);

                return res.status(429).json({
                    error: message,
                    retryAfter: Math.ceil((rateLimitData.firstAttempt + windowMs - now) / 1000),
                    resetTime: resetTime.toISOString()
                });
            }

            // Increment counter
            rateLimitData.count++;
            rateLimitData.lastAttempt = now;

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': maxRequests,
                'X-RateLimit-Remaining': Math.max(0, maxRequests - rateLimitData.count),
                'X-RateLimit-Reset': new Date(rateLimitData.firstAttempt + windowMs).toISOString()
            });

            next();
        } catch (error) {
            console.error('❌ Rate limiting error:', error);
            // Don't block requests if rate limiting fails
            next();
        }
    };
};

/**
 * User-specific rate limiting (uses user ID instead of IP)
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware
 */
export const createUserRateLimit = (options = {}) => createRateLimit({
    ...options,
    keyGenerator: req => `user_rate_limit_${req.user?.id || req.ip || 'anonymous'}`
});

/**
 * Checkout-specific rate limiting (stricter limits for payment operations)
 */
export const checkoutRateLimit = createUserRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3, // 3 checkout attempts per minute
    message: 'Too many checkout attempts. Please wait a minute before trying again.'
});

/**
 * Promo code redemption rate limiting
 */
export const promoRedemptionRateLimit = createUserRateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5, // 5 promo redemptions per minute
    message: 'Too many promo code redemption attempts. Please wait a minute before trying again.'
});

/**
 * Image generation rate limiting
 */
export const imageGenerationRateLimit = createUserRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 50, // 50 generations per 15 minutes
    message: 'Image generation rate limit exceeded. Please wait before generating more images.'
});

/**
 * General API rate limiting
 */
export const generalRateLimit = createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'API rate limit exceeded. Please slow down your requests.'
});

export default {
    createRateLimit,
    createUserRateLimit,
    checkoutRateLimit,
    promoRedemptionRateLimit,
    imageGenerationRateLimit,
    generalRateLimit
};
