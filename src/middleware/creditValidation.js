/**
 * Credit system validation middleware
 */

/**
 * Validate promo code redemption request
 */
export const validatePromoRedemption = (req, res, next) => {
    const { promoCode } = req.body;

    // Check if promoCode is provided
    if (!promoCode) {
        return res.status(400).json({
            error: 'Promo code is required',
            success: false
        });
    }

    // Check if promoCode is a string
    if (typeof promoCode !== 'string') {
        return res.status(400).json({
            error: 'Promo code must be a string',
            success: false
        });
    }

    // Check length
    if (promoCode.trim().length < 3 || promoCode.trim().length > 50) {
        return res.status(400).json({
            error: 'Promo code must be between 3 and 50 characters',
            success: false
        });
    }

    // Sanitize the promo code
    req.body.promoCode = promoCode.trim().toUpperCase();

    next();
};

/**
 * Validate purchase request
 */
export const validatePurchaseRequest = (req, res, next) => {
    const { packageId, successUrl, cancelUrl } = req.body;

    // Check required fields
    if (!packageId || !successUrl || !cancelUrl) {
        return res.status(400).json({
            error: 'packageId, successUrl, and cancelUrl are required',
            success: false
        });
    }

    // Validate package ID format
    if (typeof packageId !== 'string' || !(/^[a-zA-Z0-9_-]+$/).test(packageId)) {
        return res.status(400).json({
            error: 'Invalid package ID format',
            success: false
        });
    }

    // Validate URLs
    try {
        new URL(successUrl);
        new URL(cancelUrl);
    } catch (error) {
        return res.status(400).json({
            error: 'Invalid URL format for successUrl or cancelUrl',
            success: false
        });
    }

    next();
};

/**
 * Validate credit check request
 */
export const validateCreditCheck = (req, res, next) => {
    const { provider, multiplier, mixup, mashup } = req.query;

    // Provider validation (optional)
    if (provider && typeof provider !== 'string') {
        return res.status(400).json({
            error: 'Provider must be a string',
            success: false
        });
    }

    // Boolean parameter validation
    const booleanParams = { multiplier, mixup, mashup };

    for (const [key, value] of Object.entries(booleanParams)) {
        if (value !== undefined && value !== 'true' && value !== 'false') {
            return res.status(400).json({
                error: `${key} must be 'true' or 'false'`,
                success: false
            });
        }
    }

    next();
};

/**
 * Rate limiting for promo code attempts
 */
const promoAttempts = new Map();
const PROMO_RATE_LIMIT = 5; // 5 attempts per minute
const PROMO_WINDOW = 60 * 1000; // 1 minute

export const rateLimitPromoRedemption = (req, res, next) => {
    const userId = req.session?.userId;

    if (!userId) {
        return next(); // Will be handled by auth middleware
    }

    const now = Date.now();
    const userAttempts = promoAttempts.get(userId) || { count: 0, resetTime: now + PROMO_WINDOW };

    // Reset if window has passed
    if (now > userAttempts.resetTime) {
        userAttempts.count = 0;
        userAttempts.resetTime = now + PROMO_WINDOW;
    }

    // Check rate limit
    if (userAttempts.count >= PROMO_RATE_LIMIT) {
        return res.status(429).json({
            error: 'Too many promo code attempts. Please wait a minute.',
            success: false,
            retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000)
        });
    }

    // Increment attempt count
    userAttempts.count++;
    promoAttempts.set(userId, userAttempts);

    next();
};

/**
 * Validate session ID parameter
 */
export const validateSessionId = (req, res, next) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        return res.status(400).json({
            error: 'Session ID is required',
            success: false
        });
    }

    // Validate Stripe session ID format
    if (typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
        return res.status(400).json({
            error: 'Invalid session ID format',
            success: false
        });
    }

    next();
};

/**
 * Validate query parameters for pagination
 */
export const validatePagination = (req, res, next) => {
    const { limit } = req.query;

    if (limit !== undefined) {
        const limitNum = parseInt(limit);

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return res.status(400).json({
                error: 'Limit must be a number between 1 and 100',
                success: false
            });
        }
        req.query.limit = limitNum;
    }

    next();
};
