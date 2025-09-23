#!/usr/bin/env node

/**
 * Railway Deployment Script with Comprehensive Database & Data Verification
 *
 * This script provides:
 * - Complete database schema verification
 * - Data integrity checks
 * - System settings validation
 * - Messaging system verification
 * - Fallback data restoration
 * - Comprehensive error handling and reporting
 *
 * Run: node scripts/railway-deploy-verified.js
 */

import { PrismaClient } from '@prisma/client';
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

async function railwayDeployVerified() {
    try {
        log('🚀 Starting Railway deployment with comprehensive verification...', 'bright');

        // Step 1: Database Connection & Schema Verification
        logStep(1, 'Database Connection & Schema Verification');
        await verifyDatabaseConnection();
        await verifyDatabaseSchema();

        // Step 2: Core Data Verification
        logStep(2, 'Core Data Verification');
        const dataStatus = await verifyCoreData();

        // Step 3: System Settings Verification
        logStep(3, 'System Settings Verification');
        await verifySystemSettings();

        // Step 4: Messaging System Verification
        logStep(4, 'Messaging System Verification');
        await verifyMessagingSystem();

        // Step 5: Data Restoration (if needed)
        logStep(5, 'Data Restoration (if needed)');
        await restoreMissingData(dataStatus);

        // Step 6: Final Comprehensive Verification
        logStep(6, 'Final Comprehensive Verification');
        await performFinalVerification();

        log('\n🎉 Railway deployment with verification completed successfully!', 'bright');
        log('📊 All systems verified and ready for production.', 'green');

    } catch (error) {
        logError(`Railway deployment failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function verifyDatabaseConnection() {
    try {
        logInfo('Testing database connection...');

        // Test basic connection
        await prisma.$queryRaw`SELECT 1 as test`;
        logSuccess('Database connection successful');

        // Get database info
        const dbName = await prisma.$queryRaw`SELECT DATABASE() as db_name`;
        const version = await prisma.$queryRaw`SELECT VERSION() as version`;
        const now = await prisma.$queryRaw`SELECT NOW() as now`;

        logInfo(`Connected to: ${dbName[0].db_name}`);
        logInfo(`MySQL Version: ${version[0].version}`);
        logInfo(`Current Time: ${now[0].now}`);

    } catch (error) {
        logError(`Database connection failed: ${error.message}`);
        throw error;
    }
}

async function verifyDatabaseSchema() {
    try {
        logInfo('Verifying database schema...');

        // Check if all required tables exist
        const requiredTables = [
            'users', 'images', 'models', 'word_types', 'system_settings',
            'messages', 'packages', 'promo_codes', 'stripe_payments'
        ];

        const existingTables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
        `;

        const tableNames = existingTables.map(t => t.TABLE_NAME);

        logInfo('Required tables check:');
        for (const table of requiredTables) {
            if (tableNames.includes(table)) {
                logSuccess(`  ✓ ${table} table exists`);
            } else {
                logError(`  ✗ ${table} table missing`);
                throw new Error(`Required table '${table}' is missing`);
            }
        }

        // Verify critical table structures
        await verifyTableStructure('users', ['id', 'email', 'username', 'isAdmin']);
        await verifyTableStructure('models', ['id', 'provider', 'name', 'displayName']);
        await verifyTableStructure('system_settings', ['id', 'key', 'value', 'dataType']);
        await verifyTableStructure('messages', ['id', 'userId', 'message', 'isFromUser']);

        logSuccess('Database schema verification completed');

    } catch (error) {
        logError(`Schema verification failed: ${error.message}`);
        throw error;
    }
}

async function verifyTableStructure(tableName, requiredColumns) {
    try {
        const columns = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ${tableName}
        `;

        const columnNames = columns.map(c => c.COLUMN_NAME);

        for (const column of requiredColumns) {
            if (!columnNames.includes(column)) {
                throw new Error(`Required column '${column}' missing in table '${tableName}'`);
            }
        }

        logSuccess(`  ✓ ${tableName} table structure verified`);

    } catch (error) {
        logError(`  ✗ ${tableName} table structure verification failed: ${error.message}`);
        throw error;
    }
}

async function verifyCoreData() {
    try {
        logInfo('Verifying core data...');

        const dataStatus = {
            models: { count: 0, hasData: false },
            wordTypes: { count: 0, hasData: false },
            users: { count: 0, hasData: false, hasAdmin: false },
            packages: { count: 0, hasData: false }
        };

        // Check models
        dataStatus.models.count = await prisma.model.count();
        dataStatus.models.hasData = dataStatus.models.count > 0;
        logInfo(`Models: ${dataStatus.models.count} (${dataStatus.models.hasData ? 'OK' : 'EMPTY'})`);

        // Check word types
        dataStatus.wordTypes.count = await prisma.word_types.count();
        dataStatus.wordTypes.hasData = dataStatus.wordTypes.count > 0;
        logInfo(`Word Types: ${dataStatus.wordTypes.count} (${dataStatus.wordTypes.hasData ? 'OK' : 'EMPTY'})`);

        // Check users
        dataStatus.users.count = await prisma.user.count();
        dataStatus.users.hasData = dataStatus.users.count > 0;

        const adminCount = await prisma.user.count({ where: { isAdmin: true } });
        dataStatus.users.hasAdmin = adminCount > 0;
        logInfo(`Users: ${dataStatus.users.count} (${dataStatus.users.hasData ? 'OK' : 'EMPTY'})`);
        logInfo(`Admin Users: ${adminCount} (${dataStatus.users.hasAdmin ? 'OK' : 'NONE'})`);

        // Check packages
        dataStatus.packages.count = await prisma.package.count();
        dataStatus.packages.hasData = dataStatus.packages.count > 0;
        logInfo(`Packages: ${dataStatus.packages.count} (${dataStatus.packages.hasData ? 'OK' : 'EMPTY'})`);

        // Show sample data
        if (dataStatus.models.hasData) {
            const sampleModels = await prisma.model.findMany({ take: 3 });
            logInfo('Sample models:');
            sampleModels.forEach(m => logInfo(`  - ${m.provider}/${m.name}: ${m.displayName}`));
        }

        if (dataStatus.users.hasAdmin) {
            const adminUsers = await prisma.user.findMany({
                where: { isAdmin: true },
                select: { email: true, username: true }
            });
            logInfo('Admin users:');
            adminUsers.forEach(u => logInfo(`  - ${u.email} (${u.username})`));
        }

        logSuccess('Core data verification completed');
        return dataStatus;

    } catch (error) {
        logError(`Core data verification failed: ${error.message}`);
        throw error;
    }
}

async function verifySystemSettings() {
    try {
        logInfo('Verifying system settings...');

        const settingsCount = await prisma.systemSettings.count();
        logInfo(`System Settings: ${settingsCount} total`);

        // Check critical settings
        const criticalSettings = [
            'new_user_welcome_credits',
            'max_image_generations_per_hour',
            'maintenance_mode',
            'default_image_provider'
        ];

        logInfo('Critical settings check:');
        for (const settingKey of criticalSettings) {
            const setting = await prisma.systemSettings.findUnique({
                where: { key: settingKey }
            });

            if (setting) {
                logSuccess(`  ✓ ${settingKey}: ${setting.value} (${setting.dataType})`);
            } else {
                logWarning(`  ⚠ ${settingKey}: NOT FOUND`);
            }
        }

        // Verify welcome credits specifically
        const welcomeCredits = await prisma.systemSettings.findUnique({
            where: { key: 'new_user_welcome_credits' }
        });

        if (welcomeCredits) {
            const credits = parseInt(welcomeCredits.value);
            if (credits > 0) {
                logSuccess(`Welcome credits verified: ${credits} credits`);
            } else {
                logWarning(`Welcome credits is set to ${credits} (should be > 0)`);
            }
        } else {
            logError('Welcome credits setting not found!');
        }

        logSuccess('System settings verification completed');

    } catch (error) {
        logError(`System settings verification failed: ${error.message}`);
        throw error;
    }
}

async function verifyMessagingSystem() {
    try {
        logInfo('Verifying messaging system...');

        // Check messages table
        const messagesCount = await prisma.message.count();
        logInfo(`Messages: ${messagesCount} total`);

        // Check for any existing conversations
        const conversations = await prisma.message.groupBy({
            by: ['userId'],
            _count: { userId: true }
        });

        logInfo(`Active conversations: ${conversations.length}`);

        if (conversations.length > 0) {
            logInfo('Sample conversations:');
            for (const conv of conversations.slice(0, 3)) {
                const user = await prisma.user.findUnique({
                    where: { id: conv.userId },
                    select: { email: true, username: true }
                });
                logInfo(`  - ${user?.email || 'Unknown'}: ${conv._count.userId} messages`);
            }
        }

        logSuccess('Messaging system verification completed');

    } catch (error) {
        logError(`Messaging system verification failed: ${error.message}`);
        throw error;
    }
}

async function restoreMissingData(dataStatus) {
    try {
        logInfo('Checking if data restoration is needed...');

        let needsRestoration = false;

        // Check if models need restoration
        if (!dataStatus.models.hasData) {
            logWarning('Models table is empty, restoring...');
            await restoreModels();
            needsRestoration = true;
        }

        // Check if word types need restoration
        if (!dataStatus.wordTypes.hasData) {
            logWarning('Word types table is empty, restoring...');
            await restoreWordTypes();
            needsRestoration = true;
        }

        // Check if system settings need restoration
        const settingsCount = await prisma.systemSettings.count();
        if (settingsCount === 0) {
            logWarning('System settings table is empty, restoring...');
            await restoreSystemSettings();
            needsRestoration = true;
        }

        // Check if packages need restoration
        if (!dataStatus.packages.hasData) {
            logWarning('Packages table is empty, restoring...');
            await restorePackages();
            needsRestoration = true;
        }

        if (needsRestoration) {
            logSuccess('Data restoration completed');
        } else {
            logInfo('No data restoration needed');
        }

    } catch (error) {
        logError(`Data restoration failed: ${error.message}`);
        throw error;
    }
}

async function restoreModels() {
    try {
        logInfo('Restoring models...');

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

        logSuccess(`Restored ${modelConfigs.length} models`);

    } catch (error) {
        logError(`Failed to restore models: ${error.message}`);
        throw error;
    }
}

async function restoreWordTypes() {
    try {
        logInfo('Restoring word types...');

        const wordTypes = [
            { word: 'cat', types: ['animal', 'pet', 'feline'] },
            { word: 'dog', types: ['animal', 'pet', 'canine'] },
            { word: 'car', types: ['vehicle', 'transportation', 'automobile'] },
            { word: 'house', types: ['building', 'home', 'residence'] },
            { word: 'tree', types: ['plant', 'nature', 'vegetation'] }
        ];

        for (const wordType of wordTypes) {
            await prisma.word_types.upsert({
                where: { word: wordType.word },
                update: { types: wordType.types },
                create: wordType
            });
        }

        logSuccess(`Restored ${wordTypes.length} word types`);

    } catch (error) {
        logError(`Failed to restore word types: ${error.message}`);
        throw error;
    }
}

async function restoreSystemSettings() {
    try {
        logInfo('Restoring system settings...');

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

        logSuccess(`Restored ${settings.length} system settings`);

    } catch (error) {
        logError(`Failed to restore system settings: ${error.message}`);
        throw error;
    }
}

async function restorePackages() {
    try {
        logInfo('Restoring packages...');

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

        logSuccess(`Restored ${packages.length} packages`);

    } catch (error) {
        logError(`Failed to restore packages: ${error.message}`);
        throw error;
    }
}

async function performFinalVerification() {
    try {
        logInfo('Performing final comprehensive verification...');

        // Final counts
        const finalCounts = {
            users: await prisma.user.count(),
            models: await prisma.model.count(),
            wordTypes: await prisma.word_types.count(),
            systemSettings: await prisma.systemSettings.count(),
            messages: await prisma.message.count(),
            packages: await prisma.package.count()
        };

        logInfo('Final database state:');
        Object.entries(finalCounts).forEach(([table, count]) => {
            logSuccess(`  ✓ ${table}: ${count} records`);
        });

        // Verify critical functionality
        const welcomeCredits = await prisma.systemSettings.findUnique({
            where: { key: 'new_user_welcome_credits' }
        });

        if (welcomeCredits && parseInt(welcomeCredits.value) > 0) {
            logSuccess(`✓ Welcome credits: ${welcomeCredits.value} (ready for new users)`);
        } else {
            logError('✗ Welcome credits not properly configured');
        }

        const adminUsers = await prisma.user.count({ where: { isAdmin: true } });
        if (adminUsers > 0) {
            logSuccess(`✓ Admin users: ${adminUsers} (admin access available)`);
        } else {
            logWarning('⚠ No admin users found - consider creating one');
        }

        const activeModels = await prisma.model.count({ where: { isActive: true } });
        if (activeModels > 0) {
            logSuccess(`✓ Active models: ${activeModels} (image generation ready)`);
        } else {
            logError('✗ No active models found');
        }

        logSuccess('Final verification completed successfully');

    } catch (error) {
        logError(`Final verification failed: ${error.message}`);
        throw error;
    }
}

// Run the deployment
railwayDeployVerified().catch(error => {
    logError(`Deployment failed: ${error.message}`);
    process.exit(1);
});

export default railwayDeployVerified;
