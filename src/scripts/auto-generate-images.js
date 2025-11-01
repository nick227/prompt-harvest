/**
 * Image Auto-Generator
 *
 * Generates images automatically from the server without API auth.
 * Can be used both programmatically and via CLI.
 *
 * Programmatic Usage:
 *   import { ImageAutoGenerator } from './auto-generate-images.js';
 *   const generator = new ImageAutoGenerator({ userId: 1 });
 *   const results = await generator.generate({ prompts: ['a cat', 'a dog'], skipCredits: true });
 *
 * CLI Usage:
 *   node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a cat"
 *   node src/scripts/auto-generate-images.js --userId=1 --promptFile=prompts.txt
 */

/* eslint-disable no-console */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import databaseClient from '../database/PrismaClient.js';
import generate from '../generate.js';
import { CreditManagementService } from '../services/credit/CreditManagementService.js';
import modelInterface from '../services/ModelInterface.js';

const prisma = databaseClient.getClient();

// ============================================================================
// CORE IMAGE AUTO-GENERATOR CLASS
// ============================================================================

/**
 * @class ImageAutoGenerator
 * @description Core class for automated image generation
 */
export class ImageAutoGenerator {
    constructor(options = {}) {
        this.userId = options.userId;
        this.providers = options.providers || null;
        this.guidance = options.guidance ?? 10;
        this.skipCredits = options.skipCredits ?? false;
        this.delay = options.delay ?? 1000;
        this.silent = options.silent ?? false;
        this.creditService = new CreditManagementService();
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================

    /**
     * Generate images from prompts
     * @param {Object} options - Generation options
     * @param {string[]} options.prompts - Array of prompts
     * @param {string[]} [options.providers] - Override providers
     * @param {number} [options.guidance] - Override guidance
     * @param {boolean} [options.skipCredits] - Override credit check
     * @param {number} [options.delay] - Override delay between generations
     * @returns {Promise<Object>} Results with success/failed arrays
     */
    async generate(options) {
        const prompts = options.prompts || [];
        const providers = options.providers || this.providers;
        const guidance = options.guidance ?? this.guidance;
        const skipCredits = options.skipCredits ?? this.skipCredits;
        const delay = options.delay ?? this.delay;

        if (!this.userId) {
            throw new Error('userId is required');
        }
        if (!prompts.length) {
            throw new Error('prompts array cannot be empty');
        }

        // Validate user and credits
        const user = await this._getUserInfo(this.userId);
        const costPerImage = await this._calculateCost(providers, skipCredits);
        const totalCost = prompts.length * costPerImage;

        if (!skipCredits) {
            const creditCheck = await this._validateCredits(this.userId, totalCost);

            if (!creditCheck.hasEnough) {
                throw new Error(
                    `Insufficient credits: need ${creditCheck.required}, have ${creditCheck.current}`
                );
            }
        }

        // Generate images
        const results = await this._generateBatch(prompts, {
            providers,
            guidance,
            skipCredits,
            delay
        });

        return {
            ...results,
            user,
            totalCost,
            finalCredits: skipCredits ? null : (await this._getUserInfo(this.userId)).credits
        };
    }

    /**
     * Get user information
     * @returns {Promise<Object>} User details
     */
    async getUserInfo() {
        return await this._getUserInfo(this.userId);
    }

    /**
     * Get available providers
     * @returns {Promise<string[]>} Provider names
     */
    async getProviders() {
        return await this._getProviders();
    }

    /**
     * Calculate generation cost
     * @param {number} imageCount - Number of images
     * @returns {Promise<number>} Total cost in credits
     */
    async calculateCost(imageCount) {
        const costPerImage = await this._calculateCost(this.providers, this.skipCredits);

        return costPerImage * imageCount;
    }

    /**
     * Validate if user has sufficient credits
     * @param {number} imageCount - Number of images
     * @returns {Promise<Object>} Credit check result
     */
    async checkCredits(imageCount) {
        const totalCost = await this.calculateCost(imageCount);

        return await this._validateCredits(this.userId, totalCost);
    }

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    async _getUserInfo(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, username: true, email: true, isAdmin: true, credits: true }
        });

        if (!user) {
            throw new Error(`User with ID ${userId} not found`);
        }

        return user;
    }

    async _getProviders() {
        try {
            const models = await modelInterface.getModels();

            return [...new Set(models.map(m => m.provider))];
        } catch {
            return ['flux', 'dezgo', 'stability', 'pollinations'];
        }
    }

    async _calculateCost(providers, skipCredits) {
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
    }

    async _validateCredits(userId, required) {
        const balance = await this.creditService.getUserCredits(userId);

        return { hasEnough: balance >= required, current: balance, required };
    }

    async _generateSingle(prompt, options) {
        const mockReq = {
            user: { id: this.userId },
            body: {
                prompt,
                providers: options.providers || [],
                guidance: options.guidance,
                skipCreditCheck: options.skipCredits
            }
        };

        return await generate({
            prompt,
            original: prompt,
            promptId: null,
            providers: options.providers || [],
            guidance: options.guidance,
            req: mockReq
        });
    }

    async _processPrompt(prompt, index, total, options) {
        if (!this.silent) {
            console.log(`[${index + 1}/${total}] Generating: ${prompt.substring(0, 50)}...`);
        }

        try {
            const startTime = Date.now();
            const result = await this._generateSingle(prompt, options);
            const duration = Date.now() - startTime;

            if (result.success) {
                if (!this.silent) {
                    console.log(`   ✅ Success (${this._formatDuration(duration)}) - ${result.provider || 'unknown'}`);
                }

                return {
                    type: 'success',
                    data: { prompt, imageId: result.imageId, provider: result.provider, duration }
                };
            }

            if (!this.silent) {
                console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
            }

            return { type: 'failed', data: { prompt, error: result.error || 'Unknown error' } };
        } catch (error) {
            if (!this.silent) {
                console.log(`   ❌ Failed: ${error.message}`);
            }

            return { type: 'failed', data: { prompt, error: error.message } };
        }
    }

    async _generateBatch(prompts, options) {
        const results = { success: [], failed: [], startTime: Date.now() };

        for (let i = 0; i < prompts.length; i++) {
            const result = await this._processPrompt(prompts[i], i, prompts.length, options);

            if (result.type === 'success') {
                results.success.push(result.data);
            } else {
                results.failed.push(result.data);
            }

            if (i < prompts.length - 1 && options.delay > 0) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }

            if (!this.silent) {
                console.log('');
            }
        }

        return results;
    }

    _formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);

        return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
    }
}

