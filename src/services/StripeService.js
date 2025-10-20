import { createStripeClient, getWebhookSecret } from '../config/stripeConfig.js';
import PaymentPackageService from './PaymentPackageService.js';
import SimplifiedWebhookService from './webhook/SimplifiedWebhookService.js';
import SimplifiedCreditService from './credit/SimplifiedCreditService.js';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();
const stripe = createStripeClient();

/**
 * Minimal Stripe Payment Service
 * Handles Stripe Checkout sessions and webhook events
 */
class StripeService {

    constructor() {
        // Services are injected as dependencies
        this.packageService = PaymentPackageService;
        this.webhookHandler = SimplifiedWebhookService;
        this.stripe = stripe;
    }

    /**
     * Create Stripe Checkout Session for credit purchase
     */
    async createCheckoutSession(userId, packageId, successUrl, cancelUrl) {
        try {
            const package_ = await this.packageService.getPackage(packageId);

            // Verify user exists
            const user = await this.verifyUser(userId);

            // Create Stripe session and payment record
            const session = await this.createStripeSession(user, package_, successUrl, cancelUrl);

            await this.createPaymentRecord(session.id, userId, package_);

            // eslint-disable-next-line no-console
            console.log(`💳 STRIPE-SERVICE: Created checkout session ${session.id} for user ${userId}`);

            return {
                sessionId: session.id,
                url: session.url,
                package: package_
            };

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('💳 STRIPE-SERVICE: Error creating checkout session:', error);
            throw error;
        }
    }

