#!/usr/bin/env node

/**
 * Simple script to add Google OAuth columns to the users table
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function addGoogleOAuthColumns() {
    console.log('🔄 Adding Google OAuth columns to users table...');

    try {
        // Add columns one by one to avoid conflicts
        console.log('➕ Adding googleId column...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN googleId VARCHAR(50) UNIQUE`;
        console.log('✅ googleId column added');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ googleId column already exists');
        } else {
            console.log('❌ Error adding googleId:', error.message);
        }
    }

    try {
        console.log('➕ Adding name column...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN name VARCHAR(100)`;
        console.log('✅ name column added');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ name column already exists');
        } else {
            console.log('❌ Error adding name:', error.message);
        }
    }

    try {
        console.log('➕ Adding picture column...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN picture VARCHAR(500)`;
        console.log('✅ picture column added');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ picture column already exists');
        } else {
            console.log('❌ Error adding picture:', error.message);
        }
    }

    try {
        console.log('➕ Adding isEmailVerified column...');
        await prisma.$executeRaw`ALTER TABLE users ADD COLUMN isEmailVerified BOOLEAN DEFAULT FALSE`;
        console.log('✅ isEmailVerified column added');
    } catch (error) {
        if (error.message.includes('Duplicate column name')) {
            console.log('✅ isEmailVerified column already exists');
        } else {
            console.log('❌ Error adding isEmailVerified:', error.message);
        }
    }

    try {
        console.log('🔧 Making password column nullable...');
        await prisma.$executeRaw`ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL`;
        console.log('✅ password column made nullable');
    } catch (error) {
        console.log('❌ Error modifying password column:', error.message);
    }

    console.log('✅ Google OAuth columns migration completed!');
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addGoogleOAuthColumns()
        .then(() => {
            console.log('🎉 Migration completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration failed:', error);
            process.exit(1);
        })
        .finally(() => {
            prisma.$disconnect();
        });
}

export default addGoogleOAuthColumns;
