import express from 'express';
import StripeWebhookHandler from '../webhook/StripeWebhookHandler.js';

const router = express.Router();

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
                const payment = await StripeWebhookHandler.getPaymentBySessionId(session.id);

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

                await StripeWebhookHandler.handlePaymentSuccess(session.id);
                console.log(`✅ Payment completed for session: ${session.id}`);
                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const sessionId = paymentIntent.metadata?.session_id;

                if (sessionId) {
                    await StripeWebhookHandler.handlePaymentFailure(sessionId, 'Payment failed');
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
 * Webhook endpoint
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = StripeWebhookHandler.verifyWebhookSignature(request.body, sig);
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

export default router;
