# Credits & Payments System Setup

## Required Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Database (already configured)
MYSQL_URL=mysql://user:password@localhost:3306/autoimage
```

## Stripe Setup

1. **Create Stripe Account**: Sign up at https://stripe.com
2. **Get API Keys**: Dashboard → Developers → API keys
3. **Create Webhook Endpoint**:
   - URL: `https://yoursite.com/webhooks/stripe`
   - Events: `checkout.session.completed`, `payment_intent.payment_failed`
   - Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Database Setup

The migration should already be applied. If not:

```bash
npx prisma migrate dev --name add-credits-system
```

## Initial Setup Scripts

```bash
# Create promo codes
node scripts/create-promo-codes.js

# Add initial credits to existing users (25 credits each)
node scripts/add-initial-credits.js 25
```

## Credit Pricing

Default credit costs per image:
- **DALL-E 3**: 3 credits
- **DALL-E 2**: 1 credit
- **Stability AI**: 2 credits
- **Midjourney**: 4 credits
- **Default**: 1 credit

**Modifiers**:
- **Multiplier**: x2 cost
- **Mixup**: +1 credit
- **Mashup**: +1 credit

## Credit Packages

Available for purchase:
- **Starter**: 25 credits - $4.99
- **Standard**: 100 credits - $14.99
- **Premium**: 250 credits - $29.99
- **Bulk**: 500 credits - $49.99

## API Endpoints

### Credits
- `GET /api/credits/balance` - Get user balance
- `GET /api/credits/history` - Get credit history
- `GET /api/credits/check` - Check if user has credits for operation
- `POST /api/credits/redeem` - Redeem promo code
- `GET /api/credits/packages` - Get available packages
- `POST /api/credits/purchase` - Create Stripe checkout session

### Webhooks
- `POST /webhooks/stripe` - Stripe webhook handler

## Frontend Integration

Add to your frontend:

```javascript
// Check user balance
const balance = await fetch('/api/credits/balance').then(r => r.json());

// Check before image generation
const check = await fetch('/api/credits/check?provider=dalle3&multiplier=true').then(r => r.json());

// Purchase credits
const purchase = await fetch('/api/credits/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        packageId: 'standard',
        successUrl: window.location.origin + '/success',
        cancelUrl: window.location.origin + '/cancel'
    })
}).then(r => r.json());

// Redirect to Stripe Checkout
window.location.href = purchase.url;
```

## Testing

Use Stripe test cards:
- **Success**: `4242424242424242`
- **Decline**: `4000000000000002`
- **3D Secure**: `4000000000003220`

## Production Deployment

1. Replace test Stripe keys with live keys
2. Update webhook URL to production domain
3. Test webhook delivery in Stripe Dashboard
4. Monitor credit transactions and user balances
