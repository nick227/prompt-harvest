#!/usr/bin/env node

/**
 * Model Testing Runner
 *
 * Simple script to run model validation and profiling tests.
 * Usage: node test-models.js [simple|validator|profiler|all]
 */

import SimpleModelValidator from './tests/simple-model-validator.js';
import ModelEndpointValidator from './tests/model-endpoint-validator.js';
import DezgoModelProfiler from './tests/dezgo-model-profiler.js';

const command = process.argv[2] || 'simple';

async function runSimpleValidator() {
    console.log('🔍 Running Simple Model Validator...\n');
    const validator = new SimpleModelValidator();
    await validator.validateAllModels();
}

async function runValidator() {
    console.log('🔍 Running Model Endpoint Validator...\n');
    const validator = new ModelEndpointValidator();
    await validator.validateAllModels();
    validator.exportResults();
}

async function runProfiler() {
    console.log('🚀 Running Dezgo Model Profiler...\n');
    const profiler = new DezgoModelProfiler();
    await profiler.profileAllDezgoModels();
}

async function runAll() {
    console.log('🧪 Running All Model Tests...\n');

    try {
        await runSimpleValidator();
        console.log('\n' + '='.repeat(80) + '\n');
        await runValidator();
        console.log('\n' + '='.repeat(80) + '\n');
        await runProfiler();

        console.log('\n✅ All tests completed successfully!');
        console.log('\n📁 Check the following files for detailed results:');
        console.log('  • simple-model-validation-results.json');
        console.log('  • model-validation-results.json');
        console.log('  • dezgo-model-profiling-results.json');

    } catch (error) {
        console.error('❌ Tests failed:', error);
        process.exit(1);
    }
}

// Run based on command
switch (command) {
    case 'simple':
        runSimpleValidator().catch(console.error);
        break;
    case 'validator':
        runValidator().catch(console.error);
        break;
    case 'profiler':
        runProfiler().catch(console.error);
        break;
    case 'all':
        runAll().catch(console.error);
        break;
    default:
        console.log('Usage: node test-models.js [simple|validator|profiler|all]');
        console.log('  simple    - Test model configurations (no API calls) - RECOMMENDED');
        console.log('  validator - Test model endpoints and configurations (requires API keys)');
        console.log('  profiler  - Profile Dezgo models for speed and reliability (requires API keys)');
        console.log('  all       - Run all tests (default)');
        process.exit(1);
}
