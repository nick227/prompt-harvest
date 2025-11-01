/**
 * Auto-Generate Images CLI Script
 *
 * Generates images automatically from the server without API auth.
 * Uses direct backend services and database access.
 *
 * Usage:
 *   node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a beautiful landscape"
 *   node src/scripts/auto-generate-images.js --userId=1 --promptFile=prompts.txt --providers=flux,dezgo
 */

/* eslint-disable no-console */

import { readFileSync } from 'fs';
import databaseClient from '../database/PrismaClient.js';
import generate from '../generate.js';
import { CreditManagementService } from '../services/credit/CreditManagementService.js';
import modelInterface from '../services/ModelInterface.js';

const prisma = databaseClient.getClient();

// ============================================================================
// HELPERS
// ============================================================================

const truncate = (str, maxLen = 50) => (
    str.length > maxLen ? `${str.substring(0, maxLen)}...` : str
);

const formatDuration = ms => {
    if (ms < 1000) {
        return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);

    return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
};

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

        if (key === 'userId') {
            args.userId = parseInt(value, 10);
        } else if (key === 'count') {
            args.count = parseInt(value, 10);
        } else if (key === 'prompt') {
            args.prompt = value;
        } else if (key === 'promptFile') {
            args.promptFile = value;
        } else if (key === 'providers') {
            args.providers = value.split(',').map(p => p.trim());
        } else if (key === 'guidance') {
            args.guidance = parseFloat(value);
        } else if (key === 'dryRun') {
            args.dryRun = true;
        } else if (key === 'skipCredits') {
            args.skipCredits = true;
        } else if (key === 'delay') {
            args.delay = parseInt(value, 10);
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
// DATA FETCHING
// ============================================================================

const loadPrompts = args => {
    if (args.promptFile) {
        const content = readFileSync(args.promptFile, 'utf-8');

        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
    }

    return Array(args.count).fill(args.prompt);
};

const getUserInfo = async userId => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, email: true, isAdmin: true, credits: true }
    });

    if (!user) {
        throw new Error(`User with ID ${userId} not found`);
    }

    return user;
};

const getProviders = async() => {
    try {
        const models = await modelInterface.getModels();

        return [...new Set(models.map(m => m.provider))];
    } catch {
        return ['flux', 'dezgo', 'stability', 'pollinations'];
    }
};

const calculateCost = async(providers, skipCredits) => {
    if (skipCredits) {
        return 0;
    }

    try {
        const models = await modelInterface.getModels();
        const provider = Array.isArray(providers) ? providers[0] : 'flux';
        const model = models.find(m => m.provider === provider);

        return model?.cost || 1;
    } catch {
        return 1;
    }
};

const validateCredits = async(userId, required) => {
    const creditService = new CreditManagementService();
    const balance = await creditService.getUserCredits(userId);

    return { hasEnough: balance >= required, current: balance, required };
};

// ============================================================================
// IMAGE GENERATION
// ============================================================================

const generateImage = async({ prompt, providers, guidance, userId, skipCredits }) => {
    const mockReq = {
        user: { id: userId },
        body: { prompt, providers: providers || [], guidance, skipCreditCheck: skipCredits }
    };

    return await generate({
        prompt,
        original: prompt,
        promptId: null,
        providers: providers || [],
        guidance,
        req: mockReq
    });
};

const generateBatch = async(prompts, args) => {
    const results = { success: [], failed: [], startTime: Date.now() };

    for (let i = 0; i < prompts.length; i++) {
        console.log(`[${i + 1}/${prompts.length}] Generating: ${truncate(prompts[i])}`);

        try {
            const startTime = Date.now();
            const result = await generateImage({
                prompt: prompts[i],
                providers: args.providers,
                guidance: args.guidance,
                userId: args.userId,
                skipCredits: args.skipCredits
            });
            const duration = Date.now() - startTime;

            if (result.success) {
                const provider = result.provider || 'unknown';

                console.log(`   ✅ Success (${formatDuration(duration)}) - ${provider}`);
                results.success.push({
                    prompt: prompts[i],
                    imageId: result.imageId,
                    provider: result.provider,
                    duration
                });
            } else {
                console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
                results.failed.push({ prompt: prompts[i], error: result.error || 'Unknown error' });
            }
        } catch (error) {
            console.log(`   ❌ Failed: ${error.message}`);
            results.failed.push({ prompt: prompts[i], error: error.message });
        }

        if (i < prompts.length - 1 && args.delay > 0) {
            await new Promise(resolve => setTimeout(resolve, args.delay));
        }

        console.log('');
    }

    return results;
};

// ============================================================================
// OUTPUT
// ============================================================================

