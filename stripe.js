import dotenv from 'dotenv';
import Stripe from 'stripe';

dotenv.config();

const stripe = Stripe(process.env.STRIPE_API_TEST_KEY);

function setupStripe(app, express) {


app.post('/create-checkout-session', async (req, res) => {
    if(!req.user){
        res.redirect(303, '/login.html');
    }
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
        price: 'price_1OwBf2HeLaRNkmaXNdpz1aFb',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `http://localhost:${port}/success.html`,
    cancel_url: `http://localhost:${port}/`,
    metadata: {
      userId: req.user?._id,
    },
  });

  res.redirect(303, session.url);
});



app.post('/webhook', express.raw({type: 'application/json'}), (request, response) => {
  const sig = request.headers['stripe-signature'];
  const endpointSecret = "whsec_d069d9b8befa0bd8da2b89214a887164dc2b155dd92a0671006544de88eb7ffd";
  let event;
  console.log('WEBHOOK TRIGGERED !!!')
  console.log('WEBHOOK TRIGGERED !!!')
  console.log('WEBHOOK TRIGGERED !!!')
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }
  const userId = event.data.object.metadata.userId;
  // Handle the event
  switch (event.type) {
    case 'payment_intent.session.succeeded':
      const paymentIntentSucceeded = event.data.object;
      console.log('paymentIntentSucceeded', paymentIntentSucceeded);
      // Then define and call a function to handle the event checkout.session.async_payment_failed
      break;
      case 'checkout.session.async_payment_failed':
        const checkoutSessionAsyncPaymentFailed = event.data.object;
        console.log('checkoutSessionAsyncPaymentFailed', checkoutSessionAsyncPaymentFailed);
        // Then define and call a function to handle the event checkout.session.async_payment_failed
        break;
    case 'checkout.session.async_payment_succeeded':
      const checkoutSessionAsyncPaymentSucceeded = event.data.object;
      console.log('checkoutSessionAsyncPaymentFailed', checkoutSessionAsyncPaymentSucceeded);
      // Then define and call a function to handle the event checkout.session.async_payment_succeeded
      break;
    case 'checkout.session.completed':
      const checkoutSessionCompleted = event.data.object;
      console.log('checkoutSessionAsyncPaymentFailed', checkoutSessionCompleted);
      // Then define and call a function to handle the event checkout.session.completed
      break;
    case 'checkout.session.expired':
      const checkoutSessionExpired = event.data.object;
      console.log('checkoutSessionAsyncPaymentFailed', checkoutSessionExpired);
      // Then define and call a function to handle the event checkout.session.expired
      break;
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  response.send();
});


app.listen(4242, () => console.log('Running on port 4242'));
}

export default  {
    init: setupStripe
};