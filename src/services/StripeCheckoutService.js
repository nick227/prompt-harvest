import { createStripeClient } from '../config/stripeConfig.js';
import PaymentPackageService from './PaymentPackageService.js';
import databaseClient from '../database/PrismaClient.js';

const prisma = databaseClient.getClient();
const stripe = createStripeClient();

/**
 * Stripe Checkout Service
 * Handles checkout session creation and payment status
 */
class StripeCheckoutService {
    constructor() {
        this.packageService = PaymentPackageService;
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
            console.log(`💳 STRIPE-CHECKOUT: Created checkout session ${session.id} for user ${userId}`);

            return {
                sessionId: session.id,
                url: session.url,
                package: package_
            };

        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('💳 STRIPE-CHECKOUT: Error creating checkout session:', error);
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
            console.error('💳 STRIPE-CHECKOUT: Error getting payment status:', error);
            throw error;
        }
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
            console.error('💳 STRIPE-CHECKOUT: Error getting user payments:', error);
            throw error;
        }
    }

    /**
     * Get payment by Stripe session ID
     */
    async getPaymentBySessionId(sessionId) {
        try {
            // eslint-disable-next-line no-console
            console.log('🔍 STRIPE-CHECKOUT: Getting payment by session ID:', sessionId);

            const payment = await prisma.stripePayment.findFirst({
                where: { stripeSessionId: sessionId }
            });

            if (!payment) {
                // eslint-disable-next-line no-console
                console.log('❌ STRIPE-CHECKOUT: Payment not found for session:', sessionId);

                return null;
            }

            // eslint-disable-next-line no-console
            console.log('✅ STRIPE-CHECKOUT: Payment found:', payment.id);

            return payment;
        } catch (error) {
            console.error('❌ STRIPE-CHECKOUT: Error getting payment by session ID:', error);
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

export default new StripeCheckoutService();
