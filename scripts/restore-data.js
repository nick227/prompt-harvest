#!/usr/bin/env node

/**
 * Restore Data from Backup
 * Run: node scripts/restore-data.js
 *
 * This script restores models and word_types data after database reset.
 */

import { PrismaClient } from '@prisma/client';
import Database from 'nedb';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Models data (from seed-models.js)
const models = [
    // OpenAI (DALL-E) Models
    { provider: 'openai', name: 'dalle3', displayName: 'DALL-E 3', description: 'OpenAI\'s latest text-to-image model', costPerImage: 1 },
    { provider: 'openai', name: 'dalle2', displayName: 'DALL-E 2', description: 'OpenAI\'s previous text-to-image model', costPerImage: 1 },

    // Dezgo Models
    { provider: 'dezgo', name: 'flux', displayName: 'Flux', description: 'High-quality text-to-image model', costPerImage: 1 },
    { provider: 'dezgo', name: 'juggernaut', displayName: 'Juggernaut', description: 'Realistic image generation model', costPerImage: 1 },
    { provider: 'dezgo', name: 'juggernautReborn', displayName: 'Juggernaut Reborn', description: 'Enhanced Juggernaut model', costPerImage: 1 },
    { provider: 'dezgo', name: 'redshift', displayName: 'Red Shift', description: 'Creative image generation model', costPerImage: 1 },
    { provider: 'dezgo', name: 'absolute', displayName: 'Absolute Reality', description: 'Photorealistic image model', costPerImage: 1 },
    { provider: 'dezgo', name: 'realisticvision', displayName: 'Realistic Vision', description: 'High-quality realistic images', costPerImage: 1 },
    { provider: 'dezgo', name: 'icbinp', displayName: 'Icbinp', description: 'Creative image generation', costPerImage: 1 },
    { provider: 'dezgo', name: 'icbinp_seco', displayName: 'Icbinp2', description: 'Enhanced Icbinp model', costPerImage: 1 },
    { provider: 'dezgo', name: 'hasdx', displayName: 'Hasdx', description: 'Advanced image generation', costPerImage: 1 },
    { provider: 'dezgo', name: 'dreamshaper', displayName: 'Dreamshaper', description: 'Creative dream-like images', costPerImage: 1 },
    { provider: 'dezgo', name: 'dreamshaperLighting', displayName: 'Dreamshaper Lightning', description: 'Enhanced lighting effects', costPerImage: 1 },
    { provider: 'dezgo', name: 'nightmareshaper', displayName: 'Nightmare Shaper', description: 'Dark artistic images', costPerImage: 1 },
    { provider: 'dezgo', name: 'openjourney', displayName: 'Open Journey', description: 'Journey-style images', costPerImage: 1 },
    { provider: 'dezgo', name: 'analogmadness', displayName: 'Analog Madness', description: 'Retro analog aesthetics', costPerImage: 1 },
    { provider: 'dezgo', name: 'portraitplus', displayName: 'Portrait Plus', description: 'Enhanced portrait generation', costPerImage: 1 },
    { provider: 'dezgo', name: 'tshirt', displayName: 'T-shirt Design', description: 'T-shirt and merchandise designs', costPerImage: 1 },
    { provider: 'dezgo', name: 'abyssorange', displayName: 'Abyss Orange', description: 'Unique artistic style', costPerImage: 1 },
    { provider: 'dezgo', name: 'cyber', displayName: 'Cyber Real', description: 'Cyberpunk realistic images', costPerImage: 1 },
    { provider: 'dezgo', name: 'disco', displayName: 'Disco', description: 'Disco and retro style', costPerImage: 1 },
    { provider: 'dezgo', name: 'synthwave', displayName: 'Synthwave', description: '80s synthwave aesthetic', costPerImage: 1 },
    { provider: 'dezgo', name: 'lowpoly', displayName: 'Low Poly', description: 'Low poly 3D style', costPerImage: 1 },
    { provider: 'dezgo', name: 'bluepencil', displayName: 'Blue Pencil', description: 'Sketch and drawing style', costPerImage: 1 },
    { provider: 'dezgo', name: 'ink', displayName: 'Ink Punk', description: 'Ink and punk art style', costPerImage: 1 }
];

async function restoreModels() {
    try {
        console.log('🔄 Restoring models...');

        // Clear existing models
        await prisma.model.deleteMany({});
        console.log('🗑️ Cleared existing models');

        // Create new models
        for (const modelData of models) {
            await prisma.model.create({
                data: modelData
            });
            console.log(`✅ Created model: ${modelData.provider}/${modelData.name}`);
        }

        console.log(`🎉 Successfully restored ${models.length} models`);

        // Show summary by provider
        const summary = await prisma.model.groupBy({
            by: ['provider'],
            _count: {
                provider: true
            }
        });

        console.log('\n📊 Models by provider:');
        summary.forEach(group => {
            console.log(`  ${group.provider}: ${group._count.provider} models`);
        });

    } catch (error) {
        console.error('❌ Error restoring models:', error);
        throw error;
    }
}

async function restoreWordTypes() {
    return new Promise((resolve, reject) => {
        try {
            console.log('🔄 Restoring word types from NeDB...');

            // Load the word-types.db file
            const wordTypesDb = new Database({
                filename: path.join(__dirname, '../data/word-types.db'),
                autoload: true
            });

            // Get all word types from NeDB
            wordTypesDb.find({}, async (err, docs) => {
                if (err) {
                    console.error('❌ Error reading word-types.db:', err);
                    reject(err);
                    return;
                }

                try {
                    console.log(`📚 Found ${docs.length} word types in backup`);

                    // Clear existing word types
                    await prisma.word_types.deleteMany({});
                    console.log('🗑️ Cleared existing word types');

                    // Insert word types into MySQL
                    let successCount = 0;
                    let errorCount = 0;

                    for (const doc of docs) {
                        try {
                            await prisma.word_types.create({
                                data: {
                                    word: doc.word,
                                    types: doc.types || []
                                }
                            });
                            successCount++;
                            if (successCount % 100 === 0) {
                                console.log(`📝 Processed ${successCount}/${docs.length} word types...`);
                            }
                        } catch (error) {
                            console.error(`❌ Error inserting word "${doc.word}":`, error.message);
                            errorCount++;
                        }
                    }

                    console.log(`🎉 Successfully restored ${successCount} word types`);
                    if (errorCount > 0) {
                        console.log(`⚠️ ${errorCount} word types failed to restore`);
                    }

                    resolve();
                } catch (error) {
                    console.error('❌ Error processing word types:', error);
                    reject(error);
                }
            });

        } catch (error) {
            console.error('❌ Error setting up word types restoration:', error);
            reject(error);
        }
    });
}

async function restoreAllData() {
    try {
        console.log('🚀 Starting data restoration...');
        console.log('📋 This will restore:');
        console.log('   - Models (from backup)');
        console.log('   - Word Types (from NeDB backup)');
        console.log('');

        // Restore models
        await restoreModels();
        console.log('');

        // Restore word types
        await restoreWordTypes();
        console.log('');

        console.log('✅ Data restoration completed successfully!');
        console.log('');
        console.log('📊 Summary:');
        console.log(`   - Models: ${models.length} restored`);
        console.log('   - Word Types: Restored from NeDB backup');
        console.log('   - System Settings: Already initialized');

    } catch (error) {
        console.error('❌ Data restoration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreAllData()
    .then(() => {
        console.log('🎉 All data has been successfully restored!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Data restoration failed:', error);
        process.exit(1);
    });
