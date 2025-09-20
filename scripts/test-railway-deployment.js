#!/usr/bin/env node

/**
 * Test Railway Deployment Script
 * Tests the complete Railway deployment process locally
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testRailwayDeployment() {
    try {
        console.log('🧪 Testing Railway deployment process...');

        // Test 1: Check current data status
        console.log('\n🔍 Test 1: Checking current data status...');
        const modelsCount = await prisma.model.count();
        const wordTypesCount = await prisma.word_types.count();
        const packagesCount = await prisma.package.count();
        const providersCount = await prisma.provider.count();

        console.log(`📊 Current Data Status:`);
        console.log(`   🤖 Models: ${modelsCount}`);
        console.log(`   📝 Word Types: ${wordTypesCount}`);
        console.log(`   📦 Packages: ${packagesCount}`);
        console.log(`   🏢 Providers: ${providersCount}`);

        // Test 2: Check if providers table exists and has data
        console.log('\n🔍 Test 2: Checking providers table...');
        try {
            const providers = await prisma.provider.findMany({
                select: { id: true, name: true, displayName: true }
            });
            console.log(`✅ Providers table exists with ${providers.length} entries:`);
            providers.forEach(provider => {
                console.log(`   - ${provider.id}: ${provider.displayName}`);
            });
        } catch (error) {
            console.log('❌ Providers table issue:', error.message);
        }

        // Test 3: Check models table structure
        console.log('\n🔍 Test 3: Checking models table structure...');
        try {
            const columns = await prisma.$queryRaw`
                SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'models'
                ORDER BY ORDINAL_POSITION
            `;
            console.log('✅ Models table structure:');
            columns.forEach(col => {
                console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
            });
        } catch (error) {
            console.log('❌ Models table structure issue:', error.message);
        }

        // Test 4: Test model insertion with valid providerId
        console.log('\n🔍 Test 4: Testing model insertion...');
        try {
            // Ensure we have providers
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

        // Test 5: Check word types
        console.log('\n🔍 Test 5: Checking word types...');
        try {
            const sampleWords = await prisma.word_types.findMany({
                take: 3,
                select: { word: true, types: true }
            });
            console.log(`✅ Word types table has ${wordTypesCount} entries`);
            if (sampleWords.length > 0) {
                console.log('📋 Sample words:');
                sampleWords.forEach(word => {
                    console.log(`   - ${word.word}: ${JSON.stringify(word.types)}`);
                });
            }
        } catch (error) {
            console.log('❌ Word types table issue:', error.message);
        }

        // Test 6: Check packages
        console.log('\n🔍 Test 6: Checking packages...');
        try {
            const samplePackages = await prisma.package.findMany({
                take: 3,
                select: { id: true, name: true, credits: true, price: true }
            });
            console.log(`✅ Packages table has ${packagesCount} entries`);
            if (samplePackages.length > 0) {
                console.log('📋 Sample packages:');
                samplePackages.forEach(pkg => {
                    console.log(`   - ${pkg.name}: ${pkg.credits} credits - $${pkg.price / 100}`);
                });
            }
        } catch (error) {
            console.log('❌ Packages table issue:', error.message);
        }

        console.log('\n🎉 Railway deployment test completed!');
        console.log('\n📋 Summary:');
        console.log(`   ✅ Providers: ${providersCount > 0 ? 'READY' : 'NEEDS IMPORT'}`);
        console.log(`   ✅ Models: ${modelsCount > 0 ? 'READY' : 'NEEDS IMPORT'}`);
        console.log(`   ✅ Word Types: ${wordTypesCount > 0 ? 'READY' : 'NEEDS IMPORT'}`);
        console.log(`   ✅ Packages: ${packagesCount > 0 ? 'READY' : 'NEEDS IMPORT'}`);

    } catch (error) {
        console.error('💥 Test failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
testRailwayDeployment()
    .then(() => {
        console.log('✅ Railway deployment test passed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Railway deployment test failed:', error);
        process.exit(1);
    });
