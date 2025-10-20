import { createStripeClient, getWebhookSecret } from '../config/stripeConfig.js';
import StripeService from '../services/StripeService.js';
import StripeCheckoutService from '../services/StripeCheckoutService.js';

const stripe = createStripeClient();

/**
 * Minimal Stripe Webhook Handler
 * Handles webhook signature verification and event processing
 */
class StripeWebhookHandler {
    constructor() {
        this.stripeService = StripeService;
        this.checkoutService = StripeCheckoutService;
    }

    /**
     * Get webhook secret for signature verification
     */
    getWebhookSecret() {
        return getWebhookSecret();
    }

    /**
     * Verify webhook signature and parse event
     */
    verifyWebhookSignature(payload, signature) {
        const endpointSecret = this.getWebhookSecret();

        try {
            return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
        } catch (err) {
            throw new Error(`Webhook signature verification failed: ${err.message}`);
        }
    }

    /**
     * Handle webhook event
     */
    async handleWebhookEvent(event) {
        return this.stripeService.handleWebhookEvent(event);
    }

    /**
     * Get payment by session ID
     */
    async getPaymentBySessionId(sessionId) {
        return this.checkoutService.getPaymentBySessionId(sessionId);
    }

    /**
     * Handle payment success
     */
    async handlePaymentSuccess(sessionId) {
        return this.stripeService.handlePaymentSuccess(sessionId);
    }

    /**
     * Handle payment failure
     */
    async handlePaymentFailure(sessionId, reason) {
        return this.stripeService.handlePaymentFailure(sessionId, reason);
    }
}

export default new StripeWebhookHandler();
