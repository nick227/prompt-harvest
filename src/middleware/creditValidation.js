/**
 * Credit Validation Middleware
 * Validates user has sufficient credits before image generation
 */

import SimplifiedCreditService from '../services/credit/SimplifiedCreditService.js';

/**
 * Middleware to require credits for image generation
 * @param {Function} costCalculator - Function to calculate required credits
 * @returns {Function} Express middleware
 */
export const requireCredits = costCalculator => async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
        }

        // Calculate required credits based on providers
        const providers = req.body.providers || [];
        const requiredCredits = costCalculator(providers);

        if (requiredCredits <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid provider selection',
                code: 'INVALID_PROVIDERS'
            });
        }

        // Check if user has sufficient credits
        const hasCredits = await SimplifiedCreditService.hasCredits(userId, requiredCredits);

        if (!hasCredits) {
            const currentBalance = await SimplifiedCreditService.getBalance(userId);

            return res.status(402).json({
                success: false,
                error: 'Insufficient credits',
                code: 'INSUFFICIENT_CREDITS',
                data: {
                    required: requiredCredits,
                    current: currentBalance,
                    shortfall: requiredCredits - currentBalance
                }
            });
        }

        // Store required credits for later deduction
        req.requiredCredits = requiredCredits;
        req.providers = providers;

        next();
    } catch (error) {
        console.error('❌ Credit validation error:', error);
        res.status(500).json({
            success: false,
            error: 'Credit validation failed',
            code: 'VALIDATION_ERROR'
        });
    }
};

/**
 * Default cost calculator using SimplifiedCreditService
 * @param {Array} providers - Array of provider names
 * @returns {number} Total credits required
 */
export const calculateGenerationCost = providers => {
    if (!Array.isArray(providers) || providers.length === 0) {
        return 0;
    }

    // Use the first provider for cost calculation
    // In the future, we could support multi-provider generation
    const [primaryProvider] = providers;

    return SimplifiedCreditService.getCreditCost(primaryProvider);
};

/**
 * Pre-configured middleware for image generation
 */
export const requireImageGenerationCredits = requireCredits(calculateGenerationCost);

/**
 * Validate credit check request
 */
export const validateCreditCheck = (req, res, next) => {
    const { providers } = req.query;

    if (!providers) {
        return res.status(400).json({
            error: 'Missing providers',
            message: 'Providers parameter is required'
        });
    }

    if (typeof providers !== 'string' || providers.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid providers',
            message: 'Providers must be a non-empty string'
        });
    }

    next();
};

/**
 * Validate promo code redemption request
 */
export const validatePromoRedemption = (req, res, next) => {
    const { promoCode } = req.body;

    if (!promoCode) {
        return res.status(400).json({
            error: 'Missing promo code',
            message: 'Promo code is required'
        });
    }

    if (typeof promoCode !== 'string' || promoCode.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid promo code',
            message: 'Promo code must be a non-empty string'
        });
    }

    if (promoCode.length > 50) {
        return res.status(400).json({
            error: 'Promo code too long',
            message: 'Promo code must be 50 characters or less'
        });
    }

    next();
};

/**
 * Validate purchase request
 */
export const validatePurchaseRequest = async (req, res, next) => {
    const { packageId, successUrl, cancelUrl } = req.body;

    if (!packageId) {
        return res.status(400).json({
            error: 'Missing package ID',
            message: 'Package ID is required'
        });
    }

    if (!successUrl) {
        return res.status(400).json({
            error: 'Missing success URL',
            message: 'Success URL is required'
        });
    }

    if (!cancelUrl) {
        return res.status(400).json({
            error: 'Missing cancel URL',
            message: 'Cancel URL is required'
        });
    }

    try {
        const databaseClient = (await import('../database/PrismaClient.js')).default;
        const prisma = databaseClient.getClient();

        const packageExists = await prisma.package.findFirst({
            where: {
                id: packageId,
                isActive: true
            }
        });

        if (!packageExists) {
            return res.status(400).json({
                error: 'Invalid package ID',
                message: 'Package not found or inactive'
            });
        }
    } catch (error) {
        console.error('❌ CREDIT-VALIDATION: Error validating package:', error);

        return res.status(500).json({
            error: 'Package validation failed',
            message: 'Unable to validate package'
        });
    }

    // Validate URLs
    try {
        new URL(successUrl);
        new URL(cancelUrl);
    } catch (error) {
        return res.status(400).json({
            error: 'Invalid URL',
            message: 'Success and cancel URLs must be valid URLs'
        });
    }

    next();
};

/**
 * Validate session ID parameter
 */
export const validateSessionId = (req, res, next) => {
    const { sessionId } = req.params;

    if (!sessionId) {
        return res.status(400).json({
            error: 'Missing session ID',
            message: 'Session ID is required'
        });
    }

    if (typeof sessionId !== 'string' || sessionId.trim().length === 0) {
        return res.status(400).json({
            error: 'Invalid session ID',
            message: 'Session ID must be a non-empty string'
        });
    }

    next();
};

export default {
    requireCredits,
    calculateGenerationCost,
    requireImageGenerationCredits,
    validateCreditCheck,
    validatePromoRedemption,
    validatePurchaseRequest,
    validateSessionId
};
