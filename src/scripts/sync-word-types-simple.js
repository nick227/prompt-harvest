#!/usr/bin/env node

/**
 * Simple Railway Word Types Sync
 * Uses Railway's DATABASE_URL environment variable
 */

import { PrismaClient } from '@prisma/client';

// Use Railway's DATABASE_URL
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

// Sample word types data (first 10 records for testing)
const sampleData = [
    { word: "event space", types: ["Music Festival", "Wedding Hall", "Conference Center"] },
    { word: "movie lights", types: ["Floodlights", "Spotlights", "Strobe lights"] },
    { word: "detailed examples", types: ["Photos", "Screenshots", "Examples"] }
];

async function syncWordTypes() {
    console.log('🔄 Starting simple word_types sync...');

    try {
        console.log('📊 Testing database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');

        console.log('📊 Checking word_types table...');
        const count = await prisma.word_types.count();
        console.log(`📊 Current word_types count: ${count}`);

        if (count === 0) {
            console.log('📥 Inserting sample data...');
            await prisma.word_types.createMany({
                data: sampleData,
                skipDuplicates: true
            });
            console.log('✅ Sample data inserted');
        } else {
            console.log('ℹ️ Data already exists, skipping insertion');
        }

        // Verify
        const finalCount = await prisma.word_types.count();
        console.log(`✅ Final word_types count: ${finalCount}`);

    } catch (error) {
        console.error('❌ Sync failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

syncWordTypes()
    .then(() => {
        console.log('✨ Sync completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Sync failed:', error);
        process.exit(1);
    });
