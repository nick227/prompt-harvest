/**
 * MVPRateLimit - Practical rate limiting for MVP
 *
 * Essential rate limiting without over-engineering.
 */

const rateLimitStore = new Map();

export const mvpRateLimit = (windowMs = 60000, maxRequests = 10) => (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitStore.has(key)) {
        rateLimitStore.set(key, {
            requests: 1,
            resetTime: now + windowMs
        });
    } else {
        const userData = rateLimitStore.get(key);

        if (now > userData.resetTime) {
            // Reset window
            userData.requests = 1;
            userData.resetTime = now + windowMs;
        } else {
            userData.requests++;

            if (userData.requests > maxRequests) {
                return res.status(429).json({
                    error: 'Too Many Requests',
                    message: 'Rate limit exceeded. Please try again later.',
                    retryAfter: Math.ceil((userData.resetTime - now) / 1000)
                });
            }
        }
    }

    next();
};

// MVP-specific rate limits
export const imageGenerationRateLimit = mvpRateLimit(60000, 5); // 5 requests per minute
export const apiRateLimit = mvpRateLimit(60000, 20); // 20 requests per minute
export const authRateLimit = mvpRateLimit(300000, 5); // 5 requests per 5 minutes

export const clearRateLimit = (ip) => {
    if (ip) {
        rateLimitStore.delete(ip);
    } else {
        rateLimitStore.clear();
    }
};
