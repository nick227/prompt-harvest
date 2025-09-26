import express from 'express';
import StripeService from '../services/StripeService.js';
import { stripeIPManager } from '../services/StripeIPManager.js';

// eslint-disable-next-line new-cap
const router = express.Router();

/**
 * Dynamic Stripe webhook endpoint with automatic IP management
 * POST /webhooks/stripe
 *
 * Important: This endpoint requires raw body parsing, not JSON
 * The raw body is needed for Stripe signature verification
 */
router.post('/stripe', express.raw({ type: 'application/json', limit: '1mb' }), async(req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;

        // Check if IP is from Stripe using dynamic IP manager
        const isFromStripe = await stripeIPManager.isStripeIP(clientIP);

        if (!isFromStripe) {
            console.warn(`💳 WEBHOOK: Request from non-Stripe IP: ${clientIP}`);
            console.log(`🔍 WEBHOOK: Checking if this is a new Stripe IP that needs to be added...`);

            // Log the IP for manual review if needed
            console.log(`📝 WEBHOOK: Unknown IP ${clientIP} - consider adding to Stripe IP list`);
        } else {
            console.log(`✅ WEBHOOK: Request from verified Stripe IP: ${clientIP}`);
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
            received: true,
            eventId: event.id,
            eventType: event.type,
            clientIP: clientIP,
            isStripeIP: isFromStripe
        });

    } catch (error) {
        console.error('💳 WEBHOOK: Error processing webhook:', error);

        return res.status(400).json({
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

/**
 * Health check endpoint for webhook IP management
 */
router.get('/health', async (req, res) => {
    try {
        const healthStatus = await stripeIPManager.healthCheck();

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            ipManager: healthStatus
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Force refresh Stripe IP addresses
 */
router.post('/refresh-ips', async (req, res) => {
    try {
        console.log('🔄 WEBHOOK: Force refreshing Stripe IP addresses...');
        const ipData = await stripeIPManager.refreshIPs();

        res.json({
            success: true,
            message: 'Stripe IP addresses refreshed successfully',
            ipCount: ipData.allIPs.length,
            lastUpdated: ipData.lastUpdated
        });
    } catch (error) {
        console.error('❌ WEBHOOK: Error refreshing IP addresses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * Get current Stripe IP addresses
 */
router.get('/ips', async (req, res) => {
    try {
        const ipData = await stripeIPManager.getStripeIPs();

        res.json({
            success: true,
            webhookIPs: ipData.webhookIPs,
            apiIPs: ipData.apiIPs,
            allIPs: ipData.allIPs,
            lastUpdated: ipData.lastUpdated,
            source: ipData.source
        });
    } catch (error) {
        console.error('❌ WEBHOOK: Error getting IP addresses:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
