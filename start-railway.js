#!/usr/bin/env node

/**
 * Railway Production Startup Script
 *
 * This script handles Railway deployment more gracefully by:
 * 1. Setting up the database in the background
 * 2. Starting the server immediately
 * 3. Handling failures gracefully
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient();

async function startRailway() {
    console.log('🚀 Starting Railway deployment...');
    console.log(`PORT: ${process.env.PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}`);

    try {
        // Step 1: Test database connection (non-blocking)
        console.log('🔗 Testing database connection...');
        await testDatabaseConnection();

        // Step 2: Run database setup in background (non-blocking)
        console.log('📊 Setting up database in background...');
        setupDatabaseInBackground();

        // Step 3: Start the server immediately
        console.log('🌐 Starting server...');
        await startServer();

    } catch (error) {
        console.error('❌ Railway startup failed:', error);

        // Even if setup fails, try to start server
        console.log('🔄 Attempting to start server anyway...');
        await startServer();
    }
}

async function testDatabaseConnection() {
    try {
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connection successful');
        return true;
    } catch (error) {
        console.error('⚠️ Database connection failed:', error.message);
        return false;
    }
}

async function setupDatabaseInBackground() {
    // Don't await this - let it run in background
    setImmediate(async () => {
        try {
            console.log('📊 Background database setup started...');

            // Run schema push
            await pushSchema();

            // Seed essential data
            await seedEssentialData();

            console.log('✅ Background database setup completed');
        } catch (error) {
            console.error('⚠️ Background database setup failed:', error.message);
            // Don't exit - server should keep running
        }
    });
}

async function pushSchema() {
    try {
        console.log('📋 Pushing schema...');
        const { execSync } = await import('child_process');
        execSync('npx prisma db push', {
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log('✅ Schema pushed successfully');
    } catch (error) {
        console.error('⚠️ Schema push failed:', error.message);
    }
}

async function seedEssentialData() {
    try {
        console.log('🌱 Seeding essential data...');

        // Check if models exist
        const modelCount = await prisma.model.count();
        if (modelCount === 0) {
            console.log('🌱 No models found, seeding...');
            await seedModels();
        } else {
            console.log(`✅ ${modelCount} models already exist`);
        }

        // Check if settings exist
        const settingsCount = await prisma.systemSettings.count();
        if (settingsCount === 0) {
            console.log('🌱 No settings found, seeding...');
            await seedSettings();
        } else {
            console.log(`✅ ${settingsCount} settings already exist`);
        }

    } catch (error) {
        console.error('⚠️ Data seeding failed:', error.message);
    }
}

async function seedModels() {
    const essentialModels = [
        {
            provider: 'flux',
            name: 'flux-dev',
            displayName: 'Flux Dev',
            description: 'Flux development model',
            costPerImage: 1,
            isActive: true,
            apiUrl: 'https://api.flux.ai/v1/generate',
            apiModel: 'flux-dev',
            apiSize: '1024x1024'
        },
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
        }
    ];

    for (const model of essentialModels) {
        try {
            await prisma.model.upsert({
                where: {
                    provider_name: {
                        provider: model.provider,
                        name: model.name
                    }
                },
                update: model,
                create: model
            });
        } catch (error) {
            console.error(`⚠️ Failed to seed model ${model.provider}/${model.name}:`, error.message);
        }
    }

    console.log('✅ Essential models seeded');
}

async function seedSettings() {
    const settings = [
        { key: 'new_user_welcome_credits', value: '100', description: 'Credits given to new users', dataType: 'number' },
        { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode', dataType: 'boolean' }
    ];

    for (const setting of settings) {
        try {
            await prisma.systemSettings.upsert({
                where: { key: setting.key },
                update: setting,
                create: setting
            });
        } catch (error) {
            console.error(`⚠️ Failed to seed setting ${setting.key}:`, error.message);
        }
    }

    console.log('✅ Essential settings seeded');
}

async function startServer() {
    try {
        // Import and start the main server
        const { default: app } = await import('./server.js');

        const port = process.env.PORT || 3000;

        app.listen(port, '0.0.0.0', () => {
            console.log(`🚀 Server listening on port ${port}`);
            console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

// Start the application
startRailway().catch((error) => {
    console.error('❌ Fatal startup error:', error);
    process.exit(1);
});
