# Billing Flow E2E Tests

## Overview

This directory contains comprehensive end-to-end tests for the billing system, covering all key payment flows, credit management, and webhook processing.

## Test Files

### `billing-flows.spec.js`
Main test file containing all billing flow tests:
- User registration and credit balance checks
- Credit package display and validation
- Stripe checkout session creation
- Rate limiting on checkout attempts
- Webhook event processing
- Payment status checks
- Credit debit operations
- Promo code redemption
- Credit history display
- Refund operations
- Authentication requirements
- Webhook signature verification
- Payment amount validation
- Concurrent payment processing
- Database transaction rollbacks
- Memory leak prevention
- Session expiration and re-authentication

### `billing.config.js`
Playwright configuration specifically for billing tests with:
- Multiple browser support (Chrome, Firefox, Safari)
- Automatic server startup
- Screenshot and video capture on failure
- Global setup and teardown

### `setup/billing-setup.js`
Global setup that:
- Connects to database
- Cleans up existing test data
- Creates test credit packages
- Creates test promo codes

### `setup/billing-teardown.js`
Global teardown that:
- Cleans up all test data
- Removes test users, payments, and ledger entries
- Ensures database is left in clean state

### `utils/billing-test-utils.js`
Utility functions for:
- Creating test users with specific credit balances
- Creating test payment records
- Adding credits to users
- Getting user credit balance and history
- Creating and redeeming promo codes
- Simulating Stripe webhook events
- Verifying payment processing
- Cleaning up test data

## Running the Tests

### Prerequisites
1. Ensure the server is running on `http://localhost:3200`
2. Database should be migrated and up to date
3. Environment variables should be configured

### Commands

```bash
# Run all billing tests
npm run test:e2e:billing

# Run with UI
npm run test:e2e:billing:ui

# Run in headed mode
npm run test:e2e:billing:headed

# Run specific test file
npx playwright test tests/e2e/billing-flows.spec.js

# Run with specific browser
npx playwright test tests/e2e/billing-flows.spec.js --project=chromium
```

## Test Scenarios Covered

### 1. User Registration and Credit Management
- ✅ New user registration
- ✅ Initial credit balance verification (should be 0)
- ✅ Credit balance API responses

### 2. Credit Package System
- ✅ Display available credit packages
- ✅ Package structure validation
- ✅ Package pricing verification

### 3. Stripe Integration
- ✅ Checkout session creation
- ✅ Redirect to Stripe checkout
- ✅ Payment amount validation
- ✅ Session metadata handling

### 4. Rate Limiting
- ✅ Multiple rapid checkout attempts
- ✅ Rate limit enforcement (429 responses)
- ✅ Memory leak prevention
- ✅ Rate limit cleanup

### 5. Webhook Processing
- ✅ Webhook signature verification
- ✅ Event processing for successful payments
- ✅ Payment status updates
- ✅ Credit balance updates
- ✅ Idempotency handling

### 6. Credit Operations
- ✅ Credit debit operations
- ✅ Insufficient credit handling
- ✅ Credit history tracking
- ✅ Transaction rollbacks on errors

### 7. Promo Code System
- ✅ Promo code redemption
- ✅ Invalid promo code handling
- ✅ Expired promo code handling
- ✅ Duplicate redemption prevention

### 8. Payment Management
- ✅ Payment status checks
- ✅ Payment authorization (users can only see their own payments)
- ✅ Refund operations
- ✅ Payment verification

### 9. Security and Authentication
- ✅ Authentication requirements for billing routes
- ✅ JWT token validation
- ✅ Session expiration handling
- ✅ Re-authentication flows

### 10. Error Handling
- ✅ Database transaction rollbacks
- ✅ Webhook error handling
- ✅ Invalid signature handling
- ✅ Concurrent request handling

## Test Data Management

### Test Users
- Created with email pattern: `billing-test-{timestamp}@example.com`
- Automatically cleaned up after tests
- Used for isolated testing

### Test Credit Packages
- Test Starter Pack: 50 credits for $5.00
- Test Pro Pack: 200 credits for $15.00
- Test Enterprise Pack: 500 credits for $30.00

### Test Promo Codes
- `TESTWELCOME`: 10 credits, 100 max redemptions
- `TESTBONUS`: 25 credits, 50 max redemptions
- `TESTEXPIRED`: 5 credits, expired

### Test Payments
- Session IDs: `cs_test_*`
- Automatically cleaned up
- Used for webhook testing

## Assertions and Validations

### API Response Validation
- ✅ Status codes (200, 201, 400, 401, 404, 429)
- ✅ Response structure validation
- ✅ Data type verification
- ✅ Required field presence

### Database State Validation
- ✅ Credit balance accuracy
- ✅ Payment record creation
- ✅ Ledger entry creation
- ✅ Transaction consistency

### Security Validation
- ✅ Authentication requirements
- ✅ Authorization checks
- ✅ Data isolation
- ✅ Input validation

### Performance Validation
- ✅ Rate limiting effectiveness
- ✅ Memory leak prevention
- ✅ Concurrent request handling
- ✅ Response times

## Debugging

### Failed Test Debugging
1. Check screenshots in `playwright-report/`
2. Review video recordings
3. Check browser console logs
4. Verify database state

### Common Issues
- **Database connection**: Ensure MySQL is running
- **Server not started**: Check if server is on port 3200
- **Environment variables**: Verify .env file is loaded
- **Test data cleanup**: Check if previous test data exists

### Logs
- Test setup/teardown logs show data cleanup
- Error monitoring captures JavaScript errors
- Network requests are logged for debugging

## Continuous Integration

### CI Configuration
- Tests run on multiple browsers
- Screenshots and videos captured
- Test reports generated
- Database reset between test runs

### Pre-commit Hooks
- Linting checks
- Unit test execution
- E2E test execution (optional)

## Maintenance

### Adding New Tests
1. Add test to `billing-flows.spec.js`
2. Update test documentation
3. Add any new test data to setup files
4. Update utility functions if needed

### Updating Test Data
1. Modify setup files
2. Update documentation
3. Test with existing scenarios
4. Verify cleanup works correctly

### Performance Monitoring
- Monitor test execution times
- Track memory usage
- Monitor database performance
- Review rate limiting effectiveness
