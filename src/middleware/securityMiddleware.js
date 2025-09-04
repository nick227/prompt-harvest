/**
 * Enhanced Security Middleware
 * Comprehensive security measures for API routes
 */

// Simple rate limiting implementation
const rateLimitStore = new Map();

/**
 * Simple rate limiter implementation
 */
const createRateLimit = (windowMs, maxRequests, message) => (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    // Clean up old entries
    for (const [storeKey, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > windowMs) {
            rateLimitStore.delete(storeKey);
        }
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

        return res.status(429).json({
            error: message.error,
            retryAfter
        });
    }

    // Increment count
    limitData.count++;
    rateLimitStore.set(key, limitData);

    next();
};

/**
 * General API rate limiter
 */
export const generalRateLimit = createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests
    { error: 'Too many requests from this IP, please try again later.' }
);

/**
 * Strict rate limiter for sensitive operations
 */
export const strictRateLimit = createRateLimit(
    60 * 1000, // 1 minute
    5, // 5 requests
    { error: 'Too many attempts for this operation, please wait a minute.' }
);

/**
 * Payment operation rate limiter
 */
export const paymentRateLimit = createRateLimit(
    5 * 60 * 1000, // 5 minutes
    3, // 3 requests
    { error: 'Too many payment attempts, please wait 5 minutes.' }
);

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
 * Sanitize request body
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
 * Security headers middleware
 */
export const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (basic)
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.tailwindcss.com; style-src 'self' 'unsafe-inline' cdn.tailwindcss.com");

    next();
};

/**
 * API key validation (for future use)
 */
export const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];

    // For now, just log the presence of API key
    if (apiKey) {
        console.log('🔑 API key provided in request');
    }

    next();
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    const userAgent = req.headers['user-agent'] || 'unknown';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Log request
    console.log(`🌐 ${req.method} ${req.path} - IP: ${ip.substring(0, 15)} - UA: ${userAgent.substring(0, 50)}`);

    // Log response
    const originalSend = res.send;

    res.send = function(body) {
        const duration = Date.now() - start;

        console.log(`📡 ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
        originalSend.call(this, body);
    };

    next();
};

/**
 * Error handling for security middleware
 */
export const securityErrorHandler = (error, req, res, next) => {
    // Rate limit errors
    if (error.code === 'RATE_LIMIT_EXCEEDED') {
        return res.status(429).json({
            error: 'Rate limit exceeded',
            retryAfter: error.retryAfter
        });
    }

    // Other security errors
    if (error.type === 'security') {
        return res.status(400).json({
            error: 'Security validation failed',
            message: error.message
        });
    }

    next(error);
};

/**
 * Admin route protection
 */
export const requireAdmin = (req, res, next) => {
    const userId = req.session?.userId;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // TODO: Check if user is admin
    // For now, just proceed
    next();
};
