#!/usr/bin/env node

/**
 * Railway Build Script
 * Simple script to run the data check and import process
 */

console.log('🚀 Starting Railway build process...');
console.log('📋 This script will:');
console.log('   1. Check if models and word_types tables have data');
console.log('   2. Import fallback data if tables are empty');
console.log('   3. Fix table structure if needed');
console.log('   4. Verify the final state');
console.log('');

// Import and run the main deployment function
import('./railway-deploy-with-data-check.js')
    .then(() => {
        console.log('🎉 Railway build completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Railway build failed:', error);
        process.exit(1);
    });
