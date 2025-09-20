#!/usr/bin/env node

/**
 * Railway Deployment Script with Data Check and Fallback Import
 * Checks if models and word_types tables have data and imports fallback data if empty
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function railwayDeployWithDataCheck() {
    try {
        console.log('🚀 Starting Railway deployment with data check...');

        // Step 1: Check current data status
        console.log('🔍 Step 1: Checking current data status...');
        const dataStatus = await checkDataStatus();

        // Step 2: Fix table structure if needed
        console.log('🔧 Step 2: Fixing table structure...');
        await fixTableStructure();

        // Step 3: Import fallback data if tables are empty
        console.log('📦 Step 3: Importing fallback data if needed...');
        await importFallbackData(dataStatus);

        // Step 4: Verify final state
        console.log('✅ Step 4: Verifying final state...');
        await verifyFinalState();

        console.log('🎉 Railway deployment with data check completed successfully!');

    } catch (error) {
        console.error('❌ Railway deployment failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function checkDataStatus() {
    try {
        console.log('🔍 Checking data status in critical tables...');

        // Check models table
        const modelsCount = await prisma.model.count();
        console.log(`🤖 Models table: ${modelsCount} entries`);

        // Check word_types table
        const wordTypesCount = await prisma.word_types.count();
        console.log(`📝 Word types table: ${wordTypesCount} entries`);

        // Check packages table (if exists)
        let packagesCount = 0;
        try {
            packagesCount = await prisma.package.count();
            console.log(`📦 Packages table: ${packagesCount} entries`);
        } catch (error) {
            console.log('📦 Packages table: not found (will be created)');
        }

        // Check providers table (if exists)
        let providersCount = 0;
        try {
            providersCount = await prisma.provider.count();
            console.log(`🏢 Providers table: ${providersCount} entries`);
        } catch (error) {
            console.log('🏢 Providers table: not found (will be created)');
        }

        const dataStatus = {
            models: {
                count: modelsCount,
                isEmpty: modelsCount === 0,
                needsImport: modelsCount === 0
            },
            wordTypes: {
                count: wordTypesCount,
                isEmpty: wordTypesCount === 0,
                needsImport: wordTypesCount === 0
            },
            packages: {
                count: packagesCount,
                isEmpty: packagesCount === 0,
                needsImport: packagesCount === 0
            },
            providers: {
                count: providersCount,
                isEmpty: providersCount === 0,
                needsImport: providersCount === 0
            }
        };

        console.log('\n📊 Data Status Summary:');
        console.log(`   Models: ${dataStatus.models.isEmpty ? '❌ EMPTY' : '✅ HAS DATA'} (${dataStatus.models.count})`);
        console.log(`   Word Types: ${dataStatus.wordTypes.isEmpty ? '❌ EMPTY' : '✅ HAS DATA'} (${dataStatus.wordTypes.count})`);
        console.log(`   Packages: ${dataStatus.packages.isEmpty ? '❌ EMPTY' : '✅ HAS DATA'} (${dataStatus.packages.count})`);
        console.log(`   Providers: ${dataStatus.providers.isEmpty ? '❌ EMPTY' : '✅ HAS DATA'} (${dataStatus.providers.count})`);

        return dataStatus;

    } catch (error) {
        console.error('❌ Failed to check data status:', error);
        throw error;
    }
}

async function fixTableStructure() {
    try {
        console.log('🔧 Fixing table structure for Railway...');

        // Disable foreign key checks temporarily
        console.log('🔓 Disabling foreign key checks...');
        await prisma.$executeRaw`SET FOREIGN_KEY_CHECKS = 0`;

        try {
            // Create providers table first (required for foreign key)
            await createProvidersTableIfNeeded();

            // Fix models table structure
            await fixModelsTableStructure();

            // Create packages table if it doesn't exist
            await createPackagesTableIfNeeded();

            console.log('✅ Table structure fixed');

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

async function createProvidersTableIfNeeded() {
    try {
        console.log('🔧 Creating providers table if needed...');

        // Check if providers table exists
        const tableExists = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'providers'
        `;

        if (tableExists[0].count === 0) {
            console.log('🔄 Creating providers table...');
            await prisma.$executeRaw`
                CREATE TABLE providers (
                    id VARCHAR(50) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    displayName VARCHAR(100) NOT NULL,
                    description TEXT,
                    isActive BOOLEAN DEFAULT TRUE,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `;
            console.log('✅ Providers table created');
        } else {
            console.log('✅ Providers table already exists');
        }

        // Populate providers table with required data
        await populateProvidersTable();

    } catch (error) {
        console.error('❌ Failed to create providers table:', error);
        throw error;
    }
}

async function populateProvidersTable() {
    try {
        console.log('🌱 Populating providers table...');

        const providers = [
            ['openai', 'OpenAI', 'OpenAI', 'OpenAI AI image generation services'],
            ['google', 'Google', 'Google', 'Google AI image generation services'],
            ['dezgo', 'Dezgo', 'Dezgo', 'Dezgo AI image generation services']
        ];

        let successCount = 0;
        for (const [id, name, displayName, description] of providers) {
            try {
                await prisma.$executeRaw`
                    INSERT IGNORE INTO providers (id, name, displayName, description, isActive, createdAt, updatedAt)
                    VALUES (${id}, ${name}, ${displayName}, ${description}, TRUE, NOW(), NOW())
                `;

                console.log(`✅ Created provider: ${name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating provider ${name}:`, error.message);
            }
        }

        console.log(`🎉 Providers population completed: ${successCount}/${providers.length} successful`);

    } catch (error) {
        console.error('❌ Failed to populate providers table:', error);
        throw error;
    }
}

async function fixModelsTableStructure() {
    try {
        console.log('🔧 Fixing models table structure...');

        // Check current structure
        const columns = await prisma.$queryRaw`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'models'
            ORDER BY ORDINAL_POSITION
        `;

        const columnNames = columns.map(col => col.COLUMN_NAME);
        const idMaxLength = columns.find(col => col.COLUMN_NAME === 'id')?.CHARACTER_MAXIMUM_LENGTH || 25;

        // Fix ID column length if too short
        if (idMaxLength < 30) {
            console.log('🔄 Extending ID column length...');
            await prisma.$executeRaw`
                ALTER TABLE models MODIFY COLUMN id VARCHAR(50)
            `;
        }

        // Add missing columns
        if (!columnNames.includes('provider')) {
            console.log('🔄 Adding provider column...');
            await prisma.$executeRaw`
                ALTER TABLE models ADD COLUMN provider VARCHAR(50) NOT NULL AFTER id
            `;
        }

        if (!columnNames.includes('apiUrl')) {
            console.log('🔄 Adding apiUrl column...');
            await prisma.$executeRaw`
                ALTER TABLE models ADD COLUMN apiUrl VARCHAR(500) AFTER isActive
            `;
        }

        if (!columnNames.includes('apiModel')) {
            console.log('🔄 Adding apiModel column...');
            await prisma.$executeRaw`
                ALTER TABLE models ADD COLUMN apiModel VARCHAR(100) AFTER apiUrl
            `;
        }

        if (!columnNames.includes('apiSize')) {
            console.log('🔄 Adding apiSize column...');
            await prisma.$executeRaw`
                ALTER TABLE models ADD COLUMN apiSize VARCHAR(20) AFTER apiModel
            `;
        }

        // Make providerId nullable if it exists
        if (columnNames.includes('providerId')) {
            console.log('🔄 Making providerId nullable...');
            await prisma.$executeRaw`
                ALTER TABLE models MODIFY COLUMN providerId VARCHAR(50) NULL
            `;
        }

    } catch (error) {
        console.error('❌ Failed to fix models table structure:', error);
        throw error;
    }
}

async function createPackagesTableIfNeeded() {
    try {
        console.log('🔧 Creating packages table if needed...');

        // Check if packages table exists
        const tableExists = await prisma.$queryRaw`
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'packages'
        `;

        if (tableExists[0].count === 0) {
            console.log('🔄 Creating packages table...');
            await prisma.$executeRaw`
                CREATE TABLE packages (
                    id VARCHAR(25) PRIMARY KEY,
                    name VARCHAR(100) NOT NULL,
                    credits INT NOT NULL,
                    price INT NOT NULL,
                    description TEXT,
                    popular BOOLEAN DEFAULT FALSE,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_by VARCHAR(50) DEFAULT 'system',
                    version INT DEFAULT 1
                )
            `;
            console.log('✅ Packages table created');
        } else {
            console.log('✅ Packages table already exists');
        }

    } catch (error) {
        console.error('❌ Failed to create packages table:', error);
        throw error;
    }
}

async function importFallbackData(dataStatus) {
    try {
        console.log('📦 Importing fallback data for empty tables...');

        // Import models if empty
        if (dataStatus.models.needsImport) {
            console.log('🤖 Importing fallback models...');
            await importFallbackModels();
        } else {
            console.log('✅ Models table already has data, skipping import');
        }

        // Import word types if empty
        if (dataStatus.wordTypes.needsImport) {
            console.log('📝 Importing fallback word types...');
            await importFallbackWordTypes();
        } else {
            console.log('✅ Word types table already has data, skipping import');
        }

        // Import packages if empty
        if (dataStatus.packages.needsImport) {
            console.log('📦 Importing fallback packages...');
            await importFallbackPackages();
        } else {
            console.log('✅ Packages table already has data, skipping import');
        }

        // Import providers if empty
        if (dataStatus.providers.needsImport) {
            console.log('🏢 Importing fallback providers...');
            await importFallbackProviders();
        } else {
            console.log('✅ Providers table already has data, skipping import');
        }

    } catch (error) {
        console.error('❌ Failed to import fallback data:', error);
        throw error;
    }
}

async function importFallbackModels() {
    try {
        console.log('🗑️ Clearing existing models...');
        await prisma.$executeRaw`DELETE FROM models`;

        console.log('🌱 Importing fallback models...');

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

        console.log(`🎉 Models import completed: ${successCount}/${models.length} successful`);

    } catch (error) {
        console.error('❌ Failed to import fallback models:', error);
        throw error;
    }
}

async function importFallbackWordTypes() {
    try {
        console.log('📝 Importing fallback word types from backup...');

        // Read the NeDB backup file
        const backupPath = path.join(__dirname, '..', 'data', 'word-types.db');

        if (!fs.existsSync(backupPath)) {
            console.log('⚠️ Word types backup file not found, creating minimal fallback...');
            await createMinimalWordTypes();
            return;
        }

        const backupContent = fs.readFileSync(backupPath, 'utf8');
        const lines = backupContent.trim().split('\n');
        console.log(`📊 Found ${lines.length} word entries to restore`);

        let successCount = 0;
        let errorCount = 0;

        // Clear existing word_types data
        console.log('🗑️ Clearing existing word_types data...');
        await prisma.word_types.deleteMany({});

        // Process each line
        for (let i = 0; i < lines.length; i++) {
            try {
                const line = lines[i].trim();
                if (!line) {
                    continue;
                }

                const wordData = JSON.parse(line);
                const { word, types } = wordData;

                if (!word || !types || !Array.isArray(types)) {
                    console.warn(`⚠️ Skipping invalid entry at line ${i + 1}:`, wordData);
                    continue;
                }

                // Insert into MySQL database
                await prisma.word_types.create({
                    data: {
                        word: word,
                        types: types,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                successCount++;

                // Progress indicator
                if (successCount % 100 === 0) {
                    console.log(`✅ Processed ${successCount} words...`);
                }

            } catch (parseError) {
                console.error(`❌ Error parsing line ${i + 1}:`, parseError.message);
                errorCount++;
            }
        }

        console.log(`🎉 Word types import completed: ${successCount} successful, ${errorCount} errors`);

    } catch (error) {
        console.error('❌ Failed to import fallback word types:', error);
        throw error;
    }
}

async function createMinimalWordTypes() {
    try {
        console.log('📝 Creating minimal word types fallback...');

        const minimalWords = [
            { word: 'beautiful', types: ['adjective'] },
            { word: 'amazing', types: ['adjective'] },
            { word: 'stunning', types: ['adjective'] },
            { word: 'artistic', types: ['adjective'] },
            { word: 'creative', types: ['adjective'] },
            { word: 'vibrant', types: ['adjective'] },
            { word: 'colorful', types: ['adjective'] },
            { word: 'detailed', types: ['adjective'] },
            { word: 'realistic', types: ['adjective'] },
            { word: 'fantasy', types: ['noun'] },
            { word: 'landscape', types: ['noun'] },
            { word: 'portrait', types: ['noun'] },
            { word: 'abstract', types: ['adjective'] },
            { word: 'modern', types: ['adjective'] },
            { word: 'vintage', types: ['adjective'] }
        ];

        for (const { word, types } of minimalWords) {
            try {
                await prisma.word_types.create({
                    data: {
                        word: word,
                        types: types,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });
            } catch (error) {
                console.error(`❌ Error creating word type ${word}:`, error.message);
            }
        }

        console.log(`✅ Created ${minimalWords.length} minimal word types`);

    } catch (error) {
        console.error('❌ Failed to create minimal word types:', error);
        throw error;
    }
}

async function importFallbackPackages() {
    try {
        console.log('📦 Importing fallback packages...');

        // Read packages from JSON file
        const packagesPath = path.join(__dirname, '..', 'data', 'packages.json');

        if (!fs.existsSync(packagesPath)) {
            console.log('⚠️ Packages file not found, creating default packages...');
            await createDefaultPackages();
            return;
        }

        const packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf8'));
        console.log(`📊 Found ${packagesData.length} packages to import`);

        let successCount = 0;

        for (const pkg of packagesData) {
            try {
                await prisma.package.create({
                    data: {
                        id: pkg.id,
                        name: pkg.name,
                        displayName: pkg.name,
                        credits: pkg.credits,
                        price: pkg.price,
                        description: pkg.description,
                        isPopular: pkg.popular || false,
                        isActive: true,
                        sortOrder: 0
                    }
                });

                console.log(`✅ Created package: ${pkg.name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating package ${pkg.name}:`, error.message);
            }
        }

        console.log(`🎉 Packages import completed: ${successCount}/${packagesData.length} successful`);

    } catch (error) {
        console.error('❌ Failed to import fallback packages:', error);
        throw error;
    }
}

async function importFallbackProviders() {
    try {
        console.log('🏢 Importing fallback providers...');

        const providers = [
            {
                id: 'openai',
                name: 'OpenAI',
                displayName: 'OpenAI',
                description: 'OpenAI AI image generation services'
            },
            {
                id: 'google',
                name: 'Google',
                displayName: 'Google',
                description: 'Google AI image generation services'
            },
            {
                id: 'dezgo',
                name: 'Dezgo',
                displayName: 'Dezgo',
                description: 'Dezgo AI image generation services'
            }
        ];

        let successCount = 0;

        for (const provider of providers) {
            try {
                await prisma.provider.create({
                    data: {
                        id: provider.id,
                        name: provider.name,
                        displayName: provider.displayName,
                        description: provider.description,
                        isActive: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    }
                });

                console.log(`✅ Created provider: ${provider.name}`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating provider ${provider.name}:`, error.message);
            }
        }

        console.log(`🎉 Providers import completed: ${successCount}/${providers.length} successful`);

    } catch (error) {
        console.error('❌ Failed to import fallback providers:', error);
        throw error;
    }
}

async function createDefaultPackages() {
    try {
        console.log('📦 Creating default packages...');

        const defaultPackages = [
            {
                id: 'starter',
                name: 'Starter Pack',
                credits: 10,
                price: 999,
                description: 'Perfect for trying out AI image generation',
                popular: false
            },
            {
                id: 'pro',
                name: 'Pro Pack',
                credits: 50,
                price: 3999,
                description: 'Great for regular users',
                popular: true
            },
            {
                id: 'enterprise',
                name: 'Enterprise Pack',
                credits: 200,
                price: 14999,
                description: 'For power users and businesses',
                popular: false
            }
        ];

        for (const pkg of defaultPackages) {
            try {
                await prisma.package.create({
                    data: {
                        id: pkg.id,
                        name: pkg.name,
                        displayName: pkg.name,
                        credits: pkg.credits,
                        price: pkg.price,
                        description: pkg.description,
                        isPopular: pkg.popular,
                        isActive: true,
                        sortOrder: 0
                    }
                });

                console.log(`✅ Created default package: ${pkg.name}`);
            } catch (error) {
                console.error(`❌ Error creating default package ${pkg.name}:`, error.message);
            }
        }

    } catch (error) {
        console.error('❌ Failed to create default packages:', error);
        throw error;
    }
}

async function verifyFinalState() {
    try {
        console.log('🔍 Verifying final deployment state...');

        // Check final counts
        const modelsCount = await prisma.model.count();
        const wordTypesCount = await prisma.word_types.count();
        const packagesCount = await prisma.package.count();
        const providersCount = await prisma.provider.count();

        console.log('\n📊 Final Data Status:');
        console.log(`   🤖 Models: ${modelsCount} entries`);
        console.log(`   📝 Word Types: ${wordTypesCount} entries`);
        console.log(`   📦 Packages: ${packagesCount} entries`);
        console.log(`   🏢 Providers: ${providersCount} entries`);

        // Show sample data
        if (modelsCount > 0) {
            const sampleModels = await prisma.$queryRaw`
                SELECT provider, name, apiUrl FROM models LIMIT 3
            `;
            console.log('\n🔍 Sample Models:');
            sampleModels.forEach(model => {
                console.log(`   ${model.provider}/${model.name}: ${model.apiUrl}`);
            });
        }

        if (wordTypesCount > 0) {
            const sampleWords = await prisma.$queryRaw`
                SELECT word, types FROM word_types LIMIT 3
            `;
            console.log('\n🔍 Sample Word Types:');
            sampleWords.forEach(word => {
                console.log(`   ${word.word}: ${JSON.stringify(word.types)}`);
            });
        }

        if (packagesCount > 0) {
            const samplePackages = await prisma.$queryRaw`
                SELECT id, name, credits, price FROM packages LIMIT 3
            `;
            console.log('\n🔍 Sample Packages:');
            samplePackages.forEach(pkg => {
                console.log(`   ${pkg.name}: ${pkg.credits} credits - $${pkg.price / 100}`);
            });
        }

        if (providersCount > 0) {
            const sampleProviders = await prisma.$queryRaw`
                SELECT id, name, displayName FROM providers LIMIT 3
            `;
            console.log('\n🔍 Sample Providers:');
            sampleProviders.forEach(provider => {
                console.log(`   ${provider.id}: ${provider.displayName}`);
            });
        }

        console.log('\n✅ Final verification completed');

    } catch (error) {
        console.error('❌ Final verification failed:', error);
        throw error;
    }
}

// Run the deployment
railwayDeployWithDataCheck()
    .then(() => {
        console.log('🎉 Railway deployment with data check completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Railway deployment with data check failed:', error);
        process.exit(1);
    });
