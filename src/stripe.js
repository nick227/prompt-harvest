import dotenv from 'dotenv';
import { createStripeClient, getWebhookSecret } from './config/stripeConfig.js';
import StripeService from './services/StripeService.js';
import SimplifiedCreditService from './services/credit/SimplifiedCreditService.js';
import PaymentPackageService from './services/PaymentPackageService.js';
import { checkoutRateLimit } from './middleware/rateLimiting.js';
import { authenticateTokenRequired } from './middleware/authMiddleware.js';

dotenv.config();

const stripe = createStripeClient();
const stripeService = StripeService;
const creditService = SimplifiedCreditService;
const packageService = PaymentPackageService;

/**
 * Create Stripe checkout session for user
 */
const getStripeCheckoutSession = async user => {
    const defaultPackage = packageService.getDefaultPackage();
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3200}`;
    const successUrl = `${baseUrl}/purchase-success.html`;
    const cancelUrl = `${baseUrl}/`;

    return await stripeService.createCheckoutSession(
        user.id,
        defaultPackage.id,
        successUrl,
        cancelUrl
    );
};

/**
 * Handle Stripe webhook events with proper business logic
 */
// eslint-disable-next-line max-lines-per-function, max-statements
const handleStripeEvent = async event => {
    try {
        console.log(`💳 WEBHOOK: Processing event ${event.type} (${event.id})`);

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Validate payment amount matches expected
                const payment = await stripeService.getPaymentBySessionId(session.id);

                if (!payment) {
                    console.error(`❌ Payment record not found for session: ${session.id}`);
                    break;
                }

                // Validate payment amount (Stripe amounts are in cents)
                const expectedAmount = payment.amount;

                if (session.amount_total !== expectedAmount) {
                    console.error(
                        `❌ Payment amount mismatch: expected ${expectedAmount} cents, ` +
                        `got ${session.amount_total} cents`
                    );
                    break;
                }

                await stripeService.handlePaymentSuccess(session.id);
                console.log(`✅ Payment completed for session: ${session.id}`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const sessionId = paymentIntent.metadata?.session_id;

                if (sessionId) {
                    await stripeService.handlePaymentFailure(sessionId, 'Payment failed');
                    console.log(`❌ Payment failed for session: ${sessionId}`);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;

                console.log(`❌ Invoice payment failed: ${invoice.id}`);
                // Handle subscription payment failures if needed
                break;
            }

            case 'charge.dispute.created': {
                const dispute = event.data.object;

                console.log(`⚠️ Charge dispute created: ${dispute.id}`);
                // Handle chargebacks
                break;
            }

            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;

                console.log(`✅ Payment intent succeeded: ${paymentIntent.id}`);
                // Additional success handling if needed
                break;
            }

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(`❌ Error handling webhook event ${event.type}:`, error);
        throw error;
    }
};

/**
 * Setup Stripe routes and webhook handling
 */
// eslint-disable-next-line max-lines-per-function
const setupStripe = (app, express) => {
    // Create checkout session route with proper rate limiting
    app.post('/create-checkout-session', checkoutRateLimit, async (req, res) => {
        try {
            if (!req.user) {
                return res.redirect(303, '/login.html');
            }

            const result = await getStripeCheckoutSession(req.user);

            res.redirect(303, result.url);
        } catch (error) {
            console.error('❌ Error creating checkout session:', error);
            res.status(500).json({
                error: 'Failed to create checkout session',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    // Webhook endpoint
    app.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
        const sig = request.headers['stripe-signature'];
        const endpointSecret = getWebhookSecret();

        let event;

        try {
            event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
        } catch (err) {
            console.error(`❌ Webhook signature verification failed: ${err.message}`);

            return response.status(400).send(`Webhook Error: ${err.message}`);
        }

        try {
            await handleStripeEvent(event);
            response.send();
        } catch (error) {
            console.error('❌ Webhook processing error:', error);
            // Don't send error details to Stripe, just acknowledge receipt
            response.status(200).send('Webhook received');
        }
    });

    // Payment status check route
    app.get('/api/payment/status/:sessionId', async (req, res) => {
        try {
            const { sessionId } = req.params;
            const status = await stripeService.getPaymentStatus(sessionId);

            if (!status) {
                return res.status(404).json({ error: 'Payment not found' });
            }

            // Only allow users to check their own payments
            if (req.user && status.userId !== req.user.id) {
                return res.status(403).json({ error: 'Access denied' });
            }

            res.json(status);
        } catch (error) {
            console.error('❌ Error getting payment status:', error);
            res.status(500).json({ error: 'Failed to get payment status' });
        }
    });

    // Credit packages route
    app.get('/api/credit-packages', (req, res) => {
        try {
            const packages = packageService.getAllPackages();

            res.json(packages);
        } catch (error) {
            console.error('❌ Error getting credit packages:', error);
            res.status(500).json({ error: 'Failed to get credit packages' });
        }
    });

    // Apply authentication middleware to user-specific routes
    app.use('/api/user', authenticateTokenRequired);

    // User credit balance route
    app.get('/api/user/credits', async (req, res) => {
        try {
            const balance = await creditService.getBalance(req.user.id);
            const history = await creditService.getCreditHistory(req.user.id, 10);

            res.json({
                balance,
                recentTransactions: history
            });
        } catch (error) {
            console.error('❌ Error getting user credits:', error);
            res.status(500).json({ error: 'Failed to get user credits' });
        }
    });

    // User payment history route
    app.get('/api/user/payments', async (req, res) => {
        try {
            const payments = await stripeService.getUserPayments(req.user.id, 50);

            res.json({
                payments: payments.map(payment => ({
                    id: payment.id,
                    amount: payment.amount,
                    credits: payment.credits,
                    status: payment.status,
                    createdAt: payment.createdAt,
                    stripeSessionId: payment.stripeSessionId
                }))
            });
        } catch (error) {
            console.error('❌ Error getting user payments:', error);
            res.status(500).json({ error: 'Failed to get payment history' });
        }
    });

    // User credit history route (separate from balance)
    app.get('/api/user/credit-history', async (req, res) => {
        try {
            const transactions = await SimplifiedCreditService.getCreditHistory(req.user.id, 50);

            res.json({
                transactions: transactions.map(transaction => ({
                    id: transaction.id,
                    amount: transaction.amount,
                    type: transaction.type,
                    description: transaction.description,
                    createdAt: transaction.createdAt,
                    metadata: transaction.metadata
                }))
            });
        } catch (error) {
            console.error('❌ Error getting user credit history:', error);
            res.status(500).json({ error: 'Failed to get credit history' });
        }
    });

    console.log('✅ Stripe routes configured successfully');
};

export default {
    init: setupStripe,
    getStripeCheckoutSession,
    handleStripeEvent
};
