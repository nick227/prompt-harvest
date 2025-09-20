#!/usr/bin/env node

/**
 * Simple Railway Deployment Script
 * Focuses on fixing the models table schema issue
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function railwayDeploySimple() {
    try {
        console.log('🚀 Starting simple Railway deployment...');

        // Step 1: Check and fix models table
        console.log('🔧 Step 1: Fixing models table...');
        await fixModelsTable();

        // Step 2: Insert models
        console.log('🤖 Step 2: Inserting models...');
        await insertModels();

        // Step 3: Verify
        console.log('✅ Step 3: Verifying...');
        await verify();

        console.log('🎉 Simple Railway deployment successful!');

    } catch (error) {
        console.error('❌ Simple deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function fixModelsTable() {
    try {
        console.log('🔍 Checking models table structure...');

        // Check if models table exists
        const tableExists = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'models'
        `;

        if (tableExists.length === 0) {
            console.log('⚠️ Models table does not exist, creating...');
            await createModelsTable();
        } else {
            console.log('✅ Models table exists, checking structure...');
            await checkAndFixTableStructure();
        }

    } catch (error) {
        console.error('❌ Failed to fix models table:', error);
        throw error;
    }
}

async function createModelsTable() {
    try {
        console.log('🔧 Creating models table...');

        await prisma.$executeRaw`
            CREATE TABLE models (
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

        console.log('✅ Models table created');

    } catch (error) {
        console.error('❌ Failed to create models table:', error);
        throw error;
    }
}

async function checkAndFixTableStructure() {
    try {
        console.log('🔍 Checking table structure...');

        const columns = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'models'
            ORDER BY ORDINAL_POSITION
        `;

        console.log('📊 Current table structure:');
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE}`);
        });

        const hasProvider = columns.some(col => col.COLUMN_NAME === 'provider');
        const hasApiUrl = columns.some(col => col.COLUMN_NAME === 'apiUrl');
        const hasApiModel = columns.some(col => col.COLUMN_NAME === 'apiModel');

        if (!hasProvider || !hasApiUrl || !hasApiModel) {
            console.log('⚠️ Table structure is incorrect, recreating...');
            await prisma.$executeRaw`DROP TABLE IF EXISTS models`;
            await createModelsTable();
        } else {
            console.log('✅ Table structure is correct');
        }

    } catch (error) {
        console.error('❌ Failed to check table structure:', error);
        throw error;
    }
}

async function insertModels() {
    try {
        console.log('🗑️ Clearing existing models...');
        await prisma.$executeRaw`DELETE FROM models`;

        console.log('🌱 Inserting models...');

        const models = [
            // OpenAI Models
            ['openai', 'dalle3', 'DALL-E 3', 'OpenAI\'s latest text-to-image model', 1, true, 'https://api.openai.com/v1/images/generations', 'dall-e-3', '1024x1024'],
            ['openai', 'dalle2', 'DALL-E 2', 'OpenAI\'s previous text-to-image model', 1, true, 'https://api.openai.com/v1/images/generations', 'dall-e-2', '1024x1024'],

            // Google Models
            ['google', 'imagen3', 'Imagen 3', 'Google\'s latest Imagen model', 1, true, 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:generateImage', 'imagen-3.0-generate-001', '1024x1024'],
            ['google', 'imagen2', 'Imagen 2', 'Google\'s Imagen 2 model', 1, true, 'https://generativelanguage.googleapis.com/v1beta/models/imagegeneration@006:generateImage', 'imagegeneration@006', '1024x1024'],

            // Dezgo Models
            ['dezgo', 'flux', 'Flux', 'High-quality text-to-image model', 1, true, 'https://api.dezgo.com/text2image_flux', 'flux_1_schnell', '1024x1024'],
            ['dezgo', 'juggernaut', 'Juggernaut', 'Realistic image generation model', 1, true, 'https://api.dezgo.com/text2image_sdxl', 'juggernautxl_1024px', '1024x1024'],
            ['dezgo', 'juggernautReborn', 'Juggernaut Reborn', 'Enhanced Juggernaut model', 1, true, 'https://api.dezgo.com/text2image', 'juggernaut_reborn', '1024x1024'],
            ['dezgo', 'redshift', 'Red Shift', 'Creative image generation model', 1, true, 'https://api.dezgo.com/text2image', 'redshift_diffusion_768px', '768x768'],
            ['dezgo', 'absolute', 'Absolute Reality', 'Photorealistic image model', 1, true, 'https://api.dezgo.com/text2image', 'absolute_reality_1_8_1', '1024x1024'],
            ['dezgo', 'realisticvision', 'Realistic Vision', 'High-quality realistic images', 1, true, 'https://api.dezgo.com/text2image', 'realistic_vision_5_1', '1024x1024'],
            ['dezgo', 'icbinp', 'Icbinp', 'Creative image generation', 1, true, 'https://api.dezgo.com/text2image', 'icbinp', '1024x1024'],
            ['dezgo', 'icbinp_seco', 'Icbinp2', 'Enhanced Icbinp model', 1, true, 'https://api.dezgo.com/text2image', 'icbinp_seco', '1024x1024'],
            ['dezgo', 'hasdx', 'Hasdx', 'Advanced image generation', 1, true, 'https://api.dezgo.com/text2image', 'hasdx', '1024x1024'],
            ['dezgo', 'dreamshaper', 'Dreamshaper', 'Creative dream-like images', 1, true, 'https://api.dezgo.com/text2image_sdxl', 'dreamshaperxl_1024px', '1024x1024'],
            ['dezgo', 'dreamshaperLighting', 'Dreamshaper Lightning', 'Enhanced lighting effects', 1, true, 'https://api.dezgo.com/text2image_sdxl_lightning', 'dreamshaperxl_lightning_1024px', '1024x1024'],
            ['dezgo', 'nightmareshaper', 'Nightmare Shaper', 'Dark artistic images', 1, true, 'https://api.dezgo.com/text2image', 'nightmareshaper', '1024x1024'],
            ['dezgo', 'openjourney', 'Open Journey', 'Journey-style images', 1, true, 'https://api.dezgo.com/text2image', 'openjourney_2', '1024x1024'],
            ['dezgo', 'analogmadness', 'Analog Madness', 'Retro analog aesthetics', 1, true, 'https://api.dezgo.com/text2image', 'analogmadness_7', '1024x1024'],
            ['dezgo', 'portraitplus', 'Portrait Plus', 'Enhanced portrait generation', 1, true, 'https://api.dezgo.com/text2image', 'portrait_plus', '1024x1024'],
            ['dezgo', 'tshirt', 'T-shirt Design', 'T-shirt and merchandise designs', 1, true, 'https://api.dezgo.com/text2image_sdxl', 'tshirtdesignredmond_1024px', '1024x1024'],
            ['dezgo', 'abyssorange', 'Abyss Orange', 'Unique artistic style', 1, true, 'https://api.dezgo.com/text2image', 'abyss_orange_mix_2', '1024x1024'],
            ['dezgo', 'cyber', 'Cyber Real', 'Cyberpunk realistic images', 1, true, 'https://api.dezgo.com/text2image', 'cyberrealistic_3_1', '1024x1024'],
            ['dezgo', 'disco', 'Disco', 'Disco and retro style', 1, true, 'https://api.dezgo.com/text2image', 'disco_diffusion_style', '1024x1024'],
            ['dezgo', 'synthwave', 'Synthwave', '80s synthwave aesthetic', 1, true, 'https://api.dezgo.com/text2image', 'synthwavepunk_v2', '1024x1024'],
            ['dezgo', 'lowpoly', 'Low Poly', 'Low poly 3D style', 1, true, 'https://api.dezgo.com/text2image', 'lowpoly_world', '1024x1024'],
            ['dezgo', 'bluepencil', 'Blue Pencil', 'Sketch and drawing style', 1, true, 'https://api.dezgo.com/text2image_sdxl', 'bluepencilxl_1024px', '1024x1024'],
            ['dezgo', 'ink', 'Ink Punk', 'Ink and punk art style', 1, true, 'https://api.dezgo.com/text2image', 'inkpunk_diffusion', '1024x1024']
        ];

        let successCount = 0;
        for (const [provider, name, displayName, description, costPerImage, isActive, apiUrl, apiModel, apiSize] of models) {
            try {
                const id = `model_${provider}_${name}`;
                await prisma.$executeRaw`
                    INSERT INTO models (id, provider, name, displayName, description, costPerImage, isActive, apiUrl, apiModel, apiSize, createdAt, updatedAt)
                    VALUES (${id}, ${provider}, ${name}, ${displayName}, ${description}, ${costPerImage}, ${isActive}, ${apiUrl}, ${apiModel}, ${apiSize}, NOW(), NOW())
                `;

                console.log(`✅ Created model: ${provider}/${name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating model ${provider}/${name}:`, error.message);
            }
        }

        console.log(`🎉 Model insertion completed: ${successCount}/${models.length} successful`);

    } catch (error) {
        console.error('❌ Model insertion failed:', error);
        throw error;
    }
}

async function verify() {
    try {
        console.log('🔍 Verifying deployment...');

        // Check models count
        const modelsResult = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM models
        `;
        const modelsCount = modelsResult[0].count;
        console.log(`🤖 Models: ${modelsCount}`);

        // Show sample models
        const sampleModels = await prisma.$queryRaw`
            SELECT provider, name, apiUrl FROM models LIMIT 3
        `;
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
railwayDeploySimple()
    .then(() => {
        console.log('🎉 Simple Railway deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Simple Railway deployment failed:', error);
        process.exit(1);
    });
