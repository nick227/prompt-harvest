#!/usr/bin/env node

/**
 * Admin API E2E Test with Flux Provider
 * Tests image generation using Flux provider
 */

import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import databaseClient from '../src/database/PrismaClient.js';

const BASE_URL = 'http://localhost:3200';
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
const TEST_EMAIL = 'nick2@gmail.com';
const TEST_PASSWORD = '123456';

async function getAuthToken() {
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
    const token = jwt.sign(
        { userId: user.id },
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    console.log(`✅ User authenticated: ${user.email} (ID: ${user.id})`);
    return token;
}

async function testHealthCheck(token) {
    console.log('\n🏥 Testing health check endpoint...');

    try {
        const response = await fetch(`${BASE_URL}/api/admin/health`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Health check passed');
            console.log(`   User: ${data.user.email} (${data.user.username})`);
            console.log(`   Message: ${data.message}`);
        } else {
            console.log('❌ Health check failed:', data);
        }

        return response.ok;
    } catch (error) {
        console.log('❌ Health check error:', error.message);
        return false;
    }
}

async function testBlogCreation(token) {
    console.log('\n📝 Testing blog post creation...');

    const blogData = {
        title: `Flux E2E Test Blog Post ${Date.now()}`,
        content: 'This is a test blog post created during Flux E2E testing. Testing the admin API with Flux provider for image generation.',
        excerpt: 'Flux E2E test blog post',
        thumbnail: 'https://example.com/flux-test-thumbnail.jpg',
        tags: ['flux', 'e2e', 'test', 'image-generation'],
        isPublished: false,
        isFeatured: false,
        metadata: {
            testRun: true,
            provider: 'flux',
            createdAt: new Date().toISOString()
        }
    };

    try {
        const response = await fetch(`${BASE_URL}/api/admin/create-blog-post`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(blogData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Blog post created successfully');
            console.log(`   Post ID: ${data.data.id}`);
            console.log(`   Title: ${data.data.title}`);
            console.log(`   Author: ${data.data.authorId}`);
            console.log(`   Duration: ${data.duration}ms`);
            return data.data.id;
        } else {
            console.log('❌ Blog creation failed:', data);
            return null;
        }
    } catch (error) {
        console.log('❌ Blog creation error:', error.message);
        return null;
    }
}

async function testFluxImageGeneration(token) {
    console.log('\n🖼️ Testing Flux image generation...');

    const imageData = {
        prompt: 'A beautiful cyberpunk cityscape at night with neon lights, futuristic architecture, and flying cars, highly detailed digital art',
        providers: ['flux'],
        guidance: 7,
        multiplier: '',
        mixup: false,
        mashup: false,
        autoPublic: false,
        customVariables: '',
        promptId: null,
        original: '',
        model: 'flux-dev',
        size: '1024x1024'
    };

    console.log('📋 Image generation request:');
    console.log(`   Prompt: ${imageData.prompt.substring(0, 80)}...`);
    console.log(`   Provider: ${imageData.providers.join(', ')}`);
    console.log(`   Model: ${imageData.model}`);
    console.log(`   Size: ${imageData.size}`);
    console.log(`   Guidance: ${imageData.guidance}`);

    try {
        const response = await fetch(`${BASE_URL}/api/admin/generate-image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(imageData)
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Flux image generation successful!');
            console.log(`   Image ID: ${data.data.id}`);
            console.log(`   Provider: ${data.data.provider}`);
            console.log(`   Model: ${data.data.model || 'N/A'}`);
            console.log(`   URL: ${data.data.imageUrl || 'N/A'}`);
            console.log(`   Duration: ${data.duration}ms`);
            console.log(`   Request ID: ${data.requestId}`);
            return data.data.id;
        } else {
            console.log('❌ Flux image generation failed:');
            console.log(`   Status: ${response.status}`);
            console.log(`   Error: ${data.error?.message || 'Unknown error'}`);
            console.log(`   Type: ${data.error?.type || 'Unknown'}`);
            if (data.error?.details) {
                console.log(`   Details: ${data.error.details}`);
            }
            return null;
        }
    } catch (error) {
        console.log('❌ Flux image generation error:', error.message);
        return null;
    }
}

async function testUsageStats(token) {
    console.log('\n📊 Testing usage statistics...');

    try {
        const response = await fetch(`${BASE_URL}/api/admin/usage-stats`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ Usage stats retrieved successfully');
            console.log(`   Total requests: ${data.data.total}`);
            console.log(`   Successful: ${data.data.successful}`);
            console.log(`   Failed: ${data.data.failed}`);
            console.log(`   Average time: ${data.data.averageTime}ms`);
            console.log(`   Recent requests: ${data.data.recent.length}`);

            // Show recent requests
            if (data.data.recent.length > 0) {
                console.log('   Recent API calls:');
                data.data.recent.slice(0, 3).forEach((req, index) => {
                    console.log(`     ${index + 1}. ${req.method} ${req.endpoint} - ${req.status} (${req.duration}ms)`);
                });
            }
        } else {
            console.log('❌ Usage stats failed:', data);
        }

        return response.ok;
    } catch (error) {
        console.log('❌ Usage stats error:', error.message);
        return false;
    }
}

async function testMultipleFluxRequests(token) {
    console.log('\n🔄 Testing multiple Flux requests...');

    const prompts = [
        'A serene mountain landscape with a crystal clear lake reflecting snow-capped peaks',
        'A futuristic robot in a cyberpunk city with neon lights and rain',
        'A magical forest with glowing mushrooms and fairy lights'
    ];

    const results = [];

    for (let i = 0; i < prompts.length; i++) {
        console.log(`\n   Request ${i + 1}/${prompts.length}:`);
        console.log(`   Prompt: ${prompts[i].substring(0, 60)}...`);

        const imageData = {
            prompt: prompts[i],
            providers: ['flux'],
            guidance: 7,
            model: 'flux-dev',
            size: '1024x1024'
        };

        try {
            const response = await fetch(`${BASE_URL}/api/admin/generate-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(imageData)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`   ✅ Success - ID: ${data.data.id}`);
                results.push({ success: true, id: data.data.id, duration: data.duration });
            } else {
                console.log(`   ❌ Failed - ${data.error?.message || 'Unknown error'}`);
                results.push({ success: false, error: data.error?.message });
            }
        } catch (error) {
            console.log(`   ❌ Error - ${error.message}`);
            results.push({ success: false, error: error.message });
        }

        // Small delay between requests
        if (i < prompts.length - 1) {
            console.log('   ⏳ Waiting 2 seconds before next request...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`\n   📊 Multiple requests summary: ${successCount}/${prompts.length} successful`);

    return results;
}

async function runFluxTests() {
    console.log('🚀 Starting Admin API Flux E2E Tests');
    console.log('=====================================\n');

    try {
        // Get authentication token
        const token = await getAuthToken();
        if (!token) {
            console.log('❌ Failed to get authentication token');
            return;
        }

        // Test health check
        const healthOk = await testHealthCheck(token);
        if (!healthOk) {
            console.log('❌ Health check failed, stopping tests');
            return;
        }

        // Test blog creation
        const blogId = await testBlogCreation(token);

        // Test single Flux image generation
        const imageId = await testFluxImageGeneration(token);

        // Test multiple Flux requests
        const multipleResults = await testMultipleFluxRequests(token);

        // Test usage stats
        await testUsageStats(token);

        console.log('\n🎉 Flux E2E Tests Completed!');
        console.log('============================');
        console.log(`✅ Health check: ${healthOk ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Blog creation: ${blogId ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Single Flux generation: ${imageId ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Multiple Flux requests: ${multipleResults.filter(r => r.success).length}/${multipleResults.length} PASSED`);

        // Summary
        const totalTests = 4;
        const passedTests = [
            healthOk,
            !!blogId,
            !!imageId,
            multipleResults.some(r => r.success)
        ].filter(Boolean).length;

        console.log(`\n📊 Overall Results: ${passedTests}/${totalTests} tests passed`);

        if (passedTests === totalTests) {
            console.log('🎉 All tests passed! Flux integration is working perfectly!');
        } else if (passedTests >= 3) {
            console.log('✅ Most tests passed! Flux integration is mostly working.');
        } else {
            console.log('⚠️ Some tests failed. Check Flux provider configuration.');
        }

    } catch (error) {
        console.log('❌ Test execution error:', error);
    }
}

// Run the tests
runFluxTests().catch(console.error);
