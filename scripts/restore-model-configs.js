#!/usr/bin/env node

/**
 * Restore Model Configurations
 * Run: node scripts/restore-model-configs.js
 *
 * This script restores the complete model configurations with API URLs and models.
 */

import { PrismaClient } from '@prisma/client';

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

async function restoreModelConfigs() {
    try {
        console.log('🔄 Restoring model configurations...\n');

        // Clear existing models
        await prisma.model.deleteMany({});
        console.log('🗑️ Cleared existing models');

        // Create new models with complete configurations
        let successCount = 0;
        let errorCount = 0;

        for (const modelData of modelConfigs) {
            try {
                await prisma.model.create({
                    data: modelData
                });
                console.log(`✅ Created model: ${modelData.provider}/${modelData.name} (${modelData.apiUrl})`);
                successCount++;
            } catch (error) {
                console.error(`❌ Error creating model ${modelData.name}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\n🎉 Model restoration completed!`);
        console.log(`   - Successfully created: ${successCount} models`);
        if (errorCount > 0) {
            console.log(`   - Failed to create: ${errorCount} models`);
        }

        // Show summary by provider
        const summary = await prisma.model.groupBy({
            by: ['provider'],
            _count: {
                provider: true
            }
        });

        console.log('\n📊 Models by provider:');
        summary.forEach(group => {
            console.log(`   ${group.provider}: ${group._count.provider} models`);
        });

        // Show some sample configurations
        console.log('\n🔍 Sample model configurations:');
        const sampleModels = await prisma.model.findMany({
            take: 3,
            select: {
                name: true,
                provider: true,
                apiUrl: true,
                apiModel: true,
                apiSize: true
            }
        });

        sampleModels.forEach(model => {
            console.log(`   ${model.provider}/${model.name}:`);
            console.log(`     URL: ${model.apiUrl}`);
            console.log(`     Model: ${model.apiModel}`);
            console.log(`     Size: ${model.apiSize}`);
        });

    } catch (error) {
        console.error('❌ Error restoring model configs:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the restoration
restoreModelConfigs()
    .then(() => {
        console.log('\n✅ Model configurations restored successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Model configuration restoration failed:', error);
        process.exit(1);
    });