    /**
     * Handle successful payment completion
     */
    // Alternative to webhooks: Poll payment status
    async checkPaymentStatus(sessionId) {
        try {
            const session = await this.stripe.checkout.sessions.retrieve(sessionId);

            if (session.payment_status === 'paid') {
                await this.handlePaymentSuccess(sessionId);

                return { status: 'completed', session };
            } else if (session.payment_status === 'unpaid') {
                return { status: 'pending', session };
            } else {
                return { status: 'failed', session };
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
            throw error;
        }
    }

    async handlePaymentSuccess(sessionId) {
        try {
            // Get session from Stripe
            const session = await stripe.checkout.sessions.retrieve(sessionId, {
                expand: ['payment_intent']
            });

            if (session.payment_status !== 'paid') {
                throw new Error(`Payment not completed for session ${sessionId}`);
            }

            const result = await prisma.$transaction(async tx => {
                // Find payment record
                const payment = await tx.stripePayment.findUnique({
                    where: { stripeSessionId: sessionId }
                });

                if (!payment) {
                    throw new Error(`Payment record not found for session ${sessionId}`);
                }

                if (payment.status === 'completed') {
                    // eslint-disable-next-line no-console
                    console.log(`💳 STRIPE-SERVICE: Payment ${sessionId} already processed`);

                    return payment;
                }

                // Update payment status
                const updatedPayment = await tx.stripePayment.update({
                    where: { stripeSessionId: sessionId },
                    data: {
                        status: 'completed',
                        stripePaymentIntentId: session.payment_intent?.id || null
                    }
                });

                // Add credits to user account
                await SimplifiedCreditService.addCredits(
                    payment.userId,
                    payment.credits,
                    'purchase',
                    `Credit purchase - ${payment.credits} credits`, { stripePaymentId: sessionId }
                );

                return updatedPayment;
            });

            // eslint-disable-next-line no-console
            console.log(`💳 STRIPE-SERVICE: Successfully processed payment ${sessionId} for ${result.credits} credits`);

            return result;

        } catch (error) {
            console.error('💳 STRIPE-SERVICE: Error handling payment success:', error);
            throw error;
        }
    }

    /**
     * Handle failed payment
     */
    async handlePaymentFailure(sessionId, reason = 'Payment failed') {
        try {
            const payment = await prisma.stripePayment.update({
                where: { stripeSessionId: sessionId },
                data: { status: 'failed' }
            });

            // eslint-disable-next-line no-console
            console.log(`💳 STRIPE-SERVICE: Marked payment ${sessionId} as failed: ${reason}`);

            return payment;

        } catch (error) {
            console.error('💳 STRIPE-SERVICE: Error handling payment failure:', error);
            throw error;
        }
    }

    /**
     * Process refund
     */
    async processRefund(sessionId, reason = 'Customer request') {
        try {
            const result = await prisma.$transaction(async tx => {
                // Find payment
                const payment = await tx.stripePayment.findUnique({
                    where: { stripeSessionId: sessionId }
                });

                if (!payment) {
                    throw new Error(`Payment not found: ${sessionId}`);
                }

                if (payment.status !== 'completed') {
                    throw new Error(`Cannot refund non-completed payment: ${sessionId}`);
                }

                // Process Stripe refund
                let stripeRefund = null;

                if (payment.stripePaymentIntentId) {
                    stripeRefund = await stripe.refunds.create({
                        payment_intent: payment.stripePaymentIntentId,
                        reason: 'requested_by_customer'
                    });
                }

                // Update payment status
                const updatedPayment = await tx.stripePayment.update({
                    where: { stripeSessionId: sessionId },
                    data: { status: 'refunded' }
                });

                // Refund credits to user account (use proper refund method)
                await SimplifiedCreditService.refundCredits(
                    payment.userId,
                    payment.credits, // Positive amount for refund
                    `Refund for payment ${sessionId} - ${reason}`, { stripePaymentId: sessionId }
                );

                return {
                    payment: updatedPayment,
                    stripeRefund
                };
            });

            // eslint-disable-next-line no-console
            console.log(`💳 STRIPE-SERVICE: Processed refund for payment ${sessionId}`);

            return result;

        } catch (error) {
            console.error('💳 STRIPE-SERVICE: Error processing refund:', error);
            throw error;
        }
    }

    /**
     * Get payment status
     */
    async getPaymentStatus(sessionId) {
        try {
            const payment = await prisma.stripePayment.findUnique({
                where: { stripeSessionId: sessionId },
                include: {
                    user: {
                        select: { email: true }
                    }
                }
            });

            if (!payment) {
                return null;
            }

            // Also get Stripe session status
            const session = await stripe.checkout.sessions.retrieve(sessionId);

            return {
                ...payment,
                stripeStatus: session.payment_status,
                stripeUrl: session.url
            };

        } catch (error) {
            console.error('💳 STRIPE-SERVICE: Error getting payment status:', error);
            throw error;
        }
    }

    /**
     * Get available credit packages
     */
    async getCreditPackages() {
        return await this.packageService.getAllPackages();
    }

    /**
     * Verify webhook signature (delegates to webhook handler)
     */
    verifyWebhookSignature(payload, signature) {
        return this.webhookHandler.verifyAndParseWebhook(payload, signature);
    }

    /**
     * Handle webhook events (delegates to webhook handler)
     */
    async handleWebhookEvent(event) {
        return this.webhookHandler.processWebhookEvent(event);
    }

    /**
     * Get user's payment history
     */
    async getUserPayments(userId, limit = 20) {
        try {
            const payments = await prisma.stripePayment.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit
            });

            return payments;

        } catch (error) {
            console.error('💳 STRIPE-SERVICE: Error getting user payments:', error);
            throw error;
        }
    }

    /**
     * Get webhook secret for signature verification
     */
    getWebhookSecret() {
        return getWebhookSecret();
    }

    /**
     * Get payment by Stripe session ID
     */
    async getPaymentBySessionId(sessionId) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔍 STRIPE-SERVICE: Getting payment by session ID:', sessionId);

            const payment = await prisma.stripePayment.findFirst({
                where: { stripeSessionId: sessionId }
            });

            if (!payment) {
                // eslint-disable-next-line no-console
                console.log('❌ STRIPE-SERVICE: Payment not found for session:', sessionId);

                return null;
            }

            // eslint-disable-next-line no-console
            console.log('✅ STRIPE-SERVICE: Payment found:', payment.id);

            return payment;
        } catch (error) {
            console.error('❌ STRIPE-SERVICE: Error getting payment by session ID:', error);
            throw error;
        }
    }

    /**
     * Verify user exists and return user data
     */
    async verifyUser(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true }
        });

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        return user;
    }

    /**
     * Create Stripe checkout session
     */
    async createStripeSession(user, package_, successUrl, cancelUrl) {
        return await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: user.email,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `${package_.name} - AI Image Credits`,
                        description: `Generate ${package_.credits} AI images`,
                        images: [] // Add your logo URL here if desired
                    },
                    unit_amount: package_.price
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: cancelUrl,
            metadata: {
                userId: user.id,
                credits: package_.credits.toString(),
                packageId: package_.id
            },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60) // 30 minutes
        });
    }

    /**
     * Create payment record in database
     */
    async createPaymentRecord(sessionId, userId, package_) {
        return await prisma.stripePayment.create({
            data: {
                stripeSessionId: sessionId,
                userId,
                amount: package_.price,
                credits: package_.credits,
                status: 'pending'
            }
        });
    }
}

export default new StripeService();
