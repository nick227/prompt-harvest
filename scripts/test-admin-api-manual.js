#!/usr/bin/env node

/**
 * Manual Admin API Test Script
 * Simple script to manually test the admin API endpoints
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
        title: `Test Blog Post - Manual E2E Test ${Date.now()}`,
        content: 'This is a test blog post created during manual E2E testing. It contains sample content to verify the blog creation endpoint works correctly.',
        excerpt: 'Test excerpt for manual E2E testing',
        thumbnail: 'https://example.com/test-thumbnail.jpg',
        tags: ['test', 'e2e', 'manual'],
        isPublished: false,
        isFeatured: false,
        metadata: {
            testRun: true,
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

async function testImageGeneration(token) {
    console.log('\n🖼️ Testing image generation...');

    const imageData = {
        prompt: 'A beautiful sunset over mountains, digital art style',
        providers: ['openai'],
        guidance: 10,
        multiplier: '',
        mixup: false,
        mashup: false,
        autoPublic: false,
        customVariables: '',
        promptId: null,
        original: '',
        model: null,
        size: null
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
            console.log('✅ Image generation request successful');
            console.log(`   Image ID: ${data.data.id}`);
            console.log(`   Provider: ${data.data.provider}`);
            console.log(`   Duration: ${data.duration}ms`);
            return data.data.id;
        } else {
            console.log('❌ Image generation failed:', data);
            return null;
        }
    } catch (error) {
        console.log('❌ Image generation error:', error.message);
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
        } else {
            console.log('❌ Usage stats failed:', data);
        }

        return response.ok;
    } catch (error) {
        console.log('❌ Usage stats error:', error.message);
        return false;
    }
}

async function runTests() {
    console.log('🚀 Starting Admin API Manual E2E Tests');
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

        // Test image generation
        const imageId = await testImageGeneration(token);

        // Test usage stats
        await testUsageStats(token);

        console.log('\n🎉 Manual E2E Tests Completed!');
        console.log('==============================');
        console.log(`✅ Health check: ${healthOk ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Blog creation: ${blogId ? 'PASSED' : 'FAILED'}`);
        console.log(`✅ Image generation: ${imageId ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
        console.log('❌ Test execution error:', error);
    }
}

// Run the tests
runTests().catch(console.error);
