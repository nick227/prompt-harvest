#!/usr/bin/env node

/**
 * Export local database data for Railway synchronization
 * This script exports critical data from word_types, packages, and models tables
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function exportLocalData() {
    try {
        console.log('📦 Exporting local database data...');

        const exportData = {
            timestamp: new Date().toISOString(),
            word_types: [],
            packages: [],
            models: [],
            users: [],
            images: []
        };

        // Export word_types
        console.log('📝 Exporting word_types...');
        const wordTypes = await prisma.word_types.findMany();
        exportData.word_types = wordTypes;
        console.log(`✅ Exported ${wordTypes.length} word_types`);

        // Export packages
        console.log('📦 Exporting packages...');
        const packages = await prisma.package.findMany();
        exportData.packages = packages;
        console.log(`✅ Exported ${packages.length} packages`);

        // Export models
        console.log('🤖 Exporting models...');
        const models = await prisma.model.findMany();
        exportData.models = models;
        console.log(`✅ Exported ${models.length} models`);

        // Export users (without sensitive data)
        console.log('👥 Exporting users...');
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                isSuspended: true,
                creditBalance: true,
                createdAt: true,
                updatedAt: true
            }
        });
        exportData.users = users;
        console.log(`✅ Exported ${users.length} users`);

        // Export images (metadata only)
        console.log('🖼️ Exporting images...');
        const images = await prisma.image.findMany({
            select: {
                id: true,
                userId: true,
                prompt: true,
                original: true,
                imageUrl: true,
                provider: true,
                guidance: true,
                model: true,
                rating: true,
                isPublic: true,
                isHidden: true,
                createdAt: true,
                updatedAt: true,
                modelId: true,
                taggedAt: true,
                taggingMetadata: true,
                tags: true
            }
        });
        exportData.images = images;
        console.log(`✅ Exported ${images.length} images`);

        // Save to file
        const exportPath = path.join(process.cwd(), 'data-export.json');
        fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

        console.log(`💾 Data exported to: ${exportPath}`);
        console.log(`📊 Export summary:`);
        console.log(`   - Word Types: ${exportData.word_types.length}`);
        console.log(`   - Packages: ${exportData.packages.length}`);
        console.log(`   - Models: ${exportData.models.length}`);
        console.log(`   - Users: ${exportData.users.length}`);
        console.log(`   - Images: ${exportData.images.length}`);

        return exportData;

    } catch (error) {
        console.error('❌ Error exporting data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the export
exportLocalData()
    .then(() => {
        console.log('🎉 Data export completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Data export failed:', error);
        process.exit(1);
    });
