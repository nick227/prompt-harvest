/**
 * Auto-Generate Images CLI Script
 *
 * Generates images automatically from the server without API auth.
 * Uses direct backend services and database access.
 *
 * Usage:
 *   node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a beautiful landscape"
 *   node src/scripts/auto-generate-images.js --userId=1 --count=10 --providers=flux,dezgo
 *   node src/scripts/auto-generate-images.js --userId=1 --promptFile=prompts.txt
 *
 * Options:
 *   --userId       User ID to generate images for (required)
 *   --count        Number of images to generate (default: 1)
 *   --prompt       Single prompt to use for all generations
 *   --promptFile   File with prompts (one per line)
 *   --providers    Comma-separated list of providers to use (default: random)
 *   --guidance     Guidance value (default: 10)
 *   --dryRun       Preview without actually generating images
 *   --skipCredits  Skip credit validation and deduction (admin mode)
 *   --delay        Delay between generations in ms (default: 1000)
 */

/* eslint-disable no-console */

import { readFileSync } from 'fs';
import databaseClient from '../database/PrismaClient.js';
import generate from '../generate.js';
import { CreditManagementService } from '../services/credit/CreditManagementService.js';
import modelInterface from '../services/ModelInterface.js';

const prisma = databaseClient.getClient();

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

const parseArgs = () => {
    const args = {
        userId: null,
        count: 1,
        prompt: null,
        promptFile: null,
        providers: null,
        guidance: 10,
        dryRun: false,
        skipCredits: false,
        delay: 1000
    };

    process.argv.slice(2).forEach(arg => {
        const [key, value] = arg.replace(/^--/, '').split('=');

        switch (key) {
            case 'userId':
                args.userId = parseInt(value, 10);
                break;
            case 'count':
                args.count = parseInt(value, 10);
                break;
            case 'prompt':
                args.prompt = value;
                break;
            case 'promptFile':
                args.promptFile = value;
                break;
            case 'providers':
                args.providers = value.split(',').map(p => p.trim());
                break;
            case 'guidance':
                args.guidance = parseFloat(value);
                break;
            case 'dryRun':
                args.dryRun = true;
                break;
            case 'skipCredits':
                args.skipCredits = true;
                break;
            case 'delay':
                args.delay = parseInt(value, 10);
                break;
            default:
                console.warn(`⚠️  Unknown argument: ${key}`);
        }
    });

    return args;
};

const validateArgs = args => {
    const errors = [];

    if (!args.userId) {
        errors.push('--userId is required');
    }

    if (args.count < 1 || args.count > 100) {
        errors.push('--count must be between 1 and 100');
    }

    if (!args.prompt && !args.promptFile) {
        errors.push('Either --prompt or --promptFile is required');
    }

    if (args.prompt && args.promptFile) {
        errors.push('Cannot use both --prompt and --promptFile');
    }

    if (args.guidance < 0 || args.guidance > 20) {
        errors.push('--guidance must be between 0 and 20');
    }

    return errors;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const loadPromptsFromFile = filePath => {
    try {
        const content = readFileSync(filePath, 'utf-8');

        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    } catch (error) {
        throw new Error(`Failed to read prompt file: ${error.message}`);
    }
};

const getUserInfo = async userId => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            email: true,
            isAdmin: true,
            credits: true
        }
    });

    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    return user;
};

const getAvailableProviders = async() => {
    try {
        const models = await modelInterface.getModels();
        const providers = [...new Set(models.map(m => m.provider))];

        return providers;
    } catch (error) {
        console.warn('⚠️  Failed to fetch providers, using defaults:', error.message);

        return ['flux', 'dezgo', 'stability', 'pollinations'];
    }
};

const calculateGenerationCost = async(providers, skipCredits) => {
    if (skipCredits) {
        return 0;
    }

    try {
        const models = await modelInterface.getModels();
        const provider = Array.isArray(providers) ? providers[0] : 'flux';
        const model = models.find(m => m.provider === provider);

        return model?.cost || 1;
    } catch (error) {
        console.warn('⚠️  Failed to calculate cost, assuming 1 credit:', error.message);

        return 1;
    }
};

