#!/usr/bin/env node

/**
 * Check Feed Dependencies
 * 
 * This script checks which feed dependencies are missing in production
 */

console.log('🔍 CHECKING FEED DEPENDENCIES');
console.log('==========================================');

const requiredDependencies = [
    'FEED_CONFIG', 'FEED_CONSTANTS', 'FeedCacheManager', 'FeedDOMManager',
    'FeedAPIManager', 'FeedUIManager', 'FeedFilterManager', 'HybridTabService',
    'FeedViewManager', 'FillToBottomManager'
];

console.log('Required dependencies:');
requiredDependencies.forEach(dep => {
    console.log(`  - ${dep}`);
});

console.log('');
console.log('Checking if these are loaded in the HTML...');

// Check if the files exist
import fs from 'fs';
import path from 'path';

const feedFiles = [
    'public/js/modules/feed/feed-constants.js',
    'public/js/modules/feed/feed-cache-manager.js',
    'public/js/modules/feed/hybrid-tab-service.js',
    'public/js/modules/feed/feed-dom-manager.js',
    'public/js/modules/feed/feed-api-manager.js',
    'public/js/modules/feed/feed-ui-manager.js',
    'public/js/modules/feed/feed-filter-manager.js',
    'public/js/modules/feed/feed-view-manager.js',
    'public/js/modules/feed/fill-to-bottom-manager.js',
    'public/js/modules/feed/feed-manager-refactored.js'
];

console.log('');
console.log('Checking feed files:');
feedFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
});

console.log('');
console.log('Checking HTML includes...');

// Check if the files are included in index.html
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

feedFiles.forEach(file => {
    const scriptName = file.replace('public/', '');
    const isIncluded = indexHtml.includes(scriptName);
    console.log(`  ${isIncluded ? '✅' : '❌'} ${scriptName}`);
});

console.log('');
console.log('==========================================');
console.log('✅ FEED DEPENDENCIES CHECK COMPLETED');
console.log('==========================================');
