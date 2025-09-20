import configManager from '../config/ConfigManager.js';

const rateLimitStore = new Map();

export const rateLimit = (windowMs = null, maxRequests = null) => (req, res, next) => {
    const config = configManager.rateLimit;
    const actualWindowMs = windowMs || config.windowMs;
    const actualMaxRequests = maxRequests || config.maxRequests;
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
            userData.resetTime = now + actualWindowMs;
        } else {
            userData.requests++;

            if (userData.requests > actualMaxRequests) {
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

export const imageGenerationRateLimit = rateLimit(
    configManager.rateLimit.imageGenerationWindowMs,
    configManager.rateLimit.imageGenerationMaxRequests
);
export const apiRateLimit = rateLimit();
export const authRateLimit = rateLimit(
    configManager.rateLimit.authWindowMs,
    configManager.rateLimit.authMaxRequests
);

export const clearRateLimit = ip => {
    if (ip) {
        rateLimitStore.delete(ip);
    } else {
        rateLimitStore.clear();
    }
};
