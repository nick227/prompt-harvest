#!/usr/bin/env node

/**
 * Update model costs in database to USD values
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// USD cost mapping
const costMapping = {
    'dalle': 0.02,
    'flux': 0.015,
    'dreamshaper': 0.005,
    'tshirt': 0.003,
    'stability': 0.01,
    'midjourney': 0.025,
    'default': 0.005
};

async function updateModelCosts() {
    try {
        console.log('🔄 Updating model costs to USD values...');

        // Get all models
        const models = await prisma.models.findMany({
            where: { isActive: true }
        });

        console.log(`📊 Found ${models.length} active models`);

        let updatedCount = 0;

        for (const model of models) {
            const provider = model.provider.toLowerCase();
            const newCost = costMapping[provider] || costMapping.default;

            if (model.costPerImage !== newCost) {
                await prisma.models.update({
                    where: { id: model.id },
                    data: { costPerImage: newCost }
                });

                console.log(`✅ Updated ${model.provider}/${model.name}: ${model.costPerImage} → ${newCost}`);
                updatedCount++;
            } else {
                console.log(`⏭️  Skipped ${model.provider}/${model.name}: already ${newCost}`);
            }
        }

        console.log(`\n🎉 Updated ${updatedCount} models`);
        console.log('✅ Model costs updated successfully!');

    } catch (error) {
        console.error('❌ Error updating model costs:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the update
updateModelCosts();
