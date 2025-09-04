#!/usr/bin/env node

/**
 * Backend Security and Performance Test Script
 * Tests the hardened backend implementation
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3200';
const TEST_USER_SESSION = 'test-session-id'; // Replace with actual session

class BackendTester {
    constructor() {
        this.results = {
            security: [],
            performance: [],
            validation: [],
            errors: []
        };
    }

    /**
     * Test rate limiting functionality
     */
    async testRateLimiting() {
        console.log('🛡️ Testing Rate Limiting...');

        try {
            // Test general rate limiting
            const promises = Array(10).fill().map(async (_, i) => {
                try {
                    const response = await axios.get(`${BASE_URL}/api/credits/balance`, {
                        timeout: 5000
                    });
                    return { success: true, status: response.status, index: i };
                } catch (error) {
                    return {
                        success: false,
                        status: error.response?.status || 0,
                        index: i,
                        error: error.message
                    };
                }
            });

            const results = await Promise.all(promises);
            const successCount = results.filter(r => r.success).length;
            const rateLimitedCount = results.filter(r => r.status === 429).length;

            this.results.security.push({
                test: 'Rate Limiting',
                passed: rateLimitedCount === 0, // Should not be rate limited for normal requests
                details: `${successCount} successful, ${rateLimitedCount} rate limited`
            });

        } catch (error) {
            this.results.errors.push({
                test: 'Rate Limiting',
                error: error.message
            });
        }
    }

    /**
     * Test input validation
     */
    async testInputValidation() {
        console.log('🔍 Testing Input Validation...');

        const testCases = [
            {
                name: 'Promo Code - XSS Attempt',
                endpoint: '/api/credits/redeem',
                method: 'POST',
                data: { promoCode: '<script>alert("xss")</script>' },
                expectedStatus: 400
            },
            {
                name: 'Promo Code - SQL Injection Attempt',
                endpoint: '/api/credits/redeem',
                method: 'POST',
                data: { promoCode: "'; DROP TABLE users; --" },
                expectedStatus: 400
            },
            {
                name: 'Promo Code - Too Long',
                endpoint: '/api/credits/redeem',
                method: 'POST',
                data: { promoCode: 'A'.repeat(100) },
                expectedStatus: 400
            },
            {
                name: 'Purchase - Invalid Package ID',
                endpoint: '/api/credits/purchase',
                method: 'POST',
                data: {
                    packageId: '../../../etc/passwd',
                    successUrl: 'http://example.com',
                    cancelUrl: 'http://example.com'
                },
                expectedStatus: 400
            },
            {
                name: 'Purchase - Invalid URLs',
                endpoint: '/api/credits/purchase',
                method: 'POST',
                data: {
                    packageId: 'standard',
                    successUrl: 'not-a-url',
                    cancelUrl: 'http://example.com'
                },
                expectedStatus: 400
            }
        ];

        for (const testCase of testCases) {
            try {
                const response = await axios({
                    method: testCase.method,
                    url: `${BASE_URL}${testCase.endpoint}`,
                    data: testCase.data,
                    timeout: 5000,
                    validateStatus: () => true // Don't throw on error status
                });

                const passed = response.status === testCase.expectedStatus;
                this.results.validation.push({
                    test: testCase.name,
                    passed,
                    expected: testCase.expectedStatus,
                    actual: response.status,
                    details: response.data?.error || 'No error message'
                });

            } catch (error) {
                this.results.errors.push({
                    test: testCase.name,
                    error: error.message
                });
            }
        }
    }

    /**
     * Test API performance
     */
    async testPerformance() {
        console.log('⚡ Testing Performance...');

        const endpoints = [
            { path: '/api/credits/balance', method: 'GET' },
            { path: '/api/credits/packages', method: 'GET' },
            { path: '/api/credits/history?limit=10', method: 'GET' }
        ];

        for (const endpoint of endpoints) {
            try {
                const start = performance.now();

                const response = await axios({
                    method: endpoint.method,
                    url: `${BASE_URL}${endpoint.path}`,
                    timeout: 10000
                });

                const duration = performance.now() - start;
                const passed = duration < 1000; // Should respond within 1 second

                this.results.performance.push({
                    endpoint: endpoint.path,
                    method: endpoint.method,
                    duration: Math.round(duration),
                    passed,
                    status: response.status
                });

            } catch (error) {
                this.results.errors.push({
                    test: `Performance - ${endpoint.path}`,
                    error: error.message
                });
            }
        }
    }

    /**
     * Test security headers
     */
    async testSecurityHeaders() {
        console.log('🔒 Testing Security Headers...');

        try {
            const response = await axios.get(`${BASE_URL}/api/credits/packages`);
            const headers = response.headers;

            const expectedHeaders = [
                'x-frame-options',
                'x-content-type-options',
                'x-xss-protection',
                'referrer-policy'
            ];

            const missingHeaders = expectedHeaders.filter(header => !headers[header]);
            const passed = missingHeaders.length === 0;

            this.results.security.push({
                test: 'Security Headers',
                passed,
                details: passed ? 'All security headers present' : `Missing: ${missingHeaders.join(', ')}`
            });

        } catch (error) {
            this.results.errors.push({
                test: 'Security Headers',
                error: error.message
            });
        }
    }

    /**
     * Test webhook security
     */
    async testWebhookSecurity() {
        console.log('🎣 Testing Webhook Security...');

        try {
            // Test webhook without signature
            const response = await axios({
                method: 'POST',
                url: `${BASE_URL}/webhooks/stripe`,
                data: { fake: 'data' },
                headers: { 'content-type': 'application/json' },
                timeout: 5000,
                validateStatus: () => true
            });

            const passed = response.status === 400; // Should reject without signature

            this.results.security.push({
                test: 'Webhook Signature Validation',
                passed,
                expected: 400,
                actual: response.status,
                details: 'Webhook should reject requests without valid signature'
            });

        } catch (error) {
            this.results.errors.push({
                test: 'Webhook Security',
                error: error.message
            });
        }
    }

    /**
     * Test environment configuration
     */
    testEnvironmentConfig() {
        console.log('🌍 Testing Environment Configuration...');

        const requiredEnvVars = [
            'STRIPE_SECRET_TEST_KEY',
            'STRIPE_WEBHOOK_SECRET_TEST',
            'STRIPE_PUBLISHABLE_TEST_KEY',
            'MYSQL_URL'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        const passed = missingVars.length === 0;

        this.results.security.push({
            test: 'Environment Configuration',
            passed,
            details: passed ? 'All required environment variables present' : `Missing: ${missingVars.join(', ')}`
        });
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🚀 Starting Backend Security & Performance Tests...\n');

        await this.testRateLimiting();
        await this.testInputValidation();
        await this.testPerformance();
        await this.testSecurityHeaders();
        await this.testWebhookSecurity();
        this.testEnvironmentConfig();

        this.printResults();
    }

    /**
     * Print test results
     */
    printResults() {
        console.log('\n📊 TEST RESULTS:\n');

        // Security Tests
        console.log('🛡️ SECURITY TESTS:');
        this.results.security.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`  ${status} ${result.test}: ${result.details}`);
        });

        // Validation Tests
        console.log('\n🔍 VALIDATION TESTS:');
        this.results.validation.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`  ${status} ${result.test}: Expected ${result.expected}, got ${result.actual}`);
        });

        // Performance Tests
        console.log('\n⚡ PERFORMANCE TESTS:');
        this.results.performance.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`  ${status} ${result.endpoint}: ${result.duration}ms (${result.method})`);
        });

        // Errors
        if (this.results.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            this.results.errors.forEach(error => {
                console.log(`  ❌ ${error.test}: ${error.error}`);
            });
        }

        // Summary
        const totalTests = this.results.security.length + this.results.validation.length + this.results.performance.length;
        const passedTests = [
            ...this.results.security,
            ...this.results.validation,
            ...this.results.performance
        ].filter(r => r.passed).length;

        const errorCount = this.results.errors.length;

        console.log(`\n📈 SUMMARY:`);
        console.log(`  Total Tests: ${totalTests}`);
        console.log(`  Passed: ${passedTests}`);
        console.log(`  Failed: ${totalTests - passedTests}`);
        console.log(`  Errors: ${errorCount}`);

        const successRate = Math.round((passedTests / totalTests) * 100);
        console.log(`  Success Rate: ${successRate}%`);

        if (successRate >= 90) {
            console.log('\n🎉 EXCELLENT: Backend security and performance are in great shape!');
        } else if (successRate >= 75) {
            console.log('\n👍 GOOD: Most tests passed, minor issues to address.');
        } else {
            console.log('\n⚠️ NEEDS ATTENTION: Several issues found that should be addressed.');
        }
    }
}

// Run tests
const tester = new BackendTester();
tester.runAllTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});