const checkCredits = async(userId, requiredCredits) => {
    const creditService = new CreditManagementService();
    const balance = await creditService.getUserCredits(userId);

    return {
        hasEnough: balance >= requiredCredits,
        current: balance,
        required: requiredCredits
    };
};

const formatDuration = ms => {
    if (ms < 1000) {
        return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }

    return `${seconds}s`;
};

// ============================================================================
// IMAGE GENERATION
// ============================================================================

const generateImage = async options => {
    const { prompt, providers, guidance, userId, skipCredits } = options;

    const mockReq = {
        user: { id: userId },
        body: {
            prompt,
            providers: providers || [],
            guidance,
            skipCreditCheck: skipCredits
        }
    };

    const result = await generate({
        prompt,
        original: prompt,
        promptId: null,
        providers: providers || [],
        guidance,
        req: mockReq
    });

    return result;
};

const processGeneration = async(prompt, args, imageNum, totalImages) => {
    console.log(`[${imageNum}/${totalImages}] Generating: ${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`);

    try {
        const imageStartTime = Date.now();
        const result = await generateImage({
            prompt,
            providers: args.providers,
            guidance: args.guidance,
            userId: args.userId,
            skipCredits: args.skipCredits
        });

        const duration = Date.now() - imageStartTime;

        if (result.success) {
            console.log(`   ✅ Success (${formatDuration(duration)}) - Provider: ${result.provider || 'unknown'}`);

            return {
                success: true,
                data: {
                    prompt,
                    imageId: result.imageId,
                    provider: result.provider,
                    duration
                }
            };
        }

        console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);

        return {
            success: false,
            error: {
                prompt,
                error: result.error || 'Unknown error'
            }
        };
    } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);

        return {
            success: false,
            error: {
                prompt,
                error: error.message
            }
        };
    }
};

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

const displayHeader = () => {
    console.log('🎨 AUTO-GENERATE IMAGES\n');
    console.log('========================\n');
};

const displayUserInfo = user => {
    console.log('👤 Fetching user info...');
    console.log(`   User: ${user.username} (${user.email})`);
    console.log(`   Admin: ${user.isAdmin ? 'Yes' : 'No'}`);
    console.log(`   Credits: ${user.credits}\n`);
};

const displayProviderValidation = (requestedProviders, availableProviders) => {
    const invalidProviders = requestedProviders.filter(p => !availableProviders.includes(p));

    if (invalidProviders.length > 0) {
        console.warn(`⚠️  Invalid providers: ${invalidProviders.join(', ')}`);
        console.warn(`   Available: ${availableProviders.join(', ')}\n`);
    }
};

const displayGenerationPlan = (promptsCount, providers, guidance, costPerImage) => {
    console.log('📊 Generation Plan:');
    console.log(`   Images to generate: ${promptsCount}`);
    console.log(`   Providers: ${providers ? providers.join(', ') : 'random'}`);
    console.log(`   Guidance: ${guidance}`);
    console.log(`   Cost per image: ${costPerImage} credits`);
    console.log(`   Total cost: ${promptsCount * costPerImage} credits\n`);
};

const displayCreditCheck = (creditCheck, skipCredits) => {
    if (!skipCredits) {
        console.log('💰 Credit Check:');
        console.log(`   Current balance: ${creditCheck.current} credits`);
        console.log(`   Required: ${creditCheck.required} credits`);

        if (!creditCheck.hasEnough) {
            console.error('\n❌ Insufficient credits!');
            console.error(`   Shortfall: ${creditCheck.required - creditCheck.current} credits`);
            console.error('\n💡 Use --skipCredits to bypass credit checks (admin only)\n');

            return false;
        }

        console.log('   ✅ Sufficient credits available\n');
    } else {
        console.log('⚠️  Credit checks skipped (admin mode)\n');
    }

    return true;
};

const displayDryRun = prompts => {
    console.log('🔍 DRY RUN MODE - No images will be generated\n');
    console.log('Sample prompts:');
    prompts.slice(0, 5).forEach((prompt, i) => {
        console.log(`   ${i + 1}. ${prompt.substring(0, 60)}${prompt.length > 60 ? '...' : ''}`);
    });

    if (prompts.length > 5) {
        console.log(`   ... and ${prompts.length - 5} more\n`);
    }

    console.log('✅ Dry run complete - everything looks good!\n');
};

