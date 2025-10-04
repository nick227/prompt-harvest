import express from 'express';
import SimplifiedCreditService from '../services/credit/SimplifiedCreditService.js';
import StripeService from '../services/StripeService.js';
import databaseClient from '../database/PrismaClient.js';
import {
    validatePromoRedemption,
    validatePurchaseRequest,
    validateCreditCheck,
    validateSessionId
} from '../middleware/creditValidation.js';

const prisma = databaseClient.getClient();

import { validatePagination } from '../middleware/validation.js';
import { promoRedemptionRateLimit } from '../middleware/rateLimiting.js';
import {
    basicApiSecurity,
    strictApiSecurity as _strictApiSecurity,
    paymentApiSecurity as _paymentApiSecurity,
    validateContentType,
    strictRateLimit,
    paymentRateLimit
} from '../middleware/security/SimplifiedSecurityMiddleware.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';

// eslint-disable-next-line new-cap
const router = express.Router();

// Apply basic security to all routes
basicApiSecurity.forEach(middleware => router.use(middleware));

/**
 * Get available credit packages for purchase (public endpoint)
 * GET /api/credits/packages
 */
router.get('/packages', async (req, res) => {
    try {
        const packages = await StripeService.getCreditPackages();

        return res.json({
            success: true,
            packages
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error getting packages:', error);

        return res.status(500).json({
            error: 'Failed to get credit packages',
            message: error.message
        });
    }
});

// Apply authentication middleware to all remaining credits routes
router.use(authenticateTokenRequired);

/**
 * Get user's current credit balance
 * GET /api/credits/balance
 */
router.get('/balance', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const balance = await SimplifiedCreditService.getBalance(userId);

        return res.json({
            success: true,
            balance,
            userId
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error getting balance:', error);

        return res.status(500).json({
            error: 'Failed to get credit balance',
            message: error.message
        });
    }
});


/**
 * Get user statistics
 * GET /api/credits/stats
 */
router.get('/stats', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Get user data from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get credit balance using the service
        const balance = await SimplifiedCreditService.getBalance(userId);

        // Get credit summary using the existing service
        const creditSummary = await SimplifiedCreditService.getCreditSummary(userId);

        // Get total images generated (from image table)
        const totalImages = await prisma.image.count({
            where: { userId }
        });

        // Get monthly usage (images generated this month)
        const startOfMonth = new Date();

        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const monthlyImages = await prisma.image.count({
            where: {
                userId,
                createdAt: {
                    gte: startOfMonth
                }
            }
        });

        // Calculate total credits purchased from credit summary
        const totalCreditsPurchased = creditSummary.byType.purchase?.totalAmount || 0;

        return res.json({
            success: true,
            user: {
                email: user.email,
                createdAt: user.createdAt
            },
            balance,
            totalImages,
            monthlyImages,
            monthlyCredits: monthlyImages, // Assume 1 credit per image for now
            totalCreditsPurchased,
            creditSummary: {
                totalTransactions: creditSummary.totalTransactions,
                byType: creditSummary.byType
            }
        });
    } catch (error) {
        console.error('💳 CREDITS-API: Error getting user stats:', error);

        return res.status(500).json({
            error: 'Failed to get user statistics',
            message: error.message
        });
    }
});

/**
 * Check if user has sufficient credits for an operation
 * GET /api/credits/check?amount=1&provider=dalle3&multiplier=false
 */
router.get('/check', validateCreditCheck, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { provider, multiplier, mixup, mashup } = req.query;

        // Calculate required credits
        const requiredCredits = SimplifiedCreditService.getCreditCost(
            provider,
            multiplier === 'true',
            mixup === 'true',
            mashup === 'true'
        );

        const hasCredits = await SimplifiedCreditService.hasCredits(userId, requiredCredits);
        const currentBalance = await SimplifiedCreditService.getBalance(userId);

        return res.json({
            success: true,
            hasCredits,
            requiredCredits,
            currentBalance,
            canGenerate: hasCredits
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error checking credits:', error);

        return res.status(500).json({
            error: 'Failed to check credits',
            message: error.message
        });
    }
});

/**
 * Redeem promo code
 * POST /api/credits/redeem
 * Body: { promoCode: "WELCOME10" }
 */
router.post('/redeem', strictRateLimit, promoRedemptionRateLimit, validateContentType(), validatePromoRedemption, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { promoCode } = req.body;

        if (!promoCode || typeof promoCode !== 'string') {
            return res.status(400).json({ error: 'Valid promo code required' });
        }

        const result = await SimplifiedCreditService.redeemPromoCode(userId, promoCode.trim());

        return res.json({
            success: true,
            message: `Successfully redeemed ${result.credits} credits!`,
            credits: result.credits,
            newBalance: result.newBalance,
            promoCode: result.promoCode
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error redeeming promo code:', error);

        // Return specific error messages for known issues
        const errorMessage = error.message.includes('Invalid promo code') ||
                           error.message.includes('expired') ||
                           error.message.includes('inactive') ||
                           error.message.includes('maximum redemptions') ||
                           error.message.includes('already redeemed')
            ? error.message
            : 'Failed to redeem promo code';

        return res.status(400).json({
            error: errorMessage,
            success: false
        });
    }
});

