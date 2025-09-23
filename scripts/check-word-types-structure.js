#!/usr/bin/env node

/**
 * Check Word Types Data Structure
 * Run: node scripts/check-word-types-structure.js
 *
 * This script checks the structure of word types data in the database.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkWordTypesStructure() {
    try {
        console.log('🔍 Checking word types data structure...\n');

        // Get a few sample records
        const sampleRecords = await prisma.word_types.findMany({
            take: 3,
            select: {
                word: true,
                types: true
            }
        });

        console.log('📊 Sample records:');
        sampleRecords.forEach((record, index) => {
            console.log(`\nRecord ${index + 1}:`);
            console.log(`  Word: "${record.word}"`);
            console.log(`  Types type: ${typeof record.types}`);
            console.log(`  Types value: ${record.types}`);

            // Try to parse the types
            try {
                const parsedTypes = JSON.parse(record.types);
                console.log(`  Parsed types: Array with ${parsedTypes.length} items`);
                console.log(`  First few types: ${parsedTypes.slice(0, 3).join(', ')}`);
            } catch (parseError) {
                console.log(`  ❌ Failed to parse types: ${parseError.message}`);
            }
        });

        // Check the /words endpoint response
        console.log('\n🌐 Testing /words endpoint response...');
        const response = await fetch('http://localhost:3200/words');
        const wordsData = await response.json();

        if (wordsData && wordsData.length > 0) {
            const firstRecord = wordsData[0];
            console.log('\nFirst record from /words endpoint:');
            console.log(`  Word: "${firstRecord.word}"`);
            console.log(`  Types type: ${typeof firstRecord.types}`);
            console.log(`  Types value: ${firstRecord.types}`);

            if (Array.isArray(firstRecord.types)) {
                console.log(`  ✅ Types is an array with ${firstRecord.types.length} items`);
            } else {
                console.log(`  ❌ Types is not an array: ${typeof firstRecord.types}`);
            }
        }

    } catch (error) {
        console.error('💥 Error checking word types structure:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the check
checkWordTypesStructure()
    .then(() => {
        console.log('\n✨ Structure check completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Structure check failed:', error);
        process.exit(1);
    });

export { checkWordTypesStructure };
