#!/usr/bin/env node

/**
 * Simple Railway Deployment Script
 *
 * This script bypasses the migration system entirely and:
 * 1. Pushes the schema directly
 * 2. Seeds essential data
 * 3. Verifies deployment
 *
 * This is the safest approach for Railway deployment
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function railwayDeploySimple() {
    console.log('=== RAILWAY DEPLOYMENT START ===');
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);

    try {
        // Step 1: Push schema directly (bypass migrations)
        console.log('=== SCHEMA PUSH ===');
        await pushSchema();

        // Step 2: Seed essential data
        console.log('=== DATA SEEDING ===');
        await seedEssentialData();

        // Step 3: Verify deployment
        console.log('=== DEPLOYMENT VERIFICATION ===');
        await verifyDeployment();

        console.log('=== RAILWAY DEPLOYMENT COMPLETE ===');

    } catch (error) {
        console.error('=== RAILWAY DEPLOYMENT FAILED ===');
        console.error('Error:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function pushSchema() {
    try {
        console.log('Pushing schema directly to database...');
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        console.log('Schema pushed successfully');
    } catch (error) {
        console.error('Failed to push schema:', error.message);
        throw error;
    }
}

async function seedEssentialData() {
    try {
        console.log('=== SEEDING ESSENTIAL DATA ===');

        // Test database connection first
        console.log('Testing database connection...');
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connection successful');

        // Seed models with retry logic
        console.log('Seeding models...');
        await seedModelsWithRetry();

        // Seed system settings
        console.log('Seeding system settings...');
        await seedSystemSettings();

        // Seed packages
        console.log('Seeding packages...');
        await seedPackages();

        // Verify seeding
        const modelCount = await prisma.model.count();
        const settingsCount = await prisma.systemSettings.count();
        const packageCount = await prisma.package.count();

        console.log(`=== SEEDING VERIFICATION ===`);
        console.log(`Models: ${modelCount}`);
        console.log(`Settings: ${settingsCount}`);
        console.log(`Packages: ${packageCount}`);

        if (modelCount === 0) {
            throw new Error('Models were not seeded successfully');
        }

        console.log('✅ Essential data seeded successfully');

    } catch (error) {
        console.error('❌ Data seeding failed:', error.message);
        throw error;
    }
}

async function seedModelsWithRetry() {
    const maxRetries = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`Model seeding attempt ${attempt}/${maxRetries}`);
            await seedModels();

            // Verify models were seeded
            const modelCount = await prisma.model.count();
            if (modelCount > 0) {
                console.log(`✅ Models seeded successfully (${modelCount} models)`);
                return;
            } else {
                throw new Error('No models found after seeding');
            }
        } catch (error) {
            lastError = error;
            console.error(`❌ Model seeding attempt ${attempt} failed:`, error.message);

            if (attempt < maxRetries) {
                console.log(`Retrying in 2 seconds...`);
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
            console.error(`Failed to seed model ${config.provider}/${config.name}:`, error.message);
        }
    }

    console.log(`Seeded ${seededCount} models successfully`);
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

    console.log(`Seeded ${settings.length} system settings`);
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

    console.log(`Seeded ${packages.length} packages`);
}

async function createSessionsTable() {
    try {
        console.log('Creating sessions table...');
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR(128) PRIMARY KEY,
                data TEXT,
                expiresAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_expiresAt (expiresAt)
            )
        `;
        console.log('✅ Sessions table created successfully');
    } catch (error) {
        console.error('❌ Failed to create sessions table:', error.message);
        throw error;
    }
}

async function verifyDeployment() {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('Database connection verified');

        // Verify sessions table exists
        try {
            await prisma.$queryRaw`SELECT 1 FROM sessions LIMIT 1`;
            console.log('✅ Sessions table verified');
        } catch (sessionsError) {
            console.log('⚠️ Sessions table not found, creating...');
            await createSessionsTable();
        }

        // Check essential data
        const counts = {
            users: await prisma.user.count(),
            models: await prisma.model.count(),
            systemSettings: await prisma.systemSettings.count(),
            packages: await prisma.package.count(),
            sessions: await prisma.session.count()
        };

        console.log('Deployment verification:');
        Object.entries(counts).forEach(([table, count]) => {
            console.log(`  ✓ ${table}: ${count} records`);
        });

        // CRITICAL: Verify models exist
        if (counts.models === 0) {
            console.error('❌ CRITICAL: No models found in database!');
            console.log('Attempting emergency model seeding...');

            await emergencyModelSeeding();

            // Verify again
            const newModelCount = await prisma.model.count();
            if (newModelCount === 0) {
                throw new Error('Emergency model seeding failed - no models available');
            }
            console.log(`✅ Emergency seeding successful: ${newModelCount} models`);
        } else {
            console.log(`✅ Models verified: ${counts.models} models available`);
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

        console.log('Sample models:');
        models.forEach(model => {
            console.log(`  - ${model.provider}/${model.name}: ${model.displayName}`);
        });

        // Verify critical settings
        const welcomeCredits = await prisma.systemSettings.findUnique({
            where: { key: 'new_user_welcome_credits' }
        });

        if (welcomeCredits && parseInt(welcomeCredits.value) > 0) {
            console.log(`✓ Welcome credits: ${welcomeCredits.value} (ready for new users)`);
        } else {
            console.error('✗ Welcome credits not properly configured');
        }

        console.log('Deployment verification completed successfully');

    } catch (error) {
        console.error('Deployment verification failed:', error.message);
        throw error;
    }
}

async function emergencyModelSeeding() {
    console.log('🚨 EMERGENCY MODEL SEEDING STARTED');

    const essentialModels = [
        {
            provider: 'flux',
            name: 'flux-dev',
            displayName: 'Flux Dev',
            description: 'Flux development model',
            costPerImage: 1,
            isActive: true,
            apiModel: 'flux-dev',
            apiSize: '1024x1024'
        },
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
            apiModel: 'flux_1_schnell',
            apiSize: '1024x1024'
        }
    ];

    let seededCount = 0;
    for (const model of essentialModels) {
        try {
            await prisma.model.create({
                data: model
            });
            console.log(`✅ Emergency seeded: ${model.provider}/${model.name}`);
            seededCount++;
        } catch (error) {
            console.error(`❌ Failed to emergency seed ${model.provider}/${model.name}: ${error.message}`);
        }
    }

    console.log(`🚨 EMERGENCY MODEL SEEDING COMPLETED: ${seededCount} models`);
}

// Run the deployment
railwayDeploySimple();
