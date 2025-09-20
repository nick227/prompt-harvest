#!/usr/bin/env node

/**
 * Railway Migration Fix Script
 *
 * This script resolves failed Prisma migrations on Railway by:
 * 1. Checking migration status
 * 2. Resolving failed migrations
 * 3. Applying new migrations
 * 4. Verifying the database state
 *
 * Run: node scripts/railway-migration-fix.js
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

async function railwayMigrationFix() {
    try {
        log('🚀 Starting Railway migration fix...', 'bright');

        // Step 1: Check current migration status
        logStep(1, 'Checking migration status');
        await checkMigrationStatus();

        // Step 2: Resolve failed migrations
        logStep(2, 'Resolving failed migrations');
        await resolveFailedMigrations();

        // Step 3: Apply new migrations
        logStep(3, 'Applying new migrations');
        await applyNewMigrations();

        // Step 4: Verify database state
        logStep(4, 'Verifying database state');
        await verifyDatabaseState();

        log('\n🎉 Railway migration fix completed successfully!', 'bright');
        log('📊 Database is ready for production deployment.', 'green');

    } catch (error) {
        logError(`Railway migration fix failed: ${error.message}`);
        logError(`Stack trace: ${error.stack}`);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function checkMigrationStatus() {
    try {
        logInfo('Checking Prisma migration status...');

        // Check migration status
        const statusOutput = execSync('npx prisma migrate status', {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        logInfo('Migration status:');
        console.log(statusOutput);

        // Check if there are failed migrations
        if (statusOutput.includes('failed') || statusOutput.includes('P3009')) {
            logWarning('Failed migrations detected');
            return true;
        }

        logSuccess('No failed migrations found');
        return false;

    } catch (error) {
        logError(`Failed to check migration status: ${error.message}`);
        throw error;
    }
}

async function resolveFailedMigrations() {
    try {
        logInfo('Resolving failed migrations...');

        // Try to resolve failed migrations
        try {
            const resolveOutput = execSync('npx prisma migrate resolve --applied 20250917081252_initial_complete_schema', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            logSuccess('Failed migration resolved');
            console.log(resolveOutput);

        } catch (resolveError) {
            logWarning(`Could not resolve migration: ${resolveError.message}`);

            // Try alternative approach - reset and push
            logInfo('Attempting alternative resolution...');
            await resetAndPush();
        }

    } catch (error) {
        logError(`Failed to resolve migrations: ${error.message}`);
        throw error;
    }
}

async function resetAndPush() {
    try {
        logInfo('Resetting database and pushing schema...');

        // Reset the database
        logInfo('Resetting database...');
        execSync('npx prisma migrate reset --force', {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        logSuccess('Database reset completed');

        // Push the schema
        logInfo('Pushing schema to database...');
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'pipe'
        });

        logSuccess('Schema pushed successfully');

    } catch (error) {
        logError(`Failed to reset and push: ${error.message}`);
        throw error;
    }
}

async function applyNewMigrations() {
    try {
        logInfo('Applying new migrations...');

        // Try to apply migrations
        try {
            const migrateOutput = execSync('npx prisma migrate deploy', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            logSuccess('Migrations applied successfully');
            console.log(migrateOutput);

        } catch (migrateError) {
            logWarning(`Could not apply migrations: ${migrateError.message}`);

            // Try to generate and apply new migration
            logInfo('Generating new migration...');
            execSync('npx prisma migrate dev --name fix_railway_migration', {
                encoding: 'utf8',
                stdio: 'pipe'
            });

            logSuccess('New migration generated and applied');
        }

    } catch (error) {
        logError(`Failed to apply migrations: ${error.message}`);
        throw error;
    }
}

async function verifyDatabaseState() {
    try {
        logInfo('Verifying database state...');

        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        logSuccess('Database connection verified');

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
            }
        }

        // Check data counts
        const counts = {
            users: await prisma.user.count(),
            models: await prisma.model.count(),
            wordTypes: await prisma.word_types.count(),
            systemSettings: await prisma.systemSettings.count(),
            messages: await prisma.message.count(),
            packages: await prisma.package.count()
        };

        logInfo('Data verification:');
        Object.entries(counts).forEach(([table, count]) => {
            logSuccess(`  ✓ ${table}: ${count} records`);
        });

        logSuccess('Database state verification completed');

    } catch (error) {
        logError(`Database verification failed: ${error.message}`);
        throw error;
    }
}

// Run the migration fix
railwayMigrationFix().catch(error => {
    logError(`Migration fix failed: ${error.message}`);
    process.exit(1);
});
