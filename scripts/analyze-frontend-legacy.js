#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const JS_DIR = 'public/js';

// Legacy patterns to identify
const LEGACY_PATTERNS = {
    unusedFunctions: /eslint-disable-next-line no-unused-vars/g,
    legacyComments: /\/\/ legacy/g,
    legacyMethods: /Legacy\(\)/g,
    duplicateFunctions: /const (\w+) = \(\) =>/g,
    globalExports: /window\.\w+ =/g,
    deprecatedAPIs: /fetchData|convertPromptToUrl|setupFeedComplete/g
};

// Files to analyze
const FILES_TO_ANALYZE = [
    'script.js',
    'test-payload.js',
    'tools.js',
    'helpers/addPromptToOutput.js',
    'user.js',
    'app.js',
    'enhanced-image-generation.js',
    'modules/images.js',
    'modules/search.js',
    'modules/textarea.js',
    'modules/rating/rating-manager.js',
    'modules/stats/stats-manager.js',
    'modules/prompts/prompts-manager.js',
    'core/constants.js'
];

function analyzeFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const analysis = {
            file: filePath,
            size: content.length,
            lines: content.split('\n').length,
            issues: []
        };

        // Check for unused functions
        const unusedMatches = content.match(LEGACY_PATTERNS.unusedFunctions);
        if (unusedMatches) {
            analysis.issues.push({
                type: 'unused_functions',
                count: unusedMatches.length,
                description: 'Functions marked as unused'
            });
        }

        // Check for legacy comments
        const legacyMatches = content.match(LEGACY_PATTERNS.legacyComments);
        if (legacyMatches) {
            analysis.issues.push({
                type: 'legacy_comments',
                count: legacyMatches.length,
                description: 'Legacy code comments found'
            });
        }

        // Check for legacy methods
        const legacyMethodMatches = content.match(LEGACY_PATTERNS.legacyMethods);
        if (legacyMethodMatches) {
            analysis.issues.push({
                type: 'legacy_methods',
                count: legacyMethodMatches.length,
                description: 'Legacy methods found'
            });
        }

        // Check for global exports
        const globalMatches = content.match(LEGACY_PATTERNS.globalExports);
        if (globalMatches) {
            analysis.issues.push({
                type: 'global_exports',
                count: globalMatches.length,
                description: 'Global window exports found'
            });
        }

        // Check for deprecated APIs
        const deprecatedMatches = content.match(LEGACY_PATTERNS.deprecatedAPIs);
        if (deprecatedMatches) {
            analysis.issues.push({
                type: 'deprecated_apis',
                count: deprecatedMatches.length,
                description: 'Deprecated API usage found'
            });
        }

        return analysis;
    } catch (error) {
        return {
            file: filePath,
            error: error.message
        };
    }
}

function findDuplicateFunctions() {
    const functionMap = new Map();
    const duplicates = [];

    FILES_TO_ANALYZE.forEach(file => {
        const filePath = path.join(JS_DIR, file);
        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Find function definitions
            const functionMatches = content.match(/const (\w+) = \(\) =>/g);
            if (functionMatches) {
                functionMatches.forEach(match => {
                    const funcName = match.match(/const (\w+) =/)[1];
                    if (functionMap.has(funcName)) {
                        duplicates.push({
                            function: funcName,
                            files: [functionMap.get(funcName), file]
                        });
                    } else {
                        functionMap.set(funcName, file);
                    }
                });
            }
        } catch (error) {
            console.log(`Error reading ${file}: ${error.message}`);
        }
    });

    return duplicates;
}

function generateReport() {
    console.log('🔍 Frontend Legacy Code Analysis\n');

    const analyses = FILES_TO_ANALYZE.map(file => {
        const filePath = path.join(JS_DIR, file);
        return analyzeFile(filePath);
    });

    const duplicates = findDuplicateFunctions();

    console.log('📊 File Analysis Results:\n');

    analyses.forEach(analysis => {
        if (analysis.error) {
            console.log(`❌ ${analysis.file}: ${analysis.error}`);
            return;
        }

        console.log(`📄 ${analysis.file} (${analysis.lines} lines, ${analysis.size} chars)`);

        if (analysis.issues.length === 0) {
            console.log('   ✅ No issues found');
        } else {
            analysis.issues.forEach(issue => {
                console.log(`   ⚠️  ${issue.type}: ${issue.count} instances - ${issue.description}`);
            });
        }
        console.log('');
    });

    console.log('🔄 Duplicate Functions Found:\n');
    if (duplicates.length === 0) {
        console.log('✅ No duplicate functions found');
    } else {
        duplicates.forEach(dup => {
            console.log(`⚠️  ${dup.function}: found in ${dup.files.join(', ')}`);
        });
    }

    console.log('\n📋 Legacy Code Summary:');
    console.log('   • script.js - Legacy user authentication check');
    console.log('   • test-payload.js - Development testing file');
    console.log('   • tools.js - Multiple unused functions and deprecated APIs');
    console.log('   • helpers/addPromptToOutput.js - Legacy prompt output function');
    console.log('   • Multiple modules have legacy method names');
    console.log('   • Global window exports throughout codebase');

    console.log('\n🎯 Recommended Actions:');
    console.log('   1. Remove script.js (functionality moved to user.js)');
    console.log('   2. Remove test-payload.js (development file)');
    console.log('   3. Clean up tools.js unused functions');
    console.log('   4. Remove helpers/addPromptToOutput.js (replaced by ImageComponent)');
    console.log('   5. Consolidate duplicate isProviderSelected functions');
    console.log('   6. Remove legacy method names from modules');
    console.log('   7. Reduce global window exports');
}

generateReport();
