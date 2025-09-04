#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function checkStripeCLI() {
    try {
        // Check if Stripe CLI is installed
        await execAsync('stripe --version');
        console.log('✅ Stripe CLI is installed');

        // Check if Stripe CLI is already listening
        try {
            const { stdout } = await execAsync('netstat -an | findstr :13111');
            if (stdout.includes('LISTENING')) {
                console.log('✅ Stripe CLI is already running on port 13111');
                return;
            }
        } catch (error) {
            // netstat command failed or no listening process found
        }

        // Start Stripe CLI if not running
        console.log('🚀 Starting Stripe CLI...');
        console.log('📡 Running: stripe listen --forward-to localhost:3200/webhook');

        // Start Stripe CLI in background
        const stripeProcess = exec('stripe listen --forward-to localhost:3200/webhook', (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Stripe CLI error:', error);
                return;
            }
            console.log('Stripe CLI output:', stdout);
        });

        // Give it a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('✅ Stripe CLI should now be running');
        console.log('💡 Webhook secret will be displayed above');
        console.log('💡 Add it to your .env file as STRIPE_WEBHOOK_SECRET');

    } catch (error) {
        console.error('❌ Stripe CLI is not installed or not accessible');
        console.error('💡 Install it from: https://stripe.com/docs/stripe-cli');
        console.error('💡 Or run manually: stripe listen --forward-to localhost:3200/webhook');
        process.exit(1);
    }
}

// Run the check
checkStripeCLI().catch(console.error);
