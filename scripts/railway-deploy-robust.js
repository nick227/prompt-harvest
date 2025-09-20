#!/usr/bin/env node

/**
 * Robust Railway Deployment Script
 * This script handles schema mismatches and ensures proper database setup
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

// Complete model configurations with API details
const modelConfigs = [
    // OpenAI Models
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
    },
    {
        provider: 'openai',
        name: 'dalle2',
        displayName: 'DALL-E 2',
        description: 'OpenAI\'s previous text-to-image model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.openai.com/v1/images/generations',
        apiModel: 'dall-e-2',
        apiSize: '1024x1024'
    },

    // Google Imagen Models
    {
        provider: 'google',
        name: 'imagen3',
        displayName: 'Imagen 3',
        description: 'Google\'s latest Imagen model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage',
        apiModel: 'imagen-3.0-generate-001',
        apiSize: '1024x1024'
    },
    {
        provider: 'google',
        name: 'imagen2',
        displayName: 'Imagen 2',
        description: 'Google\'s Imagen 2 model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/imagegeneration@006:generateImage',
        apiModel: 'imagegeneration@006',
        apiSize: '1024x1024'
    },

    // Dezgo Models with correct API configurations
    {
        provider: 'dezgo',
        name: 'flux',
        displayName: 'Flux',
        description: 'High-quality text-to-image model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_flux',
        apiModel: 'flux_1_schnell',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'juggernaut',
        displayName: 'Juggernaut',
        description: 'Realistic image generation model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'juggernautxl_1024px',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'juggernautReborn',
        displayName: 'Juggernaut Reborn',
        description: 'Enhanced Juggernaut model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'juggernaut_reborn',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'redshift',
        displayName: 'Red Shift',
        description: 'Creative image generation model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'redshift_diffusion_768px',
        apiSize: '768x768'
    },
    {
        provider: 'dezgo',
        name: 'absolute',
        displayName: 'Absolute Reality',
        description: 'Photorealistic image model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'absolute_reality_1_8_1',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'realisticvision',
        displayName: 'Realistic Vision',
        description: 'High-quality realistic images',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'realistic_vision_5_1',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'icbinp',
        displayName: 'Icbinp',
        description: 'Creative image generation',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'icbinp',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'icbinp_seco',
        displayName: 'Icbinp2',
        description: 'Enhanced Icbinp model',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'icbinp_seco',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'hasdx',
        displayName: 'Hasdx',
        description: 'Advanced image generation',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'hasdx',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'dreamshaper',
        displayName: 'Dreamshaper',
        description: 'Creative dream-like images',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'dreamshaperxl_1024px',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'dreamshaperLighting',
        displayName: 'Dreamshaper Lightning',
        description: 'Enhanced lighting effects',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl_lightning',
        apiModel: 'dreamshaperxl_lightning_1024px',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'nightmareshaper',
        displayName: 'Nightmare Shaper',
        description: 'Dark artistic images',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'nightmareshaper',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'openjourney',
        displayName: 'Open Journey',
        description: 'Journey-style images',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'openjourney_2',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'analogmadness',
        displayName: 'Analog Madness',
        description: 'Retro analog aesthetics',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'analogmadness_7',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'portraitplus',
        displayName: 'Portrait Plus',
        description: 'Enhanced portrait generation',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'portrait_plus',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'tshirt',
        displayName: 'T-shirt Design',
        description: 'T-shirt and merchandise designs',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'tshirtdesignredmond_1024px',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'abyssorange',
        displayName: 'Abyss Orange',
        description: 'Unique artistic style',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'abyss_orange_mix_2',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'cyber',
        displayName: 'Cyber Real',
        description: 'Cyberpunk realistic images',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'cyberrealistic_3_1',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'disco',
        displayName: 'Disco',
        description: 'Disco and retro style',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'disco_diffusion_style',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'synthwave',
        displayName: 'Synthwave',
        description: '80s synthwave aesthetic',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'synthwavepunk_v2',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'lowpoly',
        displayName: 'Low Poly',
        description: 'Low poly 3D style',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'lowpoly_world',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'bluepencil',
        displayName: 'Blue Pencil',
        description: 'Sketch and drawing style',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image_sdxl',
        apiModel: 'bluepencilxl_1024px',
        apiSize: '1024x1024'
    },
    {
        provider: 'dezgo',
        name: 'ink',
        displayName: 'Ink Punk',
        description: 'Ink and punk art style',
        costPerImage: 1,
        isActive: true,
        apiUrl: 'https://api.dezgo.com/text2image',
        apiModel: 'inkpunk_diffusion',
        apiSize: '1024x1024'
    }
];

// Default system settings
const defaultSystemSettings = [
    { key: 'new_user_welcome_credits', value: 100, description: 'Credits given to new users upon registration', dataType: 'number' },
    { key: 'max_image_generations_per_hour', value: 10, description: 'Maximum image generations allowed per user per hour', dataType: 'number' },
    { key: 'maintenance_mode', value: false, description: 'Enable/disable site-wide maintenance mode', dataType: 'boolean' },
    { key: 'default_image_provider', value: 'flux', description: 'Default AI image generation provider', dataType: 'string' }
];

async function railwayDeployRobust() {
    try {
        console.log('🚀 Starting robust Railway deployment...');

        // Step 1: Check and fix database schema
        console.log('🔍 Step 1: Checking database schema...');
        await checkAndFixSchema();

        // Step 2: Force schema sync if needed
        console.log('🔄 Step 2: Ensuring schema is up to date...');
        await ensureSchemaSync();

        // Step 3: Seed models with complete configurations
        console.log('🤖 Step 3: Seeding models with API configurations...');
        await seedModels();

        // Step 4: Initialize system settings
        console.log('⚙️ Step 4: Initializing system settings...');
        await initializeSystemSettings();

        // Step 5: Create essential word types
        console.log('📚 Step 5: Creating essential word types...');
        await createEssentialWordTypes();

        // Step 6: Verify deployment
        console.log('✅ Step 6: Verifying deployment...');
        await verifyDeployment();

        console.log('🎉 Robust Railway deployment successful!');

    } catch (error) {
        console.error('❌ Railway deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function checkAndFixSchema() {
    try {
        console.log('🔍 Checking database schema...');

        // Check if models table exists and has the right structure
        const modelsTableInfo = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'models'
            ORDER BY ORDINAL_POSITION
        `;

        if (modelsTableInfo.length === 0) {
            console.log('⚠️ Models table does not exist');
            return false;
        }

        const hasProvider = modelsTableInfo.some(col => col.COLUMN_NAME === 'provider');
        const hasApiUrl = modelsTableInfo.some(col => col.COLUMN_NAME === 'apiUrl');
        const hasApiModel = modelsTableInfo.some(col => col.COLUMN_NAME === 'apiModel');

        console.log('📊 Models table structure:');
        modelsTableInfo.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
        });

        if (!hasProvider || !hasApiUrl || !hasApiModel) {
            console.log('⚠️ Models table is missing required columns');
            return false;
        }

        console.log('✅ Models table structure is correct');
        return true;

    } catch (error) {
        console.error('❌ Schema check failed:', error);
        return false;
    }
}

async function ensureSchemaSync() {
    try {
        console.log('🔄 Ensuring schema is synchronized...');

        // Try to run prisma db push to sync schema
        try {
            console.log('📦 Running prisma db push to sync schema...');
            execSync('npx prisma db push --force-reset', { stdio: 'inherit' });
            console.log('✅ Schema synchronized successfully');
        } catch (error) {
            console.log('⚠️ Prisma db push failed, trying alternative approach...');

            // If db push fails, try to manually create the models table with correct structure
            try {
                console.log('🔧 Creating models table with correct structure...');
                await prisma.$executeRaw`
                    CREATE TABLE IF NOT EXISTS models (
                        id VARCHAR(25) PRIMARY KEY,
                        provider VARCHAR(50) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        displayName VARCHAR(100) NOT NULL,
                        description TEXT,
                        costPerImage DOUBLE NOT NULL DEFAULT 1,
                        isActive BOOLEAN NOT NULL DEFAULT true,
                        apiUrl VARCHAR(500),
                        apiModel VARCHAR(100),
                        apiSize VARCHAR(20),
                        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        UNIQUE KEY provider_name (provider, name),
                        KEY provider (provider),
                        KEY name (name),
                        KEY isActive (isActive),
                        KEY costPerImage (costPerImage)
                    )
                `;
                console.log('✅ Models table created with correct structure');
            } catch (createError) {
                console.error('❌ Failed to create models table:', createError);
                throw createError;
            }
        }

    } catch (error) {
        console.error('❌ Schema sync failed:', error);
        throw error;
    }
}

async function seedModels() {
    try {
        console.log('🗑️ Clearing existing models...');
        await prisma.model.deleteMany({});

        console.log('🌱 Seeding models with complete configurations...');
        let successCount = 0;
        let errorCount = 0;

        for (const modelData of modelConfigs) {
            try {
                await prisma.model.create({
                    data: modelData
                });
                console.log(`✅ Created model: ${modelData.provider}/${modelData.name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating model ${modelData.name}:`, error.message);
                errorCount++;
            }
        }

        console.log(`🎉 Model seeding completed: ${successCount} successful, ${errorCount} failed`);

        if (successCount === 0) {
            throw new Error('No models were created successfully');
        }

        // Show summary by provider
        try {
            const summary = await prisma.model.groupBy({
                by: ['provider'],
                _count: {
                    provider: true
                }
            });

            console.log('📊 Models by provider:');
            summary.forEach(group => {
                console.log(`   ${group.provider}: ${group._count.provider} models`);
            });
        } catch (error) {
            console.log('⚠️ Could not generate summary:', error.message);
        }

    } catch (error) {
        console.error('❌ Model seeding failed:', error);
        throw error;
    }
}

async function initializeSystemSettings() {
    try {
        console.log('🔧 Initializing system settings...');

        // Check if system_settings table exists
        const settingsTableExists = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'system_settings'
        `;

        if (settingsTableExists.length === 0) {
            console.log('⚠️ System settings table does not exist, skipping...');
            return;
        }

        for (const setting of defaultSystemSettings) {
            try {
                await prisma.systemSettings.upsert({
                    where: { key: setting.key },
                    update: {
                        value: String(setting.value),
                        description: setting.description,
                        dataType: setting.dataType,
                        isActive: true
                    },
                    create: {
                        key: setting.key,
                        value: String(setting.value),
                        description: setting.description,
                        dataType: setting.dataType,
                        isActive: true
                    }
                });
                console.log(`✅ System setting: ${setting.key} = ${setting.value}`);
            } catch (error) {
                console.error(`❌ Error creating system setting ${setting.key}:`, error.message);
            }
        }

        console.log('✅ System settings initialized');

    } catch (error) {
        console.error('❌ System settings initialization failed:', error);
        // Don't throw here, as this is not critical for basic functionality
    }
}

async function createEssentialWordTypes() {
    try {
        console.log('📚 Creating essential word types...');

        // Check if word_types table exists
        const wordTypesTableExists = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'word_types'
        `;

        if (wordTypesTableExists.length === 0) {
            console.log('⚠️ Word types table does not exist, skipping...');
            return;
        }

        const essentialWordTypes = [
            { word: 'car', types: ['sedan', 'suv', 'truck', 'sports car', 'convertible', 'hatchback', 'coupe', 'wagon', 'pickup', 'van'] },
            { word: 'house', types: ['mansion', 'cottage', 'apartment', 'villa', 'townhouse', 'bungalow', 'castle', 'cabin', 'loft', 'studio'] },
            { word: 'dog', types: ['golden retriever', 'labrador', 'german shepherd', 'bulldog', 'poodle', 'beagle', 'rottweiler', 'siberian husky', 'chihuahua', 'boxer'] },
            { word: 'cat', types: ['persian', 'maine coon', 'siamese', 'ragdoll', 'british shorthair', 'abyssinian', 'scottish fold', 'sphynx', 'bengal', 'russian blue'] },
            { word: 'tree', types: ['oak', 'pine', 'maple', 'birch', 'cedar', 'willow', 'cherry', 'apple', 'elm', 'ash'] }
        ];

        // Clear existing word types
        await prisma.word_types.deleteMany({});
        console.log('🗑️ Cleared existing word types');

        // Insert essential word types
        let successCount = 0;
        for (const wordType of essentialWordTypes) {
            try {
                await prisma.word_types.create({
                    data: wordType
                });
                console.log(`✅ Created word type: ${wordType.word} (${wordType.types.length} types)`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating word type ${wordType.word}:`, error.message);
            }
        }

        console.log(`🎉 Essential word types created: ${successCount}/${essentialWordTypes.length}`);

    } catch (error) {
        console.error('❌ Word types creation failed:', error);
        // Don't throw here, as this is not critical for basic functionality
    }
}

async function verifyDeployment() {
    try {
        console.log('🔍 Verifying deployment...');

        // Check models
        const modelsCount = await prisma.model.count();
        console.log(`🤖 Models: ${modelsCount}`);

        // Check system settings
        try {
            const settingsCount = await prisma.systemSettings.count();
            console.log(`⚙️ System Settings: ${settingsCount}`);
        } catch (error) {
            console.log('⚠️ System settings not accessible');
        }

        // Check word types
        try {
            const wordTypesCount = await prisma.word_types.count();
            console.log(`📚 Word Types: ${wordTypesCount}`);
        } catch (error) {
            console.log('⚠️ Word types not accessible');
        }

        // Check users
        const usersCount = await prisma.user.count();
        console.log(`👥 Users: ${usersCount}`);

        // Show sample data
        const sampleModels = await prisma.model.findMany({ take: 3 });
        console.log('\n🔍 Sample Models:');
        sampleModels.forEach(model => {
            console.log(`   ${model.provider}/${model.name}: ${model.apiUrl}`);
        });

        console.log('✅ Deployment verification completed');

    } catch (error) {
        console.error('❌ Deployment verification failed:', error);
        throw error;
    }
}

// Run the deployment
railwayDeployRobust()
    .then(() => {
        console.log('🎉 Railway deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Railway deployment failed:', error);
        process.exit(1);
    });
