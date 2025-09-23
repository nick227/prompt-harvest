import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Enhanced logging with colors
function log(message, color = 'white') {
    const colors = {
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        bright: '\x1b[1m',
        reset: '\x1b[0m'
    };
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

// Embedded models data for fallback
function getEmbeddedModelsData() {
    return `provider,providerId,name,displayName,description,costPerImage,isActive,apiUrl,apiModel,apiSize
openai,openai-1,openai/dalle3,DALL-E 3,OpenAI's most advanced image generation model,0.08,true,https://api.openai.com/v1/images/generations,dall-e-3,1024x1024
openai,openai-2,openai/dalle2,DALL-E 2,OpenAI's reliable image generation model,0.02,true,https://api.openai.com/v1/images/generations,dall-e-2,1024x1024
google,google-1,google/imagen3,Imagen 3,Google's latest image generation model,0.05,true,https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/us-central1/publishers/google/models,imagen-3,1024x1024
dezgo,dezgo-1,dezgo/flux,Flux (Dezgo),High-quality image generation via Dezgo API,0.04,true,https://api.dezgo.com/flux,flux,1024x1024
dezgo,dezgo-2,dezgo/flux-dev,Flux Dev (Dezgo),Development version of Flux model,0.03,true,https://api.dezgo.com/flux,flux-dev,1024x1024
stability,stability-1,stability/sd3,Stable Diffusion 3,Stability AI's flagship model,0.06,true,https://api.stability.ai/v1/generation,stable-diffusion-3,1024x1024
stability,stability-2,stability/sd3-turbo,SD3 Turbo,Fast version of Stable Diffusion 3,0.04,true,https://api.stability.ai/v1/generation,stable-diffusion-3-turbo,1024x1024`;
}

// Essential word types for cache warmup
const essentialWordTypes = [
    { word: 'cat', types: ['noun', 'animal'] },
    { word: 'dog', types: ['noun', 'animal'] },
    { word: 'color', types: ['noun', 'attribute'] },
    { word: 'style', types: ['noun', 'attribute'] },
    { word: 'art', types: ['noun', 'concept'] },
    { word: 'lighting', types: ['noun', 'technical'] },
    { word: 'background', types: ['noun', 'composition'] },
    { word: 'portrait', types: ['noun', 'style'] },
    { word: 'landscape', types: ['noun', 'style'] },
    { word: 'digital', types: ['adjective', 'medium'] },
    { word: 'painting', types: ['noun', 'medium'] },
    { word: 'photography', types: ['noun', 'medium'] },
    { word: 'realistic', types: ['adjective', 'style'] },
    { word: 'abstract', types: ['adjective', 'style'] },
    { word: 'fantasy', types: ['adjective', 'style'] },
    { word: 'vintage', types: ['adjective', 'style'] },
    { word: 'modern', types: ['adjective', 'style'] },
    { word: 'minimalist', types: ['adjective', 'style'] },
    { word: 'detailed', types: ['adjective', 'quality'] },
    { word: 'high', types: ['adjective', 'quality'] }
];

async function optimizedModelMigration() {
    try {
        log('🚀 Starting optimized Railway migration...', 'bright');

        // Step 1: Check current state
        await checkCurrentState();

        // Step 2: Clean up questionable models (bulk operation)
        await cleanupQuestionableModels();

        // Step 3: Create providers (bulk operation)
        await createProvidersBulk();

        // Step 4: Import models (bulk operation)
        await importModelsBulk();

        // Step 5: Create essential word types (bulk operation)
        await createWordTypesBulk();

        // Step 6: Verify results
        await verifyResults();

        logSuccess('🎉 Optimized migration completed successfully!');

    } catch (error) {
        logError(`Migration failed: ${error.message}`);
        console.error(error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

async function checkCurrentState() {
    log('🔍 Checking current database state...', 'bright');

    const [modelCount, wordTypeCount] = await Promise.all([
        prisma.model.count(),
        prisma.wordType.count()
    ]);

    logInfo(`Current models: ${modelCount}`);
    logInfo(`Current word types: ${wordTypeCount}`);
}

async function cleanupQuestionableModels() {
    log('🧹 Cleaning up questionable models...', 'bright');

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
}

async function createProvidersBulk() {
    log('🏭 Creating providers in bulk...', 'bright');

    const providers = [
        { name: 'openai', displayName: 'OpenAI', description: 'OpenAI image generation services', isActive: true },
        { name: 'google', displayName: 'Google', description: 'Google AI image generation services', isActive: true },
        { name: 'dezgo', displayName: 'Dezgo', description: 'Dezgo API services', isActive: true },
        { name: 'stability', displayName: 'Stability AI', description: 'Stability AI services', isActive: true }
    ];

    // Use createMany with skipDuplicates for bulk creation
    const result = await prisma.provider.createMany({
        data: providers,
        skipDuplicates: true
    });

    logSuccess(`Created ${result.count} new providers`);
}

async function importModelsBulk() {
    log('🤖 Importing models in bulk...', 'bright');

    // Get model data
    const csvPath = path.join(process.cwd(), 'private', 'models-clean.csv');
    let csvContent;

    if (fs.existsSync(csvPath)) {
        csvContent = fs.readFileSync(csvPath, 'utf8');
        logInfo('Using CSV file for models data');
    } else {
        csvContent = getEmbeddedModelsData();
        logWarning('Using embedded models data');
    }

    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

    const models = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.replace(/"/g, ''));
        const modelData = {};

        headers.forEach((header, index) => {
            modelData[header] = values[index];
        });

        // Convert string values to appropriate types
        modelData.costPerImage = parseFloat(modelData.costPerImage) || 1.0;
        modelData.isActive = modelData.isActive === 'true';

        models.push({
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
        });
    }

    // Use createMany with skipDuplicates for bulk creation
    const result = await prisma.model.createMany({
        data: models,
        skipDuplicates: true
    });

    logSuccess(`Imported ${result.count} new models`);

    // Update existing models in bulk
    for (const model of models) {
        await prisma.model.updateMany({
            where: { name: model.name },
            data: {
                provider: model.provider,
                providerId: model.providerId,
                displayName: model.displayName,
                description: model.description,
                costPerImage: model.costPerImage,
                isActive: model.isActive,
                apiUrl: model.apiUrl,
                apiModel: model.apiModel,
                apiSize: model.apiSize,
                updatedAt: new Date()
            }
        });
    }

    logSuccess(`Updated existing models`);
}

async function createWordTypesBulk() {
    log('📚 Creating essential word types in bulk...', 'bright');

    const result = await prisma.wordType.createMany({
        data: essentialWordTypes.map(item => ({
            word: item.word,
            types: item.types
        })),
        skipDuplicates: true
    });

    logSuccess(`Created ${result.count} essential word types`);
}

async function verifyResults() {
    log('✅ Verifying migration results...', 'bright');

    const [modelCount, wordTypeCount, providerCount] = await Promise.all([
        prisma.model.count(),
        prisma.wordType.count(),
        prisma.provider.count()
    ]);

    logSuccess(`Final counts:`);
    logInfo(`  Models: ${modelCount}`);
    logInfo(`  Word Types: ${wordTypeCount}`);
    logInfo(`  Providers: ${providerCount}`);

    // Test word type cache warmup
    log('🔥 Testing word type cache warmup...', 'bright');

    const testWords = ['dog', 'cat', 'color', 'style', 'background'];
    for (const word of testWords) {
        const wordType = await prisma.wordType.findUnique({
            where: { word }
        });

        if (wordType) {
            logSuccess(`✅ Found types for "${word}": ${wordType.types.join(', ')}`);
        } else {
            logWarning(`⚠️ No types found for "${word}"`);
        }
    }
}

// Run the migration
optimizedModelMigration().catch(console.error);
