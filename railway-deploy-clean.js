#!/usr/bin/env node

/**
 * Clean Railway Deployment Script
 *
 * This script handles Railway deployment with minimal, essential operations:
 * 1. Push Prisma schema to database
 * 2. Seed basic data if needed
 * 3. Verify deployment
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function cleanRailwayDeploy() {
    console.log('🚀 CLEAN RAILWAY DEPLOYMENT START');
    console.log('==========================================');
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'NOT SET'}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
    console.log('');

    try {
        // Step 1: Push Prisma schema
        console.log('📋 Step 1: Pushing Prisma schema...');
        await pushSchema();

        // Step 2: Verify deployment
        console.log('📋 Step 2: Verifying deployment...');
        await verifyDeployment();

        console.log('==========================================');
        console.log('✅ CLEAN RAILWAY DEPLOYMENT COMPLETED');
        console.log('==========================================');

    } catch (error) {
        console.error('==========================================');
        console.error('❌ CLEAN RAILWAY DEPLOYMENT FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function pushSchema() {
    try {
        console.log('  🔧 Pushing schema to production database...');
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'inherit'
        });
        console.log('  ✅ Schema pushed successfully');
    } catch (error) {
        console.log('  ⚠️  Schema push failed:', error.message);
        throw error;
    }
}

async function verifyDeployment() {
    try {
        console.log('  🔍 Verifying database connection...');
        await prisma.$connect();
        console.log('  ✅ Database connection successful');

        // Check if essential tables exist
        console.log('  🔍 Checking essential tables...');
        const userCount = await prisma.user.count();
        const modelCount = await prisma.models.count();
        const wordTypeCount = await prisma.word_types.count();

        console.log(`  📊 Users: ${userCount}`);
        console.log(`  📊 Models: ${modelCount}`);
        console.log(`  📊 Word Types: ${wordTypeCount}`);

        if (modelCount === 0) {
            console.log('  ⚠️  No models found - this may need manual seeding');
        }

        if (wordTypeCount === 0) {
            console.log('  ⚠️  No word types found - this may need manual seeding');
        }

        console.log('  ✅ Deployment verification completed');
    } catch (error) {
        console.log('  ❌ Deployment verification failed:', error.message);
        throw error;
    }
}

cleanRailwayDeploy();
