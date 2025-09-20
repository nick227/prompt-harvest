/**
 * Webhook Validator
 * Handles webhook signature verification and validation
 */

import { createStripeClient, getWebhookSecret } from '../../config/stripeConfig.js';

const stripe = createStripeClient();

export class WebhookValidator {

    /**
     * Verify webhook signature and parse event
     */
    verifyAndParseWebhook(payload, signature) {
        if (!payload) {
            throw new Error('Webhook payload is required');
        }

        const webhookSecret = getWebhookSecret();

        // Skip webhook verification if no secret is provided (for development/testing)
        if (!webhookSecret) {
            console.warn('⚠️  Webhook secret not configured - skipping signature verification');

            // Parse the body as JSON for testing
            return JSON.parse(payload.toString());
        }

        if (!signature) {
            throw new Error('Webhook signature is required');
        }

        try {
            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                webhookSecret
            );

            console.log(`💳 WEBHOOK-VALIDATOR: Verified event ${event.id}: ${event.type}`);

            return event;
        } catch (error) {
            console.error('💳 WEBHOOK-VALIDATOR: Signature verification failed:', error.message);
            throw new Error('Invalid webhook signature');
        }
    }

    /**
     * Validate event structure
     */
    validateEventStructure(event) {
        if (!event) {
            throw new Error('Event is required');
        }

        if (!event.id) {
            throw new Error('Event ID is missing');
        }

        if (!event.type) {
            throw new Error('Event type is missing');
        }

        if (!event.data || !event.data.object) {
            throw new Error('Event data is missing or invalid');
        }

        return true;
    }

    /**
     * Check if event is supported
     */
    isSupportedEventType(eventType) {
        const supportedEvents = [
            'checkout.session.completed',
            'payment_intent.payment_failed',
            'invoice.payment_failed',
            'charge.dispute.created',
            'payment_intent.succeeded'
        ];

        return supportedEvents.includes(eventType);
    }

    /**
     * Validate event age (prevent replay attacks)
     */
    validateEventAge(event, maxAgeMinutes = 5) {
        if (!event.created) {
            throw new Error('Event creation time is missing');
        }

        const eventTime = new Date(event.created * 1000);
        const now = new Date();
        const ageMinutes = (now - eventTime) / (1000 * 60);

        if (ageMinutes > maxAgeMinutes) {
            throw new Error(`Event is too old: ${ageMinutes.toFixed(1)} minutes (max: ${maxAgeMinutes})`);
        }

        return true;
    }

    /**
     * Comprehensive webhook validation
     */
    validateWebhook(payload, signature, options = {}) {
        const { maxAgeMinutes = 5, requireSupportedType = true } = options;

        try {
            // Verify signature and parse
            const event = this.verifyAndParseWebhook(payload, signature);

            // Validate structure
            this.validateEventStructure(event);

            // Validate age
            this.validateEventAge(event, maxAgeMinutes);

            // Check if supported (optional)
            if (requireSupportedType && !this.isSupportedEventType(event.type)) {
                console.log(`💳 WEBHOOK-VALIDATOR: Unsupported event type: ${event.type}`);

                return { event, supported: false };
            }

            return { event, supported: true };

        } catch (error) {
            console.error('💳 WEBHOOK-VALIDATOR: Validation failed:', error.message);
            throw error;
        }
    }
}

export default new WebhookValidator();
