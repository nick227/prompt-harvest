#!/usr/bin/env node

/**
 * Railway Models Seeding Script
 *
 * This script focuses exclusively on seeding models for Railway deployment.
 * It ensures that essential models are available for image generation.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️ ${message}`, 'blue');
}

async function seedRailwayModels() {
    try {
        log('🚀 RAILWAY MODELS SEEDING STARTED', 'bright');
        log('=====================================', 'bright');

        // Step 1: Test database connection
        logInfo('Step 1: Testing database connection...');
        await testDatabaseConnection();

        // Step 2: Check current models
        logInfo('Step 2: Checking current models...');
        const currentCount = await checkCurrentModels();

        // Step 3: Seed essential models
        logInfo('Step 3: Seeding essential models...');
        const seedingResult = await seedEssentialModels();

        // Step 4: Verify seeding
        logInfo('Step 4: Verifying seeding...');
        await verifySeeding();

        // Step 5: Final summary
        logInfo('Step 5: Final summary...');
        await finalSummary();

        log('=====================================', 'bright');
        logSuccess('🎉 RAILWAY MODELS SEEDING COMPLETED SUCCESSFULLY!');
        log('=====================================', 'bright');

    } catch (error) {
        logError(`RAILWAY MODELS SEEDING FAILED: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function testDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1 as test`;
        logSuccess('Database connection successful');
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        throw error;
    }
}

async function checkCurrentModels() {
    try {
        const models = await prisma.model.findMany({
            select: {
                id: true,
                provider: true,
                name: true,
                displayName: true,
                isActive: true
            }
        });

        logInfo(`Current models in database: ${models.length}`);

        if (models.length > 0) {
            logInfo('Existing models:');
            models.forEach(model => {
                const status = model.isActive ? '✅' : '❌';
                logInfo(`  ${status} ${model.provider}/${model.name}: ${model.displayName}`);
            });
        } else {
            logWarning('No models found in database - will seed essential models');
        }

        return models.length;
    } catch (error) {
        logError(`Failed to check current models: ${error.message}`);
        return 0;
    }
}

async function seedEssentialModels() {
    const essentialModels = [
        // Flux Models
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
        },
        {
            provider: 'flux',
            name: 'flux-pro',
            displayName: 'Flux Pro',
            description: 'Flux professional model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.flux.ai/v1/generate',
            apiModel: 'flux-pro',
            apiSize: '1024x1024'
        },

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
            apiUrl: 'https://imagen.googleapis.com/v1/images:generate',
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
            apiUrl: 'https://api.dezgo.com/generate',
            apiModel: 'flux',
            apiSize: '1024x1024'
        },
        {
            provider: 'dezgo',
            name: 'flux-dev',
            displayName: 'Flux Dev (Dezgo)',
            description: 'Flux Dev model via Dezgo API',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.dezgo.com/generate',
            apiModel: 'flux-dev',
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

    let insertedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    logInfo(`Starting to seed ${essentialModels.length} essential models...`);

    for (const model of essentialModels) {
        try {
            // Check if model exists
            const existingModel = await prisma.model.findUnique({
                where: {
                    provider_name: {
                        provider: model.provider,
                        name: model.name
                    }
                }
            });

            if (existingModel) {
                // Update existing model
                await prisma.model.update({
                    where: {
                        provider_name: {
                            provider: model.provider,
                            name: model.name
                        }
                    },
                    data: model
                });
                logSuccess(`Updated ${model.provider}/${model.name}: ${model.displayName}`);
                updatedCount++;
            } else {
                // Create new model
                await prisma.model.create({
                    data: model
                });
                logSuccess(`Created ${model.provider}/${model.name}: ${model.displayName}`);
                insertedCount++;
            }
        } catch (error) {
            errorCount++;
            logError(`Failed to seed model ${model.provider}/${model.name}: ${error.message}`);
        }
    }

    logInfo(`Seeding completed: ${insertedCount} created, ${updatedCount} updated, ${errorCount} failed`);
    return { insertedCount, updatedCount, errorCount };
}

async function verifySeeding() {
    try {
        const models = await prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                displayName: true,
                isActive: true
            }
        });

        logInfo(`Verification: Found ${models.length} active models`);

        if (models.length === 0) {
            logError('No active models found! Seeding may have failed.');
            throw new Error('No active models found after seeding');
        }

        logInfo('Active models:');
        models.forEach(model => {
            logInfo(`  ✅ ${model.provider}/${model.name}: ${model.displayName}`);
        });

        return true;
    } catch (error) {
        logError(`Verification failed: ${error.message}`);
        throw error;
    }
}

async function finalSummary() {
    try {
        // Get final counts
        const totalModels = await prisma.model.count();
        const activeModels = await prisma.model.count({ where: { isActive: true } });

        // Check for images with null models
        const imagesWithNullModels = await prisma.image.findMany({
            where: { model: null },
            select: {
                id: true,
                provider: true,
                model: true,
                createdAt: true
            }
        });

        logInfo('=== FINAL SUMMARY ===');
        logInfo(`Total models: ${totalModels}`);
        logInfo(`Active models: ${activeModels}`);
        logInfo(`Images with null models: ${imagesWithNullModels.length}`);

        if (imagesWithNullModels.length > 0) {
            logWarning('Images with null models found:');
            imagesWithNullModels.forEach(image => {
                logWarning(`  - ${image.id}: ${image.provider} (created: ${image.createdAt})`);
            });
        }

        if (activeModels > 0) {
            logSuccess('✅ Models are now available for image generation!');
        } else {
            logError('❌ No active models available - image generation will fail!');
        }

    } catch (error) {
        logError(`Final summary failed: ${error.message}`);
    }
}

// Run the seeding
seedRailwayModels();
