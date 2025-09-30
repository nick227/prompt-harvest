#!/usr/bin/env node

/**
 * Auto-populate word_types on Railway startup
 */

import { PrismaClient } from '@prisma/client';
import { fullWordTypesData } from '../src/data/full-word-types-data.js';

const prisma = new PrismaClient();

export async function autoPopulateWordTypes() {
    try {
        // Check if we're on Railway
        const isRailway = process.env.RAILWAY_ENVIRONMENT || process.env.DATABASE_URL?.includes('railway.internal');

        if (!isRailway) {
            console.log('ℹ️ Not on Railway, skipping word_types auto-population');
            return;
        }

        console.log('🔍 Checking Railway word_types table...');

        // Check current count
        const currentCount = await prisma.word_types.count();
        console.log(`📊 Current word_types count: ${currentCount}`);

        if (currentCount === 0) {
            console.log('📥 Railway word_types table is empty, populating...');

            // Insert data in batches to avoid memory issues
            const batchSize = 100;
            const totalRecords = fullWordTypesData.length;

            console.log(`📥 Inserting ${totalRecords} word_types records in batches of ${batchSize}...`);

            for (let i = 0; i < totalRecords; i += batchSize) {
                const batch = fullWordTypesData.slice(i, i + batchSize);

                await prisma.word_types.createMany({
                    data: batch.map(record => ({
                        word: record.word,
                        types: record.types
                    })),
                    skipDuplicates: true
                });

                const processed = Math.min(i + batchSize, totalRecords);
                console.log(`📦 Processed ${processed}/${totalRecords} records`);
            }

            const newCount = await prisma.word_types.count();
            console.log(`✅ Populated Railway word_types with ${newCount} records`);
        } else {
            console.log(`✅ Railway word_types already has ${currentCount} records`);
        }

    } catch (error) {
        console.error('❌ Auto-populate word_types failed:', error.message);
        // Don't throw - this shouldn't prevent server startup
    }
}
