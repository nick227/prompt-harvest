#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testValidation() {
    console.log('🔍 Testing input validation improvements...\n');
    
    const testCases = [
        {
            name: 'Empty providers array',
            data: { providers: [] },
            expectedError: 'At least one provider must be specified'
        },
        {
            name: 'Empty provider string',
            data: { providers: ['dalle', ''] },
            expectedError: 'All providers must be non-empty strings'
        },
        {
            name: 'Valid providers',
            data: { providers: ['dalle', 'flux'] },
            expectedSuccess: true
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`📝 Testing: ${testCase.name}`);
        
        try {
            const response = await axios.post(`${BASE_URL}/api/transactions/estimate-cost`, testCase.data);
            
            if (testCase.expectedSuccess) {
                console.log(`✅ Success: ${response.data.data.estimatedCost}`);
            } else {
                console.log(`❌ Expected error but got success`);
            }
        } catch (error) {
            if (error.response && error.response.data.error) {
                const errorMessage = error.response.data.error;
                if (testCase.expectedError && errorMessage.includes(testCase.expectedError)) {
                    console.log(`✅ Validation working: ${errorMessage}`);
                } else {
                    console.log(`❌ Unexpected error: ${errorMessage}`);
                }
            } else {
                console.log(`❌ Network error: ${error.message}`);
            }
        }
        console.log('');
    }
}

async function testCostMatrix() {
    console.log('🔍 Testing cost matrix with caching...\n');
    
    try {
        const response = await axios.get(`${BASE_URL}/api/transactions/cost-matrix`);
        
        if (response.data.success) {
            console.log('✅ Cost matrix retrieved successfully');
            console.log(`📊 Cache headers: ${JSON.stringify(response.headers, null, 2)}`);
            console.log(`💰 Default cost: ${response.data.data.defaultCost}`);
            console.log(`📅 Last updated: ${response.data.data.lastUpdated}`);
        } else {
            console.log('❌ Failed to get cost matrix');
        }
    } catch (error) {
        console.error('❌ Error testing cost matrix:', error.message);
    }
}

async function testCostFormatting() {
    console.log('\n🔍 Testing cost formatting utilities...\n');
    
    try {
        // Test the new cost summary functionality
        const response = await axios.post(`${BASE_URL}/api/transactions/estimate-cost`, {
            providers: ['dalle', 'flux', 'dreamshaper']
        });
        
        if (response.data.success) {
            const { estimatedCost, costBreakdown } = response.data.data;
            console.log(`✅ Cost estimation: $${estimatedCost.toFixed(3)}`);
            console.log('📊 Cost breakdown:');
            costBreakdown.forEach(item => {
                console.log(`   ${item.provider}: $${item.cost.toFixed(3)}`);
            });
        }
    } catch (error) {
        console.error('❌ Error testing cost formatting:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Testing Transaction System Improvements\n');
    
    await testValidation();
    await testCostMatrix();
    await testCostFormatting();
    
    console.log('✅ All improvement tests completed!');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
