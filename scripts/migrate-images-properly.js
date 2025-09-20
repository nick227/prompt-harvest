#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ImageMigrationManager {
    constructor() {
        this.prisma = databaseClient.getClient();
        this.nedb = new DB('images.db');
        this.migratedCount = 0;
        this.errorCount = 0;
        this.skippedCount = 0;
    }

    async connect() {
        await databaseClient.connect();
        console.log('✅ Connected to MySQL database');
    }

    async disconnect() {
        await databaseClient.disconnect();
        console.log('✅ Disconnected from MySQL database');
    }

    async clearExistingImages() {
        try {
            console.log('🗑️ Clearing existing images from MySQL...');
            await this.prisma.image.deleteMany({});
            console.log('✅ Cleared existing images');
        } catch (error) {
            console.error('❌ Error clearing images:', error);
            throw error;
        }
    }

    async migrateImages() {
        try {
            console.log('🚀 Starting proper image migration...');

            // Get all images from NeDB
            const nedbImages = await this.nedb.find({});
            console.log(`📊 Found ${nedbImages.length} images in NeDB`);

            if (nedbImages.length === 0) {
                console.log('⚠️ No images found in NeDB');
                return;
            }

            // Process each image
            for (let i = 0; i < nedbImages.length; i++) {
                const nedbImage = nedbImages[i];
                await this.migrateImage(nedbImage, i + 1, nedbImages.length);
            }

            console.log('\n📊 Migration Summary:');
            console.log(`✅ Successfully migrated: ${this.migratedCount}`);
            console.log(`❌ Errors: ${this.errorCount}`);
            console.log(`⏭️ Skipped: ${this.skippedCount}`);

        } catch (error) {
            console.error('❌ Migration failed:', error);
            throw error;
        }
    }

    async migrateImage(nedbImage, current, total) {
        try {
            console.log(`\n🔄 Processing image ${current}/${total}: ${nedbImage._id}`);

            // Extract data from NeDB structure
            const data = nedbImage.data || {};
            const userId = nedbImage.userId || 'undefined';
            const timestamp = nedbImage.timestamp?.$$date || nedbImage.timestamp || Date.now();
            const createdAt = new Date(timestamp);

            // Map NeDB fields to MySQL fields
            const mysqlImage = {
                id: nedbImage._id,
                userId: userId,
                prompt: data.prompt || '',
                original: data.original || data.prompt || '',
                imageUrl: this.constructImageUrl(data.imageName, data.providerName),
                provider: data.providerName || 'unknown',
                guidance: data.guidance || 10,
                model: data.model || null,
                rating: data.rating || null,
                createdAt: createdAt,
                updatedAt: createdAt
            };

            // Validate required fields
            if (!mysqlImage.prompt && !mysqlImage.original) {
                console.log(`⚠️ Skipping image ${nedbImage._id} - no prompt or original data`);
                this.skippedCount++;
                return;
            }

            // Check if image already exists
            const existingImage = await this.prisma.image.findUnique({
                where: { id: mysqlImage.id }
            });

            if (existingImage) {
                console.log(`⚠️ Image ${nedbImage._id} already exists, updating...`);
                await this.prisma.image.update({
                    where: { id: mysqlImage.id },
                    data: mysqlImage
                });
            } else {
                console.log(`➕ Creating new image ${nedbImage._id}`);
                await this.prisma.image.create({
                    data: mysqlImage
                });
            }

            this.migratedCount++;
            console.log(`✅ Successfully migrated image: ${mysqlImage.provider} - ${mysqlImage.prompt.substring(0, 50)}...`);

        } catch (error) {
            console.error(`❌ Error migrating image ${nedbImage._id}:`, error);
            this.errorCount++;
        }
    }

    constructImageUrl(imageName, providerName) {
        if (!imageName) {
            return '';
        }

        // If imageName is already a full URL, return it
        if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
            return imageName;
        }

        // Construct local path for uploaded images
        // Assuming images are stored in public/uploads/
        return `/uploads/${imageName}`;
    }

    async verifyMigration() {
        try {
            console.log('\n🔍 Verifying migration...');

            const mysqlCount = await this.prisma.image.count();
            console.log(`📊 MySQL images count: ${mysqlCount}`);

            // Check a few sample records
            const sampleImages = await this.prisma.image.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' }
            });

            console.log('\n📋 Sample migrated images:');
            sampleImages.forEach((image, index) => {
                console.log(`${index + 1}. ID: ${image.id}`);
                console.log(`   Provider: ${image.provider}`);
                console.log(`   Prompt: ${image.prompt.substring(0, 50)}...`);
                console.log(`   ImageUrl: ${image.imageUrl}`);
                console.log(`   Created: ${image.createdAt}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }
}

async function main() {
    const migrator = new ImageMigrationManager();

    try {
        await migrator.connect();
        await migrator.clearExistingImages();
        await migrator.migrateImages();
        await migrator.verifyMigration();
        console.log('\n🎉 Image migration completed successfully!');
    } catch (error) {
        console.error('\n💥 Migration failed:', error);
        process.exit(1);
    } finally {
        await migrator.disconnect();
    }
}

// Run migration
main();
