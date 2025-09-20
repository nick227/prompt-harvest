#!/usr/bin/env node

/**
 * Test Railway Fix Script
 * Tests the foreign key constraint fix for providers table
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRailwayFix() {
    try {
        console.log('🧪 Testing Railway foreign key constraint fix...');

        // Test 1: Check if providers table exists and has data
        console.log('\n🔍 Test 1: Checking providers table...');
        try {
            const providersCount = await prisma.provider.count();
            console.log(`✅ Providers table exists with ${providersCount} entries`);

            if (providersCount > 0) {
                const providers = await prisma.provider.findMany({
                    select: { id: true, name: true, displayName: true }
                });
                console.log('📋 Available providers:');
                providers.forEach(provider => {
                    console.log(`   - ${provider.id}: ${provider.displayName}`);
                });
            }
        } catch (error) {
            console.log('❌ Providers table does not exist or has issues:', error.message);
        }

        // Test 2: Check if models table can reference providers
        console.log('\n🔍 Test 2: Checking models table foreign key...');
        try {
            const modelsCount = await prisma.model.count();
            console.log(`✅ Models table exists with ${modelsCount} entries`);

            if (modelsCount > 0) {
                const models = await prisma.model.findMany({
                    select: { id: true, provider: true, providerId: true, name: true },
                    take: 3
                });
                console.log('📋 Sample models:');
                models.forEach(model => {
                    console.log(`   - ${model.id}: provider=${model.provider}, providerId=${model.providerId}`);
                });
            }
        } catch (error) {
            console.log('❌ Models table has issues:', error.message);
        }

        // Test 3: Test inserting a model with valid providerId
        console.log('\n🔍 Test 3: Testing model insertion with valid providerId...');
        try {
            // First, ensure we have providers
            const providers = await prisma.provider.findMany();
            if (providers.length === 0) {
                console.log('⚠️ No providers found, creating test provider...');
                await prisma.provider.create({
                    data: {
                        id: 'test_provider',
                        name: 'Test Provider',
                        displayName: 'Test Provider',
                        description: 'Test provider for validation',
                        isActive: true
                    }
                });
                console.log('✅ Test provider created');
            }

            // Try to insert a test model
            const testModelId = 'test_model_' + Date.now();
            await prisma.model.create({
                data: {
                    id: testModelId,
                    provider: 'test_provider',
                    providerId: 'test_provider',
                    name: 'test_model',
                    displayName: 'Test Model',
                    description: 'Test model for validation',
                    costPerImage: 1,
                    isActive: true,
                    apiUrl: 'https://test.api.com',
                    apiModel: 'test-model',
                    apiSize: '1024x1024'
                }
            });
            console.log('✅ Test model inserted successfully');

            // Clean up test data
            await prisma.model.delete({ where: { id: testModelId } });
            console.log('🧹 Test model cleaned up');

        } catch (error) {
            console.log('❌ Model insertion test failed:', error.message);
        }

        console.log('\n🎉 Railway fix test completed!');

    } catch (error) {
        console.error('💥 Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testRailwayFix()
    .then(() => {
        console.log('✅ Railway fix test passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Railway fix test failed:', error);
        process.exit(1);
    });