const logPlan = options => {
    const { user, prompts, providers, guidance, costPerImage, creditCheck, skipCredits } = options;

    console.log('🎨 AUTO-GENERATE IMAGES\n========================\n');
    console.log(`👤 User: ${user.username} (${user.email}) - ${user.isAdmin ? 'Admin' : 'User'}`);
    console.log(`   Credits: ${user.credits}\n`);

    console.log('📊 Plan:');
    console.log(`   Images: ${prompts.length}`);
    console.log(`   Providers: ${providers ? providers.join(', ') : 'random'}`);
    console.log(`   Guidance: ${guidance}`);
    const totalCost = prompts.length * costPerImage;

    console.log(`   Cost: ${costPerImage} credits/image (${totalCost} total)\n`);

    if (!skipCredits) {
        const status = creditCheck.hasEnough ? '✅ Sufficient' : '❌ Insufficient';

        console.log(`💰 Credits: ${creditCheck.current} available, ${creditCheck.required} required`);
        console.log(`   ${status}\n`);
    } else {
        console.log('⚠️  Credits: Skipped (admin mode)\n');
    }
};

const logDryRun = prompts => {
    console.log('🔍 DRY RUN - Preview:\n');
    prompts.slice(0, 5).forEach((p, i) => console.log(`   ${i + 1}. ${truncate(p, 60)}`));
    if (prompts.length > 5) {
        console.log(`   ... and ${prompts.length - 5} more`);
    }
    console.log('\n✅ Dry run complete!\n');
};

const logResults = (results, prompts, skipCredits, finalCredits) => {
    const totalDuration = Date.now() - results.startTime;
    const avgDuration = results.success.length > 0
        ? results.success.reduce((sum, r) => sum + r.duration, 0) / results.success.length
        : 0;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📊 SUMMARY\n');
    console.log(`   Total: ${prompts.length} | ✅ ${results.success.length} | ❌ ${results.failed.length}`);
    console.log(`   Time: ${formatDuration(totalDuration)} total, ${formatDuration(avgDuration)} avg\n`);

    if (results.failed.length > 0) {
        console.log('❌ Failed:\n');
        results.failed.forEach((f, i) => {
            console.log(`   ${i + 1}. ${truncate(f.prompt)}`);
            console.log(`      ${f.error}\n`);
        });
    }

    if (results.success.length > 0) {
        const providers = {};

        results.success.forEach(r => {
            const p = r.provider || 'unknown';

            providers[p] = (providers[p] || 0) + 1;
        });
        console.log('🎯 Providers:');
        Object.entries(providers).forEach(([p, count]) => console.log(`   ${p}: ${count}`));
        console.log('');
    }

    console.log('✅ Complete!\n');
    if (!skipCredits) {
        console.log(`💰 Final balance: ${finalCredits} credits\n`);
    }
};

// ============================================================================
// MAIN
// ============================================================================

const setupAndValidate = async args => {
    const user = await getUserInfo(args.userId);
    const prompts = loadPrompts(args);
    const availableProviders = await getProviders();
    const costPerImage = await calculateCost(args.providers, args.skipCredits);
    const creditCheck = await validateCredits(args.userId, prompts.length * costPerImage);

    return { user, prompts, availableProviders, costPerImage, creditCheck };
};

const validateProviders = (requestedProviders, availableProviders) => {
    if (!requestedProviders) {
        return;
    }

    const invalid = requestedProviders.filter(p => !availableProviders.includes(p));

    if (invalid.length > 0) {
        console.warn(`⚠️  Invalid: ${invalid.join(', ')}`);
        console.warn(`   Available: ${availableProviders.join(', ')}\n`);
    }
};

const checkSufficientCredits = (creditCheck, skipCredits) => {
    if (!skipCredits && !creditCheck.hasEnough) {
        const shortfall = creditCheck.required - creditCheck.current;

        console.error(`❌ Shortfall: ${shortfall} credits`);
        console.error('💡 Use --skipCredits to bypass (admin only)\n');
        process.exit(1);
    }
};

const runGeneration = async(prompts, args) => {
    console.log('🚀 Starting...\n');
    const results = await generateBatch(prompts, args);
    const finalUser = args.skipCredits ? null : await getUserInfo(args.userId);

    logResults(results, prompts, args.skipCredits, finalUser?.credits);
};

const main = async() => {
    const args = parseArgs();
    const errors = validateArgs(args);

    if (errors.length > 0) {
        console.error('❌ Errors:\n');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\n💡 Example: node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a cat"\n');
        process.exit(1);
    }

    try {
        const { user, prompts, availableProviders, costPerImage, creditCheck } = await setupAndValidate(args);

        validateProviders(args.providers, availableProviders);

        logPlan({
            user,
            prompts,
            providers: args.providers,
            guidance: args.guidance,
            costPerImage,
            creditCheck,
            skipCredits: args.skipCredits
        });

        checkSufficientCredits(creditCheck, args.skipCredits);

        if (args.dryRun) {
            logDryRun(prompts);

            return;
        }

        await runGeneration(prompts, args);

    } catch (error) {
        console.error('\n❌ FAILED:', error.message);
        console.error(error.stack, '\n');
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

main().catch(error => {
    console.error('❌ Unhandled:', error);
    process.exit(1);
});
