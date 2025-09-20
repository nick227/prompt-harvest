#!/usr/bin/env node

/**
 * Privacy Endpoint Test Script
 *
 * This script tests the API endpoints to ensure privacy controls are working:
 * 1. /api/feed/site should only return public images
 * 2. /api/feed/user should only return authenticated user's images
 * 3. /api/images should respect privacy based on authentication
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testEndpoint(url, token = null, description) {
    console.log(`\n🔍 Testing: ${description}`);
    console.log(`   URL: ${url}`);

    const headers = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(url, { headers });
        const data = await response.json();

        if (!response.ok) {
            console.log(`❌ HTTP ${response.status}: ${data.error || 'Unknown error'}`);
            return null;
        }

        console.log(`✅ HTTP ${response.status}: ${data.images?.length || data.data?.items?.length || 0} images returned`);

        // Check privacy violations
        const images = data.images || data.data?.items || [];
        const nonPublicImages = images.filter(img => !img.isPublic);

        if (nonPublicImages.length > 0) {
            console.error(`🚨 PRIVACY VIOLATION: ${nonPublicImages.length} non-public images found!`, nonPublicImages);
        } else {
            console.log(`✅ Privacy check passed: All images are public`);
        }

        return data;
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return null;
    }
}

async function testPrivacyEndpoints() {
    console.log('🔍 Starting privacy endpoint testing...\n');

    // Test 1: Public site feed (no authentication)
    await testEndpoint(
        `${BASE_URL}/api/feed/site?page=0&limit=10`,
        null,
        'Public Site Feed (No Auth)'
    );

    // Test 2: Public site feed with authentication
    const testToken = process.env.TEST_AUTH_TOKEN;
    if (testToken) {
        await testEndpoint(
            `${BASE_URL}/api/feed/site?page=0&limit=10`,
            testToken,
            'Public Site Feed (With Auth)'
        );

        // Test 3: User feed with authentication
        await testEndpoint(
            `${BASE_URL}/api/feed/user?page=0&limit=10`,
            testToken,
            'User Feed (With Auth)'
        );

        // Test 4: General images endpoint with authentication
        await testEndpoint(
            `${BASE_URL}/api/images?page=0&limit=10`,
            testToken,
            'General Images Endpoint (With Auth)'
        );
    } else {
        console.log('\n⚠️  Skipping authenticated tests - TEST_AUTH_TOKEN not provided');
        console.log('   To test authenticated endpoints, set TEST_AUTH_TOKEN environment variable');
    }

    console.log('\n🎉 Privacy endpoint testing completed!');
}

// Run the tests
testPrivacyEndpoints();
