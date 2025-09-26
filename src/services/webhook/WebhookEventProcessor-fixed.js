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
                    console.log(`💳 WEBHOOK: Credits already added for payment ${sessionId}`);
                    return { success: true, alreadyProcessed: true, creditsAlreadyAdded: true };
                } else {
                    console.log(`💳 WEBHOOK: Payment ${sessionId} completed but credits not added, adding credits now...`);
                    // Add credits even though payment is marked as completed
                    await SimplifiedCreditService.addCredits(
                        payment.userId,
                        payment.credits,
                        'purchase',
                        `Credit purchase - ${payment.credits} credits`,
                        { stripePaymentId: sessionId }
                    );
                    console.log(`💳 WEBHOOK: Successfully added ${payment.credits} credits for payment ${sessionId}`);
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

        console.log(`💳 WEBHOOK: Processing payment success for intent ${paymentIntent.id}`);

        try {
            // Find sessions by payment intent
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

        console.log(`💳 WEBHOOK: Processing invoice payment failure for ${invoice.id}`);

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

                console.log(`💳 WEBHOOK: Marked payment ${payment.stripeSessionId} as failed due to invoice payment failure`);
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

        console.log(`💳 WEBHOOK: Processing subscription update for ${subscription.id}`);

        try {
            // Handle subscription status changes
            if (subscription.status === 'active') {
                console.log(`💳 WEBHOOK: Subscription ${subscription.id} is now active`);
            } else if (subscription.status === 'canceled') {
                console.log(`💳 WEBHOOK: Subscription ${subscription.id} has been canceled`);
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

        console.log(`💳 WEBHOOK: Processing subscription deletion for ${subscription.id}`);

        try {
            // Handle subscription cancellation
            console.log(`💳 WEBHOOK: Subscription ${subscription.id} has been deleted`);

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

        console.log(`💳 WEBHOOK: Processing customer creation for ${customer.id}`);

        try {
            // Handle new customer creation
            console.log(`💳 WEBHOOK: New customer ${customer.id} created`);

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

        console.log(`💳 WEBHOOK: Processing customer update for ${customer.id}`);

        try {
            // Handle customer updates
            console.log(`💳 WEBHOOK: Customer ${customer.id} updated`);

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

        console.log(`💳 WEBHOOK: Processing customer deletion for ${customer.id}`);

        try {
            // Handle customer deletion
            console.log(`💳 WEBHOOK: Customer ${customer.id} deleted`);

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

        console.log(`💳 WEBHOOK: Processing payment method attachment for ${paymentMethod.id}`);

        try {
            // Handle payment method attachment
            console.log(`💳 WEBHOOK: Payment method ${paymentMethod.id} attached to customer ${paymentMethod.customer}`);

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

        console.log(`💳 WEBHOOK: Processing payment method detachment for ${paymentMethod.id}`);

        try {
            // Handle payment method detachment
            console.log(`💳 WEBHOOK: Payment method ${paymentMethod.id} detached from customer ${paymentMethod.customer}`);

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

        console.log(`💳 WEBHOOK: Processing payment method update for ${paymentMethod.id}`);

        try {
            // Handle payment method updates
            console.log(`💳 WEBHOOK: Payment method ${paymentMethod.id} updated`);

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

        console.log(`💳 WEBHOOK: Processing setup intent success for ${setupIntent.id}`);

        try {
            // Handle setup intent success
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} succeeded`);

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

        console.log(`💳 WEBHOOK: Processing setup intent failure for ${setupIntent.id}`);

        try {
            // Handle setup intent failure
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} failed`);

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

        console.log(`💳 WEBHOOK: Processing setup intent cancellation for ${setupIntent.id}`);

        try {
            // Handle setup intent cancellation
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} canceled`);

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

        console.log(`💳 WEBHOOK: Processing setup intent requires action for ${setupIntent.id}`);

        try {
            // Handle setup intent requires action
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} requires action`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup success for ${setupIntent.id}`);

        try {
            // Handle setup intent setup success
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup succeeded`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup failure for ${setupIntent.id}`);

        try {
            // Handle setup intent setup failure
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup failed`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup cancellation for ${setupIntent.id}`);

        try {
            // Handle setup intent setup cancellation
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup canceled`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup requires action for ${setupIntent.id}`);

        try {
            // Handle setup intent setup requires action
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup requires action`);

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup requires action:', error);
            throw error;
        }
    }

    /**
     * Handle setup intent setup succeeded
     */
    async handleSetupIntentSetupSucceeded(event) {
        const setupIntent = event.data.object;

        console.log(`💳 WEBHOOK: Processing setup intent setup success for ${setupIntent.id}`);

        try {
            // Handle setup intent setup success
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup succeeded`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup failure for ${setupIntent.id}`);

        try {
            // Handle setup intent setup failure
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup failed`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup cancellation for ${setupIntent.id}`);

        try {
            // Handle setup intent setup cancellation
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup canceled`);

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

        console.log(`💳 WEBHOOK: Processing setup intent setup requires action for ${setupIntent.id}`);

        try {
            // Handle setup intent setup requires action
            console.log(`💳 WEBHOOK: Setup intent ${setupIntent.id} setup requires action`);

            return { success: true };

        } catch (error) {
            console.error('💳 WEBHOOK: Error handling setup intent setup requires action:', error);
            throw error;
        }
    }
}
