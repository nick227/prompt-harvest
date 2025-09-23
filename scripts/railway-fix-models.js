#!/usr/bin/env node

/**
 * Railway Model Configuration Fix
 * 
 * This script runs on Railway to fix the model configurations in production.
 * It updates all models to use the correct API URLs and model names.
 */

import { PrismaClient } from '@prisma/client';
import { STATIC_MODELS } from '../src/config/static-models.js';

const prisma = new PrismaClient();

async function fixRailwayModels() {
    console.log('🔧 FIXING RAILWAY MODEL CONFIGURATIONS');
    console.log('='.repeat(60));
    
    try {
        await prisma.$connect();
        console.log('✅ Connected to Railway production database');
        
        // Get current models
        const currentModels = await prisma.model.findMany();
        console.log(`📊 Found ${currentModels.length} models in production`);
        
        // Show current flux model
        const fluxModel = currentModels.find(m => m.name === 'flux');
        if (fluxModel) {
            console.log('\n🔍 CURRENT FLUX MODEL:');
            console.log(`  API URL: ${fluxModel.apiUrl}`);
            console.log(`  API Model: ${fluxModel.apiModel}`);
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
                    if (correctConfig.name === 'flux') {
                        console.log(`   API URL: ${existingModel.apiUrl} → ${correctConfig.apiUrl}`);
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
        
        // Verify flux model
        const fixedFlux = await prisma.model.findUnique({
            where: {
                provider_name: {
                    provider: 'dezgo',
                    name: 'flux'
                }
            }
        });
        
        if (fixedFlux) {
            console.log('\n🎯 FLUX MODEL VERIFICATION:');
            console.log(`  ✅ API URL: ${fixedFlux.apiUrl}`);
            console.log(`  ✅ API Model: ${fixedFlux.apiModel}`);
            console.log(`  ✅ Active: ${fixedFlux.isActive}`);
            
            if (fixedFlux.apiUrl === 'https://api.dezgo.com/text2image_flux') {
                console.log('  ✅ Flux model is now correctly configured!');
            } else {
                console.log('  ❌ Flux model still has incorrect API URL');
            }
        }
        
        // Final stats
        const totalModels = await prisma.model.count();
        const activeModels = await prisma.model.count({
            where: { isActive: true }
        });
        
        console.log('\n📈 FINAL RAILWAY STATE:');
        console.log(`  📊 Total models: ${totalModels}`);
        console.log(`  ✅ Active models: ${activeModels}`);
        
        console.log('\n✅ RAILWAY MODEL CONFIGURATION FIX COMPLETED!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixRailwayModels();
