const fs = require('fs');
const path = require('path');

function checkSyntax(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        // Try to parse the JavaScript
        Function(content);
        return { valid: true, error: null };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

const files = [
    'js/components/ai-chat-widget.js',
    'js/components/controls-drawer.js',
    'js/components/header-component.js',
    'js/components/unified-drawer-component.js',
    'js/components/image/image-component.js',
    'js/components/image/unified-navigation.js',
    'js/components/image/unified-info-box.js'
];


files.forEach(file => {
    const result = checkSyntax(file);
    if (result.valid) {
    } else {
    }
});
