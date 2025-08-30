#!/usr/bin/env node

/**
 * Legacy Code Cleanup Script
 * Identifies and removes unused JavaScript files and code
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const publicJsDir = path.join(projectRoot, 'public', 'js');

console.log('🧹 Starting legacy code cleanup analysis...\n');

// Files that exist but are not loaded in index.html
const unusedFiles = [
    'public/js/components/provider-component.js',  // Not referenced in index.html
    'public/js/helpers'  // Empty directory
];

// Legacy functions that have duplicates or are unused
const legacyFunctions = {
    'user.js': [
        'isValidEmail',  // Duplicate of Utils.isValidEmail and apiService.isValidEmail
        'checkPasswordStrength'  // Only used in one place, could be inlined
    ],
    'tools.js': [
        'makeFileNameSafeForWindows',  // Legacy file naming, may not be needed
        'DOWNLOAD_BTN_HTML',  // Static HTML, better in templates
        'IMAGE_FULLSCREEN_CLASS'  // Should be in CSS classes constant file
    ]
};

// Files that are loaded but may have minimal usage
const suspiciousFiles = [
    'public/js/modules/prompts/prompts-manager.js',  // Referenced in app.js but may not be actively used
    'public/js/terms-manager.js'  // Only used in terms.html, could be standalone
];

// Analysis results
const analysisResults = {
    unusedFiles: [],
    duplicateFunctions: [],
    legacyCode: [],
    recommendations: []
};

// Check if files exist and are truly unused
const analyzeUnusedFiles = () => {
    console.log('📂 Analyzing unused files...');

    unusedFiles.forEach(filePath => {
        const fullPath = path.join(projectRoot, filePath);

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);

            if (stats.isDirectory()) {
                const contents = fs.readdirSync(fullPath);
                if (contents.length === 0) {
                    analysisResults.unusedFiles.push({
                        path: filePath,
                        type: 'empty_directory',
                        action: 'safe_to_delete'
                    });
                }
            } else {
                analysisResults.unusedFiles.push({
                    path: filePath,
                    type: 'unused_script',
                    action: 'review_before_delete',
                    size: stats.size
                });
            }
        }
    });
};

// Analyze duplicate functions
const analyzeDuplicateFunctions = () => {
    console.log('🔍 Analyzing duplicate functions...');

    // Check for isValidEmail duplicates
    const emailValidators = [
        { file: 'user.js', function: 'isValidEmail' },
        { file: 'core/utils.js', function: 'isValidEmail' },
        { file: 'core/api-service.js', function: 'isValidEmail' }
    ];

    analysisResults.duplicateFunctions.push({
        function: 'isValidEmail',
        locations: emailValidators,
        recommendation: 'Consolidate to use apiService.isValidEmail() consistently'
    });
};

// Check for legacy patterns
const analyzeLegacyPatterns = () => {
    console.log('🕸️ Analyzing legacy patterns...');

    // Check tools.js for legacy patterns
    const toolsPath = path.join(publicJsDir, 'tools.js');
    if (fs.existsSync(toolsPath)) {
        const content = fs.readFileSync(toolsPath, 'utf8');

        // Check for prototype extensions (generally not recommended)
        if (content.includes('HTMLElement.prototype.addSwipe')) {
            analysisResults.legacyCode.push({
                file: 'tools.js',
                issue: 'Prototype extension on HTMLElement',
                line: 'HTMLElement.prototype.addSwipe',
                recommendation: 'Use composition or utility function instead'
            });
        }

        // Check for global constants that should be in constants.js
        if (content.includes('const IMAGE_FULLSCREEN_CLASS')) {
            analysisResults.legacyCode.push({
                file: 'tools.js',
                issue: 'CSS class constants in wrong file',
                line: 'IMAGE_FULLSCREEN_CLASS',
                recommendation: 'Move to core/constants.js'
            });
        }
    }
};

// Generate recommendations
const generateRecommendations = () => {
    console.log('💡 Generating recommendations...');

    analysisResults.recommendations = [
        {
            priority: 'high',
            action: 'Delete unused files',
            description: 'Remove provider-component.js and empty helpers directory',
            impact: 'Reduces bundle size and code complexity'
        },
        {
            priority: 'medium',
            action: 'Consolidate email validation',
            description: 'Use single email validation function from apiService',
            impact: 'Reduces code duplication and maintenance burden'
        },
        {
            priority: 'medium',
            action: 'Refactor tools.js',
            description: 'Move constants to appropriate files, avoid prototype extension',
            impact: 'Better code organization and no global pollution'
        },
        {
            priority: 'low',
            action: 'Review prompts-manager usage',
            description: 'Verify if prompts-manager is actively used or can be removed',
            impact: 'Potential size reduction if unused'
        }
    ];
};

// Create cleanup script
const createCleanupScript = () => {
    const cleanupScript = `#!/usr/bin/env node

/**
 * Automated Cleanup Script
 * Generated by legacy code analysis
 */

