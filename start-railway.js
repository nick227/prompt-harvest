#!/usr/bin/env node

/**
 * Railway Startup Script
 *
 * This script handles the complete Railway deployment process:
 * 1. Schema migration
 * 2. Data seeding
 * 3. Server startup
 */

import { spawn } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function startRailway() {
    try {
        console.log('🚀 RAILWAY STARTUP START');
        console.log('========================');
        console.log(`DATABASE_URL=${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

        // Step 1: Push schema
        console.log('📋 Step 1: Pushing schema...');
        await pushSchema();
        console.log('✅ Schema pushed successfully');

        // Step 2: Seed data
        console.log('🌱 Step 2: Seeding data...');
        await seedData();
        console.log('✅ Data seeded successfully');

        // Step 3: Start server
        console.log('🚀 Step 3: Starting server...');
        await startServer();

    } catch (error) {
        console.error('❌ RAILWAY STARTUP FAILED:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function pushSchema() {
    return new Promise((resolve, reject) => {
        const process = spawn('npx', ['prisma', 'db', 'push'], {
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Schema push failed with code ${code}`));
            }
        });
    });
}

async function seedData() {
    // Run the clean deployment script
    return new Promise((resolve, reject) => {
        const process = spawn('node', ['railway-deploy-clean.js'], {
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Data seeding failed with code ${code}`));
            }
        });
    });
}

async function startServer() {
    return new Promise((resolve, reject) => {
        const process = spawn('node', ['server.js'], {
            stdio: 'inherit',
            shell: true
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Server failed with code ${code}`));
            }
        });

        // Keep the process running
        process.on('error', (error) => {
            reject(error);
        });
    });
}

// Run the startup process
startRailway();
