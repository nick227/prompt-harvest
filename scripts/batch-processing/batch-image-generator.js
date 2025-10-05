#!/usr/bin/env node

/**
 * Batch Image Generation Script
 * Processes an array of image generation API requests
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import databaseClient from '../../src/database/PrismaClient.js';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3200';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const TEST_EMAIL = 'nick2@gmail.com';
const TEST_PASSWORD = '123456';

// Default image generation requests
const DEFAULT_IMAGE_REQUESTS = [
    {
        prompt: 'A serene mountain landscape with a crystal clear lake reflecting snow-capped peaks, golden hour lighting',
        providers: ['flux'],
        guidance: 7,
        model: 'flux-dev',
        size: '1024x1024',
        tags: ['nature', 'landscape', 'mountains']
    },
    {
        prompt: 'A futuristic cyberpunk cityscape at night with neon lights, flying cars, and towering skyscrapers',
        providers: ['flux'],
        guidance: 8,
        model: 'flux-dev',
        size: '1024x1024',
        tags: ['cyberpunk', 'futuristic', 'city']
    },
    {
        prompt: 'A magical forest with glowing mushrooms, fairy lights, and mystical creatures, fantasy art style',
        providers: ['flux'],
        guidance: 6,
        model: 'flux-dev',
        size: '1024x1024',
        tags: ['fantasy', 'magical', 'forest']
    },
    {
        prompt: 'A beautiful underwater scene with colorful coral reefs, tropical fish, and sunbeams filtering through water',
        providers: ['flux'],
        guidance: 7,
        model: 'flux-dev',
        size: '1024x1024',
        tags: ['underwater', 'ocean', 'marine']
    },
    {
        prompt: 'A cozy cabin in the woods during winter, smoke rising from chimney, snow-covered trees, warm lighting',
        providers: ['flux'],
        guidance: 8,
        model: 'flux-dev',
        size: '1024x1024',
        tags: ['winter', 'cabin', 'cozy']
    }
];

class BatchImageGenerator {
    constructor() {
        this.authToken = null;
        this.results = [];
        this.errors = [];
        this.startTime = Date.now();
    }

    async getAuthToken() {
        console.log('🔐 Getting authentication token...');

        const prisma = databaseClient.getClient();

        // Find or create test user
        let user = await prisma.User.findFirst({
            where: { email: TEST_EMAIL }
        });

        if (!user) {
            console.log('👤 Creating test user...');
            const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
            user = await prisma.User.create({
                data: {
                    email: TEST_EMAIL,
                    username: 'nick2',
                    password: hashedPassword,
                    isAdmin: true,
                    isSuspended: false
                }
            });
        } else {
            // Ensure user is admin
            user = await prisma.User.update({
                where: { id: user.id },
                data: {
                    isAdmin: true,
                    isSuspended: false
                }
            });
        }

        // Generate JWT token
        this.authToken = jwt.sign(
            { userId: user.id },
            JWT_SECRET,
            { expiresIn: '2h' }
        );

        console.log(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
        return this.authToken;
    }

    async generateImage(requestData, index) {
        console.log(`\n🖼️ Generating image ${index + 1}/${this.totalRequests}:`);
        console.log(`   Prompt: ${requestData.prompt.substring(0, 80)}...`);
        console.log(`   Provider: ${requestData.providers.join(', ')}`);
        console.log(`   Model: ${requestData.model}`);
        console.log(`   Size: ${requestData.size}`);
        console.log(`   Guidance: ${requestData.guidance}`);

        try {
            const response = await fetch(`${BASE_URL}/api/admin/generate-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`   ✅ Success - ID: ${data.data.id}`);
                console.log(`   📊 Duration: ${data.duration}ms`);

                this.results.push({
                    index: index + 1,
                    success: true,
                    id: data.data.id,
                    prompt: requestData.prompt,
                    provider: data.data.provider,
                    model: data.data.model,
                    imageUrl: data.data.imageUrl,
                    duration: data.duration,
                    requestId: data.requestId,
                    timestamp: data.timestamp
                });

                return { success: true, data: data.data };
            } else {
                console.log(`   ❌ Failed - ${data.error?.message || 'Unknown error'}`);

                this.errors.push({
                    index: index + 1,
                    success: false,
                    prompt: requestData.prompt,
                    error: data.error?.message || 'Unknown error',
                    statusCode: response.status,
                    requestId: data.requestId
                });

                return { success: false, error: data.error?.message };
            }
        } catch (error) {
            console.log(`   ❌ Error - ${error.message}`);

            this.errors.push({
                index: index + 1,
                success: false,
                prompt: requestData.prompt,
                error: error.message,
                statusCode: 0
            });

            return { success: false, error: error.message };
        }
    }

    async processBatch(imageRequests, options = {}) {
        const {
            delayBetweenRequests = 3000, // 3 seconds
            maxConcurrent = 1, // Process one at a time to avoid overwhelming the API
            saveResults = true,
            outputFile = 'batch-image-results.json'
        } = options;

        this.totalRequests = imageRequests.length;
        console.log(`\n🚀 Starting batch image generation`);
        console.log(`📊 Total requests: ${this.totalRequests}`);
        console.log(`⏱️ Delay between requests: ${delayBetweenRequests}ms`);
        console.log(`🔄 Max concurrent: ${maxConcurrent}`);
        console.log(`💾 Save results: ${saveResults}`);

        // Get authentication token
        await this.getAuthToken();

        // Process requests sequentially
        for (let i = 0; i < imageRequests.length; i++) {
            const requestData = imageRequests[i];

            // Add default values if not provided
            const fullRequestData = {
                providers: ['flux'],
                guidance: 7,
                model: 'flux-dev',
                size: '1024x1024',
                multiplier: '',
                mixup: false,
                mashup: false,
                autoPublic: false,
                customVariables: '',
                promptId: null,
                original: '',
                ...requestData
            };

            await this.generateImage(fullRequestData, i);

            // Add delay between requests (except for the last one)
            if (i < imageRequests.length - 1) {
                console.log(`   ⏳ Waiting ${delayBetweenRequests}ms before next request...`);
                await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
            }
        }

        // Generate summary
        this.generateSummary();

        // Save results if requested
        if (saveResults) {
            await this.saveResults(outputFile);
        }

        return {
            results: this.results,
            errors: this.errors,
            summary: this.getSummary()
        };
    }

    generateSummary() {
        const totalTime = Date.now() - this.startTime;
        const successCount = this.results.length;
        const errorCount = this.errors.length;
        const successRate = (successCount / this.totalRequests) * 100;

        console.log('\n📊 Batch Processing Summary');
        console.log('==========================');
        console.log(`✅ Successful: ${successCount}/${this.totalRequests} (${successRate.toFixed(1)}%)`);
        console.log(`❌ Failed: ${errorCount}/${this.totalRequests}`);
        console.log(`⏱️ Total time: ${(totalTime / 1000).toFixed(1)}s`);
        console.log(`⚡ Average time per request: ${(totalTime / this.totalRequests / 1000).toFixed(1)}s`);

        if (this.results.length > 0) {
            const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
            console.log(`📈 Average generation time: ${avgDuration.toFixed(0)}ms`);
        }

        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => {
                console.log(`   ${error.index}. ${error.prompt.substring(0, 50)}... - ${error.error}`);
            });
        }

        if (this.results.length > 0) {
            console.log('\n✅ Successful generations:');
            this.results.forEach(result => {
                console.log(`   ${result.index}. ${result.prompt.substring(0, 50)}... - ID: ${result.id}`);
            });
        }
    }

    getSummary() {
        const totalTime = Date.now() - this.startTime;
        const successCount = this.results.length;
        const errorCount = this.errors.length;
        const successRate = (successCount / this.totalRequests) * 100;

        return {
            totalRequests: this.totalRequests,
            successful: successCount,
            failed: errorCount,
            successRate: successRate,
            totalTime: totalTime,
            averageTime: this.results.length > 0 ?
                this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length : 0
        };
    }

    async saveResults(filename) {
        const outputPath = path.join(process.cwd(), 'scripts', 'batch-processing', filename);

        const outputData = {
            timestamp: new Date().toISOString(),
            summary: this.getSummary(),
            results: this.results,
            errors: this.errors,
            requests: this.totalRequests
        };

        try {
            await fs.promises.writeFile(outputPath, JSON.stringify(outputData, null, 2));
            console.log(`\n💾 Results saved to: ${outputPath}`);
        } catch (error) {
            console.log(`\n❌ Failed to save results: ${error.message}`);
        }
    }
}

// Main execution function
async function runBatchImageGeneration() {
    console.log('🚀 Batch Image Generation Script');
    console.log('================================\n');

    const generator = new BatchImageGenerator();

    // Check if custom requests file exists
    const customRequestsPath = path.join(process.cwd(), 'scripts', 'batch-processing', 'image-requests.json');

    let imageRequests = DEFAULT_IMAGE_REQUESTS;

    try {
        if (fs.existsSync(customRequestsPath)) {
            console.log('📁 Loading custom image requests from file...');
            const customData = JSON.parse(await fs.promises.readFile(customRequestsPath, 'utf8'));
            imageRequests = customData.requests || customData;
            console.log(`✅ Loaded ${imageRequests.length} custom requests`);
        } else {
            console.log('📁 Using default image requests');
            console.log(`💡 To use custom requests, create: ${customRequestsPath}`);
        }
    } catch (error) {
        console.log(`⚠️ Error loading custom requests: ${error.message}`);
        console.log('📁 Using default image requests');
    }

    // Process the batch
    const results = await generator.processBatch(imageRequests, {
        delayBetweenRequests: 3000, // 3 seconds between requests
        maxConcurrent: 1,
        saveResults: true,
        outputFile: `batch-image-results-${Date.now()}.json`
    });

    console.log('\n🎉 Batch processing completed!');
    return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBatchImageGeneration().catch(console.error);
}

export { BatchImageGenerator, runBatchImageGeneration };