import fs from 'fs';
import path from 'path';

console.log('🧹 Executing automated cleanup...');

// 1. Remove empty helpers directory
const helpersDir = 'public/js/helpers';
if (fs.existsSync(helpersDir)) {
    fs.rmSync(helpersDir, { recursive: true });
    console.log('✅ Removed empty helpers directory');
}

// 2. Delete unused provider-component.js
const providerComponent = 'public/js/components/provider-component.js';
if (fs.existsSync(providerComponent)) {
    fs.unlinkSync(providerComponent);
    console.log('✅ Removed unused provider-component.js');
}

console.log('🎉 Automated cleanup complete!');
console.log('📝 Manual cleanup tasks:');
console.log('   - Consolidate email validation functions');
console.log('   - Refactor tools.js prototype extensions');
console.log('   - Move CSS constants to constants.js');
`;

    fs.writeFileSync(path.join(__dirname, 'execute-cleanup.js'), cleanupScript);
};

// Main execution
const runAnalysis = () => {
    analyzeUnusedFiles();
    analyzeDuplicateFunctions();
    analyzeLegacyPatterns();
    generateRecommendations();
    createCleanupScript();

    // Output results
    console.log('\n📊 CLEANUP ANALYSIS RESULTS\n');

    console.log('🗑️  UNUSED FILES:');
    analysisResults.unusedFiles.forEach(file => {
        console.log(`   - ${file.path} (${file.type}) - ${file.action}`);
    });

    console.log('\n📋 DUPLICATE FUNCTIONS:');
    analysisResults.duplicateFunctions.forEach(dup => {
        console.log(`   - ${dup.function}: ${dup.locations.length} instances`);
        console.log(`     Recommendation: ${dup.recommendation}`);
    });

    console.log('\n🕸️  LEGACY CODE PATTERNS:');
    analysisResults.legacyCode.forEach(legacy => {
        console.log(`   - ${legacy.file}: ${legacy.issue}`);
        console.log(`     Recommendation: ${legacy.recommendation}`);
    });

    console.log('\n💡 RECOMMENDATIONS (by priority):');
    analysisResults.recommendations.forEach(rec => {
        console.log(`   [${rec.priority.toUpperCase()}] ${rec.action}`);
        console.log(`     ${rec.description}`);
        console.log(`     Impact: ${rec.impact}\n`);
    });

    console.log('🚀 NEXT STEPS:');
    console.log('   1. Run: node scripts/execute-cleanup.js  (auto-generated)');
    console.log('   2. Manually consolidate duplicate functions');
    console.log('   3. Refactor legacy patterns in tools.js');
    console.log('   4. Test application after changes\n');

    console.log('✅ Analysis complete! Cleanup script generated: execute-cleanup.js');
};

try {
    runAnalysis();
} catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
}
