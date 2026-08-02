#!/usr/bin/env node

/**
 * Seed Database
 *
 * Populates the providers and models tables from src/config/static-models.js.
 * Safe to re-run: uses upsert, so existing rows are updated in place rather
 * than duplicated.
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';
import { getAllStaticModels } from '../src/config/static-models.js';

const prisma = new PrismaClient();

const PROVIDERS = [
    { id: 'openai', name: 'openai', displayName: 'OpenAI', description: 'OpenAI image generation models' },
    { id: 'dezgo', name: 'dezgo', displayName: 'Dezgo', description: 'Dezgo image generation models' },
    { id: 'google', name: 'google', displayName: 'Google', description: 'Google Vertex AI image generation models' },
    { id: 'grok', name: 'grok', displayName: 'Grok', description: 'xAI Grok image generation models' }
];

async function seedProviders() {
    console.log('🌱 Seeding providers...');

    for (const provider of PROVIDERS) {
        await prisma.provider.upsert({
            where: { id: provider.id },
            update: {
                name: provider.name,
                displayName: provider.displayName,
                description: provider.description,
                isActive: true
            },
            create: provider
        });
        console.log(`  ✅ ${provider.displayName}`);
    }
}

async function seedModels() {
    console.log('\n🌱 Seeding models...');

    const models = getAllStaticModels();

    for (const model of models) {
        await prisma.model.upsert({
            where: { provider_name: { provider: model.provider, name: model.name } },
            update: {
                displayName: model.displayName,
                description: model.description,
                costPerImage: model.costPerImage,
                isActive: model.isActive,
                apiUrl: model.apiUrl,
                apiModel: model.apiModel,
                apiSize: model.apiSize
            },
            create: {
                provider: model.provider,
                name: model.name,
                displayName: model.displayName,
                description: model.description,
                costPerImage: model.costPerImage,
                isActive: model.isActive,
                apiUrl: model.apiUrl,
                apiModel: model.apiModel,
                apiSize: model.apiSize
            }
        });
        console.log(`  ✅ ${model.provider}/${model.name}`);
    }

    console.log(`\n✅ Seeded ${models.length} models across ${PROVIDERS.length} providers`);
}

async function main() {
    try {
        await seedProviders();
        await seedModels();
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exitCode = 1;
    } finally {
        await prisma.$disconnect();
    }
}

main();
