#!/usr/bin/env node

/**
 * Railway Deployment Script - Clean Version
 *
 * This script focuses only on the essential deployment steps with minimal logging
 * to clearly see what's happening with model seeding.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function railwayDeployClean() {
    // Check if called from server.js (skip schema push)
    const skipSchemaPush = process.argv.includes('--skip-schema');

    if (!skipSchemaPush) {
        console.log('🚀 RAILWAY DEPLOYMENT START');
        console.log('============================');
    }

    try {
        // Step 1: Push schema (only if not skipped)
        if (!skipSchemaPush) {
            console.log('📋 Step 1: Pushing schema...');
            await pushSchema();
            console.log('✅ Schema pushed successfully');
        }

        // Step 2: Seed essential data
        console.log('🌱 Seeding essential data...');
        await seedEssentialData();

        // Step 3: Verify deployment
        console.log('🔍 Verifying deployment...');
        await verifyDeployment();

        if (!skipSchemaPush) {
            console.log('============================');
            console.log('🎉 RAILWAY DEPLOYMENT COMPLETE');
        }

    } catch (error) {
        console.log('============================');
        console.error('❌ RAILWAY DEPLOYMENT FAILED');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function pushSchema() {
    try {
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'inherit'
        });
    } catch (error) {
        throw new Error(`Schema push failed: ${error.message}`);
    }
}

async function seedEssentialData() {
    console.log('  🔍 Checking current data...');

    // Check current counts
    const modelCount = await prisma.model.count();
    const settingsCount = await prisma.systemSettings.count();
    const packageCount = await prisma.package.count();

    console.log(`  📊 Current: ${modelCount} models, ${settingsCount} settings, ${packageCount} packages`);

    // Seed models
    console.log('  🌱 Seeding models...');
    await seedModels();

    // Seed system settings
    console.log('  ⚙️ Seeding system settings...');
    await seedSystemSettings();

    // Seed packages
    console.log('  📦 Seeding packages...');
    await seedPackages();

    // Verify seeding
    const newModelCount = await prisma.model.count();
    const newSettingsCount = await prisma.systemSettings.count();
    const newPackageCount = await prisma.package.count();

    console.log(`  ✅ After seeding: ${newModelCount} models, ${newSettingsCount} settings, ${newPackageCount} packages`);

    if (newModelCount === 0) {
        throw new Error('CRITICAL: No models found after seeding!');
    }
}

async function seedModels() {
    const modelConfigs = [
        {
            provider: 'openai',
            name: 'dalle3',
            displayName: 'DALL-E 3',
            description: 'OpenAI\'s latest text-to-image model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.openai.com/v1/images/generations',
            apiModel: 'dall-e-3',
            apiSize: '1024x1024'
        },
        {
            provider: 'google',
            name: 'imagen3',
            displayName: 'Imagen 3',
            description: 'Google\'s latest Imagen model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict',
            apiModel: 'imagen-3.0-generate-001',
            apiSize: '1024x1024'
        },
        {
            provider: 'dezgo',
            name: 'flux',
            displayName: 'Flux (Dezgo)',
            description: 'Flux model via Dezgo API',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.dezgo.com/text2image_flux',
            apiModel: 'flux',
            apiSize: '1024x1024'
        }
    ];

    let seededCount = 0;
    for (const config of modelConfigs) {
        try {
            await prisma.model.upsert({
                where: {
                    provider_name: {
                        provider: config.provider,
                        name: config.name
                    }
                },
                update: config,
                create: config
            });
            seededCount++;
            console.log(`    ✅ ${config.provider}/${config.name}: ${config.displayName}`);
        } catch (error) {
            console.error(`    ❌ Failed ${config.provider}/${config.name}: ${error.message}`);
        }
    }

    console.log(`  📊 Models seeded: ${seededCount}/${modelConfigs.length}`);
}

async function seedSystemSettings() {
    const settings = [
        { key: 'new_user_welcome_credits', value: '100', description: 'Credits given to new users upon registration', dataType: 'number' },
        { key: 'max_image_generations_per_hour', value: '10', description: 'Maximum image generations per user per hour', dataType: 'number' },
        { key: 'maintenance_mode', value: 'false', description: 'Enable maintenance mode', dataType: 'boolean' },
        { key: 'default_image_provider', value: 'flux', description: 'Default image generation provider', dataType: 'string' }
    ];

    for (const setting of settings) {
        await prisma.systemSettings.upsert({
            where: { key: setting.key },
            update: setting,
            create: setting
        });
    }

    console.log(`  📊 System settings seeded: ${settings.length}`);
}

async function seedPackages() {
    const packages = [
        {
            name: 'Starter',
            displayName: 'Starter Package',
            description: 'Perfect for getting started',
            price: 0,
            credits: 10,
            isActive: true
        },
        {
            name: 'Pro',
            displayName: 'Pro Package',
            description: 'For power users',
            price: 999,
            credits: 100,
            isActive: true
        }
    ];

    for (const pkg of packages) {
        await prisma.package.upsert({
            where: { name: pkg.name },
            update: pkg,
            create: pkg
        });
    }

    console.log(`  📊 Packages seeded: ${packages.length}`);
}

async function verifyDeployment() {
    // Test database connection
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('  ✅ Database connection verified');

    // Check essential data
    const counts = {
        users: await prisma.user.count(),
        models: await prisma.model.count(),
        systemSettings: await prisma.systemSettings.count(),
        packages: await prisma.package.count()
    };

    console.log('  📊 Final counts:');
    Object.entries(counts).forEach(([table, count]) => {
        console.log(`    ${table}: ${count} records`);
    });

    // CRITICAL: Verify models exist
    if (counts.models === 0) {
        console.error('  ❌ CRITICAL: No models found in database!');
        throw new Error('No models available - image generation will fail!');
    } else {
        console.log(`  ✅ Models verified: ${counts.models} models available`);
    }

    // List some models
    const models = await prisma.model.findMany({
        take: 3,
        select: {
            provider: true,
            name: true,
            displayName: true,
            isActive: true
        }
    });

    console.log('  📋 Sample models:');
    models.forEach(model => {
        console.log(`    - ${model.provider}/${model.name}: ${model.displayName}`);
    });
}

// Run the deployment
railwayDeployClean();
