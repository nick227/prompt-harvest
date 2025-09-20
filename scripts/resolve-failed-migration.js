#!/usr/bin/env node

/**
 * Script to resolve failed Prisma migration on Railway
 * This script will mark the failed migration as resolved
 */

const { PrismaClient } = require('@prisma/client');

async function resolveFailedMigration() {
    const prisma = new PrismaClient();

    try {
        console.log('🔍 Checking migration status...');

        // Check if the isSuspended column exists
        const result = await prisma.$queryRaw`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'isSuspended'
        `;

        if (result.length > 0) {
            console.log('✅ isSuspended column already exists in users table');
            console.log('📝 Marking migration as resolved...');

            // Mark the migration as resolved by updating the _prisma_migrations table
            await prisma.$executeRaw`
                UPDATE _prisma_migrations
                SET finished_at = NOW(),
                    logs = 'Migration resolved manually - column already exists'
                WHERE migration_name = '20250115000000_add_isSuspended_field'
                AND finished_at IS NULL
            `;

            console.log('✅ Migration marked as resolved');
        } else {
            console.log('❌ isSuspended column does not exist');
            console.log('🔧 Adding the column manually...');

            // Add the column manually
            await prisma.$executeRaw`
                ALTER TABLE users ADD COLUMN isSuspended BOOLEAN NOT NULL DEFAULT false
            `;

            console.log('✅ Column added successfully');

            // Mark the migration as resolved
            await prisma.$executeRaw`
                UPDATE _prisma_migrations
                SET finished_at = NOW(),
                    logs = 'Migration resolved manually - column added'
                WHERE migration_name = '20250115000000_add_isSuspended_field'
                AND finished_at IS NULL
            `;

            console.log('✅ Migration marked as resolved');
        }

        console.log('🎉 Migration resolution complete!');

    } catch (error) {
        console.error('❌ Error resolving migration:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the script
resolveFailedMigration();
