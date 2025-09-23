#!/usr/bin/env node

/**
 * Ultimate Railway Deployment Script
 * Handles Railway-specific database constraints and column requirements
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function railwayDeployUltimate() {
    try {
        console.log('🚀 Starting ultimate Railway deployment...');

        // Step 1: Analyze current table structure
        console.log('🔍 Step 1: Analyzing current table structure...');
        const tableInfo = await analyzeTableStructure();

        // Step 2: Fix table structure for Railway constraints
        console.log('🔧 Step 2: Fixing table structure for Railway...');
        await fixTableStructureForRailway(tableInfo);

        // Step 3: Insert/update models with Railway-compatible data
        console.log('🤖 Step 3: Inserting models with Railway compatibility...');
        await insertModelsForRailway();

        // Step 4: Verify
        console.log('✅ Step 4: Verifying...');
        await verify();

        console.log('🎉 Ultimate Railway deployment successful!');

    } catch (error) {
        console.error('❌ Ultimate deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function analyzeTableStructure() {
    try {
        console.log('🔍 Analyzing current table structure...');

        const columns = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'models'
            ORDER BY ORDINAL_POSITION
        `;

        console.log('📊 Current table structure:');
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE}, max_length: ${col.CHARACTER_MAXIMUM_LENGTH})`);
        });

        const columnNames = columns.map(col => col.COLUMN_NAME);

        return {
            columns,
            columnNames,
            hasProvider: columnNames.includes('provider'),
            hasProviderId: columnNames.includes('providerId'),
            hasApiUrl: columnNames.includes('apiUrl'),
            hasApiModel: columnNames.includes('apiModel'),
            hasApiSize: columnNames.includes('apiSize'),
            idMaxLength: columns.find(col => col.COLUMN_NAME === 'id')?.CHARACTER_MAXIMUM_LENGTH || 25
        };

    } catch (error) {
        console.error('❌ Failed to analyze table structure:', error);
        throw error;
    }
}

async function fixTableStructureForRailway(tableInfo) {
    try {
        console.log('🔧 Fixing table structure for Railway constraints...');

        const { hasProvider, hasProviderId, hasApiUrl, hasApiModel, hasApiSize, idMaxLength } = tableInfo;

        // Disable foreign key checks temporarily
        console.log('🔓 Disabling foreign key checks...');
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

        try {
            // Fix ID column length if too short
            if (idMaxLength < 30) {
                console.log('🔄 Extending ID column length...');
                await prisma.$executeRaw`
                    ALTER TABLE models MODIFY COLUMN id VARCHAR(50)
                `;
            }

            // Add missing columns
            if (!hasProvider && hasProviderId) {
                console.log('🔄 Adding provider column...');
                await prisma.$executeRaw`
                    ALTER TABLE models ADD COLUMN provider VARCHAR(50) AFTER providerId
                `;
            }

            if (!hasApiUrl) {
                console.log('🔄 Adding apiUrl column...');
                await prisma.$executeRaw`
                    ALTER TABLE models ADD COLUMN apiUrl VARCHAR(500) AFTER isActive
                `;
            }

            if (!hasApiModel) {
                console.log('🔄 Adding apiModel column...');
                await prisma.$executeRaw`
                    ALTER TABLE models ADD COLUMN apiModel VARCHAR(100) AFTER apiUrl
                `;
            }

            if (!hasApiSize) {
                console.log('🔄 Adding apiSize column...');
                await prisma.$executeRaw`
                    ALTER TABLE models ADD COLUMN apiSize VARCHAR(20) AFTER apiModel
                `;
            }

            // Make providerId nullable if it exists and is required
            if (hasProviderId) {
                console.log('🔄 Making providerId nullable...');
                await prisma.$executeRaw`
                    ALTER TABLE models MODIFY COLUMN providerId VARCHAR(50) NULL
                `;
            }

            console.log('✅ Table structure fixed for Railway');

        } finally {
            // Re-enable foreign key checks
            console.log('🔒 Re-enabling foreign key checks...');
            await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 1`;
        }

    } catch (error) {
        console.error('❌ Failed to fix table structure:', error);
        throw error;
    }
}

async function insertModelsForRailway() {
    try {
        console.log('🗑️ Clearing existing models...');
        await prisma.$executeRaw`DELETE FROM models`;

        console.log('🌱 Inserting models with Railway compatibility...');

        const models = [
            // OpenAI Models
            ['openai', 'dalle3', 'DALL-E 3', 'OpenAI\'s latest text-to-image model', 1, true, 'https://api.openai.com/v1/images/generations', 'dall-e-3', '1024x1024'],
            ['openai', 'dalle2', 'DALL-E 2', 'OpenAI\'s previous text-to-image model', 1, true, 'https://api.openai.com/v1/images/generations', 'dall-e-2', '1024x1024'],

            // Google Models
            ['google', 'imagen3', 'Imagen 3', 'Google\'s latest Imagen model', 1, true, 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict', 'imagen-3.0-generate-001', '1024x1024'],
            ['google', 'imagen2', 'Imagen 2', 'Google\'s Imagen 2 model', 1, true, 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagegeneration@006:predict', 'imagegeneration@006', '1024x1024'],

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
                // Use shorter ID to fit Railway constraints
                const id = `${provider}_${name}`;

                await prisma.$executeRaw`
                    INSERT INTO models (id, provider, providerId, name, displayName, description, costPerImage, isActive, apiUrl, apiModel, apiSize, createdAt, updatedAt)
                    VALUES (${id}, ${provider}, ${provider}, ${name}, ${displayName}, ${description}, ${costPerImage}, ${isActive}, ${apiUrl}, ${apiModel}, ${apiSize}, NOW(), NOW())
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
railwayDeployUltimate()
    .then(() => {
        console.log('🎉 Ultimate Railway deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Ultimate Railway deployment failed:', error);
        process.exit(1);
    });
