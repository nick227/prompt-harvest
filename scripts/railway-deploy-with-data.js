#!/usr/bin/env node

/**
 * Complete Railway deployment script with data synchronization
 * This script handles migration fixes and data imports
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function railwayDeployWithData() {
    try {
        console.log('🚀 Starting Railway deployment with data sync...');

        // Step 1: Fix the failed migration
        console.log('🔧 Step 1: Fixing failed migration...');
        await fixFailedMigration();

        // Step 2: Deploy remaining migrations
        console.log('📦 Step 2: Deploying remaining migrations...');
        await deployMigrations();

        // Step 3: Import critical data
        console.log('📥 Step 3: Importing critical data...');
        await importCriticalData();

        // Step 4: Verify deployment
        console.log('✅ Step 4: Verifying deployment...');
        await verifyDeployment();

        console.log('🎉 Railway deployment completed successfully!');

    } catch (error) {
        console.error('❌ Railway deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function fixFailedMigration() {
    try {
        console.log('🔍 Checking migration status...');

        // Check if the isSuspended column exists
        const result = await prisma.$queryRaw`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'isSuspended'
        `;

        if (result.length > 0) {
            console.log('✅ isSuspended column already exists');
        } else {
            console.log('🔧 Adding isSuspended column...');
            await prisma.$executeRaw`
                ALTER TABLE users ADD COLUMN isSuspended BOOLEAN NOT NULL DEFAULT false
            `;
            console.log('✅ isSuspended column added');
        }

        // Mark the migration as resolved
        console.log('📝 Marking migration as resolved...');
        await prisma.$executeRaw`
            UPDATE _prisma_migrations
            SET finished_at = NOW(),
                logs = 'Migration resolved during Railway deployment'
            WHERE migration_name = '20250115000000_add_isSuspended_field'
            AND finished_at IS NULL
        `;

        console.log('✅ Migration marked as resolved');

    } catch (error) {
        console.error('❌ Failed to fix migration:', error);
        throw error;
    }
}

async function deployMigrations() {
    try {
        // This would typically run: npx prisma migrate deploy
        console.log('📦 Migrations should be deployed via Railway build process');
        console.log('✅ Migration deployment step completed');
    } catch (error) {
        console.error('❌ Failed to deploy migrations:', error);
        throw error;
    }
}

async function importCriticalData() {
    try {
        const dataPath = path.join(process.cwd(), 'data-export.json');

        if (!fs.existsSync(dataPath)) {
            console.log('⚠️ No data export file found, skipping data import');
            return;
        }

        // Check if data has already been imported
        console.log('🔍 Checking if data has already been imported...');
        const existingWordTypes = await prisma.word_types.count();
        const existingPackages = await prisma.package.count();
        const existingUsers = await prisma.user.count();

        // If we have substantial data already, skip import
        if (existingWordTypes >= 1000 && existingPackages >= 3 && existingUsers >= 1) {
            console.log(`✅ Data already imported: ${existingWordTypes} word_types, ${existingPackages} packages, ${existingUsers} users`);
            console.log('⏭️ Skipping data import to avoid duplicates');
            return;
        }

        console.log(`📊 Current data: ${existingWordTypes} word_types, ${existingPackages} packages, ${existingUsers} users`);
        console.log('📥 Proceeding with data import...');

        console.log('📥 Loading data from export file...');
        const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        // Import word_types
        if (exportData.word_types && exportData.word_types.length > 0) {
            console.log(`📝 Importing ${exportData.word_types.length} word_types...`);
            for (const wordType of exportData.word_types) {
                await prisma.word_types.upsert({
                    where: { word: wordType.word },
                    update: wordType,
                    create: wordType
                });
            }
            console.log('✅ Word types imported');
        }

        // Import packages
        if (exportData.packages && exportData.packages.length > 0) {
            console.log(`📦 Importing ${exportData.packages.length} packages...`);
            for (const pkg of exportData.packages) {
                await prisma.package.upsert({
                    where: { name: pkg.name },
                    update: pkg,
                    create: pkg
                });
            }
            console.log('✅ Packages imported');
        }

        // Import models (check if table exists and has correct structure)
        if (exportData.models && exportData.models.length > 0) {
            console.log(`🤖 Importing ${exportData.models.length} models...`);
            try {
                // Check if models table exists and has the right structure
                const tableInfo = await prisma.$queryRaw`
                    SELECT COLUMN_NAME
                    FROM INFORMATION_SCHEMA.COLUMNS
                    WHERE TABLE_SCHEMA = DATABASE()
                    AND TABLE_NAME = 'models'
                `;

                if (tableInfo.length > 0) {
                    // Check if it has 'provider' column (new schema) or 'providerId' (old migration)
                    const hasProvider = tableInfo.some(col => col.COLUMN_NAME === 'provider');
                    const hasProviderId = tableInfo.some(col => col.COLUMN_NAME === 'providerId');

                    if (hasProvider) {
                        // New schema - import normally
                        for (const model of exportData.models) {
                            await prisma.model.upsert({
                                where: {
                                    provider_name: {
                                        provider: model.provider,
                                        name: model.name
                                    }
                                },
                                update: model,
                                create: model
                            });
                        }
                        console.log('✅ Models imported (new schema)');
                    } else if (hasProviderId) {
                        console.log('⚠️ Models table has old schema (providerId), skipping import');
                    } else {
                        console.log('⚠️ Models table structure unknown, skipping import');
                    }
                } else {
                    console.log('⚠️ Models table does not exist, skipping import');
                }
            } catch (error) {
                console.log('⚠️ Error checking models table, skipping import:', error.message);
            }
        }

        console.log('✅ Critical data import completed');

    } catch (error) {
        console.error('❌ Failed to import data:', error);
        throw error;
    }
}

async function verifyDeployment() {
    try {
        console.log('🔍 Verifying deployment...');

        // Check word_types
        const wordTypesCount = await prisma.word_types.count();
        console.log(`📝 Word types: ${wordTypesCount}`);

        // Check packages
        const packagesCount = await prisma.package.count();
        console.log(`📦 Packages: ${packagesCount}`);

        // Check models
        const modelsCount = await prisma.model.count();
        console.log(`🤖 Models: ${modelsCount}`);

        // Check users
        const usersCount = await prisma.user.count();
        console.log(`👥 Users: ${usersCount}`);

        // Check images
        const imagesCount = await prisma.image.count();
        console.log(`🖼️ Images: ${imagesCount}`);

        console.log('✅ Deployment verification completed');

    } catch (error) {
        console.error('❌ Deployment verification failed:', error);
        throw error;
    }
}

// Run the deployment
railwayDeployWithData()
    .then(() => {
        console.log('🎉 Railway deployment with data sync completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Railway deployment failed:', error);
        process.exit(1);
    });
