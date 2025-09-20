#!/usr/bin/env node

/**
 * Check Model Configuration
 * Run: node scripts/check-model-config.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkModelConfig() {
    try {
        console.log('🔍 Checking model configurations...\n');

        const models = await prisma.model.findMany({
            where: { provider: 'dezgo' },
            select: {
                name: true,
                displayName: true,
                apiUrl: true,
                apiModel: true,
                isActive: true
            }
        });

        console.log('📊 Dezgo Models Configuration:');
        models.forEach(model => {
            console.log(`\n${model.name}:`);
            console.log(`  Display Name: ${model.displayName}`);
            console.log(`  API URL: ${model.apiUrl || 'NULL'}`);
            console.log(`  API Model: ${model.apiModel || 'NULL'}`);
            console.log(`  Active: ${model.isActive}`);
        });

        // Check specifically for absolute model
        const absoluteModel = await prisma.model.findFirst({
            where: { name: 'absolute' }
        });

        console.log('\n🎯 Absolute Model Details:');
        if (absoluteModel) {
            console.log(JSON.stringify(absoluteModel, null, 2));
        } else {
            console.log('❌ Absolute model not found!');
        }

    } catch (error) {
        console.error('❌ Error checking model config:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkModelConfig();
