#!/usr/bin/env node

/**
 * Fallback Railway Deployment Script
 * This script uses raw SQL to handle schema mismatches
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function railwayDeployFallback() {
    try {
        console.log('🚀 Starting fallback Railway deployment...');

        // Step 1: Create models table with correct structure using raw SQL
        console.log('🔧 Step 1: Creating models table with raw SQL...');
        await createModelsTableWithSQL();

        // Step 2: Insert models using raw SQL
        console.log('🤖 Step 2: Inserting models with raw SQL...');
        await insertModelsWithSQL();

        // Step 3: Create system settings if needed
        console.log('⚙️ Step 3: Creating system settings...');
        await createSystemSettingsWithSQL();

        // Step 4: Create essential word types
        console.log('📚 Step 4: Creating essential word types...');
        await createWordTypesWithSQL();

        // Step 5: Verify deployment
        console.log('✅ Step 5: Verifying deployment...');
        await verifyDeployment();

        console.log('🎉 Fallback Railway deployment successful!');

    } catch (error) {
        console.error('❌ Fallback deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function createModelsTableWithSQL() {
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

        // Clear existing data
        await prisma.$executeRaw`DELETE FROM models`;

        console.log('✅ Models table created and cleared');

    } catch (error) {
        console.error('❌ Failed to create models table:', error);
        throw error;
    }
}

async function insertModelsWithSQL() {
    try {
        console.log('🤖 Inserting models with raw SQL...');

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

async function createSystemSettingsWithSQL() {
    try {
        console.log('⚙️ Creating system settings...');

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

        const settings = [
            ['new_user_welcome_credits', '100', 'Credits given to new users upon registration', 'number', true],
            ['max_image_generations_per_hour', '10', 'Maximum image generations allowed per user per hour', 'number', true],
            ['maintenance_mode', 'false', 'Enable/disable site-wide maintenance mode', 'boolean', true],
            ['default_image_provider', 'flux', 'Default AI image generation provider', 'string', true]
        ];

        for (const [key, value, description, dataType, isActive] of settings) {
            try {
                const id = `setting_${key}`;
                await prisma.$executeRaw`
                    INSERT INTO system_settings (id, key, value, description, dataType, isActive, createdAt, updatedAt)
                    VALUES (${id}, ${key}, ${value}, ${description}, ${dataType}, ${isActive}, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE
                    value = VALUES(value),
                    description = VALUES(description),
                    dataType = VALUES(dataType),
                    isActive = VALUES(isActive),
                    updatedAt = NOW()
                `;

                console.log(`✅ System setting: ${key} = ${value}`);
            } catch (error) {
                console.error(`❌ Error creating system setting ${key}:`, error.message);
            }
        }

        console.log('✅ System settings created');

    } catch (error) {
        console.error('❌ System settings creation failed:', error);
        // Don't throw here, as this is not critical
    }
}

async function createWordTypesWithSQL() {
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

        // Clear existing word types
        await prisma.$executeRaw`DELETE FROM word_types`;

        const wordTypes = [
            ['car', JSON.stringify(['sedan', 'suv', 'truck', 'sports car', 'convertible', 'hatchback', 'coupe', 'wagon', 'pickup', 'van'])],
            ['house', JSON.stringify(['mansion', 'cottage', 'apartment', 'villa', 'townhouse', 'bungalow', 'castle', 'cabin', 'loft', 'studio'])],
            ['dog', JSON.stringify(['golden retriever', 'labrador', 'german shepherd', 'bulldog', 'poodle', 'beagle', 'rottweiler', 'siberian husky', 'chihuahua', 'boxer'])],
            ['cat', JSON.stringify(['persian', 'maine coon', 'siamese', 'ragdoll', 'british shorthair', 'abyssinian', 'scottish fold', 'sphynx', 'bengal', 'russian blue'])],
            ['tree', JSON.stringify(['oak', 'pine', 'maple', 'birch', 'cedar', 'willow', 'cherry', 'apple', 'elm', 'ash'])]
        ];

        let successCount = 0;
        for (const [word, types] of wordTypes) {
            try {
                const id = `word_${word}`;
                await prisma.$executeRaw`
                    INSERT INTO word_types (id, word, types, createdAt, updatedAt)
                    VALUES (${id}, ${word}, ${types}, NOW(), NOW())
                `;

                console.log(`✅ Created word type: ${word}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating word type ${word}:`, error.message);
            }
        }

        console.log(`🎉 Essential word types created: ${successCount}/${wordTypes.length}`);

    } catch (error) {
        console.error('❌ Word types creation failed:', error);
        // Don't throw here, as this is not critical
    }
}

async function verifyDeployment() {
    try {
        console.log('🔍 Verifying deployment...');

        // Check models using raw SQL
        const modelsResult = await prisma.$queryRaw`
            SELECT COUNT(*) as count FROM models
        `;
        const modelsCount = modelsResult[0].count;
        console.log(`🤖 Models: ${modelsCount}`);

        // Check system settings
        try {
            const settingsResult = await prisma.$queryRaw`
                SELECT COUNT(*) as count FROM system_settings
            `;
            const settingsCount = settingsResult[0].count;
            console.log(`⚙️ System Settings: ${settingsCount}`);
        } catch (error) {
            console.log('⚠️ System settings not accessible');
        }

        // Check word types
        try {
            const wordTypesResult = await prisma.$queryRaw`
                SELECT COUNT(*) as count FROM word_types
            `;
            const wordTypesCount = wordTypesResult[0].count;
            console.log(`📚 Word Types: ${wordTypesCount}`);
        } catch (error) {
            console.log('⚠️ Word types not accessible');
        }

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
railwayDeployFallback()
    .then(() => {
        console.log('🎉 Fallback Railway deployment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Fallback Railway deployment failed:', error);
        process.exit(1);
    });
