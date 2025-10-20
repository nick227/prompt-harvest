import express from 'express';
import StripeCheckoutService from '../services/StripeCheckoutService.js';
import PaymentPackageService from '../services/PaymentPackageService.js';
import SimplifiedCreditService from '../services/credit/SimplifiedCreditService.js';
import { checkoutRateLimit } from '../middleware/rateLimiting.js';
import { authenticateTokenRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Create Stripe checkout session for user
 */
const getStripeCheckoutSession = async user => {
    const defaultPackage = PaymentPackageService.getDefaultPackage();
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3200}`;
    const successUrl = `${baseUrl}/purchase-success.html`;
    const cancelUrl = `${baseUrl}/`;

    return await StripeCheckoutService.createCheckoutSession(
        user.id,
        defaultPackage.id,
        successUrl,
        cancelUrl
    );
};

/**
 * Create checkout session route with proper rate limiting
 */
router.post('/create-checkout-session', checkoutRateLimit, async (req, res) => {
    try {
        if (!req.user) {
            return res.redirect(303, '/login.html');
        }

        const result = await getStripeCheckoutSession(req.user);

        res.redirect(303, result.url);
    } catch (error) {
        console.error('❌ Error creating checkout session:', error);
        res.status(500).json({
            error: 'Failed to create checkout session',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

/**
 * Payment status check route
 */
router.get('/api/payment/status/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const status = await StripeCheckoutService.getPaymentStatus(sessionId);

        if (!status) {
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Only allow users to check their own payments
        if (req.user && status.userId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(status);
    } catch (error) {
        console.error('❌ Error getting payment status:', error);
        res.status(500).json({ error: 'Failed to get payment status' });
    }
});

/**
 * Credit packages route
 */
router.get('/api/credit-packages', (req, res) => {
    try {
        const packages = PaymentPackageService.getAllPackages();

        res.json(packages);
    } catch (error) {
        console.error('❌ Error getting credit packages:', error);
        res.status(500).json({ error: 'Failed to get credit packages' });
    }
});

/**
 * Apply authentication middleware to user-specific routes
 */
router.use('/api/user', authenticateTokenRequired);

/**
 * User credit balance route
 */
router.get('/api/user/credits', async (req, res) => {
    try {
        const balance = await SimplifiedCreditService.getBalance(req.user.id);
        const history = await SimplifiedCreditService.getCreditHistory(req.user.id, 10);

        res.json({
            balance,
            recentTransactions: history
        });
    } catch (error) {
        console.error('❌ Error getting user credits:', error);
        res.status(500).json({ error: 'Failed to get user credits' });
    }
});

/**
 * User payment history route
 */
router.get('/api/user/payments', async (req, res) => {
    try {
        const payments = await StripeCheckoutService.getUserPayments(req.user.id, 50);

        res.json({
            payments: payments.map(payment => ({
                id: payment.id,
                amount: payment.amount,
                credits: payment.credits,
                status: payment.status,
                createdAt: payment.createdAt,
                stripeSessionId: payment.stripeSessionId
            }))
        });
    } catch (error) {
        console.error('❌ Error getting user payments:', error);
        res.status(500).json({ error: 'Failed to get payment history' });
    }
});

export default router;
