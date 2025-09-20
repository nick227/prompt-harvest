#!/usr/bin/env node

/**
 * E2E Test Runner
 * 
 * Simple script to run the end-to-end test for Dezgo AI + Cloudflare R2 + Database
 */

import { runE2ETest } from './test-e2e-dezgo-cloudflare-database.js';

console.log('🚀 Starting E2E Test Runner...\n');

runE2ETest()
    .then(result => {
        if (result.success) {
            console.log('\n✅ E2E Test Result: SUCCESS');
            console.log(`📊 Test Summary:`);
            console.log(`   Duration: ${result.duration}ms`);
            console.log(`   Image ID: ${result.imageId}`);
            console.log(`   Image URL: ${result.imageUrl}`);
            console.log(`   Database: ✅ Valid row created`);
            console.log(`   Cloudflare R2: ✅ Image uploaded`);
            console.log(`   Dezgo AI: ✅ Image generated`);
            process.exit(0);
        } else {
            console.log('\n❌ E2E Test Result: FAILED');
            console.log(`📊 Test Summary:`);
            console.log(`   Duration: ${result.duration}ms`);
            console.log(`   Error: ${result.error}`);
            console.log(`   Steps Completed: ${Object.keys(result.steps || {}).length}`);
            console.log(`   Errors: ${result.errors?.length || 0}`);
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 E2E Test Result: CRASHED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    });
