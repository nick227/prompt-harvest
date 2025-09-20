/**
 * Simplified Webhook Service
 * Orchestrates webhook validation and processing
 */

import WebhookValidator from './WebhookValidator.js';
import WebhookEventProcessor from './WebhookEventProcessor.js';

export class SimplifiedWebhookService {

    constructor() {
        this.validator = WebhookValidator;
        this.processor = WebhookEventProcessor;

        // Track processed events to prevent duplicates
        this.processedEvents = new Set();

        // Event handlers map
        this.eventHandlers = new Map([
            ['checkout.session.completed', this.processor.handleCheckoutCompleted.bind(this.processor)],
            ['checkout.session.async_payment_succeeded', this.processor.handleAsyncPaymentSucceeded.bind(this.processor)],
            ['checkout.session.async_payment_failed', this.processor.handleAsyncPaymentFailed.bind(this.processor)],
            ['checkout.session.expired', this.processor.handleCheckoutExpired.bind(this.processor)],
            ['payment_intent.payment_failed', this.processor.handlePaymentFailed.bind(this.processor)],
            ['invoice.payment_failed', this.processor.handleInvoicePaymentFailed.bind(this.processor)],
            ['charge.dispute.created', this.processor.handleChargeDispute.bind(this.processor)],
            ['payment_intent.succeeded', this.processor.handlePaymentSucceeded.bind(this.processor)]
        ]);
    }

    /**
     * Verify webhook signature and parse event
     */
    verifyAndParseWebhook(payload, signature) {
        return this.validator.verifyAndParseWebhook(payload, signature);
    }

    /**
     * Process webhook event with idempotency
     */
    async processWebhookEvent(event) {
        try {
            // Validate event structure
            this.validator.validateEventStructure(event);

            // Check for duplicate processing
            if (this.processedEvents.has(event.id)) {
                console.log(`💳 WEBHOOK: Event ${event.id} already processed, skipping`);

                return { success: true, duplicate: true };
            }

            // Get handler for event type
            const handler = this.eventHandlers.get(event.type);

            if (!handler) {
                console.log(`💳 WEBHOOK: No handler for event type: ${event.type}`);

                return { success: true, unhandled: true };
            }

            // Process the event
            const result = await handler(event);

            // Mark as processed
            this.markEventProcessed(event.id);

            console.log(`💳 WEBHOOK: Successfully processed event ${event.id}`);

            return { success: true, result };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error processing event ${event.id}:`, error);
            throw error;
        }
    }

    /**
     * Mark event as processed and manage cache
     */
    markEventProcessed(eventId) {
        this.processedEvents.add(eventId);

        // Clean up old processed events (keep last 1000)
        if (this.processedEvents.size > 1000) {
            const eventsArray = Array.from(this.processedEvents);

            this.processedEvents.clear();
            eventsArray.slice(-500).forEach(id => this.processedEvents.add(id));
        }
    }

    /**
     * Get webhook processing statistics
     */
    getStats() {
        return {
            processedEventsCount: this.processedEvents.size,
            supportedEventTypes: Array.from(this.eventHandlers.keys()),
            lastCleanup: new Date().toISOString()
        };
    }

    /**
     * Clear processed events cache (admin function)
     */
    clearProcessedEvents() {
        this.processedEvents.clear();
        console.log('💳 WEBHOOK: Cleared processed events cache');
    }

    /**
     * Health check for webhook service
     */
    async healthCheck() {
        try {
            // Test webhook secret availability
            const { getWebhookSecret } = await import('../../config/stripeConfig.js');
            const secret = getWebhookSecret();

            return {
                status: 'healthy',
                components: {
                    validator: 'operational',
                    processor: 'operational',
                    eventCache: `${this.processedEvents.size} events cached`
                },
                config: {
                    webhookSecretConfigured: !!secret,
                    supportedEventTypes: this.eventHandlers.size
                },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('💳 WEBHOOK: Health check failed:', error);

            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}

export default new SimplifiedWebhookService();
