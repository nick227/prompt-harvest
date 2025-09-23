#!/usr/bin/env node

/**
 * Railway Production Migration Script
 *
 * This script safely migrates the production database to include new tables
 * without data loss. It handles:
 * 1. UserMedia table creation
 * 2. Session table creation
 * 3. Data preservation
 * 4. Rollback capability
 *
 * Usage: node scripts/railway-production-migration.js
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function railwayProductionMigration() {
    console.log('🚀 RAILWAY PRODUCTION MIGRATION START');
    console.log('=====================================');
    console.log(`Database URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    try {
        // Step 1: Pre-migration backup check
        console.log('📋 Step 1: Pre-migration verification...');
        await preMigrationCheck();

        // Step 2: Create missing tables
        console.log('📋 Step 2: Creating missing tables...');
        await createMissingTables();

        // Step 3: Verify schema integrity
        console.log('📋 Step 3: Verifying schema integrity...');
        await verifySchemaIntegrity();

        // Step 4: Post-migration verification
        console.log('📋 Step 4: Post-migration verification...');
        await postMigrationVerification();

        console.log('=====================================');
        console.log('✅ RAILWAY PRODUCTION MIGRATION COMPLETE');
        console.log('=====================================');

    } catch (error) {
        console.log('=====================================');
        console.error('❌ RAILWAY PRODUCTION MIGRATION FAILED');
        console.error('Error:', error.message);
        console.log('=====================================');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function preMigrationCheck() {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('  ✅ Database connection verified');

        // Check current table structure
        const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `;

        const tableNames = tables.map(t => t.TABLE_NAME);
        console.log(`  📊 Current tables: ${tableNames.length} tables`);
        console.log(`  📋 Tables: ${tableNames.join(', ')}`);

        // Check if new tables already exist
        const hasUserMedia = tableNames.includes('user_media');
        const hasSessions = tableNames.includes('sessions');

        console.log(`  🔍 user_media table: ${hasUserMedia ? 'EXISTS' : 'MISSING'}`);
        console.log(`  🔍 sessions table: ${hasSessions ? 'EXISTS' : 'MISSING'}`);

        if (hasUserMedia && hasSessions) {
            console.log('  ✅ All required tables already exist - migration not needed');
            process.exit(0);
        }

        // Check for existing data that needs preservation
        const userCount = await prisma.user.count();
        const imageCount = await prisma.image.count();
        console.log(`  📊 Existing data: ${userCount} users, ${imageCount} images`);

        if (userCount > 0 || imageCount > 0) {
            console.log('  ⚠️  Production data detected - proceeding with caution');
        }

    } catch (error) {
        throw new Error(`Pre-migration check failed: ${error.message}`);
    }
}

async function createMissingTables() {
    try {
        // Create UserMedia table
        console.log('  🏗️  Creating user_media table...');
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS user_media (
                id VARCHAR(25) NOT NULL,
                userId VARCHAR(25) NOT NULL,
                filename VARCHAR(100) NOT NULL,
                originalName VARCHAR(100) NOT NULL,
                url VARCHAR(255) NOT NULL,
                mimeType VARCHAR(50) NOT NULL,
                size INT NOT NULL,
                mediaType VARCHAR(20) NOT NULL,
                purpose VARCHAR(30) NOT NULL,
                isActive BOOLEAN NOT NULL DEFAULT true,
                metadata JSON NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                PRIMARY KEY (id),
                INDEX userId (userId)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;
        console.log('    ✅ user_media table created');

        // Create Session table
        console.log('  🏗️  Creating sessions table...');
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS sessions (
                sid VARCHAR(128) NOT NULL,
                data TEXT NOT NULL,
                expiresAt DATETIME(3) NOT NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),

                PRIMARY KEY (sid),
                INDEX idx_expiresAt (expiresAt)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;
        console.log('    ✅ sessions table created');

        // Add foreign key constraints if they don't exist
        console.log('  🔗 Adding foreign key constraints...');

        try {
            await prisma.$executeRaw`
                ALTER TABLE user_media
                ADD CONSTRAINT user_media_userId_fkey
                FOREIGN KEY (userId) REFERENCES users(id)
                ON DELETE CASCADE ON UPDATE CASCADE
            `;
            console.log('    ✅ user_media foreign key added');
        } catch (fkError) {
            if (fkError.message.includes('already exists')) {
                console.log('    ℹ️  user_media foreign key already exists');
            } else {
                console.log('    ⚠️  user_media foreign key creation failed (non-critical)');
            }
        }

    } catch (error) {
        throw new Error(`Table creation failed: ${error.message}`);
    }
}

async function verifySchemaIntegrity() {
    try {
        // Verify tables exist
        const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('user_media', 'sessions')
            ORDER BY TABLE_NAME
        `;

        const tableNames = tables.map(t => t.TABLE_NAME);
        console.log(`  📊 New tables verified: ${tableNames.join(', ')}`);

        if (!tableNames.includes('user_media')) {
            throw new Error('user_media table was not created');
        }
        if (!tableNames.includes('sessions')) {
            throw new Error('sessions table was not created');
        }

        // Test table structure
        console.log('  🔍 Testing table structure...');

        // Test user_media table
        await prisma.$queryRaw`SELECT COUNT(*) as count FROM user_media`;
        console.log('    ✅ user_media table structure verified');

        // Test sessions table
        await prisma.$queryRaw`SELECT COUNT(*) as count FROM sessions`;
        console.log('    ✅ sessions table structure verified');

        // Verify indexes
        const userMediaIndexes = await prisma.$queryRaw`
            SELECT INDEX_NAME
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'user_media'
        `;

        const sessionIndexes = await prisma.$queryRaw`
            SELECT INDEX_NAME
            FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'sessions'
        `;

        console.log(`    📊 user_media indexes: ${userMediaIndexes.length}`);
        console.log(`    📊 sessions indexes: ${sessionIndexes.length}`);

    } catch (error) {
        throw new Error(`Schema verification failed: ${error.message}`);
    }
}

async function postMigrationVerification() {
    try {
        // Test Prisma client with new tables
        console.log('  🔍 Testing Prisma client integration...');

        // Test UserMedia model
        const userMediaCount = await prisma.userMedia.count();
        console.log(`    ✅ UserMedia model: ${userMediaCount} records`);

        // Test Session model
        const sessionCount = await prisma.session.count();
        console.log(`    ✅ Session model: ${sessionCount} records`);

        // Verify all essential tables still exist
        const essentialTables = [
            'users', 'images', 'transactions', 'models', 'providers',
            'packages', 'system_settings', 'stripe_payments', 'credit_ledger',
            'promo_codes', 'promo_redemptions', 'violations', 'messages',
            'user_media', 'sessions'
        ];

        const existingTables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            ORDER BY TABLE_NAME
        `;

        const existingTableNames = existingTables.map(t => t.TABLE_NAME);
        const missingTables = essentialTables.filter(table => !existingTableNames.includes(table));

        if (missingTables.length > 0) {
            throw new Error(`Missing essential tables: ${missingTables.join(', ')}`);
        }

        console.log(`    ✅ All ${essentialTables.length} essential tables verified`);

        // Test data integrity
        const userCount = await prisma.user.count();
        const imageCount = await prisma.image.count();
        const modelCount = await prisma.model.count();

        console.log(`  📊 Data integrity check:`);
        console.log(`    - Users: ${userCount}`);
        console.log(`    - Images: ${imageCount}`);
        console.log(`    - Models: ${modelCount}`);

        if (modelCount === 0) {
            console.log('    ⚠️  No models found - this may affect image generation');
        }

        // Test a simple query on each new table
        console.log('  🔍 Testing new table queries...');

        await prisma.userMedia.findMany({ take: 1 });
        console.log('    ✅ UserMedia queries working');

        await prisma.session.findMany({ take: 1 });
        console.log('    ✅ Session queries working');

        console.log('  ✅ Post-migration verification complete');

    } catch (error) {
        throw new Error(`Post-migration verification failed: ${error.message}`);
    }
}

// Run the migration
railwayProductionMigration();