/**
 * Get user's promo code redemptions
 * GET /api/credits/promo-redemptions
 */
router.get('/promo-redemptions', validatePagination, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100

        const redemptions = await prisma.promoRedemption.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });

        // Get promo code details for each redemption
        const formattedRedemptions = await Promise.all(redemptions.map(async redemption => {
            const promoCode = await prisma.promoCode.findUnique({
                where: { id: redemption.promoCodeId },
                select: { code: true, credits: true }
            });

            return {
                id: redemption.id,
                credits: redemption.credits,
                code: promoCode?.code || 'Unknown',
                createdAt: redemption.createdAt
            };
        }));

        return res.json({
            success: true,
            redemptions: formattedRedemptions,
            count: formattedRedemptions.length
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error getting promo redemptions:', error);

        return res.status(500).json({
            error: 'Failed to get promo redemptions',
            message: error.message
        });
    }
});

/**
 * Create Stripe checkout session for credit purchase
 * POST /api/credits/purchase
 * Body: { packageId: "standard", successUrl: "...", cancelUrl: "..." }
 */
router.post('/purchase', paymentRateLimit, validateContentType(), validatePurchaseRequest, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { packageId, successUrl, cancelUrl } = req.body;

        if (!packageId || !successUrl || !cancelUrl) {
            return res.status(400).json({
                error: 'packageId, successUrl, and cancelUrl are required'
            });
        }

        const session = await StripeService.createCheckoutSession(
            userId,
            packageId,
            successUrl,
            cancelUrl
        );

        return res.json({
            success: true,
            sessionId: session.sessionId,
            url: session.url,
            package: session.package
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error creating purchase session:', error);

        return res.status(500).json({
            error: 'Failed to create purchase session',
            message: error.message
        });
    }
});

/**
 * Get payment status
 * GET /api/credits/payment/:sessionId
 */
router.get('/payment/:sessionId', validateSessionId, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { sessionId } = req.params;
        const payment = await StripeService.getPaymentStatus(sessionId);

        if (!payment) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Ensure user can only see their own payments
        if (payment.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        return res.json({
            success: true,
            payment
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error getting payment status:', error);

        return res.status(500).json({
            error: 'Failed to get payment status',
            message: error.message
        });
    }
});

/**
 * Get user's payment history
 * GET /api/credits/payments?limit=20
 */
router.get('/payments', validatePagination, async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50
        const payments = await StripeService.getUserPayments(userId, limit);

        return res.json({
            success: true,
            payments,
            count: payments.length
        });

    } catch (error) {
        console.error('💳 CREDITS-API: Error getting payments:', error);

        return res.status(500).json({
            error: 'Failed to get payment history',
            message: error.message
        });
    }
});

/**
 * Verify payment completion and return payment details
 */
router.post('/verify-payment', async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }

        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ success: false, message: 'Session ID is required' });
        }

        // eslint-disable-next-line no-console

        // Get payment details from Stripe service
        const payment = await StripeService.getPaymentBySessionId(sessionId);

        if (!payment) {
            return res.status(404).json({ success: false, message: 'Payment not found' });
        }

        // Verify the payment belongs to the current user
        if (payment.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Payment does not belong to current user' });
        }

        // If payment is still pending, try to process it
        if (payment.status === 'pending') {

            try {
                // Check with Stripe to see if payment was actually completed
                const { createStripeClient } = await import('../config/stripeConfig.js');
                const stripe = createStripeClient();
                const session = await stripe.checkout.sessions.retrieve(sessionId);

                if (session.payment_status === 'paid') {
                    await StripeService.handlePaymentSuccess(sessionId);

                    // Get updated payment details
                    const updatedPayment = await StripeService.getPaymentBySessionId(sessionId);

                    return res.json({
                        success: true,
                        payment: {
                            id: updatedPayment.id,
                            credits: updatedPayment.credits,
                            amount: updatedPayment.amount,
                            status: updatedPayment.status,
                            packageId: updatedPayment.packageId,
                            createdAt: updatedPayment.createdAt
                        },
                        processed: true
                    });
                } else {
                }
            } catch (error) {
                console.error('❌ CREDITS: Error processing pending payment:', error);
                // Continue with original response even if processing fails
            }
        }

        res.json({
            success: true,
            payment: {
                id: payment.id,
                credits: payment.credits,
                amount: payment.amount,
                status: payment.status,
                packageId: payment.packageId,
                createdAt: payment.createdAt
            }
        });
    } catch (error) {
        console.error('❌ CREDITS: Failed to verify payment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment' });
    }
});

export default router;
