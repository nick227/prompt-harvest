#!/usr/bin/env node

/**
 * Check All Models
 * Run: node scripts/check-all-models.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllModels() {
    try {
        console.log('📊 All Models by Provider:\n');

        const models = await prisma.model.findMany({
            select: {
                provider: true,
                name: true,
                displayName: true,
                apiUrl: true,
                apiModel: true,
                isActive: true
            },
            orderBy: [
                { provider: 'asc' },
                { name: 'asc' }
            ]
        });

        const byProvider = {};
        models.forEach(model => {
            if (!byProvider[model.provider]) {
                byProvider[model.provider] = [];
            }
            byProvider[model.provider].push(model);
        });

        Object.keys(byProvider).forEach(provider => {
            console.log(`${provider.toUpperCase()} (${byProvider[provider].length} models):`);
            byProvider[provider].forEach(model => {
                console.log(`  - ${model.name}: ${model.displayName}`);
                console.log(`    URL: ${model.apiUrl}`);
                console.log(`    Model: ${model.apiModel}`);
            });
            console.log('');
        });

        console.log(`✅ Total: ${models.length} models across ${Object.keys(byProvider).length} providers`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkAllModels();
