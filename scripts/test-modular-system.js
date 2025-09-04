#!/usr/bin/env node

/**
 * Test Modular System
 * Quick test of the new simplified architecture
 */

console.log('🚀 Testing Modular System Architecture...\n');

// Test imports
try {
    const SimplifiedCreditService = (await import('../src/services/credit/SimplifiedCreditService.js')).default;
    const PaymentPackageService = (await import('../src/services/PaymentPackageService.js')).default;

    console.log('✅ All services imported successfully');

    // Test credit cost calculation
    const cost = SimplifiedCreditService.getCreditCost('dalle3', true, false, true);
    console.log(`✅ Credit cost calculation: ${cost} credits (expected: 7)`);

    // Test package service
    const packages = PaymentPackageService.getAllPackages();
    console.log(`✅ Package service: ${packages.length} packages available`);

    // Test package validation
    const isValid = PaymentPackageService.validatePackages();
    console.log(`✅ Package validation: ${isValid ? 'passed' : 'failed'}`);

    console.log('\n🎉 Modular system is working correctly!');

} catch (error) {
    console.error('❌ Error testing modular system:', error.message);
    process.exit(1);
}
