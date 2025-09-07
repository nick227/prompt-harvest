import dotenv from 'dotenv';
import { createStripeClient, getWebhookSecret } from './config/stripeConfig.js';
import StripeService from './services/StripeService.js';
import SimplifiedCreditService from './services/credit/SimplifiedCreditService.js';
import PaymentPackageService from './services/PaymentPackageService.js';

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
    const successUrl = `${baseUrl}/success.html`;
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
    // Create checkout session route
    app.post('/create-checkout-session', async (req, res) => {
        try {
            if (!req.user) {
                return res.redirect(303, '/login.html');
            }

            // Rate limiting check using JWT user ID
            const userRateLimitKey = `checkout_${req.user.id}`;
            const lastAttempt = global.rateLimitStore?.[userRateLimitKey];
            const now = Date.now();

            if (lastAttempt && (now - lastAttempt) < 60000) { // 1 minute cooldown
                return res.status(429).json({ error: 'Too many checkout attempts. Please wait a minute.' });
            }

            // Store rate limit data globally (simple in-memory store)
            if (!global.rateLimitStore) {
                global.rateLimitStore = {};
            }
            global.rateLimitStore[userRateLimitKey] = now;

            // Clean up old entries to prevent memory leaks (keep only last 1000 entries)
            const entries = Object.keys(global.rateLimitStore);

            if (entries.length > 1000) {
                const sortedEntries = entries
                    .map(key => ({ key, timestamp: global.rateLimitStore[key] }))
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 1000);

                global.rateLimitStore = {};
                sortedEntries.forEach(entry => {
                    global.rateLimitStore[entry.key] = entry.timestamp;
                });
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

    // User credit balance route
    app.get('/api/user/credits', async (req, res) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

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

    console.log('✅ Stripe routes configured successfully');
};

export default {
    init: setupStripe,
    getStripeCheckoutSession,
    handleStripeEvent
};
