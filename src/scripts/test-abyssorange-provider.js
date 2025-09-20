#!/usr/bin/env node

/**
 * AbyssOrange Provider Test
 * 
 * Quick test to verify the abyssorange provider works correctly
 */

import dotenv from 'dotenv';
import ImageGenerator from '../services/feed/ImageGenerator.js';

// Load environment variables from project root
dotenv.config({ path: '../.env' });

const TEST_CONFIG = {
    provider: 'abyssorange',
    prompt: 'A beautiful sunset over a mountain landscape, digital art, vibrant colors',
    guidance: 8,
    userId: 'test-abyssorange-' + Date.now()
};

const testAbyssOrangeProvider = async () => {
    console.log('🧪 Testing AbyssOrange Provider');
    console.log('=' .repeat(50));
    console.log(`Provider: ${TEST_CONFIG.provider}`);
    console.log(`Prompt: ${TEST_CONFIG.prompt}`);
    console.log(`Guidance: ${TEST_CONFIG.guidance}`);
    console.log('=' .repeat(50));

    try {
        // Check environment
        if (!process.env.DEZGO_API_KEY) {
            throw new Error('DEZGO_API_KEY environment variable is required');
        }

        console.log('\n1️⃣ Generating image with AbyssOrange provider...');
        const startTime = Date.now();

        const result = await ImageGenerator.generateProviderImage(
            TEST_CONFIG.provider,
            TEST_CONFIG.prompt,
            TEST_CONFIG.guidance,
            TEST_CONFIG.userId
        );

        const duration = Date.now() - startTime;

        if (result.error) {
            throw new Error(`Image generation failed: ${result.error}`);
        }

        if (!result || typeof result !== 'string') {
            throw new Error('Invalid result - expected base64 string');
        }

        // Validate result
        const buffer = Buffer.from(result, 'base64');
        if (buffer.length === 0) {
            throw new Error('Generated image buffer is empty');
        }

        console.log('✅ Image generated successfully!');
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Buffer size: ${buffer.length} bytes`);
        console.log(`   Base64 length: ${result.length} characters`);
        console.log(`   Provider: ${TEST_CONFIG.provider}`);
        console.log(`   Model: abyss_orange_mix_2`);

        console.log('\n🎉 AbyssOrange Provider Test: SUCCESS');
        return true;

    } catch (error) {
        console.error('\n❌ AbyssOrange Provider Test: FAILED');
        console.error(`Error: ${error.message}`);
        return false;
    }
};

// Run the test
testAbyssOrangeProvider()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error('💥 Test crashed:', error.message);
        process.exit(1);
    });
