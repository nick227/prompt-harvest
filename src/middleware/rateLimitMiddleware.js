/**
 * Rate Limiting Middleware for Password Reset and Authentication Endpoints
 * Prevents abuse and brute force attacks
 */

const resetAttempts = new Map(); // IP -> {count, resetTime}
const loginAttempts = new Map(); // IP -> {count, resetTime, lockoutUntil}

/**
 * Clean up expired entries every hour
 */
setInterval(() => {
    const now = Date.now();

    // Clean reset attempts
    for (const [ip, data] of resetAttempts.entries()) {
        if (now > data.resetTime) {
            resetAttempts.delete(ip);
        }
    }

    // Clean login attempts
    for (const [ip, data] of loginAttempts.entries()) {
        if (now > data.resetTime && (!data.lockoutUntil || now > data.lockoutUntil)) {
            loginAttempts.delete(ip);
        }
    }
}, 3600000); // 1 hour

/**
 * Rate limit password reset requests
 * Allows 5 attempts per hour per IP
 */
export const rateLimitPasswordReset = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    let attempts = resetAttempts.get(ip) || { count: 0, resetTime: now + 3600000 }; // 1 hour window

    // Reset counter if time window has passed
    if (now > attempts.resetTime) {
        attempts = { count: 0, resetTime: now + 3600000 };
    }

    // Check if rate limit exceeded
    if (attempts.count >= 5) {
        const timeRemaining = Math.ceil((attempts.resetTime - now) / 60000); // minutes

        return res.status(429).json({
            success: false,
            message: `Too many password reset attempts. Please try again in ${timeRemaining} minutes.`,
            retryAfter: attempts.resetTime
        });
    }

    // Increment counter
    attempts.count++;
    resetAttempts.set(ip, attempts);

    // Add rate limit info to response headers
    res.set({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': Math.max(0, 5 - attempts.count),
        'X-RateLimit-Reset': new Date(attempts.resetTime).toISOString()
    });

    next();
};

/**
 * Rate limit login attempts with progressive lockout
 * - 5 attempts: 5 minute lockout
 * - 10 attempts: 30 minute lockout
 * - 15+ attempts: 2 hour lockout
 */
export const rateLimitLogin = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    let attempts = loginAttempts.get(ip) || { count: 0, resetTime: now + 3600000, lockoutUntil: null };

    // Reset counter if time window has passed and not locked out
    if (now > attempts.resetTime && (!attempts.lockoutUntil || now > attempts.lockoutUntil)) {
        attempts = { count: 0, resetTime: now + 3600000, lockoutUntil: null };
    }

    // Check if currently locked out
    if (attempts.lockoutUntil && now < attempts.lockoutUntil) {
        const timeRemaining = Math.ceil((attempts.lockoutUntil - now) / 60000); // minutes

        return res.status(429).json({
            success: false,
            message: 'Account temporarily locked due to too many failed login attempts. ' +
                `Please try again in ${timeRemaining} minutes.`,
            retryAfter: attempts.lockoutUntil
        });
    }

    // Store original next function to call after login attempt
    const originalNext = next;

    // Override next to handle failed login attempts
    req.recordFailedLogin = () => {
        attempts.count++;

        // Set progressive lockout periods
        if (attempts.count >= 15) {
            attempts.lockoutUntil = now + 7200000; // 2 hours
        } else if (attempts.count >= 10) {
            attempts.lockoutUntil = now + 1800000; // 30 minutes
        } else if (attempts.count >= 5) {
            attempts.lockoutUntil = now + 300000; // 5 minutes
        }

        loginAttempts.set(ip, attempts);
    };

    // Clear failed attempts on successful login
    req.recordSuccessfulLogin = () => {
        loginAttempts.delete(ip);
    };

    // Add rate limit info to response headers
    res.set({
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': Math.max(0, 5 - attempts.count),
        'X-RateLimit-Reset': new Date(attempts.resetTime).toISOString()
    });

    originalNext();
};

/**
 * Rate limit general API requests
 * Allows 100 requests per 15 minutes per IP
 */
export const rateLimitGeneral = (limit = 100, windowMs = 900000) => {
    const requests = new Map(); // IP -> {count, resetTime}

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        let requestData = requests.get(ip) || { count: 0, resetTime: now + windowMs };

        // Reset counter if time window has passed
        if (now > requestData.resetTime) {
            requestData = { count: 0, resetTime: now + windowMs };
        }

        // Check if rate limit exceeded
        if (requestData.count >= limit) {
            const timeRemaining = Math.ceil((requestData.resetTime - now) / 60000); // minutes

            return res.status(429).json({
                success: false,
                message: `Too many requests. Please try again in ${timeRemaining} minutes.`,
                retryAfter: requestData.resetTime
            });
        }

        // Increment counter
        requestData.count++;
        requests.set(ip, requestData);

        // Add rate limit info to response headers
        res.set({
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': Math.max(0, limit - requestData.count).toString(),
            'X-RateLimit-Reset': new Date(requestData.resetTime).toISOString()
        });

        next();
    };
};

/**
 * Get current rate limit status for an IP
 */
export const getRateLimitStatus = (ip, type = 'general') => {
    const now = Date.now();

    switch (type) {
        case 'reset': {
            const resetData = resetAttempts.get(ip);

            if (!resetData || now > resetData.resetTime) {
                return { remaining: 5, resetTime: null };
            }

            return {
                remaining: Math.max(0, 5 - resetData.count),
                resetTime: resetData.resetTime
            };
        }

        case 'login': {
            const loginData = loginAttempts.get(ip);

            if (!loginData ||
                (now > loginData.resetTime && (!loginData.lockoutUntil || now > loginData.lockoutUntil))) {
                return { remaining: 5, resetTime: null, lockedOut: false };
            }

            return {
                remaining: Math.max(0, 5 - loginData.count),
                resetTime: loginData.resetTime,
                lockedOut: loginData.lockoutUntil && now < loginData.lockoutUntil,
                lockoutUntil: loginData.lockoutUntil
            };
        }

        default:
            return { remaining: 100, resetTime: null };
    }
};
