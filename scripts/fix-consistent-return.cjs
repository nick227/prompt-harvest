#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing consistent-return errors...');

// Get all files with consistent-return errors
const lintOutput = execSync('npm run lint:backend 2>&1', { encoding: 'utf8' });
const consistentReturnErrors = lintOutput
    .split('\n')
    .filter(line => line.includes('consistent-return'))
    .map(line => {
        const match = line.match(/^([^:]+):(\d+):(\d+)/);
        if (match) {
            return {
                file: match[1].trim(),
                line: parseInt(match[2]),
                column: parseInt(match[3])
            };
        }
        return null;
    })
    .filter(Boolean);

console.log(`Found ${consistentReturnErrors.length} consistent-return errors`);

// Group by file
const fileGroups = {};
consistentReturnErrors.forEach(error => {
    if (!fileGroups[error.file]) {
        fileGroups[error.file] = [];
    }
    fileGroups[error.file].push(error);
});

// Fix each file
for (const [filePath, errors] of Object.entries(fileGroups)) {
    console.log(`Fixing ${errors.length} errors in ${filePath}`);
    
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Common patterns to fix
        const fixes = [
            // Pattern 1: res.status().json() without return
            {
                pattern: /^(\s+)(res\.status\(\d+\)\.json\([^;]+\);)$/gm,
                replacement: '$1return $2'
            },
            // Pattern 2: res.json() without return  
            {
                pattern: /^(\s+)(res\.json\([^;]+\);)$/gm,
                replacement: '$1return $2'
            },
            // Pattern 3: res.send() without return
            {
                pattern: /^(\s+)(res\.send\([^;]+\);)$/gm,
                replacement: '$1return $2'
            }
        ];
        
        let modified = false;
        fixes.forEach(fix => {
            const newContent = content.replace(fix.pattern, fix.replacement);
            if (newContent !== content) {
                content = newContent;
                modified = true;
            }
        });
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed ${filePath}`);
        }
    } catch (error) {
        console.error(`❌ Error fixing ${filePath}:`, error.message);
    }
}

console.log('🎉 Consistent-return fixes completed!');
