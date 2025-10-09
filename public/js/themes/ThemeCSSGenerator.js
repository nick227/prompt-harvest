/**
 * Theme CSS Generator - Handles CSS generation for themes
 * Extracted from SimpleThemeService to reduce file size
 */
class ThemeCSSGenerator {
    /**
     * Generate CSS for a theme
     */
    static generateCSS(theme) {
        const isLight = theme.type === 'light';
        const textColor = theme.colors['--color-text-primary'];

        return `
/* Theme Variables */
:root {
    ${Object.entries(theme.colors).map(([key, value]) => `${key}: ${value};`).join('\n    ')}
}

/* Base Styles */
body {
    background-color: var(--color-background-primary);
    color: var(--color-text-primary);
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* Header Styles */
header {
    background-color: var(--color-background-secondary);
    border-color: var(--color-border-primary);
}

/* Interactive Elements */
button, .btn {
    background-color: var(--color-interactive-primary);
    color: ${isLight ? '#ffffff' : 'var(--color-text-primary)'};
    border-color: var(--color-border-primary);
    transition: background-color 0.2s ease, border-color 0.2s ease;
}

button:hover, .btn:hover {
    background-color: var(--color-interactive-primary-hover);
}

/* Form Elements - Comprehensive Coverage */
input, textarea, select {
    background-color: var(--color-surface-primary) !important;
    border-color: var(--color-border-primary) !important;
    color: var(--color-text-primary) !important;
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

input:focus, textarea:focus, select:focus {
    border-color: var(--color-accent-primary) !important;
    outline: none;
    box-shadow: 0 0 0 2px var(--color-accent-primary);
}

/* Theme Select Boxes - Specific Fix */
#theme-select, #mobile-theme-select {
    background-color: var(--color-surface-primary) !important;
    border-color: var(--color-border-primary) !important;
    color: var(--color-text-primary) !important;
}

#theme-select option, #mobile-theme-select option {
    background-color: var(--color-surface-primary) !important;
    color: var(--color-text-primary) !important;
}

/* Drawer and Panel Styles */
#controls-drawer, #mobile-controls-drawer {
    background: linear-gradient(to bottom, var(--color-background-primary), var(--color-background-secondary), var(--color-background-primary));
    border-color: var(--color-border-primary);
}

/* Drawer Content Areas */
#controls-drawer *, #mobile-controls-drawer * {
    color: var(--color-text-primary) !important;
}

#controls-drawer h3, #mobile-controls-drawer h3 {
    color: var(--color-accent-primary) !important;
}

#controls-drawer label, #mobile-controls-drawer label {
    color: var(--color-text-secondary) !important;
}

#controls-drawer .text-xs, #mobile-controls-drawer .text-xs {
    color: var(--color-text-tertiary) !important;
}

/* Surface Elements - Comprehensive */
.bg-gray-800, .bg-gray-700, .bg-gray-600, .bg-gray-500 {
    background-color: var(--color-surface-primary) !important;
}

.bg-gray-900 {
    background-color: var(--color-background-primary) !important;
}

.bg-gray-800\\/50 {
    background-color: var(--color-surface-secondary) !important;
}

/* Text Colors - Comprehensive Coverage */
.text-gray-200, .text-gray-300, .text-gray-400 {
    color: var(--color-text-secondary) !important;
}

.text-gray-500, .text-gray-600 {
    color: var(--color-text-tertiary) !important;
}

.text-white {
    color: var(--color-text-primary) !important;
}

.text-black {
    color: var(--color-text-primary) !important;
}

/* Additional Text Color Variations */
.text-muted {
    color: var(--color-text-muted) !important;
}

.text-subtle {
    color: var(--color-text-subtle) !important;
}

.text-disabled {
    color: var(--color-text-disabled) !important;
}

.text-inverse {
    color: var(--color-text-inverse) !important;
}

/* Border Colors */
.border-gray-600, .border-gray-700, .border-gray-500 {
    border-color: var(--color-border-primary) !important;
}

/* Status Colors */
.text-success { color: var(--color-status-success) !important; }
.text-warning { color: var(--color-status-warning) !important; }
.text-error { color: var(--color-status-error) !important; }
.text-info { color: var(--color-status-info) !important; }

/* Rating Colors */
.text-yellow-400 {
    color: var(--color-rating) !important;
}

/* Accent Colors - Comprehensive */
.text-green-400, .text-blue-400, .text-purple-400 {
    color: var(--color-accent-primary) !important;
}

/* Enhanced Accent Colors */
.text-accent-primary { color: var(--color-accent-primary) !important; }
.text-accent-secondary { color: var(--color-accent-secondary) !important; }
.text-accent-tertiary { color: var(--color-accent-tertiary) !important; }
.text-accent-quaternary { color: var(--color-accent-quaternary) !important; }

/* Status Light Colors */
.bg-status-success-light { background-color: var(--color-status-success-light) !important; }
.bg-status-warning-light { background-color: var(--color-status-warning-light) !important; }
.bg-status-error-light { background-color: var(--color-status-error-light) !important; }
.bg-status-info-light { background-color: var(--color-status-info-light) !important; }

.text-status-success-light { color: var(--color-status-success-light) !important; }
.text-status-warning-light { color: var(--color-status-warning-light) !important; }
.text-status-error-light { color: var(--color-status-error-light) !important; }
.text-status-info-light { color: var(--color-status-info-light) !important; }

/* Checkbox and Form Controls */
.checkbox-custom {
    background-color: var(--color-surface-secondary) !important;
    border-color: var(--color-border-secondary) !important;
}

input[type="checkbox"]:checked + .checkbox-custom {
    background-color: var(--color-accent-primary) !important;
    border-color: var(--color-accent-primary) !important;
}

/* Labels and Text Elements */
label {
    color: var(--color-text-secondary) !important;
}

span {
    color: var(--color-text-primary) !important;
}

/* Button States */
.btn-generate, .btn-replace, .btn-record, .btn-magic {
    background-color: var(--color-interactive-primary) !important;
    color: ${isLight ? '#ffffff' : 'var(--color-text-primary)'} !important;
    border-color: var(--color-border-primary) !important;
}

.btn-generate:hover, .btn-replace:hover, .btn-record:hover, .btn-magic:hover {
    background-color: var(--color-interactive-primary-hover) !important;
}

/* View Switch Buttons */
input[type="radio"] + span {
    color: var(--color-text-primary) !important;
}

input[type="radio"]:checked + span {
    color: var(--color-accent-primary) !important;
}

/* Placeholder Text */
::placeholder {
    color: var(--color-text-tertiary) !important;
    opacity: 1;
}

/* Scrollbar Styling */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    background: var(--color-surface-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--color-border-secondary);
    border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
    background: var(--color-border-primary);
}

/* Inline Style Overrides */
[style*="color: #1f2937"] { color: var(--color-text-primary) !important; }
[style*="color: #059669"] { color: var(--color-status-success) !important; }
[style*="background: #3b82f6"] { background: var(--color-interactive-primary) !important; }

/* Additional Specific Element Fixes */
.main-container, .main-controls-container {
    color: var(--color-text-primary) !important;
}

.matches, .prompt-output {
    color: var(--color-text-primary) !important;
}

.view-switch label {
    background-color: var(--color-surface-secondary) !important;
    color: var(--color-text-primary) !important;
    border-color: var(--color-border-primary) !important;
}

.view-switch label:hover {
    background-color: var(--color-surface-tertiary) !important;
}

/* Image and content areas */
.generated-image, .image-wrapper {
    border-color: var(--color-border-primary) !important;
}

/* Notification areas */
#notification-container {
    color: var(--color-text-primary) !important;
}

/* Search and input areas */
.search input, .search-replace input {
    background-color: var(--color-surface-primary) !important;
    color: var(--color-text-primary) !important;
    border-color: var(--color-border-primary) !important;
}

/* Provider and history lists */
#provider-list, #mobile-provider-list {
    color: var(--color-text-primary) !important;
}

/* Rating and stats elements */
.image-rating, .transaction-stats {
    color: var(--color-text-primary) !important;
}

/* Force text readability on all elements */
p, div, span, h1, h2, h3, h4, h5, h6, a, li, td, th {
    color: var(--color-text-primary) !important;
}

/* Specific override for any remaining gray text */
.text-gray-100, .text-gray-800, .text-gray-900 {
    color: var(--color-text-primary) !important;
}

/* Ensure all form elements are readable */
input[type="text"], input[type="number"], input[type="email"], input[type="password"] {
    color: var(--color-text-primary) !important;
}

/* Smooth Transitions for Theme Changes */
* {
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Universal Prompt Textarea Styling */
#prompt-textarea, #prompt-input, textarea[name="prompt"], .prompt-textarea {
    border: 2px solid var(--color-prompt-border) !important;
    border-radius: 8px !important;
    transition: all 0.3s ease !important;
}

#prompt-textarea:focus, #prompt-input:focus, textarea[name="prompt"]:focus, .prompt-textarea:focus {
    border-color: var(--color-prompt-focus-border) !important;
    outline: none !important;
    box-shadow: 0 0 0 2px var(--color-prompt-focus-border) !important;
}

/* Monokai-specific prompt textarea customization */
${theme.name === 'Monokai'
        ? `
#prompt-textarea, #prompt-input, textarea[name="prompt"], .prompt-textarea {
    background-color: var(--color-prompt-background) !important;
    color: var(--color-prompt-text) !important;
    padding: 12px !important;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

#prompt-textarea:focus, #prompt-input:focus, textarea[name="prompt"]:focus, .prompt-textarea:focus {
    box-shadow: 0 0 0 3px rgba(255, 97, 136, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

#prompt-textarea::placeholder, #prompt-input::placeholder, textarea[name="prompt"]::placeholder, .prompt-textarea::placeholder {
    color: var(--color-prompt-placeholder) !important;
    font-style: italic !important;
}

/* Monokai syntax highlighting for prompt text */
.prompt-textarea .keyword { color: var(--color-accent-primary) !important; }
.prompt-textarea .string { color: var(--color-accent-tertiary) !important; }
.prompt-textarea .comment { color: var(--color-prompt-placeholder) !important; }
`
        : ''}
`;
    }
}

// Export for use in other modules
window.ThemeCSSGenerator = ThemeCSSGenerator;
