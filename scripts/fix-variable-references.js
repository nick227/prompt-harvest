#!/usr/bin/env node

/**
 * Fix Variable Reference Issues
 * Systematically fixes incorrect variable references in feed-manager.js
 */

import fs from 'fs';

const filePath = 'public/js/modules/feed/feed-manager.js';

console.log('🔧 Fixing variable reference issues...\n');

if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath);
    process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const originalContent = content;

// Fix variable reference issues
const fixes = [
    // Fix result -> _result
    { from: /\bresult\./g, to: '_result.' },
    { from: /\bresult\)/g, to: '_result)' },
    { from: /\bresult\s*\|\|/g, to: '_result ||' },

    // Fix container -> _container
    { from: /\bcontainer\./g, to: '_container.' },
    { from: /\bcontainer\)/g, to: '_container)' },
    { from: /\bcontainer,/g, to: '_container,' },

    // Fix user -> _user (in specific contexts)
    { from: /\buser\s*&&/g, to: '_user &&' },
    { from: /\buser\./g, to: '_user.' }
];

let fixesApplied = 0;

fixes.forEach((fix, index) => {
    const matches = content.match(fix.from);
    if (matches) {
        content = content.replace(fix.from, fix.to);
        fixesApplied += matches.length;
        console.log(`✅ Fix ${index + 1}: ${matches.length} replacements`);
    }
});

// Additional specific fixes for function parameters
const specificFixes = [
    // createBasicImage function
    {
        from: 'createBasicImage(_result, isNewlyGenerated = false) {\n        const _container = this.getImageContainer();\n\n        if (!container) {',
        to: 'createBasicImage(_result, isNewlyGenerated = false) {\n        const _container = this.getImageContainer();\n\n        if (!_container) {'
    },
    {
        from: 'if (isNewlyGenerated) {\n            container.insertBefore(li, container.firstChild);\n        } else {\n            container.appendChild(li);\n        }',
        to: 'if (isNewlyGenerated) {\n            _container.insertBefore(li, _container.firstChild);\n        } else {\n            _container.appendChild(li);\n        }'
    }
];

specificFixes.forEach((fix, index) => {
    if (content.includes(fix.from)) {
        content = content.replace(fix.from, fix.to);
        console.log(`✅ Specific fix ${index + 1}: Applied`);
        fixesApplied++;
    }
});

if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`\n🎉 Applied ${fixesApplied} fixes to ${filePath}`);
} else {
    console.log('\n⏩ No changes needed');
}

console.log('\n✅ Variable reference fixes complete!');
