#!/usr/bin/env node

/**
 * Verify Restoration
 * Run: node scripts/verify-restoration.js
 *
 * This script verifies that both models and word_types have been properly restored.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRestoration() {
    try {
        console.log('🔍 Verifying restoration...\n');

        // Check Models
        console.log('📊 MODELS VERIFICATION:');
        const modelCount = await prisma.model.count();
        console.log(`   Total models: ${modelCount}`);

        if (modelCount > 0) {
            const modelsByProvider = await prisma.model.groupBy({
                by: ['provider'],
                _count: { provider: true }
            });

            console.log('   Models by provider:');
            modelsByProvider.forEach(group => {
                console.log(`     ${group.provider}: ${group._count.provider} models`);
            });

            // Show sample models
            const sampleModels = await prisma.model.findMany({
                take: 3,
                select: {
                    name: true,
                    provider: true,
                    displayName: true,
                    costPerImage: true,
                    isActive: true
                }
            });

            console.log('   Sample models:');
            sampleModels.forEach(model => {
                console.log(`     ${model.provider}/${model.name}: ${model.displayName} (${model.costPerImage} credits)`);
            });
        } else {
            console.log('   ❌ No models found!');
        }

        console.log('');

        // Check Word Types
        console.log('📚 WORD TYPES VERIFICATION:');
        const wordTypesCount = await prisma.word_types.count();
        console.log(`   Total word types: ${wordTypesCount}`);

        if (wordTypesCount > 0) {
            // Show sample word types
            const sampleWordTypes = await prisma.word_types.findMany({
                take: 5,
                select: {
                    word: true,
                    types: true,
                    createdAt: true
                }
            });

            console.log('   Sample word types:');
            sampleWordTypes.forEach(wordType => {
                const types = JSON.parse(wordType.types);
                console.log(`     "${wordType.word}": ${types.length} types`);
            });

            // Check for any corrupted entries by sampling
            const allWordTypes = await prisma.word_types.findMany({
                select: {
                    word: true,
                    types: true
                }
            });

            let corruptedCount = 0;
            allWordTypes.forEach(wordType => {
                try {
                    JSON.parse(wordType.types);
                } catch (e) {
                    corruptedCount++;
                }
            });

            if (corruptedCount > 0) {
                console.log(`   ⚠️ Found ${corruptedCount} potentially corrupted entries`);
            } else {
                console.log('   ✅ No corrupted entries found');
            }
        } else {
            console.log('   ❌ No word types found!');
        }

        console.log('');

        // Overall Status
        console.log('🎯 OVERALL STATUS:');
        if (modelCount > 0 && wordTypesCount > 0) {
            console.log('   ✅ Restoration appears successful!');
            console.log('   ✅ Both models and word types have been restored');
        } else {
            console.log('   ❌ Restoration incomplete!');
            if (modelCount === 0) console.log('   ❌ Models missing');
            if (wordTypesCount === 0) console.log('   ❌ Word types missing');
        }

        // Check database connectivity
        console.log('\n🔗 DATABASE CONNECTIVITY:');
        try {
            await prisma.$queryRaw`SELECT 1`;
            console.log('   ✅ Database connection is working');
        } catch (dbError) {
            console.log('   ❌ Database connection failed:', dbError.message);
        }

    } catch (error) {
        console.error('💥 Error during verification:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the verification
verifyRestoration()
    .then(() => {
        console.log('\n✨ Verification completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Verification failed:', error);
        process.exit(1);
    });

export { verifyRestoration };
