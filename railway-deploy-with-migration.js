#!/usr/bin/env node

/**
 * Railway Deployment Script with Migration
 *
 * This script handles Railway deployment with proper schema migration:
 * 1. Runs production migration to add missing tables
 * 2. Pushes schema changes
 * 3. Seeds essential data
 * 4. Verifies deployment
 *
 * This is the recommended approach for Railway production deployment
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function railwayDeployWithMigration() {
    console.log('🚀 RAILWAY DEPLOYMENT WITH MIGRATION START');
    console.log('==========================================');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    try {
        // Step 1: Run production migration
        console.log('📋 Step 1: Running production migration...');
        await runProductionMigration();

        // Step 2: Push schema (safe after migration)
        console.log('📋 Step 2: Pushing schema...');
        await pushSchema();

        // Step 3: Seed essential data
        console.log('📋 Step 3: Seeding essential data...');
        await seedEssentialData();

        // Step 4: Verify deployment
        console.log('📋 Step 4: Verifying deployment...');
        await verifyDeployment();

        console.log('==========================================');
        console.log('✅ RAILWAY DEPLOYMENT WITH MIGRATION COMPLETE');
        console.log('==========================================');

    } catch (error) {
        console.log('==========================================');
        console.error('❌ RAILWAY DEPLOYMENT WITH MIGRATION FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function runProductionMigration() {
    try {
        console.log('  🔄 Running production migration script...');

        // Import and run the migration script
        const { execSync } = await import('child_process');
        execSync('node scripts/railway-production-migration.js', {
            encoding: 'utf8',
            stdio: 'inherit',
            env: { ...process.env }
        });

        console.log('  ✅ Production migration completed successfully');
    } catch (error) {
        throw new Error(`Production migration failed: ${error.message}`);
    }
}

async function pushSchema() {
    try {
        console.log('  📋 Pushing schema to database...');
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        console.log('  ✅ Schema pushed successfully');
    } catch (error) {
        throw new Error(`Schema push failed: ${error.message}`);
    }
}

async function seedEssentialData() {
    try {
        console.log('  🌱 Seeding essential data...');

        // Test database connection first
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('    ✅ Database connection verified');

        // Seed models with retry logic
        await seedModelsWithRetry();

        // Seed system settings
        await seedSystemSettings();

        // Seed packages
        await seedPackages();

        // Verify seeding
        const modelCount = await prisma.model.count();
        const settingsCount = await prisma.systemSettings.count();
        const packageCount = await prisma.package.count();

        console.log(`    📊 Seeding results:`);
        console.log(`      - Models: ${modelCount}`);
        console.log(`      - Settings: ${settingsCount}`);
        console.log(`      - Packages: ${packageCount}`);

        if (modelCount === 0) {
            throw new Error('CRITICAL: No models found after seeding');
        }

        console.log('  ✅ Essential data seeded successfully');

    } catch (error) {
        throw new Error(`Data seeding failed: ${error.message}`);
    }
}

async function seedModelsWithRetry() {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`    🔄 Model seeding attempt ${attempt}/${maxRetries}`);
            await seedModels();

            const modelCount = await prisma.model.count();
            if (modelCount > 0) {
                console.log(`    ✅ Models seeded successfully (${modelCount} models)`);
                return;
            } else {
                throw new Error('No models found after seeding');
            }
        } catch (error) {
            lastError = error;
            console.error(`    ❌ Model seeding attempt ${attempt} failed:`, error.message);

            if (attempt < maxRetries) {
                console.log(`    ⏳ Retrying in 2 seconds...`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }

    throw new Error(`Model seeding failed after ${maxRetries} attempts. Last error: ${lastError.message}`);
}

async function seedModels() {
    const modelConfigs = [
        // OpenAI Models
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
            provider: 'openai',
            name: 'dalle2',
            displayName: 'DALL-E 2',
            description: 'OpenAI\'s previous text-to-image model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.openai.com/v1/images/generations',
            apiModel: 'dall-e-2',
            apiSize: '1024x1024'
        },

        // Google Models
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

        // Dezgo Models
        {
            provider: 'dezgo',
            name: 'flux',
            displayName: 'Flux (Dezgo)',
            description: 'Flux model via Dezgo API',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.dezgo.com/text2image_flux',
            apiModel: 'flux_1_schnell',
            apiSize: '1024x1024'
        },
        {
            provider: 'dezgo',
            name: 'flux-dev',
            displayName: 'Flux Dev (Dezgo)',
            description: 'Flux Dev model via Dezgo API',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.dezgo.com/text2image_flux',
            apiModel: 'flux_1_schnell',
            apiSize: '1024x1024'
        },

        // Stability AI Models
        {
            provider: 'stability',
            name: 'sd3',
            displayName: 'Stable Diffusion 3',
            description: 'Stability AI\'s latest model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.stability.ai/v2beta/stable-image/generate/sd3',
            apiModel: 'sd3',
            apiSize: '1024x1024'
        },
        {
            provider: 'stability',
            name: 'sd3-turbo',
            displayName: 'Stable Diffusion 3 Turbo',
            description: 'Stability AI\'s fast model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.stability.ai/v2beta/stable-image/generate/sd3-turbo',
            apiModel: 'sd3-turbo',
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
        } catch (error) {
            console.error(`    ❌ Failed to seed model ${config.provider}/${config.name}:`, error.message);
        }
    }

    console.log(`    📊 Seeded ${seededCount}/${modelConfigs.length} models`);
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

    console.log(`    📊 Seeded ${settings.length} system settings`);
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

    console.log(`    📊 Seeded ${packages.length} packages`);
}

async function verifyDeployment() {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('  ✅ Database connection verified');

        // Check all essential tables
        const counts = {
            users: await prisma.user.count(),
            images: await prisma.image.count(),
            models: await prisma.model.count(),
            systemSettings: await prisma.systemSettings.count(),
            packages: await prisma.package.count(),
            userMedia: await prisma.userMedia.count(),
            sessions: await prisma.session.count()
        };

        console.log('  📊 Final table counts:');
        Object.entries(counts).forEach(([table, count]) => {
            console.log(`    - ${table}: ${count} records`);
        });

        // CRITICAL: Verify models exist
        if (counts.models === 0) {
            console.error('  ❌ CRITICAL: No models found in database!');
            throw new Error('No models available - image generation will fail!');
        } else {
            console.log(`  ✅ Models verified: ${counts.models} models available`);
        }

        // List some models for verification
        const models = await prisma.model.findMany({
            take: 5,
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

        // Test new table functionality
        console.log('  🔍 Testing new table functionality...');

        // Test UserMedia table
        await prisma.userMedia.findMany({ take: 1 });
        console.log('    ✅ UserMedia table accessible');

        // Test Session table
        await prisma.session.findMany({ take: 1 });
        console.log('    ✅ Session table accessible');

        console.log('  ✅ Deployment verification completed successfully');

    } catch (error) {
        throw new Error(`Deployment verification failed: ${error.message}`);
    }
}

// Run the deployment
railwayDeployWithMigration();
