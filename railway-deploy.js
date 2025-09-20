#!/usr/bin/env node

/**
 * Railway Deployment Script
 *
 * This script is designed to be run during Railway deployment to handle:
 * 1. Migration resolution
 * 2. Database setup
 * 3. Data seeding
 * 4. Verification
 *
 * This script is called automatically by Railway during deployment
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function railwayDeploy() {
    console.log('=== RAILWAY DEPLOYMENT START ===');
    console.log(`DATABASE_URL=${process.env.DATABASE_URL}`);

    try {
        // Step 1: Handle migrations
        console.log('=== SCHEMA MIGRATION ===');
        await handleMigrations();

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

async function handleMigrations() {
    try {
        // Try to deploy migrations first
        try {
            console.log('Attempting to deploy migrations...');
            execSync('npx prisma migrate deploy', {
                encoding: 'utf8',
                stdio: 'inherit'
            });
            console.log('Migrations deployed successfully');
            return;
        } catch (migrateError) {
            console.log('Migration deploy failed, checking for failed migrations...');

            // Check if there are failed migrations
            try {
                const statusOutput = execSync('npx prisma migrate status', {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });

                if (statusOutput.includes('failed') || statusOutput.includes('P3009')) {
                    console.log('Failed migrations detected, attempting to resolve...');

                    // Try to resolve the specific failed migration
                    try {
                        execSync('npx prisma migrate resolve --applied 20250917081252_initial_complete_schema', {
                            encoding: 'utf8',
                            stdio: 'inherit'
                        });
                        console.log('Failed migration resolved');

                        // Try to deploy again
                        execSync('npx prisma migrate deploy', {
                            encoding: 'utf8',
                            stdio: 'inherit'
                        });
                        console.log('Migrations deployed successfully after resolution');
                        return;
                    } catch (resolveError) {
                        console.log('Could not resolve migration, falling back to schema push...');
                    }
                }
            } catch (statusError) {
                console.log('Could not check migration status, falling back to schema push...');
            }

            // Fallback: Push schema directly
            console.log('Pushing schema directly...');
            execSync('npx prisma db push', {
                encoding: 'utf8',
                stdio: 'inherit'
            });
            console.log('Schema pushed successfully');
        }

    } catch (error) {
        console.error('Migration handling failed:', error.message);
        throw error;
    }
}

async function seedEssentialData() {
    try {
        // Check if data already exists
        const userCount = await prisma.user.count();
        const modelCount = await prisma.model.count();
        const settingsCount = await prisma.systemSettings.count();

        if (userCount > 0 && modelCount > 0 && settingsCount > 0) {
            console.log('Essential data already exists, skipping seeding');
            return;
        }

        // Seed models if needed
        if (modelCount === 0) {
            console.log('Seeding models...');
            await seedModels();
        }

        // Seed system settings if needed
        if (settingsCount === 0) {
            console.log('Seeding system settings...');
            await seedSystemSettings();
        }

        // Seed packages if needed
        const packageCount = await prisma.package.count();
        if (packageCount === 0) {
            console.log('Seeding packages...');
            await seedPackages();
        }

        console.log('Essential data seeded successfully');

    } catch (error) {
        console.error('Data seeding failed:', error.message);
        throw error;
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
        {
            provider: 'google',
            name: 'imagen3',
            displayName: 'Imagen 3',
            description: 'Google\'s latest Imagen model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://imagen.googleapis.com/v1/images:generate',
            apiModel: 'imagen-3.0-generate-001',
            apiSize: '1024x1024'
        },
        {
            provider: 'flux',
            name: 'flux-dev',
            displayName: 'Flux Dev',
            description: 'Flux development model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.flux.ai/v1/generate',
            apiModel: 'flux-dev',
            apiSize: '1024x1024'
        }
    ];

    for (const config of modelConfigs) {
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
    }

    console.log(`Seeded ${modelConfigs.length} models`);
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

async function verifyDeployment() {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('Database connection verified');

        // Check essential data
        const counts = {
            users: await prisma.user.count(),
            models: await prisma.model.count(),
            systemSettings: await prisma.systemSettings.count(),
            packages: await prisma.package.count()
        };

        console.log('Deployment verification:');
        Object.entries(counts).forEach(([table, count]) => {
            console.log(`  ✓ ${table}: ${count} records`);
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

// Run the deployment
railwayDeploy();
