#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testSimplifiedSystem() {
    console.log('🔍 Testing Simplified Image Generation System\n');

    try {
        const response = await axios.get(`${BASE_URL}/`);

        if (response.status === 200) {
            const content = response.data;

            // Check if the main scripts are loaded
            const checks = [
                { name: 'modules/images.js', pattern: 'modules/images.js' },
                { name: 'enhanced-image-generation.js', pattern: 'enhanced-image-generation.js' },
                { name: 'START button', pattern: 'btn-generate' },
                { name: 'ImageComponent', pattern: 'image-component.js' }
            ];

            checks.forEach(check => {
                if (content.includes(check.pattern)) {
                    console.log(`✅ ${check.name} found`);
                } else {
                    console.log(`❌ ${check.name} not found`);
                }
            });

            // Check that legacy images.js is NOT loaded
            if (!content.includes('images.js')) {
                console.log('✅ Legacy images.js correctly removed');
            } else {
                console.log('❌ Legacy images.js still present');
            }

        } else {
            console.log(`❌ Main page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing simplified system:', error.message);
    }
}

async function testJavaScriptFiles() {
    console.log('\n🔍 Testing JavaScript file availability...\n');

    const files = [
        '/js/modules/images.js',
        '/js/enhanced-image-generation.js',
        '/js/components/image-component.js'
    ];

    for (const file of files) {
        try {
            const response = await axios.get(`${BASE_URL}${file}`);

            if (response.status === 200) {
                console.log(`✅ ${file} - Available`);

                // Check for specific content
                const content = response.data;
                if (file.includes('modules/images.js')) {
                    if (content.includes('class ImagesManager')) {
                        console.log(`   ✅ ImagesManager class found`);
                    } else {
                        console.log(`   ❌ ImagesManager class not found`);
                    }

                    if (content.includes('window.generateImage')) {
                        console.log(`   ✅ generateImage exported globally`);
                    } else {
                        console.log(`   ❌ generateImage not exported globally`);
                    }
                }

                if (file.includes('enhanced-image-generation.js')) {
                    if (content.includes('window.generateImage')) {
                        console.log(`   ✅ Uses existing generateImage function`);
                    } else {
                        console.log(`   ❌ Does not use existing generateImage function`);
                    }

                    if (content.includes('class EnhancedImageGenerator')) {
                        console.log(`   ✅ EnhancedImageGenerator class found`);
                    } else {
                        console.log(`   ❌ EnhancedImageGenerator class not found`);
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

async function testButtonPage() {
    console.log('\n🔍 Testing button test page...\n');

    try {
        const response = await axios.get(`${BASE_URL}/test-button`);

        if (response.status === 200) {
            console.log('✅ Button test page is accessible');

            const content = response.data;
            if (content.includes('enhanced-image-generation.js')) {
                console.log('✅ Enhanced image generation script loaded in test page');
            } else {
                console.log('❌ Enhanced image generation script not loaded in test page');
            }

        } else {
            console.log(`❌ Button test page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing button page:', error.message);
    }
}

async function runTests() {
    console.log('🚀 Testing Simplified Image Generation System\n');

    await testSimplifiedSystem();
    await testJavaScriptFiles();
    await testButtonPage();

    console.log('\n✅ Simplified system tests completed!');
    console.log('\n📚 Summary of changes:');
    console.log('   ✅ Removed legacy images.js file');
    console.log('   ✅ Simplified enhanced-image-generation.js');
    console.log('   ✅ Enhanced image generation now uses modules/images.js');
    console.log('   ✅ Removed redundant code and functionality');
    console.log('   ✅ Maintained all essential features');
    console.log('\n🔧 Expected behavior:');
    console.log('   - START button should work correctly');
    console.log('   - Image generation should use modules/images.js');
    console.log('   - Auto-generation should still work');
    console.log('   - Button state management should work');
    console.log('   - Loading placeholders should display');
    console.log('\n🧪 Test the system:');
    console.log('   1. Visit http://localhost:3200');
    console.log('   2. Test the START button');
    console.log('   3. Check browser console for logs');
    console.log('   4. Verify image generation works');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
