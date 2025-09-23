#!/usr/bin/env node

/**
 * Railway Models Fix - Direct Database Approach
 *
 * This script directly fixes the models issue on Railway by:
 * 1. Testing database connection
 * 2. Checking current models
 * 3. Inserting essential models directly
 * 4. Verifying the fix
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

async function fixRailwayModels() {
    try {
        console.log('🚀 RAILWAY MODELS FIX STARTED');
        console.log('================================');

        // Step 1: Test database connection
        console.log('Step 1: Testing database connection...');
        try {
            await prisma.$queryRaw`SELECT 1 as test`;
            console.log('✅ Database connection successful');
        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            throw error;
        }

        // Step 2: Check current models
        console.log('\nStep 2: Checking current models...');
        const currentModels = await prisma.model.findMany({
            select: {
                id: true,
                provider: true,
                name: true,
                displayName: true,
                isActive: true
            }
        });

        console.log(`Current models count: ${currentModels.length}`);
        if (currentModels.length > 0) {
            console.log('Existing models:');
            currentModels.forEach(model => {
                console.log(`  - ${model.provider}/${model.name}: ${model.displayName} (${model.isActive ? 'active' : 'inactive'})`);
            });
        }

        // Step 3: Insert essential models
        console.log('\nStep 3: Inserting essential models...');

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
            },
            {
                provider: 'dezgo',
                name: 'flux',
                displayName: 'Flux (Dezgo)',
                description: 'Flux model via Dezgo API',
                costPerImage: 1,
                isActive: true,
                apiUrl: 'https://api.dezgo.com/text2image_flux',
                apiModel: 'flux',
                apiSize: '1024x1024'
            }
        ];

        let insertedCount = 0;
        let updatedCount = 0;

        for (const model of essentialModels) {
            try {
                // Check if model exists
                const existingModel = await prisma.model.findUnique({
                    where: {
                        provider_name: {
                            provider: model.provider,
                            name: model.name
                        }
                    }
                });

                if (existingModel) {
                    // Update existing model
                    await prisma.model.update({
                        where: {
                            provider_name: {
                                provider: model.provider,
                                name: model.name
                            }
                        },
                        data: model
                    });
                    console.log(`✅ Updated ${model.provider}/${model.name}: ${model.displayName}`);
                    updatedCount++;
                } else {
                    // Create new model
                    await prisma.model.create({
                        data: model
                    });
                    console.log(`✅ Created ${model.provider}/${model.name}: ${model.displayName}`);
                    insertedCount++;
                }
            } catch (error) {
                console.error(`❌ Failed to process ${model.provider}/${model.name}: ${error.message}`);
            }
        }

        // Step 4: Verify the fix
        console.log('\nStep 4: Verifying the fix...');
        const finalModels = await prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                displayName: true,
                isActive: true
            }
        });

        console.log(`Final active models count: ${finalModels.length}`);
        console.log('Active models:');
        finalModels.forEach(model => {
            console.log(`  ✅ ${model.provider}/${model.name}: ${model.displayName}`);
        });

        // Step 5: Check if any images have null models
        console.log('\nStep 5: Checking for images with null models...');
        const imagesWithNullModels = await prisma.image.findMany({
            where: { model: null },
            select: {
                id: true,
                provider: true,
                model: true,
                createdAt: true
            }
        });

        console.log(`Images with null models: ${imagesWithNullModels.length}`);
        if (imagesWithNullModels.length > 0) {
            console.log('Images with null models:');
            imagesWithNullModels.forEach(image => {
                console.log(`  - ${image.id}: ${image.provider} (created: ${image.createdAt})`);
            });
        }

        // Summary
        console.log('\n================================');
        console.log('🎉 RAILWAY MODELS FIX COMPLETED');
        console.log(`✅ Models inserted: ${insertedCount}`);
        console.log(`✅ Models updated: ${updatedCount}`);
        console.log(`✅ Total active models: ${finalModels.length}`);
        console.log(`⚠️ Images with null models: ${imagesWithNullModels.length}`);
        console.log('================================');

        if (finalModels.length > 0) {
            console.log('🎉 SUCCESS: Models are now available on Railway!');
        } else {
            console.log('❌ FAILURE: No models found after fix attempt');
        }

    } catch (error) {
        console.error('❌ RAILWAY MODELS FIX FAILED:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixRailwayModels();
