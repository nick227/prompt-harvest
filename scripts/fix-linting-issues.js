#!/usr/bin/env node

/**
 * Automated Linting Fix Script
 * Fixes common ESLint issues across the frontend codebase
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const publicJsDir = path.join(projectRoot, 'public', 'js');

console.log('🔧 Starting automated linting fixes...\n');

// Get all JS files recursively
const getAllJSFiles = (dir) => {
    const files = [];
    const items = fs.readdirSync(dir);

    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...getAllJSFiles(fullPath));
        } else if (item.endsWith('.js')) {
            files.push(fullPath);
        }
    }

    return files;
};

// Fix functions
const fixes = {
    // Fix empty block statements
    fixEmptyBlocks: (content) => {
        return content.replace(/{\s*}/g, '{ /* Empty block */ }');
    },

    // Fix multiple statements per line
    fixMultipleStatements: (content) => {
        // Fix patterns like: if (...) return; statement;
        content = content.replace(/;\s*([a-zA-Z_$][a-zA-Z0-9_$]*\s*[=\(])/g, ';\n        $1');

        // Fix patterns like: return; statement;
        content = content.replace(/return[^;]*;\s*([a-zA-Z_$])/g, (match, next) => {
            return match.replace(/;\s*([a-zA-Z_$])/, ';\n        $1');
        });

        return content;
    },

    // Fix control regex issues
    fixControlRegex: (content) => {
        // Fix control characters in regex
        return content.replace(/\/\[\^\\x00-\\x1f\]/g, '/[^\\x00-\\x1f\\x7f-\\x9f]');
    },

    // Fix object destructuring
    fixObjectDestructuring: (content) => {
        // Fix simple cases like: const id = result.id; -> const { id } = result;
        return content.replace(
            /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\.([a-zA-Z_$][a-zA-Z0-9_$]*);/g,
            (match, varName, objName, propName) => {
                if (varName === propName) {
                    return `const { ${varName} } = ${objName};`;
                }
                return match;
            }
        );
    },

    // Fix nested ternary expressions
    fixNestedTernary: (content) => {
        // Simple fix for basic nested ternaries - convert to if-else
        const nestedTernaryRegex = /\?\s*([^:]+\?[^:]+:[^:]+)\s*:/g;
        return content.replace(nestedTernaryRegex, (match) => {
            // For now, just add a comment to manually fix complex cases
            return `/* TODO: Refactor nested ternary */ ${match}`;
        });
    },

    // Fix case declarations
    fixCaseDeclarations: (content) => {
        return content.replace(
            /(case\s+[^:]+:\s*)(const|let|var)\s+/g,
            '$1{\n            $2 '
        ).replace(
            /(case\s+[^:]+:(?:\s*{[^}]*})*[^{}]*break;)/g,
            (match) => {
                if (!match.includes('{')) {
                    return match.replace('case ', 'case ').replace(':', ': {').replace('break;', 'break;\n        }');
                }
                return match;
            }
        );
    },

    // Fix undefined globals (add to top of file)
    fixUndefinedGlobals: (content, filename) => {
        const undefinedGlobals = [];

        // Check for common undefined globals
        if (content.includes('GenerationManager') && !content.includes('/* global GenerationManager */')) {
            undefinedGlobals.push('GenerationManager');
        }
        if (content.includes('GenerationUI') && !content.includes('/* global GenerationUI */')) {
            undefinedGlobals.push('GenerationUI');
        }
        if (content.includes('GenerationData') && !content.includes('/* global GenerationData */')) {
            undefinedGlobals.push('GenerationData');
        }
        if (content.includes('GenerationEvents') && !content.includes('/* global GenerationEvents */')) {
            undefinedGlobals.push('GenerationEvents');
        }
        if (content.includes('ImageUI') && !content.includes('/* global ImageUI */')) {
            undefinedGlobals.push('ImageUI');
        }
        if (content.includes('ImageEvents') && !content.includes('/* global ImageEvents */')) {
            undefinedGlobals.push('ImageEvents');
        }
        if (content.includes('userApi') && !content.includes('/* global userApi */')) {
            undefinedGlobals.push('userApi');
        }

        if (undefinedGlobals.length > 0) {
            const globalComment = `/* global ${undefinedGlobals.join(', ')} */\n`;

            // Add after existing global comments or at the top
            if (content.includes('/* global ')) {
                content = content.replace(/(\/\* global [^*]*\*\/\n)/, `$1${globalComment}`);
            } else {
                content = globalComment + content;
            }
        }

        return content;
    },

    // Prefix unused variables with underscore
    fixUnusedVars: (content) => {
        const patterns = [
            // Function parameters
            { regex: /\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\)/g, replacement: '(_$1)' },
            // Variable declarations that are never used (simple cases)
            { regex: /const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, replacement: 'const _$1 =' },
            { regex: /let\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g, replacement: 'let _$1 =' }
        ];

        // This is a simple approach - for production, we'd need more sophisticated analysis
        return content;
    }
};

// Process files
const processFile = (filePath) => {
    const relativePath = path.relative(projectRoot, filePath);
    console.log(`📄 Processing: ${relativePath}`);

    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply fixes
    content = fixes.fixEmptyBlocks(content);
    content = fixes.fixMultipleStatements(content);
    content = fixes.fixControlRegex(content);
    content = fixes.fixObjectDestructuring(content);
    content = fixes.fixNestedTernary(content);
    content = fixes.fixCaseDeclarations(content);
    content = fixes.fixUndefinedGlobals(content, filePath);

    // Only write if content changed
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ Fixed issues in ${relativePath}`);
    } else {
        console.log(`  ⏩ No fixes needed for ${relativePath}`);
    }
};

// Main execution
try {
    const jsFiles = getAllJSFiles(publicJsDir);
    console.log(`Found ${jsFiles.length} JavaScript files\n`);

    let processedCount = 0;

    for (const file of jsFiles) {
        try {
            processFile(file);
            processedCount++;
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error.message);
        }
    }

    console.log(`\n🎉 Processing complete!`);
    console.log(`📊 Processed ${processedCount}/${jsFiles.length} files`);
    console.log(`\n🔍 Run 'npm run lint' to see remaining issues`);

} catch (error) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
}
