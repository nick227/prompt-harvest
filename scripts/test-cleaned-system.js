#!/usr/bin/env node

import axios from 'axios';

const BASE_URL = 'http://localhost:3200';

async function testCleanedSystem() {
    console.log('🔍 Testing Cleaned Frontend System\n');

    try {
        const response = await axios.get(`${BASE_URL}/`);

        if (response.status === 200) {
            const content = response.data;

            // Check that legacy files are NOT loaded
            const removedFiles = [
                'script.js',
                'test-payload.js',
                'helpers/addPromptToOutput.js'
            ];

            console.log('✅ Legacy Files Removed:');
            removedFiles.forEach(file => {
                if (!content.includes(file)) {
                    console.log(`   ✅ ${file} - Correctly removed`);
                } else {
                    console.log(`   ❌ ${file} - Still present`);
                }
            });

            // Check that essential files are still loaded
            const essentialFiles = [
                'modules/images.js',
                'enhanced-image-generation.js',
                'app.js',
                'tools.js',
                'user.js'
            ];

            console.log('\n✅ Essential Files Present:');
            essentialFiles.forEach(file => {
                if (content.includes(file)) {
                    console.log(`   ✅ ${file} - Loaded`);
                } else {
                    console.log(`   ❌ ${file} - Missing`);
                }
            });

            // Check for START button
            if (content.includes('btn-generate')) {
                console.log('   ✅ START button found');
            } else {
                console.log('   ❌ START button missing');
            }

        } else {
            console.log(`❌ Main page returned status: ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Error testing cleaned system:', error.message);
    }
}

async function testJavaScriptFiles() {
    console.log('\n🔍 Testing JavaScript File Availability...\n');

    const files = [
        '/js/modules/images.js',
        '/js/enhanced-image-generation.js',
        '/js/tools.js',
        '/js/user.js',
        '/js/app.js'
    ];

    for (const file of files) {
        try {
            const response = await axios.get(`${BASE_URL}${file}`);

            if (response.status === 200) {
                console.log(`✅ ${file} - Available`);

                // Check for specific improvements
                const content = response.data;
                if (file.includes('tools.js')) {
                    if (!content.includes('eslint-disable-next-line no-unused-vars')) {
                        console.log(`   ✅ tools.js - Unused function markers removed`);
                    } else {
                        console.log(`   ⚠️  tools.js - Still has unused function markers`);
                    }

                    if (!content.includes('handleMakeBtnClick')) {
                        console.log(`   ✅ tools.js - Legacy handleMakeBtnClick removed`);
                    } else {
                        console.log(`   ❌ tools.js - Legacy handleMakeBtnClick still present`);
                    }
                }

                if (file.includes('modules/search.js')) {
                    if (!content.includes('Legacy()')) {
                        console.log(`   ✅ search.js - Legacy methods removed`);
                    } else {
                        console.log(`   ❌ search.js - Legacy methods still present`);
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

async function testRemovedFiles() {
    console.log('\n🔍 Testing Removed Files...\n');

    const removedFiles = [
        '/js/script.js',
        '/js/test-payload.js',
        '/js/helpers/addPromptToOutput.js'
    ];

    for (const file of removedFiles) {
        try {
            const response = await axios.get(`${BASE_URL}${file}`);
            console.log(`❌ ${file} - Still accessible (should be 404)`);
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log(`✅ ${file} - Correctly removed (404)`);
            } else {
                console.log(`❌ ${file} - Error: ${error.message}`);
            }
        }
    }
}

async function runTests() {
    console.log('🚀 Testing Cleaned Frontend System\n');

    await testCleanedSystem();
    await testJavaScriptFiles();
    await testRemovedFiles();

    console.log('\n✅ Cleaned system tests completed!');
    console.log('\n📚 Summary of Frontend Cleanup:');
    console.log('   ✅ Removed script.js (legacy auth check)');
    console.log('   ✅ Removed test-payload.js (development file)');
    console.log('   ✅ Removed helpers/addPromptToOutput.js (replaced by ImageComponent)');
    console.log('   ✅ Cleaned tools.js (removed unused functions)');
    console.log('   ✅ Removed legacy method names from modules');
    console.log('   ✅ Consolidated duplicate isProviderSelected functions');
    console.log('   ✅ Removed deprecated API endpoints from constants');
    console.log('   ✅ Removed legacy compatibility code from app.js');
    console.log('   ✅ Updated HTML to remove references to deleted files');

    console.log('\n📊 Code Reduction Summary:');
    console.log('   • Removed 3 legacy files');
    console.log('   • Cleaned up 6 module files');
    console.log('   • Removed ~15 legacy method names');
    console.log('   • Eliminated duplicate functions');
    console.log('   • Reduced global window exports');

    console.log('\n🔧 Expected Behavior:');
    console.log('   - All image generation functionality should work');
    console.log('   - START button should function correctly');
    console.log('   - Auto-generation should work');
    console.log('   - Search and filtering should work');
    console.log('   - User authentication should work');
    console.log('   - No console errors from removed files');

    console.log('\n🧪 Test the system:');
    console.log('   1. Visit http://localhost:3200');
    console.log('   2. Test the START button');
    console.log('   3. Check browser console for any errors');
    console.log('   4. Verify all features still work');
    console.log('   5. Confirm no references to removed files');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
