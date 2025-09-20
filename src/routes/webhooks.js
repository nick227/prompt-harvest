import express from 'express';
import StripeService from '../services/StripeService.js';

// eslint-disable-next-line new-cap
const router = express.Router();

/**
 * Webhook IP allowlist for logging purposes only (not enforced)
 * Note: Stripe does not guarantee stable IPs for all regions and products.
 * Signature verification is the primary security mechanism.
 */
const _STRIPE_WEBHOOK_IPS = [
    '3.18.12.63', '3.130.192.231', '13.235.14.237', '13.235.122.149',
    '18.211.135.69', '35.154.171.200', '52.15.183.38', '54.88.130.119',
    '54.88.130.237', '54.187.174.169', '54.187.205.235', '54.187.216.72'
    // Add more Stripe IPs as needed
];

/**
 * Check if IP is from Stripe (for logging only, not enforcement)
 */
const isStripeIP = ip => _STRIPE_WEBHOOK_IPS.includes(ip);

/**
 * Stripe webhook endpoint
 * POST /webhooks/stripe
 *
 * Important: This endpoint requires raw body parsing, not JSON
 * The raw body is needed for Stripe signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json', limit: '1mb' }), async(req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

        // Log IP for monitoring (not enforced)
        const isFromStripe = isStripeIP(clientIP);

        if (!isFromStripe) {
            console.warn(`💳 WEBHOOK: Request from non-Stripe IP: ${clientIP}`);
        }

        if (!signature) {
            console.error('💳 WEBHOOK: Missing Stripe signature');

            return res.status(400).json({ error: 'Missing stripe-signature header' });
        }

        // Verify webhook signature and parse event
        const event = StripeService.verifyWebhookSignature(req.body, signature);

        // eslint-disable-next-line no-console
        console.log(`💳 WEBHOOK: Received event ${event.id}: ${event.type} from IP: ${clientIP}`);

        // Handle the event
        await StripeService.handleWebhookEvent(event);

        // Acknowledge receipt of the event
        return res.json({
            success: true,
            received: true,
            eventId: event.id,
            eventType: event.type
        });

    } catch (error) {
        console.error('💳 WEBHOOK: Error processing Stripe webhook:', error);

        // Return 400 for signature verification failures
        if (error.message.includes('signature')) {
            return res.status(400).json({
                error: 'Webhook signature verification failed'
            });
        }

        // Return 500 for other processing errors
        return res.status(500).json({
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

/**
 * Manual payment status check (alternative to webhooks)
 * POST /webhooks/check-payment
 */
router.post('/check-payment', async(req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        // eslint-disable-next-line no-console
        console.log(`🔍 WEBHOOK: Manual payment check for session: ${sessionId}`);

        // Check payment status with Stripe
        const { createStripeClient } = await import('../config/stripeConfig.js');
        const stripe = createStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        // eslint-disable-next-line no-console
        console.log(`💳 WEBHOOK: Session ${sessionId} status: ${session.payment_status}`);

        if (session.payment_status === 'paid') {
            // Process the payment (same logic as webhook)
            const StripeService = (await import('../services/StripeService.js')).default;

            await StripeService.handlePaymentSuccess(sessionId);

            return res.json({
                status: 'completed',
                message: 'Payment processed successfully',
                sessionId
            });
        } else {
            return res.json({
                status: session.payment_status,
                message: 'Payment not yet completed',
                sessionId
            });
        }

    } catch (error) {
        console.error('❌ WEBHOOK: Error checking payment status:', error);
        res.status(500).json({
            error: 'Failed to check payment status',
            message: error.message
        });
    }
});

/**
 * Health check for webhook endpoint
 * GET /webhooks/health
 */
router.get('/health', async (req, res) => {
    try {
        const { getWebhookSecret } = await import('../config/stripeConfig.js');
        const webhookSecret = getWebhookSecret();

        res.json({
            success: true,
            message: 'Webhook endpoint is healthy',
            config: {
                webhookSecretConfigured: !!webhookSecret,
                environment: process.env.NODE_ENV,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Webhook configuration error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

export default router;
