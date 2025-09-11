#!/usr/bin/env node

/**
 * Migration script to move word types data from NeDB to MySQL
 * This script reads data from word-types.db (NeDB) and migrates it to MySQL using Prisma
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Prisma client
const prisma = new PrismaClient();

/**
 * Simple NeDB reader (since we can't use the full NeDB library in this migration)
 */
class SimpleNeDBReader {
    constructor(dbPath) {
        this.dbPath = dbPath;
    }

    readAll() {
        try {
            if (!fs.existsSync(this.dbPath)) {
                console.log(`📁 NeDB file not found: ${this.dbPath}`);
                return [];
            }

            const content = fs.readFileSync(this.dbPath, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());

            const documents = [];
            for (const line of lines) {
                try {
                    const doc = JSON.parse(line);
                    if (!doc.$$deleted) { // Skip deleted documents
                        documents.push(doc);
                    }
                } catch (parseError) {
                    console.warn('⚠️ Skipping invalid line:', line.substring(0, 50));
                }
            }

            return documents;
        } catch (error) {
            console.error('❌ Error reading NeDB file:', error);
            return [];
        }
    }
}

/**
 * Generate a unique ID for new records
 */
function generateId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Migrate word types from NeDB to MySQL
 */
async function migrateWordTypes() {
    try {
        console.log('🚀 Starting word types migration from NeDB to MySQL...');

        // Path to NeDB files
        const nedbPath = path.join(__dirname, '..', 'data', 'word-types.db');
        const reader = new SimpleNeDBReader(nedbPath);

        console.log('📁 Reading from NeDB file:', nedbPath);
        const nedbDocs = reader.readAll();

        console.log('📥 Found', nedbDocs.length, 'documents in NeDB');

        if (nedbDocs.length === 0) {
            console.log('ℹ️ No documents to migrate');
            return;
        }

        // Sample the data to understand structure
        console.log('📋 Sample NeDB document structure:');
        console.log(JSON.stringify(nedbDocs[0], null, 2));

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const doc of nedbDocs) {
            try {
                // Validate required fields
                if (!doc.word) {
                    console.warn('⚠️ Skipping document without word field:', doc._id);
                    skippedCount++;
                    continue;
                }

                // Ensure types is an array
                let types = doc.types || [];
                if (!Array.isArray(types)) {
                    types = [];
                }

                // Prepare data for MySQL
                const wordData = {
                    id: generateId(),
                    word: doc.word.toLowerCase(),
                    types: types,
                    createdAt: doc.createdAt ? new Date(doc.createdAt) : new Date(),
                    updatedAt: new Date()
                };

                // Check if word already exists in MySQL
                const existingWord = await prisma.word_types.findFirst({
                    where: { word: wordData.word }
                });

                if (existingWord) {
                    console.log(`🔄 Updating existing word: ${wordData.word} (${types.length} types)`);

                    await prisma.word_types.update({
                        where: { id: existingWord.id },
                        data: {
                            types: wordData.types,
                            updatedAt: wordData.updatedAt
                        }
                    });
                } else {
                    console.log(`➕ Creating new word: ${wordData.word} (${types.length} types)`);

                    await prisma.word_types.create({
                        data: wordData
                    });
                }

                migratedCount++;

            } catch (error) {
                console.error(`❌ Error migrating word "${doc.word}":`, error.message);
                errorCount++;
            }
        }

        console.log('\n🎉 Migration completed!');
        console.log('📊 Migration Statistics:');
        console.log(`  ✅ Successfully migrated: ${migratedCount}`);
        console.log(`  ⚠️ Skipped: ${skippedCount}`);
        console.log(`  ❌ Errors: ${errorCount}`);
        console.log(`  📥 Total processed: ${nedbDocs.length}`);

        // Verify migration
        const totalWordsInMySQL = await prisma.word_types.count();
        console.log(`\n🔍 Verification: ${totalWordsInMySQL} words now in MySQL`);

        // Show sample of migrated data
        const sampleWords = await prisma.word_types.findMany({
            take: 5,
            orderBy: { word: 'asc' }
        });

        console.log('\n📋 Sample migrated words:');
        for (const word of sampleWords) {
            const typesCount = Array.isArray(word.types) ? word.types.length : 0;
            console.log(`  - ${word.word}: ${typesCount} types`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

/**
 * Main migration function
 */
async function migrate() {
    try {
        await migrateWordTypes();
        console.log('\n✅ All migrations completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrate();
}

export { migrate };
