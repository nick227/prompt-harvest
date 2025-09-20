#!/usr/bin/env node

/**
 * Railway Service Migration Script
 *
 * This script is designed to run as a Railway service
 * and will automatically migrate models on startup.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️ ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️ ${message}`, 'blue');
}

async function checkAndMigrateModels() {
    try {
        log('🔍 Checking models database...', 'bright');

        // Check if migration is needed
        const currentCount = await prisma.model.count();
        logInfo(`Current models in database: ${currentCount}`);

        // Check if we have questionable models
        const questionableModels = await prisma.model.findMany({
            where: {
                OR: [
                    { providerId: null },
                    { name: 'flux-dev' },
                    { name: 'flux-pro' },
                    { name: 'imagen3' },
                    { name: 'sd3' },
                    { name: 'sd3-turbo' },
                    { provider: 'flux' },
                    { provider: 'stability' }
                ]
            },
            select: {
                id: true,
                name: true,
                provider: true
            }
        });

        if (questionableModels.length === 0) {
            logSuccess('✅ Models database is already clean - no migration needed');
            return;
        }

        logWarning(`Found ${questionableModels.length} questionable models that need migration`);

        // Run the migration
        await runMigration();

    } catch (error) {
        logError(`❌ Migration check failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

async function runMigration() {
    try {
        log('🚀 Starting models migration...', 'bright');

        // Step 1: Remove questionable models
        const deleteResult = await prisma.model.deleteMany({
            where: {
                OR: [
                    { providerId: null },
                    { name: 'flux-dev' },
                    { name: 'flux-pro' },
                    { name: 'imagen3' },
                    { name: 'sd3' },
                    { name: 'sd3-turbo' },
                    { provider: 'flux' },
                    { provider: 'stability' }
                ]
            }
        });

        logSuccess(`Removed ${deleteResult.count} questionable models`);

        // Step 2: Create providers first (if they don't exist)
        await createProvidersIfNeeded();

        // Step 3: Import clean models
        const csvPath = path.join(process.cwd(), 'private', 'models-clean.csv');

        // Debug: List available files
        logInfo(`Current working directory: ${process.cwd()}`);
        logInfo(`Looking for CSV at: ${csvPath}`);

        // Check if private directory exists
        const privateDir = path.join(process.cwd(), 'private');
        if (fs.existsSync(privateDir)) {
            const files = fs.readdirSync(privateDir);
            logInfo(`Files in private directory: ${files.join(', ')}`);
        } else {
            logWarning('Private directory does not exist');
        }

        let csvContent;
        if (fs.existsSync(csvPath)) {
            logInfo('Using CSV file for models data');
            csvContent = fs.readFileSync(csvPath, 'utf8');
        } else {
            logWarning('CSV file not found, using embedded models data');
            csvContent = getEmbeddedModelsData();
        }

        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
            const modelData = {};

            headers.forEach((header, index) => {
                let value = values[index];

                if (header === 'costPerImage') {
                    value = parseFloat(value) || 1;
                } else if (header === 'isActive') {
                    value = value === '1' || value === 'true';
                } else if (header === 'createdAt' || header === 'updatedAt') {
                    value = new Date(value);
                }

                modelData[header] = value;
            });

            try {
                // Check if model already exists
                const existing = await prisma.model.findFirst({
                    where: { name: modelData.name }
                });

                if (existing) {
                    // Update existing model
                    await prisma.model.update({
                        where: { id: existing.id },
                        data: {
                            provider: modelData.provider,
                            providerId: modelData.providerId,
                            displayName: modelData.displayName,
                            description: modelData.description,
                            costPerImage: modelData.costPerImage,
                            isActive: modelData.isActive,
                            apiUrl: modelData.apiUrl,
                            apiModel: modelData.apiModel,
                            apiSize: modelData.apiSize,
                            updatedAt: new Date()
                        }
                    });
                } else {
                    // Create new model
                    await prisma.model.create({
                        data: {
                            provider: modelData.provider,
                            providerId: modelData.providerId,
                            name: modelData.name,
                            displayName: modelData.displayName,
                            description: modelData.description,
                            costPerImage: modelData.costPerImage,
                            isActive: modelData.isActive,
                            apiUrl: modelData.apiUrl,
                            apiModel: modelData.apiModel,
                            apiSize: modelData.apiSize
                        }
                    });
                }
                importedCount++;
            } catch (error) {
                logError(`Failed to import ${modelData.name}: ${error.message}`);
            }
        }

        // Step 3: Verify results
        const finalCount = await prisma.model.count();
        const finalModels = await prisma.model.findMany({
            select: {
                name: true,
                provider: true,
                isActive: true
            },
            orderBy: [
                { provider: 'asc' },
                { name: 'asc' }
            ]
        });

        logSuccess(`✅ Migration completed successfully!`);
        logSuccess(`Final models count: ${finalCount}`);
        logSuccess(`Imported: ${importedCount}`);

        const providers = [...new Set(finalModels.map(m => m.provider))];
        logInfo(`Active providers: ${providers.join(', ')}`);

    } catch (error) {
        logError(`❌ Migration failed: ${error.message}`);
        throw error;
    }
}

// Create providers if they don't exist
async function createProvidersIfNeeded() {
    const providers = [
        { name: 'openai', displayName: 'OpenAI', description: 'OpenAI image generation models' },
        { name: 'dezgo', displayName: 'Dezgo', description: 'Dezgo image generation models' },
        { name: 'google', displayName: 'Google', description: 'Google Vertex AI image generation models' }
    ];

    for (const providerData of providers) {
        try {
            const existing = await prisma.provider.findFirst({
                where: { name: providerData.name }
            });

            if (!existing) {
                await prisma.provider.create({
                    data: {
                        id: providerData.name, // Use name as ID for consistency
                        name: providerData.name,
                        displayName: providerData.displayName,
                        description: providerData.description,
                        isActive: true
                    }
                });
                logSuccess(`Created provider: ${providerData.name}`);
            } else {
                logInfo(`Provider already exists: ${providerData.name}`);
            }
        } catch (error) {
            logError(`Failed to create provider ${providerData.name}: ${error.message}`);
        }
    }
}

// Embedded models data as fallback
function getEmbeddedModelsData() {
    return `"id","provider","providerId","name","displayName","description","costPerImage","isActive","apiUrl","apiModel","apiSize","createdAt","updatedAt"
"cmfnpfhka0000utewqz82gawe","openai","openai","dalle3","DALL-E 3","OpenAI DALL-E 3 image generation model","1","1","https://api.openai.com/v1/images/generations","dall-e-3","1024x1024","2025-09-17 08:13:00.203","2025-09-18 08:35:56.160"
"cmfnpfhkd0001utew9ev9vqbf","openai","openai","dalle2","DALL-E 2","OpenAI DALL-E 2 image generation model","1","1","https://api.openai.com/v1/images/generations","dall-e-2","1024x1024","2025-09-17 08:13:00.205","2025-09-18 08:35:56.164"
"cmfnpfhkf0002utew5x2xdv2h","dezgo","dezgo","flux","Flux","Flux 1.0 Schnell model for fast image generation","1","1","https://api.dezgo.com/text2image_flux","flux_1_schnell","1024x1024","2025-09-17 08:13:00.207","2025-09-18 08:35:56.166"
"cmfnpfhkg0003utew8x9xvq3i","dezgo","dezgo","juggernaut","Juggernaut XL","Juggernaut XL SDXL model for high-quality images","0.5","1","https://api.dezgo.com/text2image_sdxl","juggernautxl_v8_rdphoto_beta","1024x1024","2025-09-17 08:13:00.209","2025-09-18 08:35:56.168"
"cmfnpfhkh0004utew2x3xvq4j","dezgo","dezgo","juggernautReborn","Juggernaut Reborn","Juggernaut Reborn SDXL model","0.5","1","https://api.dezgo.com/text2image_sdxl","juggernautxl_reborn","1024x1024","2025-09-17 08:13:00.211","2025-09-18 08:35:56.170"
"cmfnpfhki0005utew6x7xvq5k","dezgo","dezgo","redshift","Red Shift","Red Shift SDXL model for artistic images","0.5","1","https://api.dezgo.com/text2image_sdxl","redshift_diffusion_v2","1024x1024","2025-09-17 08:13:00.213","2025-09-18 08:35:56.172"
"cmfnpfhkn0006utewiclm3v9j","dezgo","dezgo","absolute","Absolute Reality","Absolute Reality 1.8.1 photorealistic model","1","1","https://api.dezgo.com/text2image","absolute_reality_1_8_1","1024x1024","2025-09-17 08:13:00.215","2025-09-18 08:35:56.189"
"cmfnpfhko0007utewjclm4v9k","dezgo","dezgo","realisticvision","Realistic Vision","Realistic Vision 6.0 B1 photorealistic model","1","1","https://api.dezgo.com/text2image","realistic_vision_v6_b1","1024x1024","2025-09-17 08:13:00.217","2025-09-18 08:35:56.191"
"cmfnpfhkp0008utewkclm5v9l","dezgo","dezgo","icbinp","Icbinp","Icbinp realistic model","1","1","https://api.dezgo.com/text2image","icbinp","1024x1024","2025-09-17 08:13:00.219","2025-09-18 08:35:56.193"
"cmfnpfhkq0009utewlclm6v9m","dezgo","dezgo","icbinp_seco","Icbinp Seco","Icbinp Seco realistic model","1","1","https://api.dezgo.com/text2image","icbinp_seco","1024x1024","2025-09-17 08:13:00.221","2025-09-18 08:35:56.195"
"cmfnpfhkr000autewmclm7v9n","dezgo","dezgo","hasdx","Hasdx","Hasdx photorealistic model","1","1","https://api.dezgo.com/text2image","hasdx","1024x1024","2025-09-17 08:13:00.223","2025-09-18 08:35:56.197"
"cmfnpfhks000butewnclm8v9o","dezgo","dezgo","dreamshaper","Dreamshaper XL","Dreamshaper XL SDXL model for creative images","0.5","1","https://api.dezgo.com/text2image_sdxl","dreamshaperxl_1024px","1024x1024","2025-09-17 08:13:00.225","2025-09-18 08:35:56.199"
"cmfnpfhkt000cutewoclm9v9p","dezgo","dezgo","dreamshaperLighting","Dreamshaper Lightning","Dreamshaper XL Lightning model for fast generation","0.5","1","https://api.dezgo.com/text2image_sdxl_lightning","dreamshaperxl_lightning_1024px","1024x1024","2025-09-17 08:13:00.227","2025-09-18 08:35:56.201"
"cmfnpfhku000dutewpclmav9q","dezgo","dezgo","nightmareshaper","Nightmare Shaper","Nightmare Shaper dark artistic model","1","1","https://api.dezgo.com/text2image","nightmareshaper","1024x1024","2025-09-17 08:13:00.229","2025-09-18 08:35:56.203"
"cmfnpfhkv000eutewqclmbv9r","dezgo","dezgo","openjourney","Open Journey","Open Journey 2 artistic model","1","1","https://api.dezgo.com/text2image","openjourney_2","1024x1024","2025-09-17 08:13:00.231","2025-09-18 08:35:56.205"
"cmfnpfhkw000futewrclmcv9s","dezgo","dezgo","analogmadness","Analog Madness","Analog Madness 7 artistic model","1","1","https://api.dezgo.com/text2image","analogmadness_7","1024x1024","2025-09-17 08:13:00.233","2025-09-18 08:35:56.207"
"cmfnpfhkx000gutewsclmdv9t","dezgo","dezgo","portraitplus","Portrait Plus","Portrait Plus model for portrait generation","1","1","https://api.dezgo.com/text2image","portrait_plus","1024x1024","2025-09-17 08:13:00.235","2025-09-18 08:35:56.209"
"cmfnpfhky000hutewtclmev9u","dezgo","dezgo","tshirt","T-Shirt Design","T-Shirt Design SDXL model for clothing designs","0.5","1","https://api.dezgo.com/text2image_sdxl","tshirtdesignredmond_1024px","1024x1024","2025-09-17 08:13:00.237","2025-09-18 08:35:56.211"
"cmfnpfhkz000iutewuclmfv9v","dezgo","dezgo","abyssorange","Abyss Orange","Abyss Orange Mix 2 artistic model","1","1","https://api.dezgo.com/text2image","abyss_orange_mix_2","1024x1024","2025-09-17 08:13:00.239","2025-09-18 08:35:56.213"
"cmfnpfhl0000jutewvclmgv9w","dezgo","dezgo","cyber","Cyber Real","Cyber Realistic 3.1 futuristic model","1","1","https://api.dezgo.com/text2image","cyberrealistic_3_1","1024x1024","2025-09-17 08:13:00.241","2025-09-18 08:35:56.215"
"cmfnpfhl1000kutewwclmhv9x","dezgo","dezgo","disco","Disco","Disco Diffusion style artistic model","1","1","https://api.dezgo.com/text2image","disco_diffusion_style","1024x1024","2025-09-17 08:13:00.243","2025-09-18 08:35:56.217"
"cmfnpfhl2000lutewxclmiv9y","dezgo","dezgo","synthwave","Synthwave","Synthwave Punk V2 retro model","1","1","https://api.dezgo.com/text2image","synthwavepunk_v2","1024x1024","2025-09-17 08:13:00.245","2025-09-18 08:35:56.219"
"cmfnpfhl3000mutewyclmjv9z","dezgo","dezgo","lowpoly","Low Poly","Low Poly World geometric model","1","1","https://api.dezgo.com/text2image","lowpoly_world","1024x1024","2025-09-17 08:13:00.247","2025-09-18 08:35:56.221"
"cmfnpfhl4000nutewzclmkva0","dezgo","dezgo","bluepencil","Blue Pencil XL","Blue Pencil XL SDXL model for artistic images","0.5","1","https://api.dezgo.com/text2image_sdxl","bluepencilxl_1024px","1024x1024","2025-09-17 08:13:00.249","2025-09-18 08:35:56.223"
"cmfnpfhl5000outew0clmlva1","dezgo","dezgo","ink","Ink Punk","Ink Punk Diffusion artistic model","1","1","https://api.dezgo.com/text2image","inkpunk_diffusion","1024x1024","2025-09-17 08:13:00.251","2025-09-18 08:35:56.225"
"cmfnpfhl6000puteew1clmmva2","google","google","nanoBanana","Google Imagen 3","Google Imagen 3 high-quality image generation model via Vertex AI","0.75","1","https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict","imagen-3.0-generate-001","1024x1024","2025-09-17 08:13:00.253","2025-09-18 08:35:56.227"`;
}

// Run the migration check
checkAndMigrateModels();
