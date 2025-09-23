#!/usr/bin/env node

/**
 * Railway Deployment Script with Migration Fix
 *
 * This script handles Railway deployment with proper migration resolution:
 * 1. Resolves failed migrations
 * 2. Applies new migrations
 * 3. Seeds essential data
 * 4. Verifies deployment
 *
 * Run: node scripts/railway-deploy-fixed.js
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

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

function logStep(step, description) {
    log(`\n${colors.cyan}🔍 Step ${step}: ${description}${colors.reset}`);
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

async function railwayDeployFixed() {
    try {
        log('🚀 Starting Railway deployment with migration fix...', 'bright');

        // Step 1: Check environment
        logStep(1, 'Checking environment');
        await checkEnvironment();

        // Step 2: Resolve migration issues
        logStep(2, 'Resolving migration issues');
        await resolveMigrationIssues();

        // Step 3: Apply migrations
        logStep(3, 'Applying migrations');
        await applyMigrations();

        // Step 4: Seed essential data
        logStep(4, 'Seeding essential data');
        await seedEssentialData();

        // Step 5: Verify deployment
        logStep(5, 'Verifying deployment');
        await verifyDeployment();

        log('\n🎉 Railway deployment completed successfully!', 'bright');
        log('📊 Application is ready for production.', 'green');

    } catch (error) {
        logError(`Railway deployment failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function checkEnvironment() {
    try {
        logInfo('Checking environment variables...');

        const requiredEnvVars = ['DATABASE_URL'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

        if (missingVars.length > 0) {
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        logSuccess('Environment variables verified');
        logInfo(`Database URL: ${process.env.DATABASE_URL?.substring(0, 50)}...`);

    } catch (error) {
        logError(`Environment check failed: ${error.message}`);
        throw error;
    }
}

async function resolveMigrationIssues() {
    try {
        logInfo('Resolving migration issues...');

        // Check migration status
        try {
            const statusOutput = execSync('npx prisma migrate status', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            logInfo('Migration status:');
            console.log(statusOutput);

            // Check for failed migrations
            if (statusOutput.includes('failed') || statusOutput.includes('P3009')) {
                logWarning('Failed migrations detected, resolving...');

                // Try to resolve the specific failed migration
                try {
                    execSync('npx prisma migrate resolve --applied 20250917081252_initial_complete_schema', {
                        encoding: 'utf8',
                        stdio: 'pipe'
                    });
                    logSuccess('Failed migration resolved');
                } catch (resolveError) {
                    logWarning(`Could not resolve migration: ${resolveError.message}`);
                    throw new Error('Failed to resolve migration');
                }
            }

        } catch (statusError) {
            logWarning(`Could not check migration status: ${statusError.message}`);
            // Continue with deployment
        }

    } catch (error) {
        logError(`Migration resolution failed: ${error.message}`);
        throw error;
    }
}

async function applyMigrations() {
    try {
        logInfo('Applying migrations...');

        // Try to deploy migrations
        try {
            const deployOutput = execSync('npx prisma migrate deploy', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            logSuccess('Migrations deployed successfully');
            console.log(deployOutput);

        } catch (deployError) {
            logWarning(`Could not deploy migrations: ${deployError.message}`);

            // Try to push schema directly
            logInfo('Attempting to push schema directly...');
            try {
                const pushOutput = execSync('npx prisma db push', {
                    encoding: 'utf8',
                    stdio: 'pipe'
                });

                logSuccess('Schema pushed successfully');
                console.log(pushOutput);

            } catch (pushError) {
                logError(`Could not push schema: ${pushError.message}`);
                throw new Error('Failed to apply database schema');
            }
        }

    } catch (error) {
        logError(`Migration application failed: ${error.message}`);
        throw error;
    }
}

async function seedEssentialData() {
    try {
        logInfo('Seeding essential data...');

        // Check if data already exists
        const userCount = await prisma.user.count();
        const modelCount = await prisma.model.count();
        const settingsCount = await prisma.systemSettings.count();

        if (userCount > 0 && modelCount > 0 && settingsCount > 0) {
            logInfo('Essential data already exists, skipping seeding');
            return;
        }

        // Seed models if needed
        if (modelCount === 0) {
            logInfo('Seeding models...');
            await seedModels();
        }

        // Seed system settings if needed
        if (settingsCount === 0) {
            logInfo('Seeding system settings...');
            await seedSystemSettings();
        }

        // Seed packages if needed
        const packageCount = await prisma.package.count();
        if (packageCount === 0) {
            logInfo('Seeding packages...');
            await seedPackages();
        }

        logSuccess('Essential data seeded successfully');

    } catch (error) {
        logError(`Data seeding failed: ${error.message}`);
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
            apiUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict',
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

    logSuccess(`Seeded ${modelConfigs.length} models`);
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

    logSuccess(`Seeded ${settings.length} system settings`);
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

    logSuccess(`Seeded ${packages.length} packages`);
}

async function verifyDeployment() {
    try {
        logInfo('Verifying deployment...');

        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        logSuccess('Database connection verified');

        // Check essential data
        const counts = {
            users: await prisma.user.count(),
            models: await prisma.model.count(),
            systemSettings: await prisma.systemSettings.count(),
            packages: await prisma.package.count()
        };

        logInfo('Deployment verification:');
        Object.entries(counts).forEach(([table, count]) => {
            logSuccess(`  ✓ ${table}: ${count} records`);
        });

        // Verify critical settings
        const welcomeCredits = await prisma.systemSettings.findUnique({
            where: { key: 'new_user_welcome_credits' }
        });

        if (welcomeCredits && parseInt(welcomeCredits.value) > 0) {
            logSuccess(`✓ Welcome credits: ${welcomeCredits.value} (ready for new users)`);
        } else {
            logError('✗ Welcome credits not properly configured');
        }

        logSuccess('Deployment verification completed');

    } catch (error) {
        logError(`Deployment verification failed: ${error.message}`);
        throw error;
    }
}

// Run the deployment
railwayDeployFixed().catch(error => {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
});
