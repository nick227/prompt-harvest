/**
 * Rate Limiting Middleware
 *
 * Per-route rate limits to prevent abuse
 */

import rateLimit from 'express-rate-limit';

/**
 * Auth routes (login, register, password reset)
 * Tight limits to prevent brute force
 */
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false
});

/**
 * Upload routes (avatars, images)
 * Moderate limits to prevent spam
 */
export const uploadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per window
    message: { error: 'Too many uploads, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Webhook routes (Stripe, external)
 * Generous limits but still protected
 */
export const webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 webhooks per minute
    message: { error: 'Webhook rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: req => {
        // Skip rate limiting if signature verified (Stripe)
        // Actual verification happens in route handler
        return false; // Apply limit to all initially
    }
});

/**
 * General API routes
 * Standard limits for normal usage
 */
export const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * CSRF token endpoint
 * Tight limit since only needed once per session
 */
export const csrfTokenRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 token requests per window
    message: { error: 'Too many token requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Promo code redemption
 * Very tight limits to prevent abuse
 */
export const promoRedemptionRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 redemptions per hour
    message: { error: 'Too many promo code attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Checkout session creation
 * Moderate limits to prevent payment abuse
 */
export const checkoutRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 checkout attempts per window
    message: { error: 'Too many checkout attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});