const displaySummary = (results, prompts) => {
    const totalDuration = Date.now() - results.startTime;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 GENERATION SUMMARY\n');
    console.log(`   Total images: ${prompts.length}`);
    console.log(`   ✅ Successful: ${results.success.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   ⏱️  Total time: ${formatDuration(totalDuration)}`);

    if (results.success.length > 0) {
        const avgDuration = results.success.reduce((sum, r) => sum + r.duration, 0) / results.success.length;

        console.log(`   📈 Avg per image: ${formatDuration(avgDuration)}`);
    }

    console.log('');
};

const displayFailedPrompts = failures => {
    if (failures.length === 0) {
        return;
    }

    console.log('❌ Failed prompts:\n');
    failures.forEach((failure, i) => {
        console.log(`   ${i + 1}. ${failure.prompt.substring(0, 50)}${failure.prompt.length > 50 ? '...' : ''}`);
        console.log(`      Error: ${failure.error}\n`);
    });
};

const displayProviderBreakdown = successes => {
    if (successes.length === 0) {
        return;
    }

    const providerCounts = {};

    successes.forEach(r => {
        const provider = r.provider || 'unknown';

        providerCounts[provider] = (providerCounts[provider] || 0) + 1;
    });

    console.log('🎯 Provider breakdown:');
    Object.entries(providerCounts).forEach(([provider, count]) => {
        console.log(`   ${provider}: ${count} images`);
    });
    console.log('');
};

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const runGenerations = async(prompts, args) => {
    console.log('🚀 Starting generation...\n');

    const results = {
        success: [],
        failed: [],
        startTime: Date.now()
    };

    for (let i = 0; i < prompts.length; i++) {
        const result = await processGeneration(prompts[i], args, i + 1, prompts.length);

        if (result.success) {
            results.success.push(result.data);
        } else {
            results.failed.push(result.error);
        }

        // Delay between generations (except last one)
        if (i < prompts.length - 1 && args.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, args.delay));
        }

        console.log('');
    }

    return results;
};

const preparePrompts = (args, promptFile) => {
    if (promptFile) {
        console.log(`📄 Loading prompts from: ${promptFile}`);
        const prompts = loadPromptsFromFile(promptFile);

        console.log(`   Loaded ${prompts.length} prompts\n`);

        return prompts;
    }

    return Array(args.count).fill(args.prompt);
};

const validateAndCheckCredits = async(args, prompts) => {
    const costPerImage = await calculateGenerationCost(args.providers, args.skipCredits);

    displayGenerationPlan(prompts.length, args.providers, args.guidance, costPerImage);

    const creditCheck = await checkCredits(args.userId, prompts.length * costPerImage);
    const hasCredits = displayCreditCheck(creditCheck, args.skipCredits);

    return hasCredits;
};

const executeScript = async args => {
    const user = await getUserInfo(args.userId);

    displayUserInfo(user);

    const availableProviders = await getAvailableProviders();

    if (args.providers) {
        displayProviderValidation(args.providers, availableProviders);
    }

    const prompts = preparePrompts(args, args.promptFile);
    const hasCredits = await validateAndCheckCredits(args, prompts);

    if (!hasCredits) {
        process.exit(1);
    }

    if (args.dryRun) {
        displayDryRun(prompts);

        return;
    }

    const results = await runGenerations(prompts, args);

    displaySummary(results, prompts);
    displayFailedPrompts(results.failed);
    displayProviderBreakdown(results.success);

    console.log('✅ Auto-generation complete!\n');

    if (!args.skipCredits) {
        const finalUser = await getUserInfo(args.userId);

        console.log(`💰 Final credit balance: ${finalUser.credits} credits\n`);
    }
};

const main = async() => {
    displayHeader();

    const args = parseArgs();
    const errors = validateArgs(args);

    if (errors.length > 0) {
        console.error('❌ Validation errors:\n');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error('\n💡 Usage examples:');
        console.error('   node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a cat"');
        console.error('   node src/scripts/auto-generate-images.js --userId=1 --promptFile=prompts.txt\n');
        process.exit(1);
    }

    try {
        await executeScript(args);
    } catch (error) {
        console.error('\n❌ SCRIPT FAILED:', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        console.error('');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

// Run the script
main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
});
