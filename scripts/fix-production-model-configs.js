#!/usr/bin/env node

/**
 * Fix Production Model Configurations
 * 
 * This script fixes incorrect model configurations in the production database.
 * Specifically addresses the juggernaut model API name issue.
 */

import { PrismaClient } from '@prisma/client';
import { STATIC_MODELS } from '../src/config/static-models.js';

const prisma = new PrismaClient();

async function fixProductionModelConfigs() {
    console.log('🔧 FIXING PRODUCTION MODEL CONFIGURATIONS');
    console.log('='.repeat(60));
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to production database');
        
        // Get current models
        const currentModels = await prisma.model.findMany();
        console.log(`📊 Found ${currentModels.length} models in production`);
        
        // Show current juggernaut model
        const juggernautModel = currentModels.find(m => m.name === 'juggernaut');
        if (juggernautModel) {
            console.log('\n🔍 CURRENT JUGGERNAUT MODEL:');
            console.log(`  API Model: ${juggernautModel.apiModel}`);
            console.log(`  API URL: ${juggernautModel.apiUrl}`);
        }
        
        // Get correct configurations
        const correctConfigs = Object.values(STATIC_MODELS);
        console.log(`📋 Found ${correctConfigs.length} correct configurations`);
        
        let fixedCount = 0;
        let createdCount = 0;
        let errorCount = 0;
        
        console.log('\n🔧 UPDATING MODEL CONFIGURATIONS:');
        
        for (const correctConfig of correctConfigs) {
            try {
                const existingModel = await prisma.model.findUnique({
                    where: {
                        provider_name: {
                            provider: correctConfig.provider,
                            name: correctConfig.name
                        }
                    }
                });
                
                if (existingModel) {
                    // Update existing model
                    await prisma.model.update({
                        where: {
                            provider_name: {
                                provider: correctConfig.provider,
                                name: correctConfig.name
                            }
                        },
                        data: {
                            displayName: correctConfig.displayName,
                            description: correctConfig.description,
                            costPerImage: correctConfig.costPerImage,
                            isActive: correctConfig.isActive,
                            apiUrl: correctConfig.apiUrl,
                            apiModel: correctConfig.apiModel,
                            apiSize: correctConfig.apiSize
                        }
                    });
                    
                    console.log(`✅ Updated ${correctConfig.provider}/${correctConfig.name}`);
                    if (correctConfig.name === 'juggernaut') {
                        console.log(`   API Model: ${existingModel.apiModel} → ${correctConfig.apiModel}`);
                    }
                    fixedCount++;
                } else {
                    // Create new model
                    await prisma.model.create({
                        data: correctConfig
                    });
                    console.log(`✅ Created ${correctConfig.provider}/${correctConfig.name}`);
                    createdCount++;
                }
                
            } catch (error) {
                console.error(`❌ Failed to update ${correctConfig.provider}/${correctConfig.name}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 UPDATE SUMMARY:');
        console.log(`  ✅ Updated: ${fixedCount} models`);
        console.log(`  ✅ Created: ${createdCount} models`);
        console.log(`  ❌ Errors: ${errorCount} models`);
        
        // Verify juggernaut model
        const fixedJuggernaut = await prisma.model.findUnique({
            where: {
                provider_name: {
                    provider: 'dezgo',
                    name: 'juggernaut'
                }
            }
        });
        
        if (fixedJuggernaut) {
            console.log('\n🎯 JUGGERNAUT MODEL VERIFICATION:');
            console.log(`  ✅ API Model: ${fixedJuggernaut.apiModel}`);
            console.log(`  ✅ API URL: ${fixedJuggernaut.apiUrl}`);
            console.log(`  ✅ Active: ${fixedJuggernaut.isActive}`);
            
            if (fixedJuggernaut.apiModel === 'juggernautxl_1024px') {
                console.log('  ✅ Juggernaut model is now correctly configured!');
            } else {
                console.log('  ❌ Juggernaut model still has incorrect API model name');
            }
        }
        
        // Final stats
        const totalModels = await prisma.model.count();
        const activeModels = await prisma.model.count({
            where: { isActive: true }
        });
        
        console.log('\n📈 FINAL PRODUCTION STATE:');
        console.log(`  📊 Total models: ${totalModels}`);
        console.log(`  ✅ Active models: ${activeModels}`);
        
        console.log('\n✅ PRODUCTION MODEL CONFIGURATION FIX COMPLETED!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixProductionModelConfigs();
