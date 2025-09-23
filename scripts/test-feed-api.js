#!/usr/bin/env node

/**
 * Test Feed API Response Format
 *
 * This script tests the actual response format from the feed API endpoints
 * to understand why the image count manager is getting "Invalid response format"
 */

import fetch from 'node-fetch';

async function testFeedAPI() {
    console.log('🧪 TESTING FEED API RESPONSE FORMAT');
    console.log('==========================================');

    try {
        // Test site feed endpoint
        console.log('🔍 Testing /api/feed/site endpoint...');
        const siteResponse = await fetch('http://localhost:3200/api/feed/site?page=0&limit=1', {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!siteResponse.ok) {
            console.log(`❌ Site feed failed: ${siteResponse.status} ${siteResponse.statusText}`);
        } else {
            const siteData = await siteResponse.json();
            console.log('✅ Site feed response structure:');
            console.log('  - success:', siteData.success);
            console.log('  - data exists:', !!siteData.data);
            console.log('  - data keys:', Object.keys(siteData.data || {}));
            console.log('  - pagination exists:', !!siteData.data?.pagination);
            console.log('  - pagination keys:', Object.keys(siteData.data?.pagination || {}));
            console.log('  - total value:', siteData.data?.pagination?.total);
            console.log('  - total type:', typeof siteData.data?.pagination?.total);
        }

        console.log('');

        // Test user feed endpoint (this might fail without auth)
        console.log('🔍 Testing /api/feed/user endpoint...');
        const userResponse = await fetch('http://localhost:3200/api/feed/user?page=0&limit=1', {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!userResponse.ok) {
            console.log(`❌ User feed failed: ${userResponse.status} ${userResponse.statusText}`);
        } else {
            const userData = await userResponse.json();
            console.log('✅ User feed response structure:');
            console.log('  - success:', userData.success);
            console.log('  - data exists:', !!userData.data);
            console.log('  - data keys:', Object.keys(userData.data || {}));
            console.log('  - pagination exists:', !!userData.data?.pagination);
            console.log('  - pagination keys:', Object.keys(userData.data?.pagination || {}));
            console.log('  - total value:', userData.data?.pagination?.total);
            console.log('  - total type:', typeof userData.data?.pagination?.total);
        }

        console.log('');
        console.log('==========================================');
        console.log('✅ FEED API TEST COMPLETED');
        console.log('==========================================');

    } catch (error) {
        console.log('==========================================');
        console.error('❌ FEED API TEST FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
    }
}

testFeedAPI();
