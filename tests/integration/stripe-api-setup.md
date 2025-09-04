# Stripe API Integration Test Setup

## Prerequisites

To run the Stripe API integration tests, you need:

1. **Stripe Test API Keys** - Get these from your Stripe Dashboard
2. **Environment Variables** - Add to your `.env` file

## Setup Instructions

### 1. Get Stripe Test Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers > API Keys**
3. Copy your **Test** keys (they start with `sk_test_` and `pk_test_`)

### 2. Add to Environment

Add these to your `.env` file:

```env
# Stripe Test Keys (for integration testing)
STRIPE_SECRET_TEST_KEY=sk_test_your_test_secret_key_here
STRIPE_PUBLISHABLE_TEST_KEY=pk_test_your_test_publishable_key_here
STRIPE_WEBHOOK_SECRET_TEST=whsec_your_test_webhook_secret_here
```

### 3. Run the Tests

```bash
# Run Stripe integration tests
npm run test:stripe-integration

# Run with verbose output
npm run test:stripe-integration -- --verbose

# Run specific test suites
npm run test:stripe-integration -- --testNamePattern="Checkout Session"
```

## Test Coverage

The integration tests cover:

- ✅ **Stripe Client Configuration**
- ✅ **Payment Package Integration**
- ✅ **Checkout Session Creation**
- ✅ **Payment Intent Creation**
- ✅ **Customer Management**
- ✅ **Webhook Event Simulation**
- ✅ **Error Handling**
- ✅ **Performance Testing**

## Test Data

The tests use:
- **Test Cards**: `4242424242424242` (Visa)
- **Test Customer**: `test@example.com`
- **Test Metadata**: All test data is tagged with `test: 'true'`

## Cleanup

Tests automatically clean up:
- Test customers created during tests
- Test payment methods
- Test sessions (expire automatically)

## Troubleshooting

### Common Issues:

1. **"Invalid API Key"**
   - Verify your `STRIPE_SECRET_TEST_KEY` is correct
   - Ensure you're using the **test** key (starts with `sk_test_`)

2. **"Network Error"**
   - Check your internet connection
   - Verify Stripe's API is accessible

3. **"Test Timeout"**
   - Tests have a 30-second timeout
   - Slow network may cause timeouts

### Debug Mode:

```bash
# Run with debug output
DEBUG=stripe* npm run test:stripe-integration
```
