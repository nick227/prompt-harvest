/**
 * Example: Programmatic Usage of ImageAutoGenerator
 *
 * This file demonstrates how to use the ImageAutoGenerator class
 * in your own scripts without using the CLI.
 */

import { ImageAutoGenerator } from '../src/scripts/auto-generate-images.js';
import databaseClient from '../src/database/PrismaClient.js';

const prisma = databaseClient.getClient();

// ============================================================================
// EXAMPLE 1: Basic Usage
// ============================================================================

async function example1_basicUsage() {
    console.log('📚 Example 1: Basic Usage\n');

    try {
        // Create generator instance
        const generator = new ImageAutoGenerator({
            userId: 1,
            skipCredits: true, // Admin mode - no credit deduction
            silent: false // Show progress
        });

        // Generate images
        const results = await generator.generate({
            prompts: ['a beautiful sunset', 'a mountain landscape', 'a cozy coffee shop']
        });

        console.log('\n✅ Results:');
        console.log(`   Success: ${results.success.length}`);
        console.log(`   Failed: ${results.failed.length}`);
        console.log(`   Total cost: ${results.totalCost} credits`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// EXAMPLE 2: With Credit Validation
// ============================================================================

async function example2_withCreditValidation() {
    console.log('\n📚 Example 2: With Credit Validation\n');

    try {
        const generator = new ImageAutoGenerator({
            userId: 1,
            skipCredits: false // Will check and deduct credits
        });

        // Check if user has enough credits first
        const prompts = ['a cat', 'a dog', 'a bird'];
        const creditCheck = await generator.checkCredits(prompts.length);

        if (!creditCheck.hasEnough) {
            console.error(`❌ Insufficient credits: need ${creditCheck.required}, have ${creditCheck.current}`);

            return;
        }

        console.log(`✅ Sufficient credits: ${creditCheck.current} available\n`);

        // Generate
        const results = await generator.generate({ prompts });

        console.log(`\n✅ Generated ${results.success.length} images`);
        console.log(`   Final balance: ${results.finalCredits} credits`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// EXAMPLE 3: Silent Mode (No Console Output)
// ============================================================================

async function example3_silentMode() {
    console.log('\n📚 Example 3: Silent Mode\n');

    try {
        const generator = new ImageAutoGenerator({
            userId: 1,
            skipCredits: true,
            silent: true // No progress output
        });

        const results = await generator.generate({
            prompts: ['a futuristic city', 'a vintage car']
        });

        // You handle the output
        console.log('Generation complete!');
        console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

        if (results.success.length > 0) {
            console.log('\nGenerated images:');
            results.success.forEach((img, i) => {
                console.log(`  ${i + 1}. ${img.prompt} (ID: ${img.imageId}, Provider: ${img.provider})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// EXAMPLE 4: Custom Providers and Settings
// ============================================================================

async function example4_customSettings() {
    console.log('\n📚 Example 4: Custom Providers and Settings\n');

    try {
        const generator = new ImageAutoGenerator({
            userId: 1,
            providers: ['flux', 'dezgo'], // Specific providers
            guidance: 15, // Higher guidance value
            delay: 2000, // 2 second delay between generations
            skipCredits: true,
            silent: false
        });

        const results = await generator.generate({
            prompts: ['abstract art', 'minimalist design']
        });

        console.log('\nProvider breakdown:');
        const providerCounts = {};

        results.success.forEach(r => {
            providerCounts[r.provider] = (providerCounts[r.provider] || 0) + 1;
        });
        Object.entries(providerCounts).forEach(([provider, count]) => {
            console.log(`  ${provider}: ${count} images`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// EXAMPLE 5: Get User Info and Available Providers
// ============================================================================

async function example5_getInfo() {
    console.log('\n📚 Example 5: Get User Info and Providers\n');

    try {
        const generator = new ImageAutoGenerator({ userId: 1 });

        // Get user info
        const user = await generator.getUserInfo();

        console.log('User Info:');
        console.log(`  Username: ${user.username}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Credits: ${user.credits}`);
        console.log(`  Admin: ${user.isAdmin}`);

        // Get available providers
        const providers = await generator.getProviders();

        console.log('\nAvailable Providers:');
        providers.forEach(p => console.log(`  - ${p}`));

        // Calculate cost for hypothetical generation
        const cost = await generator.calculateCost(10);

        console.log(`\nCost for 10 images: ${cost} credits`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// EXAMPLE 6: Batch Processing with Error Handling
// ============================================================================

async function example6_batchProcessing() {
    console.log('\n📚 Example 6: Batch Processing\n');

    try {
        const generator = new ImageAutoGenerator({
            userId: 1,
            skipCredits: true,
            silent: true
        });

        // Process multiple batches
        const batches = [
            ['landscapes', 'nature', 'mountains'],
            ['cityscapes', 'urban', 'architecture'],
            ['portraits', 'people', 'faces']
        ];

        const allResults = { success: [], failed: [] };

        for (let i = 0; i < batches.length; i++) {
            console.log(`Processing batch ${i + 1}/${batches.length}...`);

            const results = await generator.generate({
                prompts: batches[i]
            });

            allResults.success.push(...results.success);
            allResults.failed.push(...results.failed);

            console.log(`  ✅ ${results.success.length} success, ❌ ${results.failed.length} failed`);
        }

        console.log(`\nTotal: ${allResults.success.length} successful, ${allResults.failed.length} failed`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    console.log('🎨 ImageAutoGenerator - Programmatic Usage Examples\n');
    console.log('====================================================\n');

    try {
        // Run examples (comment out ones you don't want to run)
        await example1_basicUsage();
        await example2_withCreditValidation();
        await example3_silentMode();
        await example4_customSettings();
        await example5_getInfo();
        await example6_batchProcessing();

        console.log('\n✅ All examples completed!\n');

    } catch (error) {
        console.error('\n❌ Example failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

// Export for use in other scripts
export {
    example1_basicUsage,
    example2_withCreditValidation,
    example3_silentMode,
    example4_customSettings,
    example5_getInfo,
    example6_batchProcessing
};

