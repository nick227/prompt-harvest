#!/usr/bin/env node

/**
 * Railway Model Seeding Script
 *
 * This script is specifically designed to run on Railway and seed models.
 * It includes comprehensive error handling and Railway-specific optimizations.
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

async function testDatabaseConnection() {
    try {
        logInfo('Testing database connection...');
        const result = await prisma.$queryRaw`SELECT 1 as test`;
        logSuccess('Database connection successful');
        return true;
    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        return false;
    }
}

async function checkExistingModels() {
    try {
        const count = await prisma.model.count();
        logInfo(`Current models in database: ${count}`);

        if (count > 0) {
            const models = await prisma.model.findMany({
                select: {
                    provider: true,
                    name: true,
                    displayName: true,
                    isActive: true
                }
            });

            logInfo('Existing models:');
            models.forEach(model => {
                const status = model.isActive ? '✅' : '❌';
                logInfo(`  ${status} ${model.provider}/${model.name}: ${model.displayName}`);
            });
        }

        return count;
    } catch (error) {
        logError(`Failed to check existing models: ${error.message}`);
        return 0;
    }
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
            apiUrl: 'https://imagen.googleapis.com/v1/images:generate',
            apiModel: 'imagen-3.0-generate-001',
            apiSize: '1024x1024'
        },

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

    let seededCount = 0;
    let errorCount = 0;

    logInfo(`Starting to seed ${modelConfigs.length} models...`);

    for (const config of modelConfigs) {
        try {
            // First, try to find existing model
            const existingModel = await prisma.model.findUnique({
                where: {
                    provider_name: {
                        provider: config.provider,
                        name: config.name
                    }
                }
            });

            if (existingModel) {
                // Update existing model
                await prisma.model.update({
                    where: {
                        provider_name: {
                            provider: config.provider,
                            name: config.name
                        }
                    },
                    data: config
                });
                logSuccess(`Updated ${config.provider}/${config.name}: ${config.displayName}`);
            } else {
                // Create new model
                await prisma.model.create({
                    data: config
                });
                logSuccess(`Created ${config.provider}/${config.name}: ${config.displayName}`);
            }

            seededCount++;
        } catch (error) {
            errorCount++;
            logError(`Failed to seed model ${config.provider}/${config.name}: ${error.message}`);

            // Try alternative approach - delete and recreate
            try {
                await prisma.model.deleteMany({
                    where: {
                        provider: config.provider,
                        name: config.name
                    }
                });

                await prisma.model.create({
                    data: config
                });

                logSuccess(`Recovered ${config.provider}/${config.name}: ${config.displayName}`);
                seededCount++;
                errorCount--;
            } catch (recoveryError) {
                logError(`Recovery failed for ${config.provider}/${config.name}: ${recoveryError.message}`);
            }
        }
    }

    logInfo(`Seeding completed: ${seededCount} successful, ${errorCount} failed`);
    return { seededCount, errorCount };
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
            return false;
        }

        logInfo('Active models:');
        models.forEach(model => {
            logInfo(`  ✅ ${model.provider}/${model.name}: ${model.displayName}`);
        });

        return true;
    } catch (error) {
        logError(`Verification failed: ${error.message}`);
        return false;
    }
}

async function main() {
    try {
        log('🚀 Railway Model Seeding Script Started', 'bright');

        // Test database connection
        const dbConnected = await testDatabaseConnection();
        if (!dbConnected) {
            throw new Error('Cannot proceed without database connection');
        }

        // Check existing models
        const existingCount = await checkExistingModels();

        // Seed models
        const { seededCount, errorCount } = await seedModels();

        // Verify seeding
        const verificationPassed = await verifySeeding();

        if (verificationPassed && errorCount === 0) {
            logSuccess('🎉 Model seeding completed successfully!');
            logInfo(`Total models seeded: ${seededCount}`);
        } else if (verificationPassed && errorCount > 0) {
            logWarning(`⚠️ Model seeding completed with ${errorCount} errors`);
            logInfo(`Successful seeds: ${seededCount}`);
        } else {
            logError('❌ Model seeding failed verification');
            throw new Error('Seeding verification failed');
        }

    } catch (error) {
        logError(`Script failed: ${error.message}`);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
main();
