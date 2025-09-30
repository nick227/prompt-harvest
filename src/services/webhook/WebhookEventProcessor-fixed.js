/**
 * Webhook Event Processor - FIXED VERSION
 * Handles individual webhook event processing with credit verification
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


        try {
            // CRITICAL: Only process if payment is actually paid
            if (session.payment_status !== 'paid') {

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

                // Check if credits were actually added by looking at the credit ledger
                const existingCreditEntry = await prisma.creditLedger.findFirst({
                    where: {
                        userId: payment.userId,
                        type: 'purchase',
                        description: {
                            contains: `Credit purchase - ${payment.credits} credits`
                        },
                        metadata: {
                            contains: `"stripePaymentId":"${sessionId}"`
                        }
                    }
                });

                if (existingCreditEntry) {

                    return { success: true, alreadyProcessed: true, creditsAlreadyAdded: true };
                } else {
                    // Add credits even though payment is marked as completed
                    await SimplifiedCreditService.addCredits(
                        payment.userId,
                        payment.credits,
                        'purchase',
                        `Credit purchase - ${payment.credits} credits`,
                        { stripePaymentId: sessionId }
                    );

                    return { success: true, creditsAdded: true };
                }
            }

            // Update payment and add credits in transaction
            const result = await prisma.$transaction(async tx => {
                // Update payment status
                await tx.stripePayment.update({
                    where: { stripeSessionId: sessionId },
                    data: {
                        status: 'completed',
                        stripePaymentIntentId: session.payment_intent || null
                    }
                });
            }, { timeout: 15000 });

            // Add credits (outside transaction for better error handling)
            await SimplifiedCreditService.addCredits(
                payment.userId,
                payment.credits,
                'purchase',
                `Credit purchase - ${payment.credits} credits`,
                { stripePaymentId: sessionId }
            );


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
            // Find sessions by payment intent (using Stripe API)
            const stripe = (await import('../../config/stripeConfig.js')).createStripeClient();
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1
            });

            if (sessions.data.length === 0) {

                return { success: true, noSession: true };
            }

            const sessionId = sessions.data[0].id;

            // Update payment status
            await prisma.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: { status: 'failed' }
            });


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


        try {
            // Find sessions by payment intent
            const stripe = (await import('../../config/stripeConfig.js')).createStripeClient();
            const sessions = await stripe.checkout.sessions.list({
                payment_intent: paymentIntent.id,
                limit: 1
            });

            if (sessions.data.length === 0) {

                return { success: true, noSession: true };
            }

            const sessionId = sessions.data[0].id;

            // Process the checkout completion
            return await this.handleCheckoutCompleted({
                data: { object: sessions.data[0] }
            });

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Handle invoice payment failure
     */
    async handleInvoicePaymentFailed(event) {
        const invoice = event.data.object;


        try {
            // Find associated payment record
            const payment = await prisma.stripePayment.findFirst({
                where: {
                    stripePaymentIntentId: invoice.payment_intent
                }
            });

            if (payment) {
                await prisma.stripePayment.update({
                    where: { id: payment.id },
                    data: { status: 'failed' }
                });

            }

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling invoice payment failure:', error);
            throw error;
        }
    }

    /**
     * Handle customer subscription updated
     */
    async handleCustomerSubscriptionUpdated(event) {
        const subscription = event.data.object;


        try {
            // Handle subscription status changes
            if (subscription.status === 'active') {
            } else if (subscription.status === 'canceled') {
            }

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling subscription update:', error);
            throw error;
        }
    }

    /**
     * Handle customer subscription deleted
     */
    async handleCustomerSubscriptionDeleted(event) {
        const subscription = event.data.object;


        try {
            // Handle subscription cancellation

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling subscription deletion:', error);
            throw error;
        }
    }

    /**
     * Handle customer created
     */
    async handleCustomerCreated(event) {
        const customer = event.data.object;


        try {
            // Handle new customer creation

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling customer creation:', error);
            throw error;
        }
    }

    /**
     * Handle customer updated
     */
    async handleCustomerUpdated(event) {
        const customer = event.data.object;


        try {
            // Handle customer updates

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling customer update:', error);
            throw error;
        }
    }

    /**
     * Handle customer deleted
     */
    async handleCustomerDeleted(event) {
        const customer = event.data.object;


        try {
            // Handle customer deletion

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling customer deletion:', error);
            throw error;
        }
    }

    /**
     * Handle payment method attached
     */
    async handlePaymentMethodAttached(event) {
        const paymentMethod = event.data.object;


        try {
            // Handle payment method attachment

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling payment method attachment:', error);
            throw error;
        }
    }

    /**
     * Handle payment method detached
     */
    async handlePaymentMethodDetached(event) {
        const paymentMethod = event.data.object;


        try {
            // Handle payment method detachment

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling payment method detachment:', error);
            throw error;
        }
    }

    /**
     * Handle payment method updated
     */
    async handlePaymentMethodUpdated(event) {
        const paymentMethod = event.data.object;


        try {
            // Handle payment method updates

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling payment method update:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent succeeded
     */
    async handleSetupIntentSucceeded(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent success

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent success:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent failed
     */
    async handleSetupIntentFailed(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent failure

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent failure:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent canceled
     */
    async handleSetupIntentCanceled(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent cancellation

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent cancellation:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent requires action
     */
    async handleSetupIntentRequiresAction(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent requires action

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent requires action:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent setup succeeded
     */
    async handleSetupIntentSetupSucceeded(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent setup success

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup success:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent setup failed
     */
    async handleSetupIntentSetupFailed(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent setup failure

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup failure:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent setup canceled
     */
    async handleSetupIntentSetupCanceled(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent setup cancellation

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup cancellation:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent setup requires action
     */
    async handleSetupIntentSetupRequiresAction(event) {
        const setupIntent = event.data.object;


        try {
            // Handle setup intent setup requires action

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup requires action:', error);
            throw error;
        }
    }
}
