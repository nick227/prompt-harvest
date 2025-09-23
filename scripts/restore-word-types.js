#!/usr/bin/env node

/**
 * Restore Word Types from NeDB
 * Run: node scripts/restore-word-types.js
 *
 * This script reads the nedb word-types.db file and restores the data to Prisma.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function restoreWordTypes() {
    try {
        console.log('🔄 Starting word types restoration...\n');

        const wordTypesDbPath = path.join(process.cwd(), 'data', 'word-types.db');

        // Check if the file exists
        if (!fs.existsSync(wordTypesDbPath)) {
            throw new Error(`Word types database file not found at: ${wordTypesDbPath}`);
        }

        console.log(`📂 Reading word types from: ${wordTypesDbPath}`);

        // Read the file content
        const fileContent = fs.readFileSync(wordTypesDbPath, 'utf8');

        // Split by lines and parse each JSON object
        const lines = fileContent.trim().split('\n').filter(line => line.trim());
        console.log(`📊 Found ${lines.length} word type entries to process`);

        // Clear existing word types
        console.log('🗑️ Clearing existing word types data...');
        await prisma.word_types.deleteMany({});

        let successCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        // Process each line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (!line) continue;

            try {
                // Parse the JSON object
                const wordTypeData = JSON.parse(line);

                // Extract the word and types
                const { word, types, _id, timestamp } = wordTypeData;

                if (!word || !types) {
                    console.log(`⏭️ Skipping entry ${i + 1}: missing word or types`);
                    skippedCount++;
                    continue;
                }

                // Check if word already exists (shouldn't happen after deleteMany, but just in case)
                const existingWordType = await prisma.word_types.findUnique({
                    where: { word }
                });

                if (existingWordType) {
                    console.log(`⏭️ Skipping existing word: ${word}`);
                    skippedCount++;
                    continue;
                }

                // Insert into MySQL database
                await prisma.word_types.create({
                    data: {
                        word,
                        types: JSON.stringify(types), // Store as JSON string
                        createdAt: timestamp?.$$date ? new Date(timestamp.$$date) : new Date(),
                        updatedAt: new Date()
                    }
                });

                successCount++;

                // Progress indicator
                if (successCount % 100 === 0) {
                    console.log(`✅ Processed ${successCount} word types...`);
                }

            } catch (parseError) {
                console.error(`❌ Error parsing line ${i + 1}:`, parseError.message);
                console.error(`   Line content: ${line.substring(0, 100)}...`);
                errorCount++;
            }
        }

        console.log('\n🎉 Word types restoration completed!');
        console.log(`✅ Successfully restored: ${successCount} word types`);
        console.log(`⏭️ Skipped: ${skippedCount} word types`);
        console.log(`❌ Errors encountered: ${errorCount} word types`);

        // Verify the restoration
        const totalCount = await prisma.word_types.count();
        console.log(`📊 Total word types in database: ${totalCount}`);

        // Show some sample entries
        console.log('\n🔍 Sample word types:');
        const sampleWordTypes = await prisma.word_types.findMany({
            take: 3,
            select: {
                word: true,
                types: true,
                createdAt: true
            }
        });

        sampleWordTypes.forEach(wordType => {
            const types = JSON.parse(wordType.types);
            console.log(`   "${wordType.word}": ${types.length} types`);
            console.log(`     Examples: ${types.slice(0, 3).join(', ')}...`);
        });

    } catch (error) {
        console.error('💥 Fatal error during word types restoration:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreWordTypes()
    .then(() => {
        console.log('\n✨ Word types restoration script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Word types restoration script failed:', error);
        process.exit(1);
    });

export { restoreWordTypes };
