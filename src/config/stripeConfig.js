/**
 * Stripe Configuration Module
 * Handles environment-aware Stripe setup
 */

import Stripe from 'stripe';

/**
 * Get Stripe secret key based on environment
 */
const getStripeSecretKey = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const key = isProduction ? process.env.STRIPE_SECRET_KEY : process.env.STRIPE_SECRET_TEST_KEY;

    if (!key) {
        const envType = isProduction ? 'production' : 'development';
        const requiredVar = isProduction ? 'STRIPE_SECRET_KEY' : 'STRIPE_SECRET_TEST_KEY';

        throw new Error(`Missing environment variable: ${requiredVar} for ${envType}`);
    }

    // Validate key format
    const expectedPrefix = isProduction ? 'sk_live_' : 'sk_test_';

    if (!key.startsWith(expectedPrefix)) {
        throw new Error(
            `Invalid Stripe key format. Expected ${expectedPrefix}* for ${process.env.NODE_ENV} environment`
        );
    }

    return key;
};

/**
 * Get Stripe webhook secret based on environment
 */
export const getWebhookSecret = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const secret = isProduction ? process.env.STRIPE_WEBHOOK_SECRET : process.env.STRIPE_WEBHOOK_SECRET_TEST;

    if (!secret) {
        const envType = isProduction ? 'production' : 'development';
        const requiredVar = isProduction ? 'STRIPE_WEBHOOK_SECRET' : 'STRIPE_WEBHOOK_SECRET_TEST';

        throw new Error(`Missing environment variable: ${requiredVar} for ${envType}`);
    }

    // Validate webhook secret format
    if (!secret.startsWith('whsec_')) {
        throw new Error('Invalid webhook secret format. Must start with whsec_');
    }

    return secret;
};

/**
 * Get Stripe publishable key for frontend
 */
export const getPublishableKey = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const key = isProduction ? process.env.STRIPE_PUBLISHABLE_KEY : process.env.STRIPE_PUBLISHABLE_TEST_KEY;

    if (!key) {
        const envType = isProduction ? 'production' : 'development';
        const requiredVar = isProduction ? 'STRIPE_PUBLISHABLE_KEY' : 'STRIPE_PUBLISHABLE_TEST_KEY';

        throw new Error(`Missing environment variable: ${requiredVar} for ${envType}`);
    }

    return key;
};

/**
 * Initialize Stripe client with proper configuration
 */
export const createStripeClient = () => {
    try {
        const stripe = new Stripe(getStripeSecretKey(), {
            apiVersion: '2023-10-16', // Pin API version for consistency
            typescript: true,
            maxNetworkRetries: 3,
            timeout: 30000 // 30 seconds
        });

        return stripe;
    } catch (error) {
        console.error('❌ STRIPE-CONFIG: Failed to initialize Stripe client:', error.message);
        throw error;
    }
};

/**
 * Validate all required Stripe environment variables
 */
export const validateStripeConfig = () => {
    try {
        getStripeSecretKey();
        getWebhookSecret();
        getPublishableKey();

        // eslint-disable-next-line no-console
        console.log('✅ STRIPE-CONFIG: All Stripe environment variables validated');

        return true;
    } catch (error) {
        console.error('❌ STRIPE-CONFIG: Validation failed:', error.message);

        return false;
    }
};

/**
 * Get environment info for logging
 */
export const getStripeEnvironmentInfo = () => {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
        environment: isProduction ? 'production' : 'development',
        keyType: isProduction ? 'live' : 'test',
        apiVersion: '2023-10-16'
    };
};
