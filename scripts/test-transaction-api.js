#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

// Test the public cost matrix endpoint
async function testCostMatrix() {
    try {
        console.log('🔍 Testing cost matrix endpoint...');
        const response = await axios.get(`${BASE_URL}/api/transactions/cost-matrix`);

        if (response.data.success) {
            console.log('✅ Cost matrix retrieved successfully');
            console.log('📊 Cost matrix:', JSON.stringify(response.data.data.costMatrix, null, 2));
            console.log('💰 Default cost:', response.data.data.defaultCost);
        } else {
            console.log('❌ Failed to get cost matrix');
        }
    } catch (error) {
        console.error('❌ Error testing cost matrix:', error.message);
    }
}

// Test cost estimation endpoint
async function testCostEstimation() {
    try {
        console.log('\n🔍 Testing cost estimation endpoint...');

        const testCases = [
            { providers: ['dalle'] },
            { providers: ['flux', 'dreamshaper'] },
            { providers: ['dalle', 'flux', 'juggernaut', 'tshirt'] },
            { providers: [] }
        ];

        for (const testCase of testCases) {
            console.log(`\n📝 Testing providers: ${testCase.providers.join(', ') || 'none'}`);

            const response = await axios.post(`${BASE_URL}/api/transactions/estimate-cost`, testCase);

            if (response.data.success) {
                const { estimatedCost, costBreakdown } = response.data.data;
                console.log(`✅ Estimated cost: $${estimatedCost.toFixed(3)}`);
                console.log('📊 Cost breakdown:', costBreakdown);
            } else {
                console.log('❌ Failed to estimate cost');
            }
        }
    } catch (error) {
        console.error('❌ Error testing cost estimation:', error.message);
    }
}

// Test with authentication (requires valid JWT token)
async function testAuthenticatedEndpoints() {
    try {
        console.log('\n🔍 Testing authenticated endpoints...');
        console.log('⚠️  Note: These endpoints require authentication');
        console.log('   You can test them manually with a valid JWT token');

        const endpoints = [
            '/api/transactions/user/stats',
            '/api/transactions/user/provider-usage',
            '/api/transactions/user/daily-usage'
        ];

        for (const endpoint of endpoints) {
            console.log(`\n📝 Endpoint: ${endpoint}`);
            console.log('   Method: GET');
            console.log('   Headers: Authorization: Bearer <your-jwt-token>');
        }
    } catch (error) {
        console.error('❌ Error testing authenticated endpoints:', error.message);
    }
}

// Main test function
async function runTests() {
    console.log('🚀 Starting Transaction API Tests\n');

    await testCostMatrix();
    await testCostEstimation();
    await testAuthenticatedEndpoints();

    console.log('\n✅ Transaction API tests completed!');
    console.log('\n📚 For authenticated endpoints, you can:');
    console.log('   1. Register/login to get a JWT token');
    console.log('   2. Use the token in Authorization header');
    console.log('   3. Test the user-specific endpoints');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
