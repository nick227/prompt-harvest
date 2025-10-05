#!/usr/bin/env node

/**
 * Batch Blog Post Creator Script
 * Processes an array of blog post creation requests
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

// Default blog post requests
const DEFAULT_BLOG_REQUESTS = [
    {
        title: 'The Future of AI-Generated Art',
        content: 'Artificial intelligence is revolutionizing the way we create and consume art. From digital paintings to 3D sculptures, AI is opening new possibilities for artists and creators worldwide. This comprehensive guide explores the latest trends, tools, and techniques in AI-generated art.',
        excerpt: 'Explore the revolutionary world of AI-generated art and discover how artificial intelligence is transforming creative expression.',
        thumbnail: 'https://example.com/ai-art-thumbnail.jpg',
        tags: ['AI', 'art', 'technology', 'creativity'],
        isPublished: false,
        isFeatured: false,
        metadata: {
            category: 'Technology',
            readingTime: '5 minutes',
            author: 'AI Assistant'
        }
    },
    {
        title: 'Sustainable Living: A Complete Guide',
        content: 'Living sustainably is more important than ever. This comprehensive guide covers everything from reducing your carbon footprint to choosing eco-friendly products. Learn practical tips for making your lifestyle more environmentally friendly.',
        excerpt: 'Discover practical ways to live more sustainably and reduce your environmental impact.',
        thumbnail: 'https://example.com/sustainable-living-thumbnail.jpg',
        tags: ['sustainability', 'environment', 'lifestyle', 'green living'],
        isPublished: false,
        isFeatured: true,
        metadata: {
            category: 'Lifestyle',
            readingTime: '8 minutes',
            author: 'Eco Expert'
        }
    },
    {
        title: 'Mastering Digital Photography',
        content: 'Digital photography has never been more accessible. Whether you\'re a beginner or looking to improve your skills, this guide covers essential techniques, equipment recommendations, and post-processing tips to help you capture stunning images.',
        excerpt: 'Learn essential digital photography techniques and improve your skills with this comprehensive guide.',
        thumbnail: 'https://example.com/photography-thumbnail.jpg',
        tags: ['photography', 'digital', 'tutorial', 'skills'],
        isPublished: true,
        isFeatured: false,
        metadata: {
            category: 'Photography',
            readingTime: '12 minutes',
            author: 'Photo Pro'
        }
    },
    {
        title: 'Healthy Cooking for Busy Professionals',
        content: 'Eating healthy doesn\'t have to be time-consuming. This guide provides quick, nutritious recipes and meal prep strategies for busy professionals. Learn how to maintain a healthy diet even with a packed schedule.',
        excerpt: 'Discover quick and healthy cooking strategies for busy professionals who want to maintain a nutritious diet.',
        thumbnail: 'https://example.com/healthy-cooking-thumbnail.jpg',
        tags: ['cooking', 'health', 'nutrition', 'meal prep'],
        isPublished: true,
        isFeatured: true,
        metadata: {
            category: 'Health',
            readingTime: '6 minutes',
            author: 'Nutritionist'
        }
    },
    {
        title: 'The Psychology of Color in Design',
        content: 'Color plays a crucial role in design and user experience. This in-depth exploration covers color theory, psychological effects of different colors, and practical applications in web design, branding, and marketing.',
        excerpt: 'Understand how color psychology influences design and learn to use colors effectively in your projects.',
        thumbnail: 'https://example.com/color-psychology-thumbnail.jpg',
        tags: ['design', 'psychology', 'color theory', 'UX'],
        isPublished: false,
        isFeatured: false,
        metadata: {
            category: 'Design',
            readingTime: '10 minutes',
            author: 'Design Expert'
        }
    }
];

class BatchBlogCreator {
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

    async createBlogPost(postData, index) {
        console.log(`\n📝 Creating blog post ${index + 1}/${this.totalRequests}:`);
        console.log(`   Title: ${postData.title}`);
        console.log(`   Content: ${postData.content.substring(0, 80)}...`);
        console.log(`   Published: ${postData.isPublished ? 'Yes' : 'No'}`);
        console.log(`   Featured: ${postData.isFeatured ? 'Yes' : 'No'}`);
        console.log(`   Tags: ${postData.tags ? postData.tags.join(', ') : 'None'}`);

        try {
            const response = await fetch(`${BASE_URL}/api/admin/create-blog-post`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(postData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`   ✅ Success - ID: ${data.data.id}`);
                console.log(`   📊 Duration: ${data.duration}ms`);

                this.results.push({
                    index: index + 1,
                    success: true,
                    id: data.data.id,
                    title: postData.title,
                    slug: data.data.slug,
                    authorId: data.data.authorId,
                    isPublished: data.data.isPublished,
                    isFeatured: data.data.isFeatured,
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
                    title: postData.title,
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
                title: postData.title,
                error: error.message,
                statusCode: 0
            });

            return { success: false, error: error.message };
        }
    }

    async processBatch(blogRequests, options = {}) {
        const {
            delayBetweenRequests = 1000, // 1 second
            maxConcurrent = 1, // Process one at a time
            saveResults = true,
            outputFile = 'batch-blog-results.json'
        } = options;

        this.totalRequests = blogRequests.length;
        console.log(`\n🚀 Starting batch blog post creation`);
        console.log(`📊 Total requests: ${this.totalRequests}`);
        console.log(`⏱️ Delay between requests: ${delayBetweenRequests}ms`);
        console.log(`🔄 Max concurrent: ${maxConcurrent}`);
        console.log(`💾 Save results: ${saveResults}`);

        // Get authentication token
        await this.getAuthToken();

        // Process requests sequentially
        for (let i = 0; i < blogRequests.length; i++) {
            const postData = blogRequests[i];

            // Add default values if not provided
            const fullPostData = {
                title: `Blog Post ${i + 1}`,
                content: 'Default content for blog post.',
                excerpt: '',
                thumbnail: '',
                tags: [],
                isPublished: false,
                isFeatured: false,
                metadata: {},
                ...postData
            };

            await this.createBlogPost(fullPostData, i);

            // Add delay between requests (except for the last one)
            if (i < blogRequests.length - 1) {
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
            console.log(`📈 Average creation time: ${avgDuration.toFixed(0)}ms`);
        }

        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => {
                console.log(`   ${error.index}. ${error.title} - ${error.error}`);
            });
        }

        if (this.results.length > 0) {
            console.log('\n✅ Successful creations:');
            this.results.forEach(result => {
                console.log(`   ${result.index}. ${result.title} - ID: ${result.id}`);
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
async function runBatchBlogCreation() {
    console.log('🚀 Batch Blog Post Creation Script');
    console.log('==================================\n');

    const creator = new BatchBlogCreator();

    // Check if custom requests file exists
    const customRequestsPath = path.join(process.cwd(), 'scripts', 'batch-processing', 'blog-requests.json');

    let blogRequests = DEFAULT_BLOG_REQUESTS;

    try {
        if (fs.existsSync(customRequestsPath)) {
            console.log('📁 Loading custom blog requests from file...');
            const customData = JSON.parse(await fs.promises.readFile(customRequestsPath, 'utf8'));
            blogRequests = customData.requests || customData;
            console.log(`✅ Loaded ${blogRequests.length} custom requests`);
        } else {
            console.log('📁 Using default blog requests');
            console.log(`💡 To use custom requests, create: ${customRequestsPath}`);
        }
    } catch (error) {
        console.log(`⚠️ Error loading custom requests: ${error.message}`);
        console.log('📁 Using default blog requests');
    }

    // Process the batch
    const results = await creator.processBatch(blogRequests, {
        delayBetweenRequests: 1000, // 1 second between requests
        maxConcurrent: 1,
        saveResults: true,
        outputFile: `batch-blog-results-${Date.now()}.json`
    });

    console.log('\n🎉 Batch processing completed!');
    return results;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runBatchBlogCreation().catch(console.error);
}

export { BatchBlogCreator, runBatchBlogCreation };
