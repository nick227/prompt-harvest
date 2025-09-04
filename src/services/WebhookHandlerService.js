/**
 * Webhook Handler Service
 * Processes Stripe webhook events with proper error handling and retry logic
 */

import { createStripeClient, getWebhookSecret } from '../config/stripeConfig.js';
import CreditService from './CreditService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const stripe = createStripeClient();

export class WebhookHandlerService {
    constructor() {
        // Track processed events to prevent duplicates
        this.processedEvents = new Set();

        // Event handlers map
        this.eventHandlers = new Map([
            ['checkout.session.completed', this.handleCheckoutCompleted.bind(this)],
            ['payment_intent.payment_failed', this.handlePaymentFailed.bind(this)],
            ['invoice.payment_failed', this.handleInvoicePaymentFailed.bind(this)],
            ['charge.dispute.created', this.handleChargeDispute.bind(this)],
            ['payment_intent.succeeded', this.handlePaymentSucceeded.bind(this)]
        ]);
    }

    /**
     * Verify webhook signature and parse event
     */
    verifyAndParseWebhook(payload, signature) {
        try {
            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                getWebhookSecret()
            );

            console.log(`💳 WEBHOOK: Verified event ${event.id}: ${event.type}`);

            return event;
        } catch (error) {
            console.error('💳 WEBHOOK: Signature verification failed:', error.message);
            throw new Error('Invalid webhook signature');
        }
    }

    /**
     * Process webhook event with idempotency
     */
    async processWebhookEvent(event) {
        try {
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
            this.processedEvents.add(event.id);

            // Clean up old processed events (keep last 1000)
            if (this.processedEvents.size > 1000) {
                const eventsArray = Array.from(this.processedEvents);

                this.processedEvents.clear();
                eventsArray.slice(-500).forEach(id => this.processedEvents.add(id));
            }

            console.log(`💳 WEBHOOK: Successfully processed event ${event.id}`);

            return { success: true, result };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error processing event ${event.id}:`, error);
            throw error;
        }
    }

    /**
     * Handle successful checkout completion
     */
    async handleCheckoutCompleted(event) {
        const session = event.data.object;
        const sessionId = session.id;

        try {
            console.log(`💳 WEBHOOK: Processing checkout completion for session ${sessionId}`);

            // Get payment record
            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: sessionId }
            });

            if (!payment) {
                console.error(`💳 WEBHOOK: Payment record not found for session ${sessionId}`);

                return { error: 'Payment record not found' };
            }

            if (payment.status === 'completed') {
                console.log(`💳 WEBHOOK: Payment ${sessionId} already completed`);

                return { success: true, alreadyProcessed: true };
            }

            // Update payment status and add credits in transaction
            const result = await prisma.$transaction(async tx => {
                // Update payment status
                const updatedPayment = await tx.stripePayment.update({
                    where: { stripeSessionId: sessionId },
                    data: {
                        status: 'completed',
                        stripePaymentIntentId: session.payment_intent || null
                    }
                });

                // Add credits to user account
                await CreditService.addCredits(
                    payment.userId,
                    payment.credits,
                    'purchase',
                    `Credit purchase - ${payment.credits} credits`,
                    { stripePaymentId: sessionId }
                );

                return updatedPayment;
            }, {
                timeout: 15000 // 15 second timeout
            });

            console.log(`💳 WEBHOOK: Successfully completed payment ${sessionId} for ${payment.credits} credits`);

            return { success: true, payment: result };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error handling checkout completion for ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Handle payment intent failure
     */
    async handlePaymentFailed(event) {
        const paymentIntent = event.data.object;

        try {
            console.log(`💳 WEBHOOK: Processing payment failure for intent ${paymentIntent.id}`);

            // Find sessions by payment intent
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1
            });

            if (sessions.data.length === 0) {
                console.log(`💳 WEBHOOK: No session found for payment intent ${paymentIntent.id}`);

                return { success: true, noSession: true };
            }

            const sessionId = sessions.data[0].id;

            // Update payment status
            await prisma.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: { status: 'failed' }
            });

            console.log(`💳 WEBHOOK: Marked payment ${sessionId} as failed`);

            return { success: true, sessionId };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling payment failure:', error);
            throw error;
        }
    }

    /**
     * Handle payment success (additional confirmation)
     */
    async handlePaymentSucceeded(event) {
        const paymentIntent = event.data.object;

        console.log(`💳 WEBHOOK: Payment succeeded for intent ${paymentIntent.id}`);

        // This is usually handled by checkout.session.completed
        // But we can use it for additional confirmation or logging
        return { success: true, confirmed: true };
    }

    /**
     * Handle invoice payment failure (for subscriptions)
     */
    async handleInvoicePaymentFailed(event) {
        const invoice = event.data.object;

        console.log(`💳 WEBHOOK: Invoice payment failed for ${invoice.id}`);

        // For future subscription handling
        return { success: true, invoiceId: invoice.id };
    }

    /**
     * Handle charge disputes
     */
    async handleChargeDispute(event) {
        const dispute = event.data.object;

        console.log(`💳 WEBHOOK: Charge dispute created for ${dispute.charge}`);

        // For future dispute handling - maybe flag the payment
        return { success: true, disputeId: dispute.id };
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
}

// Export singleton instance
export default new WebhookHandlerService();
