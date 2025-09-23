#!/usr/bin/env node

/**
 * Fix Production Models Script
 * 
 * This script will be deployed to Railway to fix the incorrect model configurations
 * in the production database.
 */

import { PrismaClient } from '@prisma/client';
import { STATIC_MODELS } from './src/config/static-models.js';

const prisma = new PrismaClient();

async function fixProductionModels() {
    console.log('🔧 FIXING PRODUCTION MODEL CONFIGURATIONS');
    console.log('='.repeat(60));
    
    try {
        // Test database connection
        await prisma.$connect();
        console.log('✅ Database connected');
        
        // Get current models in production
        const currentModels = await prisma.model.findMany({
            orderBy: { name: 'asc' }
        });
        
        console.log(`📊 Found ${currentModels.length} models in production database`);
        
        // Show current juggernaut model
        const juggernautModel = currentModels.find(m => m.name === 'juggernaut');
        if (juggernautModel) {
            console.log('\n🔍 CURRENT JUGGERNAUT MODEL:');
            console.log(`  API Model: ${juggernautModel.apiModel}`);
            console.log(`  API URL: ${juggernautModel.apiUrl}`);
        }
        
        // Get correct configurations from static models
        const correctConfigs = Object.values(STATIC_MODELS);
        console.log(`📋 Found ${correctConfigs.length} correct configurations`);
        
        let fixedCount = 0;
        let errorCount = 0;
        
        console.log('\n🔧 FIXING MODEL CONFIGURATIONS:');
        
        for (const correctConfig of correctConfigs) {
            try {
                // Find the current model in database
                const currentModel = currentModels.find(m => 
                    m.provider === correctConfig.provider && 
                    m.name === correctConfig.name
                );
                
                if (currentModel) {
                    // Check if the configuration needs updating
                    const needsUpdate = 
                        currentModel.apiModel !== correctConfig.apiModel ||
                        currentModel.apiUrl !== correctConfig.apiUrl ||
                        currentModel.apiSize !== correctConfig.apiSize ||
                        currentModel.displayName !== correctConfig.displayName ||
                        currentModel.description !== correctConfig.description ||
                        currentModel.costPerImage !== correctConfig.costPerImage ||
                        currentModel.isActive !== correctConfig.isActive;
                    
                    if (needsUpdate) {
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
                        
                        console.log(`✅ Fixed ${correctConfig.provider}/${correctConfig.name}`);
                        console.log(`   API Model: ${currentModel.apiModel} → ${correctConfig.apiModel}`);
                        fixedCount++;
                    } else {
                        console.log(`✅ ${correctConfig.provider}/${correctConfig.name} - Already correct`);
                    }
                } else {
                    // Model doesn't exist, create it
                    await prisma.model.create({
                        data: correctConfig
                    });
                    console.log(`✅ Created ${correctConfig.provider}/${correctConfig.name}`);
                    fixedCount++;
                }
                
            } catch (error) {
                console.error(`❌ Failed to fix ${correctConfig.provider}/${correctConfig.name}: ${error.message}`);
                errorCount++;
            }
        }
        
        console.log('\n📊 FIXING SUMMARY:');
        console.log(`  ✅ Fixed/Created: ${fixedCount} models`);
        console.log(`  ❌ Errors: ${errorCount} models`);
        
        // Verify juggernaut model is now correct
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
        
        // Final verification
        const totalModels = await prisma.model.count();
        const activeModels = await prisma.model.count({
            where: { isActive: true }
        });
        
        console.log('\n📈 FINAL PRODUCTION DATABASE STATE:');
        console.log(`  📊 Total models: ${totalModels}`);
        console.log(`  ✅ Active models: ${activeModels}`);
        
        console.log('\n✅ PRODUCTION MODEL FIXING COMPLETED!');
        
    } catch (error) {
        console.error('❌ Fixing failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the fix
fixProductionModels();
