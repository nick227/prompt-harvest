#!/usr/bin/env node

/**
 * Debug Word Matching Logic
 * Run: node scripts/debug-word-matching.js
 *
 * This script debugs the word matching logic to understand why we're getting strange results.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugWordMatching() {
    try {
        console.log('🔍 Debugging word matching logic...\n');

        const testWords = ['test', 'light', 'movie'];

        for (const word of testWords) {
            console.log(`\n📝 Testing word: "${word}"`);

            // Get all word records to search through
            const allWordRecords = await prisma.word_types.findMany({
                take: 100 // Limit for debugging
            });

            const results = [];
            const searchWord = word.toLowerCase();

            console.log(`   Searching for: "${searchWord}"`);

            // Search through all records like the original implementation
            allWordRecords.forEach(record => {
                const recordWord = record.word.toLowerCase();

                // Check if word matches the record word (exact or starts with)
                if (recordWord === searchWord || recordWord.startsWith(searchWord)) {
                    if (!results.includes(record.word)) {
                        results.push(record.word);
                        console.log(`   ✅ Found main word match: "${record.word}"`);
                    }
                }

                // Check if word is in the types array
                try {
                    const typesArray = JSON.parse(record.types);
                    if (typesArray && Array.isArray(typesArray)) {
                        const hasMatch = typesArray.some(type => {
                            if (typeof type !== 'string') return false;
                            return type.toLowerCase().includes(searchWord);
                        });

                        if (hasMatch && record.word && !results.includes(record.word)) {
                            results.push(record.word);
                            console.log(`   ✅ Found types match: "${record.word}"`);

                            // Show which types matched
                            const matchingTypes = typesArray.filter(type =>
                                typeof type === 'string' && type.toLowerCase().includes(searchWord)
                            );
                            console.log(`      Matching types: ${matchingTypes.slice(0, 3).join(', ')}...`);
                        }
                    }
                } catch (parseError) {
                    console.warn(`   ⚠️ Failed to parse types for "${record.word}": ${parseError.message}`);
                }
            });

            // Sort results: exact matches first, then startsWith matches, then by length (shorter first)
            results.sort((a, b) => {
                const aIsExact = a.toLowerCase() === searchWord;
                const bIsExact = b.toLowerCase() === searchWord;

                if (aIsExact && !bIsExact) { return -1; }
                if (!aIsExact && bIsExact) { return 1; }

                const aStartsWith = a.toLowerCase().startsWith(searchWord);
                const bStartsWith = b.toLowerCase().startsWith(searchWord);

                if (aStartsWith && !bStartsWith) { return -1; }
                if (!aStartsWith && bStartsWith) { return 1; }

                // Then sort by length (shorter first)
                return a.length - b.length;
            });

            // Limit results
            const limitedResults = results.slice(0, 8);

            console.log(`   📊 Final results (${limitedResults.length}): ${JSON.stringify(limitedResults)}`);
        }

    } catch (error) {
        console.error('💥 Error debugging word matching:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the debug
debugWordMatching()
    .then(() => {
        console.log('\n✨ Debug completed');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Debug failed:', error);
        process.exit(1);
    });

export { debugWordMatching };
