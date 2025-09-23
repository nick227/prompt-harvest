#!/usr/bin/env node

/**
 * Test Model Interface
 * Run: node scripts/test-model-interface.js
 *
 * This script tests that the ModelInterface can properly access the restored models.
 */

import modelInterface from '../src/services/ModelInterface.js';

async function testModelInterface() {
    try {
        console.log('🧪 Testing Model Interface...\n');

        // Test getting all models
        console.log('📊 Testing getAllModels():');
        const allModels = await modelInterface.getAllModels();
        console.log(`   Found ${allModels.length} models`);

        if (allModels.length > 0) {
            // Group by provider
            const modelsByProvider = {};
            allModels.forEach(model => {
                if (!modelsByProvider[model.provider]) {
                    modelsByProvider[model.provider] = [];
                }
                modelsByProvider[model.provider].push(model.name);
            });

            console.log('   Models by provider:');
            Object.entries(modelsByProvider).forEach(([provider, models]) => {
                console.log(`     ${provider}: ${models.length} models`);
            });

            // Test getting a specific model
            console.log('\n🔍 Testing getModel():');
            const testModel = allModels[0];
            const retrievedModel = await modelInterface.getModel(testModel.name);

            if (retrievedModel) {
                console.log(`   ✅ Successfully retrieved model: ${retrievedModel.provider}/${retrievedModel.name}`);
                console.log(`   Display name: ${retrievedModel.displayName}`);
                console.log(`   Cost: ${retrievedModel.costPerImage} credits`);
                console.log(`   Active: ${retrievedModel.isActive}`);
            } else {
                console.log('   ❌ Failed to retrieve test model');
            }

            // Test getting models by provider
            console.log('\n🏷️ Testing getModelsByProvider():');
            const providers = Object.keys(modelsByProvider);
            const testProvider = providers[0];
            const providerModels = await modelInterface.getModelsByProvider(testProvider);
            console.log(`   Found ${providerModels.length} models for provider: ${testProvider}`);

            // Test model validation
            console.log('\n✅ Testing isModelValid():');
            const validModel = allModels.find(m => m.isActive);
            if (validModel) {
                const isValid = await modelInterface.isModelValid(validModel.name);
                console.log(`   Model ${validModel.name} is valid: ${isValid}`);
            }

            // Test invalid model
            const invalidModelCheck = await modelInterface.isModelValid('nonexistent-model');
            console.log(`   Nonexistent model is valid: ${invalidModelCheck}`);

        } else {
            console.log('   ❌ No models found!');
        }

        console.log('\n🎉 Model Interface test completed successfully!');

    } catch (error) {
        console.error('💥 Error testing Model Interface:', error);
        throw error;
    }
}

// Run the test
testModelInterface()
    .then(() => {
        console.log('\n✨ All tests passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Tests failed:', error);
        process.exit(1);
    });

export { testModelInterface };