// ============================================================================
// CLI WRAPPER
// ============================================================================

class CLI {
    static parseArgs() {
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
    }

    static validateArgs(args) {
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
    }

    static loadPrompts(args) {
        if (args.promptFile) {
            const content = readFileSync(args.promptFile, 'utf-8');

            return content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));
        }

        return Array(args.count).fill(args.prompt);
    }

    static logPlan(options) {
        const { user, prompts, providers, guidance, costPerImage, creditCheck, skipCredits } = options;

        console.log('🎨 AUTO-GENERATE IMAGES\n========================\n');
        console.log(`👤 User: ${user.username} (${user.email}) - ${user.isAdmin ? 'Admin' : 'User'}`);
        console.log(`   Credits: ${user.credits}\n`);
        console.log('📊 Plan:');
        console.log(`   Images: ${prompts.length}`);
        console.log(`   Providers: ${providers ? providers.join(', ') : 'random'}`);
        console.log(`   Guidance: ${guidance}`);
        console.log(`   Cost: ${costPerImage} credits/image (${prompts.length * costPerImage} total)\n`);

        if (!skipCredits) {
            const status = creditCheck.hasEnough ? '✅ Sufficient' : '❌ Insufficient';

            console.log(`💰 Credits: ${creditCheck.current} available, ${creditCheck.required} required`);
            console.log(`   ${status}\n`);
        } else {
            console.log('⚠️  Credits: Skipped (admin mode)\n');
        }
    }

    static logDryRun(prompts) {
        console.log('🔍 DRY RUN - Preview:\n');
        prompts.slice(0, 5).forEach((p, i) => {
            const truncated = p.length > 60 ? `${p.substring(0, 60)}...` : p;

            console.log(`   ${i + 1}. ${truncated}`);
        });
        if (prompts.length > 5) {
            console.log(`   ... and ${prompts.length - 5} more`);
        }
        console.log('\n✅ Dry run complete!\n');
    }

    static logResults(results) {
        const totalDuration = Date.now() - results.startTime;
        const avgDuration = results.success.length > 0
            ? results.success.reduce((sum, r) => sum + r.duration, 0) / results.success.length
            : 0;

        const formatDuration = ms => {
            if (ms < 1000) {
                return `${ms}ms`;
            }
            const seconds = Math.floor(ms / 1000);
            const minutes = Math.floor(seconds / 60);

            return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
        };

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('📊 SUMMARY\n');

        const total = results.success.length + results.failed.length;

        console.log(`   Total: ${total} | ✅ ${results.success.length} | ❌ ${results.failed.length}`);
        console.log(`   Time: ${formatDuration(totalDuration)} total, ${formatDuration(avgDuration)} avg\n`);

        if (results.failed.length > 0) {
            console.log('❌ Failed:\n');
            results.failed.forEach((f, i) => {
                const truncated = f.prompt.length > 50 ? `${f.prompt.substring(0, 50)}...` : f.prompt;

                console.log(`   ${i + 1}. ${truncated}`);
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
        if (results.finalCredits !== null) {
            console.log(`💰 Final balance: ${results.finalCredits} credits\n`);
        }
    }

    static async setupGenerator(args) {
        const generator = new ImageAutoGenerator({
            userId: args.userId,
            providers: args.providers,
            guidance: args.guidance,
            skipCredits: args.skipCredits,
            delay: args.delay
        });

        const user = await generator.getUserInfo();
        const prompts = this.loadPrompts(args);
        const costPerImage = await generator.calculateCost(1);
        const creditCheck = await generator.checkCredits(prompts.length);

        return { generator, user, prompts, costPerImage, creditCheck };
    }

    static async validateProvidersAndLogPlan(options) {
        const { args, generator, user, prompts, costPerImage, creditCheck } = options;

        if (args.providers) {
            const available = await generator.getProviders();
            const invalid = args.providers.filter(p => !available.includes(p));

            if (invalid.length > 0) {
                console.warn(`⚠️  Invalid: ${invalid.join(', ')}`);
                console.warn(`   Available: ${available.join(', ')}\n`);
            }
        }

        this.logPlan({
            user,
            prompts,
            providers: args.providers,
            guidance: args.guidance,
            costPerImage,
            creditCheck,
            skipCredits: args.skipCredits
        });
    }

    static checkCreditsSufficient(creditCheck, skipCredits) {
        if (!skipCredits && !creditCheck.hasEnough) {
            const shortfall = creditCheck.required - creditCheck.current;

            console.error(`❌ Shortfall: ${shortfall} credits`);
            console.error('💡 Use --skipCredits to bypass (admin only)\n');
            process.exit(1);
        }
    }

    static handleValidationErrors(errors) {
        console.error('❌ Errors:\n');
        errors.forEach(e => console.error(`   - ${e}`));
        console.error('\n💡 Example: node src/scripts/auto-generate-images.js --userId=1 --count=5 --prompt="a cat"\n');
        process.exit(1);
    }

    static async run() {
        const args = this.parseArgs();
        const errors = this.validateArgs(args);

        if (errors.length > 0) {
            this.handleValidationErrors(errors);
        }

        try {
            const setupData = await this.setupGenerator(args);

            await this.validateProvidersAndLogPlan({ ...setupData, args });
            this.checkCreditsSufficient(setupData.creditCheck, args.skipCredits);

            if (args.dryRun) {
                this.logDryRun(setupData.prompts);

                return;
            }

            console.log('🚀 Starting...\n');
            const results = await setupData.generator.generate({ prompts: setupData.prompts });

            this.logResults(results);

        } catch (error) {
            console.error('\n❌ FAILED:', error.message);
            console.error(error.stack, '\n');
            process.exit(1);
        } finally {
            await prisma.$disconnect();
        }
    }
}

// ============================================================================
// CLI ENTRY POINT (only runs when executed directly)
// ============================================================================

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);

if (isMainModule) {
    CLI.run().catch(error => {
        console.error('❌ Unhandled:', error);
        process.exit(1);
    });
}
