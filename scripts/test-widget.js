#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testWidgetPage() {
    console.log('🔍 Testing widget page availability...\n');

    try {
        const response = await axios.get(`${BASE_URL}/test-widget`);

        if (response.status === 200) {
            console.log('✅ Test widget page is accessible');
            console.log(`📄 Page content length: ${response.data.length} characters`);

            // Check if the page contains expected elements
            const content = response.data;
            const checks = [
                { name: 'Transaction stats container', pattern: 'id="transaction-stats"' },
                { name: 'Authentication container', pattern: 'id="authentication"' },
                { name: 'Transaction stats component script', pattern: 'transaction-stats-component.js' },
                { name: 'Test controls', pattern: 'testAuth' }
            ];

            checks.forEach(check => {
                if (content.includes(check.pattern)) {
                    console.log(`✅ ${check.name}: Found`);
                } else {
                    console.log(`❌ ${check.name}: Not found`);
                }
            });
        } else {
            console.log(`❌ Unexpected status code: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error accessing test widget page:', error.message);
    }
}

async function testTransactionStatsAPI() {
    console.log('\n🔍 Testing transaction stats API...\n');

    try {
        // Test the cost matrix endpoint (public)
        const costMatrixResponse = await axios.get(`${BASE_URL}/api/transactions/cost-matrix`);

        if (costMatrixResponse.data.success) {
            console.log('✅ Cost matrix endpoint working');
            console.log(`💰 Default cost: ${costMatrixResponse.data.data.defaultCost}`);
            console.log(`📊 Providers with costs: ${Object.keys(costMatrixResponse.data.data.costMatrix).length}`);
        } else {
            console.log('❌ Cost matrix endpoint failed');
        }

        // Test the user stats endpoint (requires auth)
        try {
            await axios.get(`${BASE_URL}/api/transactions/user/stats`);
            console.log('❌ User stats endpoint should require authentication');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ User stats endpoint properly requires authentication');
            } else {
                console.log(`⚠️ User stats endpoint returned: ${error.response?.status || 'unknown'}`);
            }
        }

    } catch (error) {
        console.error('❌ Error testing transaction stats API:', error.message);
    }
}

async function testHeaderIntegration() {
    console.log('\n🔍 Testing header integration...\n');

    try {
        const response = await axios.get(`${BASE_URL}/`);

        if (response.status === 200) {
            const content = response.data;

            // Check if header contains transaction stats widget
            if (content.includes('id="transaction-stats"')) {
                console.log('✅ Transaction stats widget found in main page header');
            } else {
                console.log('❌ Transaction stats widget not found in main page header');
            }

            // Check if transaction stats component script is loaded
            if (content.includes('transaction-stats-component.js')) {
                console.log('✅ Transaction stats component script loaded in main page');
            } else {
                console.log('❌ Transaction stats component script not loaded in main page');
            }

        } else {
            console.log(`❌ Main page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing header integration:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Testing Transaction Stats Widget Integration\n');

    await testWidgetPage();
    await testTransactionStatsAPI();
    await testHeaderIntegration();

    console.log('\n✅ Widget integration tests completed!');
    console.log('\n📚 Next steps:');
    console.log('   1. Visit http://localhost:3200/test-widget to test the widget manually');
    console.log('   2. Visit http://localhost:3200 to see the widget in the main header');
    console.log('   3. Login to see real transaction stats');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
