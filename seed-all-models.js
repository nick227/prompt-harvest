#!/usr/bin/env node

/**
 * Complete Model Seeding Script
 * 
 * Seeds all models from static-models.js into the database
 */

import { PrismaClient } from '@prisma/client';
import { STATIC_MODELS } from './src/config/static-models.js';

const prisma = new PrismaClient();

async function seedAllModels() {
    console.log('🌱 SEEDING ALL MODELS FROM STATIC CONFIGURATION');
    console.log('='.repeat(60));
    
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');
        
        // Get all model configurations from static models
        const modelConfigs = Object.values(STATIC_MODELS);
        console.log(`📊 Found ${modelConfigs.length} models in static configuration`);
        
        let seededCount = 0;
        let updatedCount = 0;
        let errorCount = 0;
        
        for (const config of modelConfigs) {
            try {
                // Check if model exists
                const existingModel = await prisma.model.findUnique({
                    where: {
                        provider_name: {
                            provider: config.provider,
                            name: config.name
                        }
                    }
                });
                
                if (existingModel) {
                    // Update existing model
                    await prisma.model.update({
                        where: {
                            provider_name: {
                                provider: config.provider,
                                name: config.name
                            }
                        },
                        data: config
                    });
                    console.log(`🔄 Updated ${config.provider}/${config.name}: ${config.displayName}`);
                    updatedCount++;
                } else {
                    // Create new model
                    await prisma.model.create({
                        data: config
                    });
                    console.log(`✅ Created ${config.provider}/${config.name}: ${config.displayName}`);
                    seededCount++;
                }
                
            } catch (error) {
                console.error(`❌ Failed to seed ${config.provider}/${config.name}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 SEEDING SUMMARY:');
        console.log(`  ✅ Created: ${seededCount} models`);
        console.log(`  🔄 Updated: ${updatedCount} models`);
        console.log(`  ❌ Errors: ${errorCount} models`);
        
        // Verify final count
        const totalModels = await prisma.model.count();
        const activeModels = await prisma.model.count({
            where: { isActive: true }
        });
        
        console.log(`\n📈 FINAL DATABASE STATE:`);
        console.log(`  📊 Total models: ${totalModels}`);
        console.log(`  ✅ Active models: ${activeModels}`);
        
        // Show models by provider
        const models = await prisma.model.findMany({
            select: {
                provider: true,
                name: true,
                isActive: true
            },
            orderBy: { provider: 'asc' }
        });
        
        const byProvider = models.reduce((acc, model) => {
            if (!acc[model.provider]) acc[model.provider] = { total: 0, active: 0 };
            acc[model.provider].total++;
            if (model.isActive) acc[model.provider].active++;
            return acc;
        }, {});
        
        console.log('\n🏢 MODELS BY PROVIDER:');
        Object.entries(byProvider).forEach(([provider, counts]) => {
            console.log(`  ${provider.toUpperCase()}: ${counts.active}/${counts.total} active`);
        });
        
        console.log('\n✅ MODEL SEEDING COMPLETED SUCCESSFULLY!');
        
    } catch (error) {
        console.error('❌ Seeding failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run seeding
seedAllModels();
