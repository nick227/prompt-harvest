#!/usr/bin/env node

/**
 * Migration script to add Google OAuth support to existing users table
 * This script adds the necessary columns for Google OAuth integration
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function migrateGoogleOAuth() {
    console.log('🔄 Starting Google OAuth migration...');

    try {
        // Check if the columns already exist
        const tableInfo = await prisma.$queryRaw`
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME IN ('googleId', 'name', 'picture', 'isEmailVerified')
        `;

        const existingColumns = tableInfo.map(row => row.COLUMN_NAME);
        console.log('📋 Existing columns:', existingColumns);

        // Add missing columns
        const columnsToAdd = [
            { name: 'googleId', type: 'VARCHAR(100) UNIQUE' },
            { name: 'name', type: 'VARCHAR(100)' },
            { name: 'picture', type: 'VARCHAR(500)' },
            { name: 'isEmailVerified', type: 'BOOLEAN DEFAULT FALSE' }
        ];

        for (const column of columnsToAdd) {
            if (!existingColumns.includes(column.name)) {
                console.log(`➕ Adding column: ${column.name}`);
                await prisma.$executeRawUnsafe(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
            } else {
                console.log(`✅ Column already exists: ${column.name}`);
            }
        }

        // Make password column nullable for OAuth users
        console.log('🔧 Making password column nullable...');
        await prisma.$executeRawUnsafe('ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL');

        // Add unique constraint on email if it doesn't exist
        try {
            console.log('🔧 Adding unique constraint on email...');
            await prisma.$executeRawUnsafe('ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email)');
            console.log('✅ Unique constraint on email added');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('✅ Unique constraint on email already exists');
            } else {
                throw error;
            }
        }

        // Add index on googleId if it doesn't exist
        try {
            console.log('🔧 Adding index on googleId...');
            await prisma.$executeRawUnsafe('CREATE INDEX idx_users_googleId ON users (googleId)');
            console.log('✅ Index on googleId added');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('✅ Index on googleId already exists');
            } else {
                throw error;
            }
        }

        console.log('✅ Google OAuth migration completed successfully!');

        // Show current table structure
        const tableStructure = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            ORDER BY ORDINAL_POSITION
        `;

        console.log('\n📋 Current users table structure:');
        console.table(tableStructure);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    migrateGoogleOAuth()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        });
}

export default migrateGoogleOAuth;
