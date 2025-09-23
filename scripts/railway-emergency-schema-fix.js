#!/usr/bin/env node

/**
 * Emergency Schema Fix for Railway Production
 * 
 * This script directly adds the missing columns to the images table
 * using raw SQL commands to bypass any Prisma schema issues.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function emergencySchemaFix() {
    console.log('🚨 EMERGENCY SCHEMA FIX STARTED');
    console.log('==========================================');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    try {
        console.log('🔧 Step 1: Adding missing columns to images table...');
        
        // Add isDeleted column
        try {
            await prisma.$executeRaw`ALTER TABLE images ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE`;
            console.log('    ✅ Added isDeleted column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  isDeleted column already exists');
            } else {
                throw error;
            }
        }
        
        // Add deletedAt column
        try {
            await prisma.$executeRaw`ALTER TABLE images ADD COLUMN deletedAt DATETIME NULL`;
            console.log('    ✅ Added deletedAt column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  deletedAt column already exists');
            } else {
                throw error;
            }
        }
        
        // Add deletedBy column
        try {
            await prisma.$executeRaw`ALTER TABLE images ADD COLUMN deletedBy VARCHAR(25) NULL`;
            console.log('    ✅ Added deletedBy column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  deletedBy column already exists');
            } else {
                throw error;
            }
        }
        
        console.log('🔧 Step 2: Adding indexes...');
        
        // Add indexes for the new columns
        try {
            await prisma.$executeRaw`CREATE INDEX idx_images_isDeleted ON images(isDeleted)`;
            console.log('    ✅ Added isDeleted index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  isDeleted index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        try {
            await prisma.$executeRaw`CREATE INDEX idx_images_deletedAt ON images(deletedAt)`;
            console.log('    ✅ Added deletedAt index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  deletedAt index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        try {
            await prisma.$executeRaw`CREATE INDEX idx_images_userId_isDeleted ON images(userId, isDeleted)`;
            console.log('    ✅ Added userId_isDeleted index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  userId_isDeleted index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        console.log('🔧 Step 3: Verifying schema...');
        
        // Test that the columns exist by trying to query them
        try {
            const testResult = await prisma.$queryRaw`SELECT isDeleted, deletedAt, deletedBy FROM images LIMIT 1`;
            console.log('    ✅ Schema verification successful - all columns exist');
        } catch (error) {
            console.log('    ❌ Schema verification failed:', error.message);
            throw error;
        }
        
        console.log('==========================================');
        console.log('✅ EMERGENCY SCHEMA FIX COMPLETED');
        console.log('==========================================');
        console.log('🎉 The missing columns have been added to the images table!');
        console.log('🎉 Image generation should now work properly!');

    } catch (error) {
        console.log('==========================================');
        console.error('❌ EMERGENCY SCHEMA FIX FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

emergencySchemaFix();
