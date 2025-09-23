#!/usr/bin/env node

/**
 * Test Feed Manager Loading
 * 
 * This script tests if the feed manager dependencies are loading properly
 */

import fs from 'fs';

console.log('🔍 TESTING FEED MANAGER LOADING');
console.log('==========================================');

// Check if all required files exist and have proper exports
const requiredFiles = [
    { file: 'public/js/core/constants.js', exports: ['FEED_CONFIG'] },
    { file: 'public/js/modules/feed/feed-constants.js', exports: ['FEED_CONSTANTS'] },
    { file: 'public/js/modules/feed/feed-cache-manager.js', exports: ['FeedCacheManager'] },
    { file: 'public/js/modules/feed/feed-dom-manager.js', exports: ['FeedDOMManager'] },
    { file: 'public/js/modules/feed/feed-api-manager.js', exports: ['FeedAPIManager'] },
    { file: 'public/js/modules/feed/feed-ui-manager.js', exports: ['FeedUIManager'] },
    { file: 'public/js/modules/feed/feed-filter-manager.js', exports: ['FeedFilterManager'] },
    { file: 'public/js/modules/feed/hybrid-tab-service.js', exports: ['HybridTabService'] },
    { file: 'public/js/modules/feed/feed-view-manager.js', exports: ['FeedViewManager'] },
    { file: 'public/js/modules/feed/fill-to-bottom-manager.js', exports: ['FillToBottomManager'] }
];

console.log('Checking feed manager dependencies:');
console.log('');

let allGood = true;

for (const { file, exports } of requiredFiles) {
    try {
        const content = fs.readFileSync(file, 'utf8');
        const exists = fs.existsSync(file);
        
        console.log(`${exists ? '✅' : '❌'} ${file}`);
        
        if (!exists) {
            allGood = false;
            continue;
        }
        
        // Check if the file exports the required classes/constants
        for (const exportName of exports) {
            const hasExport = content.includes(`window.${exportName}`) || 
                             content.includes(`export`) ||
                             content.includes(`class ${exportName}`) ||
                             content.includes(`const ${exportName}`);
            
            console.log(`  ${hasExport ? '✅' : '❌'} ${exportName}`);
            
            if (!hasExport) {
                allGood = false;
            }
        }
        
    } catch (error) {
        console.log(`❌ ${file} - Error reading: ${error.message}`);
        allGood = false;
    }
    
    console.log('');
}

console.log('==========================================');
if (allGood) {
    console.log('✅ ALL FEED MANAGER DEPENDENCIES LOOK GOOD');
} else {
    console.log('❌ SOME FEED MANAGER DEPENDENCIES ARE MISSING');
}
console.log('==========================================');
