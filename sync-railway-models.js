#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import { getAllStaticModels } from './src/config/static-models.js';

const prisma = new PrismaClient();

async function syncRailwayModels() {
    console.log('🔄 SYNCING RAILWAY MODELS');
    console.log('==========================');

    try {
        // Test database connection
        console.log('📋 Step 1: Testing database connection...');
        await prisma.$queryRaw`SELECT 1 as test`;
        console.log('✅ Database connection successful');

        // Get current models from database
        console.log('📋 Step 2: Getting current models from database...');
        const currentModels = await prisma.model.findMany({
            select: {
                id: true,
                provider: true,
                name: true,
                displayName: true,
                isActive: true
            }
        });
        console.log(`📊 Current models in database: ${currentModels.length}`);

        // Get latest model definitions from static config
        console.log('📋 Step 3: Getting latest model definitions...');
        const latestModels = getAllStaticModels();
        console.log(`📊 Latest model definitions: ${latestModels.length}`);

        // Compare and sync
        console.log('📋 Step 4: Syncing models...');
        let createdCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const modelDef of latestModels) {
            const { provider, name } = modelDef;

            // Check if model exists in database
            const existingModel = await prisma.model.findUnique({
                where: { provider_name: { provider, name } }
            });

            if (existingModel) {
                // Update existing model
                await prisma.model.update({
                    where: { id: existingModel.id },
                    data: {
                        displayName: modelDef.displayName,
                        description: modelDef.description,
                        costPerImage: modelDef.costPerImage,
                        isActive: modelDef.isActive,
                        apiUrl: modelDef.apiUrl,
                        apiModel: modelDef.apiModel,
                        apiSize: modelDef.apiSize
                    }
                });
                console.log(`✅ Updated ${provider}/${name}: ${modelDef.displayName}`);
                updatedCount++;
            } else {
                // Create new model
                await prisma.model.create({
                    data: {
                        provider: modelDef.provider,
                        name: modelDef.name,
                        displayName: modelDef.displayName,
                        description: modelDef.description,
                        costPerImage: modelDef.costPerImage,
                        isActive: modelDef.isActive,
                        apiUrl: modelDef.apiUrl,
                        apiModel: modelDef.apiModel,
                        apiSize: modelDef.apiSize
                    }
                });
                console.log(`✅ Created ${provider}/${name}: ${modelDef.displayName}`);
                createdCount++;
            }
        }

        // Verify sync
        console.log('📋 Step 5: Verifying sync...');
        const finalModels = await prisma.model.findMany({
            where: { isActive: true },
            select: {
                provider: true,
                name: true,
                displayName: true,
                apiUrl: true,
                apiModel: true,
                costPerImage: true
            }
        });

        console.log('📊 Final model counts:');
        console.log(`  Total models: ${finalModels.length}`);
        console.log(`  Created: ${createdCount}`);
        console.log(`  Updated: ${updatedCount}`);
        console.log(`  Skipped: ${skippedCount}`);

        // Show some key models
        console.log('📋 Key models:');
        const fluxModels = finalModels.filter(m => m.provider === 'flux');
        const dezgoModels = finalModels.filter(m => m.provider === 'dezgo');
        const openaiModels = finalModels.filter(m => m.provider === 'openai');

        console.log(`  Flux models: ${fluxModels.length}`);
        console.log(`  Dezgo models: ${dezgoModels.length}`);
        console.log(`  OpenAI models: ${openaiModels.length}`);

        // Show API URLs for verification
        console.log('📋 API URLs verification:');
        finalModels.slice(0, 5).forEach(model => {
            console.log(`  ${model.provider}/${model.name}: ${model.apiUrl}`);
        });

        console.log('==========================');
        console.log('✅ RAILWAY MODELS SYNC COMPLETE');

    } catch (error) {
        console.error('❌ Railway models sync failed:', error.message);
        console.error('Error details:', error);
    } finally {
        await prisma.$disconnect();
    }
}

syncRailwayModels();
