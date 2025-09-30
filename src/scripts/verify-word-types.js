#!/usr/bin/env node

/**
 * Verify Railway Word Types Data
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyWordTypes() {
    console.log('🔍 Verifying Railway word_types data...');

    try {
        const count = await prisma.word_types.count();
        console.log(`📊 Total word_types records: ${count}`);

        const samples = await prisma.word_types.findMany({
            take: 5,
            select: {
                word: true,
                types: true
            }
        });

        console.log('\n📋 Sample records:');
        samples.forEach((record, index) => {
            const typesPreview = JSON.stringify(record.types).substring(0, 100);
            console.log(`${index + 1}. "${record.word}" -> ${typesPreview}...`);
        });

        // Check for specific words
        const testWords = ['movie lights', 'event space', 'detailed examples'];
        console.log('\n🔍 Checking specific words:');

        for (const word of testWords) {
            const record = await prisma.word_types.findUnique({
                where: { word }
            });

            if (record) {
                console.log(`✅ "${word}" found with ${record.types.length} types`);
            } else {
                console.log(`❌ "${word}" not found`);
            }
        }

    } catch (error) {
        console.error('❌ Verification failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

verifyWordTypes()
    .then(() => {
        console.log('\n✨ Verification completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Verification failed:', error);
        process.exit(1);
    });
