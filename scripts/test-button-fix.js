#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testButtonPage() {
    console.log('🔍 Testing button test page...\n');

    try {
        const response = await axios.get(`${BASE_URL}/test-button`);

        if (response.status === 200) {
            console.log('✅ Button test page is accessible');
            console.log(`📄 Page content length: ${response.data.length} characters`);

            // Check if the page contains expected elements
            const content = response.data;
            const checks = [
                { name: 'START button', pattern: 'btn-generate' },
                { name: 'Enhanced image generation script', pattern: 'enhanced-image-generation.js' },
                { name: 'Console output area', pattern: 'console-output' },
                { name: 'Test controls', pattern: 'testButton' }
            ];

            checks.forEach(check => {
                if (content.includes(check.pattern)) {
                    console.log(`✅ ${check.name} found`);
                } else {
                    console.log(`❌ ${check.name} not found`);
                }
            });

        } else {
            console.log(`❌ Button test page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing button page:', error.message);
    }
}

async function testMainPageButton() {
    console.log('\n🔍 Testing main page button...\n');

    try {
        const response = await axios.get(`${BASE_URL}/`);

        if (response.status === 200) {
            const content = response.data;

            // Check if the main page has the button
            if (content.includes('btn-generate')) {
                console.log('✅ START button found in main page');
            } else {
                console.log('❌ START button not found in main page');
            }

            // Check if enhanced image generation script is loaded
            if (content.includes('enhanced-image-generation.js')) {
                console.log('✅ Enhanced image generation script loaded in main page');
            } else {
                console.log('❌ Enhanced image generation script not loaded in main page');
            }

            // Check if images.js is loaded (for restoreButtonState)
            if (content.includes('images.js')) {
                console.log('✅ images.js loaded in main page');
            } else {
                console.log('❌ images.js not loaded in main page');
            }

        } else {
            console.log(`❌ Main page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing main page:', error.message);
    }
}

async function testJavaScriptFiles() {
    console.log('\n🔍 Testing JavaScript file availability...\n');

    const files = [
        '/js/enhanced-image-generation.js',
        '/js/images.js',
        '/js/app.js'
    ];

    for (const file of files) {
        try {
            const response = await axios.get(`${BASE_URL}${file}`);

            if (response.status === 200) {
                console.log(`✅ ${file} - Available`);

                // Check for specific content
                const content = response.data;
                if (file.includes('enhanced-image-generation.js')) {
                    if (content.includes('restoreButtonState')) {
                        console.log(`   ✅ restoreButtonState integration found`);
                    } else {
                        console.log(`   ❌ restoreButtonState integration not found`);
                    }

                    if (content.includes('toggleProcessingStyle')) {
                        console.log(`   ✅ toggleProcessingStyle integration found`);
                    } else {
                        console.log(`   ❌ toggleProcessingStyle integration not found`);
                    }
                }

                if (file.includes('images.js')) {
                    if (content.includes('window.restoreButtonState')) {
                        console.log(`   ✅ restoreButtonState exported globally`);
                    } else {
                        console.log(`   ❌ restoreButtonState not exported globally`);
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
    console.log('🚀 Testing START Button Fixes\n');

    await testButtonPage();
    await testMainPageButton();
    await testJavaScriptFiles();

    console.log('\n✅ Button fix tests completed!');
    console.log('\n📚 Next steps:');
    console.log('   1. Visit http://localhost:3200/test-button to test the button');
    console.log('   2. Check browser console for detailed logs');
    console.log('   3. Verify button state changes (processing class, cursor, text)');
    console.log('   4. Test on main page at http://localhost:3200');
    console.log('\n🔧 Expected behavior:');
    console.log('   - Button should be clickable with pointer cursor');
    console.log('   - Clicking should add "processing" class and change text to "Generating..."');
    console.log('   - Button should be disabled during processing');
    console.log('   - After completion, button should return to "START" state');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
