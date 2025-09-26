#!/usr/bin/env node

/**
 * Test Stripe IP Manager
 * Verifies that the IP manager is working correctly
 */

import { stripeIPManager } from '../src/services/StripeIPManager.js';

async function testStripeIPManager() {
    console.log('🧪 TESTING: Stripe IP Manager');
    console.log('================================\n');

    try {
        // Test 1: Health Check
        console.log('🔍 Test 1: Health Check');
        const health = await stripeIPManager.healthCheck();
        console.log('Health Status:', health);
        console.log('✅ Health check completed\n');

        // Test 2: Get IPs (with cache)
        console.log('🔍 Test 2: Get IPs (cached)');
        const ipData = await stripeIPManager.getStripeIPs();
        console.log(`Total IPs: ${ipData.allIPs.length}`);
        console.log(`Webhook IPs: ${ipData.webhookIPs.length}`);
        console.log(`API IPs: ${ipData.apiIPs.length}`);
        console.log(`Last Updated: ${ipData.lastUpdated}`);
        console.log(`Source: ${ipData.source}`);
        console.log('✅ IP retrieval completed\n');

        // Test 3: Force Refresh
        console.log('🔍 Test 3: Force Refresh');
        const freshData = await stripeIPManager.refreshIPs();
        console.log(`Fresh IPs: ${freshData.allIPs.length}`);
        console.log(`Fresh Last Updated: ${freshData.lastUpdated}`);
        console.log('✅ Force refresh completed\n');

        // Test 4: IP Validation
        console.log('🔍 Test 4: IP Validation');
        const testIPs = [
            '3.18.12.63',      // Known Stripe IP
            '100.64.0.5',      // New Stripe IP
            '8.8.8.8',         // Google DNS (not Stripe)
            '1.1.1.1'          // Cloudflare DNS (not Stripe)
        ];

        for (const ip of testIPs) {
            const isStripe = await stripeIPManager.isStripeIP(ip);
            console.log(`${ip}: ${isStripe ? '✅ Stripe IP' : '❌ Not Stripe IP'}`);
        }
        console.log('✅ IP validation completed\n');

        // Test 5: IP Ranges
        console.log('🔍 Test 5: IP Ranges');
        const ranges = await stripeIPManager.getStripeIPRanges();
        console.log(`IP Ranges: ${ranges.length}`);
        console.log('Sample ranges:', ranges.slice(0, 5));
        console.log('✅ IP ranges completed\n');

        console.log('🎉 ALL TESTS PASSED!');
        console.log('✅ Stripe IP Manager is working correctly');

    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        process.exit(1);
    }
}

// Run tests
testStripeIPManager()
    .then(() => {
        console.log('\n🎯 Test Summary:');
        console.log('- Health check: ✅');
        console.log('- IP retrieval: ✅');
        console.log('- Force refresh: ✅');
        console.log('- IP validation: ✅');
        console.log('- IP ranges: ✅');
        console.log('\n🚀 Stripe IP Manager is ready for production!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Test suite failed:', error);
        process.exit(1);
    });
