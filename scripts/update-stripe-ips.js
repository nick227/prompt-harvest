#!/usr/bin/env node

/**
 * Stripe IP Update Script
 * Automatically updates Stripe IP addresses
 * Can be run as a cron job or scheduled task
 */

import { stripeIPManager } from '../src/services/StripeIPManager.js';

async function updateStripeIPs() {
    try {
        console.log('🔄 STRIPE-IP-UPDATER: Starting IP update process...');

        // Force refresh IP addresses
        const ipData = await stripeIPManager.refreshIPs();

        console.log('✅ STRIPE-IP-UPDATER: IP addresses updated successfully');
        console.log(`📊 STRIPE-IP-UPDATER: Total IPs: ${ipData.allIPs.length}`);
        console.log(`📊 STRIPE-IP-UPDATER: Webhook IPs: ${ipData.webhookIPs.length}`);
        console.log(`📊 STRIPE-IP-UPDATER: API IPs: ${ipData.apiIPs.length}`);
        console.log(`📊 STRIPE-IP-UPDATER: Last updated: ${ipData.lastUpdated}`);

        // Log the IP addresses for verification
        console.log('\n📋 STRIPE-IP-UPDATER: Current webhook IPs:');
        ipData.webhookIPs.forEach(ip => console.log(`  - ${ip}`));

        console.log('\n📋 STRIPE-IP-UPDATER: Current API IPs:');
        ipData.apiIPs.forEach(ip => console.log(`  - ${ip}`));

        return {
            success: true,
            ipCount: ipData.allIPs.length,
            lastUpdated: ipData.lastUpdated
        };

    } catch (error) {
        console.error('❌ STRIPE-IP-UPDATER: Error updating IP addresses:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    updateStripeIPs()
        .then((result) => {
            if (result.success) {
                console.log('🎉 STRIPE-IP-UPDATER: Update completed successfully');
                process.exit(0);
            } else {
                console.error('💥 STRIPE-IP-UPDATER: Update failed');
                process.exit(1);
            }
        })
        .catch((error) => {
            console.error('💥 STRIPE-IP-UPDATER: Fatal error:', error);
            process.exit(1);
        });
}

export { updateStripeIPs };
