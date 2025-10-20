#!/usr/bin/env node

/**
 * Railway Word Types Sync Script - Fixed Version
 *
 * This script runs ON Railway and syncs word_types data.
 * It uses the local database data and inserts it into Railway's database.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample word types data for testing (first 10 records)
const sampleWordTypes = [
    { word: 'movie lights', types: ['Floodlights', 'Spotlights', 'Strobe lights', 'Gobo lights', 'Dimmable lights', 'LED lights', 'Par lights', 'Moving lights', 'Black lights', 'UV lights'] },
    { word: 'event space', types: ['Music Festival', 'Wedding Hall', 'Conference Center', 'Art Gallery', 'Sports Stadium', 'Hotel Ballroom', 'Library Meeting Room', 'Restaurant Private Room', 'Corporate Office', 'Outdoor Park'] },
    { word: 'detailed examples', types: ['Photos', 'Screenshots', 'Examples', 'Samples', 'Demonstrations', 'Illustrations', 'Cases', 'Instances', 'References', 'Models'] },
    { word: 'biblical events', types: ['Creation of the World', 'Adam and Eve in the Garden of Eden', "Cain and Abel's offerings", "Noah's Ark and the flood", 'Tower of Babel', "God's Covenant with Abraham"] },
    { word: 'description modern desk', types: ['This modern desk features a clean, sleek design', 'Made of durable materials', 'Contemporary style furniture', 'Minimalist design approach'] },
    { word: 'skirts', types: ['A-line skirt', 'Accordion skirt', 'Asymmetrical skirt', 'Ballerina skirt', 'Bell skirt', 'Box pleat skirt', 'Circle skirt', 'Dirndl skirt'] },
    { word: 'cinestill 800tungsten', types: ['Photos taken under neon lights', 'Night cityscape shots', 'Low light forest photography', 'Sunset photo shoots', 'Candle-lit dinner photographs'] },
    { word: 'photography styles', types: ['Portrait photography', 'Landscape photography', 'Street photography', 'Macro photography', 'Architectural photography', 'Fashion photography'] },
    { word: 'lighting setups', types: ['Natural lighting', 'Studio lighting', 'Flash photography', 'Continuous lighting', 'LED panels', 'Softbox lighting'] },
    { word: 'color palettes', types: ['Warm tones', 'Cool tones', 'Monochromatic', 'Complementary colors', 'Analogous colors', 'Triadic colors'] }
];

async function syncWordTypesToRailway() {
    console.log('🔄 Starting word_types sync to Railway database...');

    try {
        // Test connection
        console.log('📊 Testing Railway database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Connected to Railway database');

        // Check current state
        const currentCount = await prisma.word_types.count();

        console.log(`📊 Current word_types count: ${currentCount}`);

        if (currentCount > 0) {
            console.log('ℹ️ Database already has data. Clearing existing data...');
            await prisma.word_types.deleteMany({});
            console.log('✅ Existing data cleared');
        }

        // Insert sample data
        console.log('📥 Inserting word_types data...');
        await prisma.word_types.createMany({
            data: sampleWordTypes,
            skipDuplicates: true
        });

        // Verify insertion
        const newCount = await prisma.word_types.count();

        console.log(`✅ Inserted ${newCount} word_types records`);

        // Show sample records
        console.log('\n📋 Sample records in Railway database:');
        const samples = await prisma.word_types.findMany({
            take: 5,
            select: {
                word: true,
                types: true
            }
        });

        samples.forEach((record, index) => {
            const typesPreview = JSON.stringify(record.types).substring(0, 80);

            console.log(`${index + 1}. "${record.word}" -> ${typesPreview}...`);
        });

        console.log('\n✨ Railway word_types sync completed successfully!');

    } catch (error) {
        console.error('❌ Sync failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the sync
syncWordTypesToRailway()
    .then(() => {
        console.log('🎉 All done! Railway database now has word_types data.');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Sync failed:', error);
        process.exit(1);
    });
