/**
 * Rate Limit Middleware
 * Simple, focused rate limiting implementation
 */

// Simple rate limiting store
const rateLimitStore = new Map();

/**
 * Create rate limiter with specified parameters
 */
// eslint-disable-next-line max-statements
const createRateLimit = (windowMs, maxRequests, message) => (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
        cleanupOldEntries(windowMs);
    }

    // Get or create rate limit data
    let limitData = rateLimitStore.get(key);

    if (!limitData || now - limitData.resetTime > windowMs) {
        limitData = {
            count: 0,
            resetTime: now
        };
    }

    // Check if limit exceeded
    if (limitData.count >= maxRequests) {
        const retryAfter = Math.ceil((limitData.resetTime + windowMs - now) / 1000);

        res.setHeader('Retry-After', retryAfter);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime + windowMs).toISOString());

        return res.status(429).json({
            error: message.error,
            retryAfter
        });
    }

    // Increment count and set headers
    limitData.count++;
    rateLimitStore.set(key, limitData);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - limitData.count));
    res.setHeader('X-RateLimit-Reset', new Date(limitData.resetTime + windowMs).toISOString());

    next();
};

/**
 * Clean up old rate limit entries
 */
const cleanupOldEntries = windowMs => {
    const now = Date.now();

    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > windowMs) {
            rateLimitStore.delete(key);
        }
    }
};

/**
 * General API rate limiter (15 minutes, 100 requests)
 */
export const generalRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    { error: 'Too many requests from this IP, please try again later.' }
);

/**
 * Strict rate limiter for sensitive operations (1 minute, 5 requests)
 */
export const strictRateLimit = createRateLimit(
    60 * 1000, // 1 minute
    5, // 5 requests
    { error: 'Too many attempts for this operation, please wait a minute.' }
);

/**
 * Payment operation rate limiter (1 minute, 10 requests)
 * More lenient for development and testing
 */
export const paymentRateLimit = createRateLimit(
    1 * 60 * 1000, // 1 minute
    10, // 10 requests
    { error: 'Too many payment attempts, please wait 1 minute.' }
);

/**
 * Get rate limit statistics (admin function)
 */
export const getRateLimitStats = () => ({
    totalEntries: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, data]) => ({
        key,
        count: data.count,
        resetTime: new Date(data.resetTime).toISOString()
    }))
});

/**
 * Clear rate limit cache (admin function)
 */
export const clearRateLimitCache = () => {
    rateLimitStore.clear();
    console.log('🛡️ RATE-LIMIT: Cache cleared');
};
