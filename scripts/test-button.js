#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testButtonFunctionality() {
    console.log('🔍 Testing START button functionality...\n');

    try {
        const response = await axios.get(`${BASE_URL}/`);

        if (response.status === 200) {
            const content = response.data;

            // Check if the button exists in the HTML
            if (content.includes('btn-generate')) {
                console.log('✅ START button found in HTML');
            } else {
                console.log('❌ START button not found in HTML');
            }

            // Check if the button has the correct text
            if (content.includes('START')) {
                console.log('✅ START button text found');
            } else {
                console.log('❌ START button text not found');
            }

            // Check if enhanced image generation script is loaded
            if (content.includes('enhanced-image-generation.js')) {
                console.log('✅ Enhanced image generation script loaded');
            } else {
                console.log('❌ Enhanced image generation script not loaded');
            }

            // Check if the button is properly structured
            if (content.includes('class="btn-generate"')) {
                console.log('✅ Button has correct class');
            } else {
                console.log('❌ Button class not found');
            }

        } else {
            console.log(`❌ Main page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing button functionality:', error.message);
    }
}

async function testJavaScriptFiles() {
    console.log('\n🔍 Testing JavaScript file availability...\n');

    const files = [
        '/js/enhanced-image-generation.js',
        '/js/app.js',
        '/js/components/header-component.js',
        '/js/components/transaction-stats-component.js'
    ];

    for (const file of files) {
        try {
            const response = await axios.get(`${BASE_URL}${file}`);

            if (response.status === 200) {
                console.log(`✅ ${file} - Available`);

                // Check for specific content
                const content = response.data;
                if (file.includes('enhanced-image-generation.js')) {
                    if (content.includes('EnhancedImageGenerator')) {
                        console.log(`   ✅ EnhancedImageGenerator class found`);
                    } else {
                        console.log(`   ❌ EnhancedImageGenerator class not found`);
                    }
                }

                if (file.includes('app.js')) {
                    if (content.includes('handleGenerateClick')) {
                        console.log(`   ✅ handleGenerateClick function found`);
                    } else {
                        console.log(`   ❌ handleGenerateClick function not found`);
                    }
                }

            } else {
                console.log(`❌ ${file} - Status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ ${file} - Error: ${error.message}`);
        }
    }
}

async function runTests() {
    console.log('🚀 Testing START Button Functionality\n');

    await testButtonFunctionality();
    await testJavaScriptFiles();

    console.log('\n✅ Button functionality tests completed!');
    console.log('\n📚 Troubleshooting steps:');
    console.log('   1. Check browser console for JavaScript errors');
    console.log('   2. Verify all JavaScript files are loading');
    console.log('   3. Check if EnhancedImageGenerator is initializing');
    console.log('   4. Look for event listener conflicts');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
