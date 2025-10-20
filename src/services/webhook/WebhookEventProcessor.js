/**
 * Webhook Event Processor
 * Handles individual webhook event processing
 */

import databaseClient from '../../database/PrismaClient.js';
import SimplifiedCreditService from '../credit/SimplifiedCreditService.js';

const prisma = databaseClient.getClient();

export class WebhookEventProcessor {

    /**
     * Handle successful checkout completion
     * Only process if payment_status === "paid"
     */
    async handleCheckoutCompleted(event) {
        const session = event.data.object;
        const sessionId = session.id;

        console.log(`💳 WEBHOOK: Processing checkout completion for session ${sessionId}, payment_status: ${session.payment_status}`);

        try {
            // CRITICAL: Only process if payment is actually paid
            if (session.payment_status !== 'paid') {
                console.log(`💳 WEBHOOK: Payment ${sessionId} not paid (status: ${session.payment_status}), skipping processing`);

                return { success: true, skipped: true, reason: `Payment status: ${session.payment_status}` };
            }

            // Get payment record
            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: sessionId }
            });

            if (!payment) {
                throw new Error(`Payment record not found for session ${sessionId}`);
            }

            if (payment.status === 'completed') {
                console.log(`💳 WEBHOOK: Payment ${sessionId} already completed`);

                return { success: true, alreadyProcessed: true };
            }

            // Update payment and add credits in transaction
            const result = await prisma.$transaction(async tx => await tx.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: {
                    status: 'completed',
                    stripePaymentIntentId: session.payment_intent || null
                }
            }), { timeout: 15000 });

            // Add credits (outside transaction for better error handling)
            await SimplifiedCreditService.addCredits(
                payment.userId,
                payment.credits,
                'purchase',
                `Credit purchase - ${payment.credits} credits`,
                { stripePaymentId: sessionId }
            );

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

        console.log(`💳 WEBHOOK: Processing payment failure for intent ${paymentIntent.id}`);

        try {
            // Find sessions by payment intent (using Stripe API)
            const stripe = (await import('../../config/stripeConfig.js')).createStripeClient();
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
     * Handle payment success confirmation
     */
    async handlePaymentSucceeded(event) {
        const paymentIntent = event.data.object;

        console.log(`💳 WEBHOOK: Payment succeeded for intent ${paymentIntent.id}`);

        // This is usually handled by checkout.session.completed
        // But we can use it for additional confirmation or logging
        return { success: true, confirmed: true };
    }

    /**
     * Handle invoice payment failure (for future subscriptions)
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
     * Handle async payment success (ACH, bank redirects, etc.)
     */
    async handleAsyncPaymentSucceeded(event) {
        const session = event.data.object;
        const sessionId = session.id;

        console.log(`💳 WEBHOOK: Processing async payment success for session ${sessionId}`);

        try {
            // Get payment record
            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: sessionId }
            });

            if (!payment) {
                throw new Error(`Payment record not found for session ${sessionId}`);
            }

            if (payment.status === 'completed') {
                console.log(`💳 WEBHOOK: Payment ${sessionId} already completed`);

                return { success: true, alreadyProcessed: true };
            }

            // Update payment and add credits in transaction
            const result = await prisma.$transaction(async tx => await tx.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: {
                    status: 'completed',
                    stripePaymentIntentId: session.payment_intent || null
                }
            }), { timeout: 15000 });

            // Add credits (outside transaction for better error handling)
            await SimplifiedCreditService.addCredits(
                payment.userId,
                payment.credits,
                'purchase',
                `Credit purchase - ${payment.credits} credits (async payment)`,
                { stripePaymentId: sessionId }
            );

            console.log(`💳 WEBHOOK: Successfully completed async payment ${sessionId} for ${payment.credits} credits`);

            return { success: true, payment: result };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error handling async payment success for ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Handle async payment failure (ACH, bank redirects, etc.)
     */
    async handleAsyncPaymentFailed(event) {
        const session = event.data.object;
        const sessionId = session.id;

        console.log(`💳 WEBHOOK: Processing async payment failure for session ${sessionId}`);

        try {
            // Update payment status to failed
            const payment = await prisma.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: { status: 'failed' }
            });

            console.log(`💳 WEBHOOK: Marked async payment ${sessionId} as failed`);

            return { success: true, payment };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error handling async payment failure for ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Handle expired checkout sessions (abandoned)
     */
    async handleCheckoutExpired(event) {
        const session = event.data.object;
        const sessionId = session.id;

        console.log(`💳 WEBHOOK: Processing expired checkout session ${sessionId}`);

        try {
            // Update payment status to expired
            const payment = await prisma.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: { status: 'expired' }
            });

            console.log(`💳 WEBHOOK: Marked payment ${sessionId} as expired`);

            return { success: true, payment };

        } catch (error) {
            console.error(`💳 WEBHOOK: Error handling expired checkout for ${sessionId}:`, error);
            throw error;
        }
    }
}

export default new WebhookEventProcessor();
