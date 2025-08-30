#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to fix optional chaining in a file
const fixOptionalChaining = filePath => {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Fix broken optional chaining patterns
        content = content.replace(/\?\s*\./g, '?.');
        content = content.replace(/\s*\?\s*\./g, '?.');

        // If content changed, write it back
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed optional chaining in: ${filePath}`);

            return true;
        }

        return false;
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);

        return false;
    }
};

// Function to recursively find and fix JavaScript files
const fixFilesInDirectory = dir => {
    const files = fs.readdirSync(dir);
    let fixedCount = 0;

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            fixedCount += fixFilesInDirectory(filePath);
        } else if (file.endsWith('.js') && !file.includes('node_modules')) {
            if (fixOptionalChaining(filePath)) {
                fixedCount++;
            }
        }
    }

    return fixedCount;
};

// Main execution
console.log('🔧 Fixing optional chaining in JavaScript files...');

const directories = ['src', 'public/js', 'lib'];
let totalFixed = 0;

for (const dir of directories) {
    if (fs.existsSync(dir)) {
        const fixed = fixFilesInDirectory(dir);

        totalFixed += fixed;
        console.log(`📁 Processed ${dir}: ${fixed} files fixed`);
    }
}

console.log(`\n✅ Total files fixed: ${totalFixed}`);
console.log('🎯 Optional chaining should now work correctly!');
