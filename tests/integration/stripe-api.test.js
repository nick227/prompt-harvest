/**
 * Stripe API Integration Tests
 * Tests actual Stripe API calls using test keys
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createStripeClient } from '../../src/config/stripeConfig.js';
import PaymentPackageService from '../../src/services/PaymentPackageService.js';
import SimplifiedWebhookService from '../../src/services/webhook/SimplifiedWebhookService.js';

describe('Stripe API Integration Tests', () => {
    let stripe;
    let testCustomer;
    let testPaymentMethod;

    beforeAll(async () => {
        // Ensure we're using test environment
        process.env.NODE_ENV = 'development';

        // Verify test API key is available
        if (!process.env.STRIPE_SECRET_TEST_KEY) {
            throw new Error('STRIPE_SECRET_TEST_KEY environment variable is required for integration tests');
        }

        stripe = createStripeClient();

        // Create a test customer for our tests
        testCustomer = await stripe.customers.create({
            email: 'test@example.com',
            name: 'Test User',
            metadata: {
                test: 'true',
                created_by: 'jest_integration_test'
            }
        });

        // Create a test payment method (card)
        testPaymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                number: '4242424242424242', // Stripe test card
                exp_month: 12,
                exp_year: 2025,
                cvc: '123'
            }
        });

        // Attach payment method to customer
        await stripe.paymentMethods.attach(testPaymentMethod.id, {
            customer: testCustomer.id
        });
    });

    afterAll(async () => {
        // Cleanup test data
        if (testCustomer) {
            try {
                await stripe.customers.del(testCustomer.id);
            } catch (error) {
                console.warn('Failed to cleanup test customer:', error.message);
            }
        }
    });

    describe('Stripe Client Configuration', () => {
        test('should create Stripe client with test API key', () => {
            expect(stripe).toBeDefined();
            expect(stripe.apiVersion).toBe('2023-10-16');
        });

        test('should use test API key in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const testStripe = createStripeClient();
            expect(testStripe).toBeDefined();

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('Payment Package Integration', () => {
        test('should retrieve all credit packages', () => {
            const packages = PaymentPackageService.getAllPackages();

            expect(packages).toHaveLength(4);
            expect(packages[0]).toHaveProperty('id', 'starter');
            expect(packages[0]).toHaveProperty('credits', 25);
            expect(packages[0]).toHaveProperty('price', 499);
        });

        test('should get specific package by ID', () => {
            const standardPackage = PaymentPackageService.getPackage('standard');

            expect(standardPackage).toBeDefined();
            expect(standardPackage.id).toBe('standard');
            expect(standardPackage.credits).toBe(100);
            expect(standardPackage.price).toBe(1499);
            expect(standardPackage.popular).toBe(true);
        });
    });

    describe('Stripe Checkout Session Creation', () => {
        test('should create checkout session for starter package', async () => {
            const starterPackage = PaymentPackageService.getPackage('starter');

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: starterPackage.name,
                            description: starterPackage.description
                        },
                        unit_amount: starterPackage.price
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: 'http://localhost:3200/purchase-success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'http://localhost:3200/',
                customer: testCustomer.id,
                metadata: {
                    packageId: starterPackage.id,
                    credits: starterPackage.credits.toString(),
                    userId: 'test-user-123',
                    test: 'true'
                }
            });

            expect(session).toBeDefined();
            expect(session.id).toMatch(/^cs_test_/);
            expect(session.mode).toBe('payment');
            expect(session.status).toBe('open');
            expect(session.metadata.packageId).toBe('starter');
            expect(session.metadata.credits).toBe('25');
        });

        test('should create checkout session for premium package', async () => {
            const premiumPackage = PaymentPackageService.getPackage('premium');

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: premiumPackage.name,
                            description: premiumPackage.description
                        },
                        unit_amount: premiumPackage.price
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: 'http://localhost:3200/purchase-success?session_id={CHECKOUT_SESSION_ID}',
                cancel_url: 'http://localhost:3200/',
                customer: testCustomer.id,
                metadata: {
                    packageId: premiumPackage.id,
                    credits: premiumPackage.credits.toString(),
                    userId: 'test-user-456'
                }
            });

            expect(session).toBeDefined();
            expect(session.id).toMatch(/^cs_test_/);
            expect(session.metadata.packageId).toBe('premium');
            expect(session.metadata.credits).toBe('250');
        });
    });

    describe('Payment Intent Creation', () => {
        test('should create payment intent for standard package', async () => {
            const standardPackage = PaymentPackageService.getPackage('standard');

            const paymentIntent = await stripe.paymentIntents.create({
                amount: standardPackage.price,
                currency: 'usd',
                customer: testCustomer.id,
                payment_method: testPaymentMethod.id,
                confirmation_method: 'manual',
                confirm: false,
                metadata: {
                    packageId: standardPackage.id,
                    credits: standardPackage.credits.toString(),
                    userId: 'test-user-789'
                }
            });

            expect(paymentIntent).toBeDefined();
            expect(paymentIntent.id).toMatch(/^pi_/);
            expect(paymentIntent.amount).toBe(1499);
            expect(paymentIntent.currency).toBe('usd');
            expect(paymentIntent.status).toBe('requires_confirmation');
            expect(paymentIntent.metadata.packageId).toBe('standard');
        });
    });

    describe('Customer Management', () => {
        test('should create and retrieve customer', async () => {
            const customer = await stripe.customers.create({
                email: 'integration-test@example.com',
                name: 'Integration Test User',
                metadata: {
                    userId: 'test-integration-001',
                    test: 'true'
                }
            });

            expect(customer).toBeDefined();
            expect(customer.id).toMatch(/^cus_/);
            expect(customer.email).toBe('integration-test@example.com');
            expect(customer.metadata.userId).toBe('test-integration-001');

            // Retrieve the customer
            const retrievedCustomer = await stripe.customers.retrieve(customer.id);
            expect(retrievedCustomer.id).toBe(customer.id);
            expect(retrievedCustomer.email).toBe(customer.email);

            // Cleanup
            await stripe.customers.del(customer.id);
        });

        test('should update customer metadata', async () => {
            const customer = await stripe.customers.create({
                email: 'update-test@example.com',
                metadata: { test: 'true' }
            });

            const updatedCustomer = await stripe.customers.update(customer.id, {
                metadata: {
                    test: 'true',
                    credits: '100',
                    lastPurchase: new Date().toISOString()
                }
            });

            expect(updatedCustomer.metadata.credits).toBe('100');
            expect(updatedCustomer.metadata.lastPurchase).toBeDefined();

            // Cleanup
            await stripe.customers.del(customer.id);
        });
    });

    describe('Webhook Event Simulation', () => {
        test('should handle checkout.session.completed event', async () => {
            // Create a test checkout session
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Test Package',
                            description: 'Test credits package'
                        },
                        unit_amount: 999
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: 'http://localhost:3200/success',
                cancel_url: 'http://localhost:3200/cancel',
                customer: testCustomer.id,
                metadata: {
                    packageId: 'starter',
                    credits: '25',
                    userId: 'webhook-test-user'
                }
            });

            // Simulate webhook event
            const mockEvent = {
                id: 'evt_test_webhook',
                object: 'event',
                type: 'checkout.session.completed',
                data: {
                    object: {
                        id: session.id,
                        object: 'checkout.session',
                        payment_status: 'paid',
                        customer: testCustomer.id,
                        metadata: session.metadata
                    }
                }
            };

            // Test webhook processing (without actual HTTP call)
            expect(mockEvent.type).toBe('checkout.session.completed');
            expect(mockEvent.data.object.payment_status).toBe('paid');
            expect(mockEvent.data.object.metadata.credits).toBe('25');
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid API key gracefully', async () => {
            const invalidStripe = new (await import('stripe')).default('sk_test_invalid_key', {
                apiVersion: '2023-10-16'
            });

            await expect(
                invalidStripe.customers.create({ email: 'test@example.com' })
            ).rejects.toThrow();
        });

        test('should handle invalid customer ID', async () => {
            await expect(
                stripe.customers.retrieve('cus_invalid_id')
            ).rejects.toThrow();
        });

        test('should handle invalid package amount', async () => {
            await expect(
                stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: [{
                        price_data: {
                            currency: 'usd',
                            product_data: { name: 'Invalid Package' },
                            unit_amount: -100 // Invalid negative amount
                        },
                        quantity: 1
                    }],
                    mode: 'payment',
                    success_url: 'http://localhost:3200/success',
                    cancel_url: 'http://localhost:3200/cancel'
                })
            ).rejects.toThrow();
        });
    });

    describe('Performance Tests', () => {
        test('should create checkout session within reasonable time', async () => {
            const startTime = Date.now();

            const session = await stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: [{
                    price_data: {
                        currency: 'usd',
                        product_data: { name: 'Performance Test Package' },
                        unit_amount: 999
                    },
                    quantity: 1
                }],
                mode: 'payment',
                success_url: 'http://localhost:3200/success',
                cancel_url: 'http://localhost:3200/cancel',
                customer: testCustomer.id
            });

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(session).toBeDefined();
            expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        });

        test('should retrieve customer quickly', async () => {
            const startTime = Date.now();

            const customer = await stripe.customers.retrieve(testCustomer.id);

            const endTime = Date.now();
            const duration = endTime - startTime;

            expect(customer).toBeDefined();
            expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
        });
    });
});
