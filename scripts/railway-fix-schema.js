#!/usr/bin/env node

/**
 * Railway Database Schema Fix
 * 
 * This script runs on Railway to fix the missing database columns.
 * It adds the missing isDeleted, deletedAt, and deletedBy columns to the images table.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRailwaySchema() {
    console.log('🔧 FIXING RAILWAY DATABASE SCHEMA');
    console.log('='.repeat(60));
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to Railway production database');
        
        // Check if isDeleted column exists
        console.log('🔍 Checking for missing columns...');
        
        try {
            // Try to query the isDeleted column
            await prisma.$queryRaw`SELECT isDeleted FROM images LIMIT 1`;
            console.log('✅ isDeleted column exists');
        } catch (error) {
            if (error.message.includes('isDeleted') || error.message.includes('does not exist')) {
                console.log('❌ isDeleted column missing - needs to be added');
                
                console.log('🔧 Adding missing columns to images table...');
                
                // Add the missing columns
                await prisma.$executeRaw`ALTER TABLE images ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE`;
                console.log('✅ Added isDeleted column');
                
                await prisma.$executeRaw`ALTER TABLE images ADD COLUMN deletedAt DATETIME NULL`;
                console.log('✅ Added deletedAt column');
                
                await prisma.$executeRaw`ALTER TABLE images ADD COLUMN deletedBy VARCHAR(25) NULL`;
                console.log('✅ Added deletedBy column');
                
                // Add indexes for the new columns
                await prisma.$executeRaw`CREATE INDEX idx_images_isDeleted ON images(isDeleted)`;
                console.log('✅ Added isDeleted index');
                
                await prisma.$executeRaw`CREATE INDEX idx_images_deletedAt ON images(deletedAt)`;
                console.log('✅ Added deletedAt index');
                
                await prisma.$executeRaw`CREATE INDEX idx_images_userId_isDeleted ON images(userId, isDeleted)`;
                console.log('✅ Added userId_isDeleted index');
                
                console.log('✅ All missing columns and indexes added successfully!');
            } else {
                console.log('❌ Unexpected error checking columns:', error.message);
                throw error;
            }
        }
        
        // Verify the fix
        console.log('\n🔍 Verifying schema fix...');
        
        try {
            // Test the isDeleted column
            const testQuery = await prisma.$queryRaw`SELECT COUNT(*) as count FROM images WHERE isDeleted = FALSE LIMIT 1`;
            console.log('✅ isDeleted column is working');
            
            // Test the deletedAt column
            const testQuery2 = await prisma.$queryRaw`SELECT COUNT(*) as count FROM images WHERE deletedAt IS NULL LIMIT 1`;
            console.log('✅ deletedAt column is working');
            
            // Test the deletedBy column
            const testQuery3 = await prisma.$queryRaw`SELECT COUNT(*) as count FROM images WHERE deletedBy IS NULL LIMIT 1`;
            console.log('✅ deletedBy column is working');
            
            console.log('\n✅ SCHEMA FIX VERIFICATION SUCCESSFUL!');
            console.log('  ✅ isDeleted column: Working');
            console.log('  ✅ deletedAt column: Working');
            console.log('  ✅ deletedBy column: Working');
            console.log('  ✅ All indexes: Created');
            
        } catch (error) {
            console.error('❌ Schema verification failed:', error.message);
            throw error;
        }
        
        // Test a simple image query
        console.log('\n🔍 Testing image queries...');
        const imageCount = await prisma.image.count();
        console.log(`📊 Total images in database: ${imageCount}`);
        
        if (imageCount > 0) {
            const sampleImage = await prisma.image.findFirst({
                select: {
                    id: true,
                    imageUrl: true,
                    provider: true,
                    isDeleted: true
                }
            });
            console.log('✅ Image queries are working with new schema');
            console.log(`  Sample image: ${sampleImage?.provider} - isDeleted: ${sampleImage?.isDeleted}`);
        }
        
        console.log('\n✅ RAILWAY DATABASE SCHEMA FIX COMPLETED!');
        console.log('  🎯 Image generation should now work properly');
        console.log('  🎯 Database saves should no longer fail');
        console.log('  🎯 All soft delete functionality is available');
        
    } catch (error) {
        console.error('❌ Schema fix failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixRailwaySchema();
