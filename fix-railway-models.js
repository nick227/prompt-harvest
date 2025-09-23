#!/usr/bin/env node

/**
 * Emergency Railway Models Fix
 *
 * This script can be run directly on Railway to fix the missing models issue.
 * It's designed to be simple and robust for Railway's environment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixRailwayModels() {
    try {
        console.log('🚀 Fixing Railway Models...');

        // Test connection
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connected');

        // Check current models
        const currentCount = await prisma.model.count();
        console.log(`Current models: ${currentCount}`);

        // Essential models for Railway
        const essentialModels = [
            {
                provider: 'flux',
                name: 'flux-dev',
                displayName: 'Flux Dev',
                description: 'Flux development model',
                costPerImage: 1,
                isActive: true,
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
            },
            {
                provider: 'google',
                name: 'imagen3',
                displayName: 'Imagen 3',
                description: 'Google\'s latest Imagen model',
                costPerImage: 1,
                isActive: true,
                apiUrl: 'https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict',
                apiModel: 'imagen-3.0-generate-001',
                apiSize: '1024x1024'
            }
        ];

        // Seed essential models
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
                console.log(`✅ ${model.provider}/${model.name}: ${model.displayName}`);
            } catch (error) {
                console.error(`❌ Failed ${model.provider}/${model.name}: ${error.message}`);
            }
        }

        // Verify
        const finalCount = await prisma.model.count();
        console.log(`Final model count: ${finalCount}`);

        if (finalCount > 0) {
            console.log('🎉 Models fixed successfully!');
        } else {
            console.log('❌ No models found after seeding');
        }

    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

fixRailwayModels();
