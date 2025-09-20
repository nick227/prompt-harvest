/**
 * Theme Service - Manages theme switching and CSS injection
 * Provides instant theme switching by injecting CSS variables into the document
 */
class ThemeService {
    constructor() {
        this.currentTheme = 'default';
        this.themes = this.initializeThemes();
        this.themeStyleElement = null;
        this.isApplyingTheme = false; // Flag to prevent recursion
        this.init();
    }

    init() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('imageHarvest_theme');

        console.log('Theme Service: Loading saved theme:', savedTheme);

        if (savedTheme && this.themes[savedTheme]) {
            this.currentTheme = savedTheme;
            console.log('Theme Service: Using saved theme:', savedTheme);
        } else {
            console.log('Theme Service: No valid saved theme, using default:', this.currentTheme);
        }

        // Apply the theme
        this.applyTheme(this.currentTheme);

        // Listen for theme changes from other components
        this.setupEventListeners();
    }

    /**
     * Initialize the available themes
     */
    initializeThemes() {
        return {
            default: {
                name: 'Default Dark',
                description: 'Original dark theme',
                colors: {
                    // Keep all existing variables as-is
                }
            },
            professional: {
                name: 'Professional',
                description: 'Clean black text on white backgrounds with high contrast',
                colors: {
                    // Tailwind CSS Variables for professional theme
                    '--tw-bg-opacity': '1',
                    '--tw-text-opacity': '1',
                    '--tw-border-opacity': '1',
                    // Professional theme uses light backgrounds with dark text
                    '--color-gray-50': '#ffffff',
                    '--color-gray-100': '#f8fafc',
                    '--color-gray-200': '#f1f5f9',
                    '--color-gray-300': '#e2e8f0',
                    '--color-gray-400': '#cbd5e1',
                    '--color-gray-500': '#94a3b8',
                    '--color-gray-600': '#64748b',
                    '--color-gray-700': '#475569',
                    '--color-gray-800': '#f1f5f9', // Light background instead of dark
                    '--color-gray-900': '#f8fafc', // Light background instead of dark
                    // Custom variables - light backgrounds, dark text
                    '--color-background-primary': '#ffffff',
                    '--color-background-secondary': '#f8fafc',
                    '--color-background-tertiary': '#f1f5f9',
                    '--color-background-quaternary': '#e2e8f0',
                    '--color-surface-primary': '#ffffff',
                    '--color-surface-secondary': '#f8fafc',
                    '--color-surface-tertiary': '#f1f5f9',
                    '--color-surface-elevated': '#ffffff',
                    '--color-border-primary': '#e2e8f0',
                    '--color-border-secondary': '#cbd5e1',
                    '--color-border-tertiary': '#94a3b8',
                    '--color-text-primary': '#0f172a',
                    '--color-text-secondary': '#1e293b',
                    '--color-text-tertiary': '#334155',
                    '--color-accent-primary': '#2563eb',
                    '--color-accent-secondary': '#1d4ed8',
                    '--color-interactive-primary': '#2563eb',
                    '--color-interactive-primary-hover': '#1d4ed8'
                }
            },
            discord: {
                name: 'Discord',
                description: 'Discord-inspired dark theme with purple accents',
                colors: {
                    // Tailwind CSS Variables for Discord theme
                    '--tw-bg-opacity': '1',
                    '--tw-text-opacity': '1',
                    '--tw-border-opacity': '1',
                    '--color-gray-50': '#f8fafc',
                    '--color-gray-100': '#f1f5f9',
                    '--color-gray-200': '#e2e8f0',
                    '--color-gray-300': '#cbd5e1',
                    '--color-gray-400': '#94a3b8',
                    '--color-gray-500': '#64748b',
                    '--color-gray-600': '#475569',
                    '--color-gray-700': '#334155',
                    '--color-gray-800': '#1e293b',
                    '--color-gray-900': '#0f172a',
                    // Custom variables
                    '--color-background-primary': '#36393f',
                    '--color-background-secondary': '#2f3136',
                    '--color-background-tertiary': '#202225',
                    '--color-background-quaternary': '#1a1c1f',
                    '--color-surface-primary': '#36393f',
                    '--color-surface-secondary': '#2f3136',
                    '--color-surface-tertiary': '#202225',
                    '--color-surface-elevated': '#40444b',
                    '--color-border-primary': '#40444b',
                    '--color-border-secondary': '#4f545c',
                    '--color-border-tertiary': '#5d6269',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#dcddde',
                    '--color-text-tertiary': '#b9bbbe',
                    '--color-accent-primary': '#5865f2',
                    '--color-accent-secondary': '#4752c4',
                    '--color-interactive-primary': '#5865f2',
                    '--color-interactive-primary-hover': '#4752c4',
                    // Discord-specific gray mappings
                    '--color-gray-50': '#f8fafc',
                    '--color-gray-100': '#f1f5f9',
                    '--color-gray-200': '#e2e8f0',
                    '--color-gray-300': '#cbd5e1',
                    '--color-gray-400': '#94a3b8',
                    '--color-gray-500': '#64748b',
                    '--color-gray-600': '#475569',
                    '--color-gray-700': '#334155',
                    '--color-gray-800': '#1e293b',
                    '--color-gray-900': '#0f172a'
                }
            },
            apple: {
                name: 'Apple',
                description: 'Apple-inspired clean design with high contrast',
                colors: {
                    // Tailwind CSS Variables for Apple theme
                    '--tw-bg-opacity': '1',
                    '--tw-text-opacity': '1',
                    '--tw-border-opacity': '1',
                    // Apple theme uses light backgrounds with dark text
                    '--color-gray-50': '#ffffff',
                    '--color-gray-100': '#f8f9fa',
                    '--color-gray-200': '#e9ecef',
                    '--color-gray-300': '#dee2e6',
                    '--color-gray-400': '#ced4da',
                    '--color-gray-500': '#adb5bd',
                    '--color-gray-600': '#6c757d',
                    '--color-gray-700': '#495057',
                    '--color-gray-800': '#e9ecef', // Light background instead of dark
                    '--color-gray-900': '#f8f9fa', // Light background instead of dark
                    // Custom variables - light backgrounds, dark text
                    '--color-background-primary': '#ffffff',
                    '--color-background-secondary': '#f8f9fa',
                    '--color-background-tertiary': '#e9ecef',
                    '--color-background-quaternary': '#dee2e6',
                    '--color-surface-primary': '#ffffff',
                    '--color-surface-secondary': '#f8f9fa',
                    '--color-surface-tertiary': '#e9ecef',
                    '--color-surface-elevated': '#ffffff',
                    '--color-border-primary': '#dee2e6',
                    '--color-border-secondary': '#ced4da',
                    '--color-border-tertiary': '#adb5bd',
                    '--color-text-primary': '#212529',
                    '--color-text-secondary': '#343a40',
                    '--color-text-tertiary': '#495057',
                    '--color-accent-primary': '#007aff',
                    '--color-accent-secondary': '#0056b3',
                    '--color-interactive-primary': '#007aff',
                    '--color-interactive-primary-hover': '#0056b3'
                }
            },
            monokai: {
                name: 'Monokai',
                description: 'Monokai editor theme with vibrant colors',
                colors: {
                    // Tailwind CSS Variables for Monokai theme
                    '--tw-bg-opacity': '1',
                    '--tw-text-opacity': '1',
                    '--tw-border-opacity': '1',
                    '--color-gray-50': '#f8f8f2',
                    '--color-gray-100': '#f1f1eb',
                    '--color-gray-200': '#e8e8e2',
                    '--color-gray-300': '#d8d8d2',
                    '--color-gray-400': '#b8b8b2',
                    '--color-gray-500': '#888878',
                    '--color-gray-600': '#75715e',
                    '--color-gray-700': '#49483e',
                    '--color-gray-800': '#272822',
                    '--color-gray-900': '#1e1e1e',
                    // Custom variables
                    '--color-background-primary': '#272822',
                    '--color-background-secondary': '#1e1e1e',
                    '--color-background-tertiary': '#181818',
                    '--color-background-quaternary': '#141414',
                    '--color-surface-primary': '#272822',
                    '--color-surface-secondary': '#1e1e1e',
                    '--color-surface-tertiary': '#181818',
                    '--color-surface-elevated': '#49483e',
                    '--color-border-primary': '#49483e',
                    '--color-border-secondary': '#75715e',
                    '--color-border-tertiary': '#888878',
                    '--color-text-primary': '#f8f8f2',
                    '--color-text-secondary': '#e8e8e2',
                    '--color-text-tertiary': '#d8d8d2',
                    '--color-accent-primary': '#f92672',
                    '--color-accent-secondary': '#66d9ef',
                    '--color-interactive-primary': '#f92672',
                    '--color-interactive-primary-hover': '#e91e63',
                    // Monokai-specific gray mappings
                    '--color-gray-50': '#f8f8f2',
                    '--color-gray-100': '#f1f1eb',
                    '--color-gray-200': '#e8e8e2',
                    '--color-gray-300': '#d8d8d2',
                    '--color-gray-400': '#b8b8b2',
                    '--color-gray-500': '#888878',
                    '--color-gray-600': '#75715e',
                    '--color-gray-700': '#49483e',
                    '--color-gray-800': '#272822',
                    '--color-gray-900': '#1e1e1e'
                }
            },
            highContrast: {
                name: 'High Contrast',
                description: 'Pure white on pure black for maximum contrast',
                colors: {
                    // Tailwind CSS Variables for high contrast theme
                    '--tw-bg-opacity': '1',
                    '--tw-text-opacity': '1',
                    '--tw-border-opacity': '1',
                    '--color-gray-50': '#ffffff',
                    '--color-gray-100': '#ffffff',
                    '--color-gray-200': '#ffffff',
                    '--color-gray-300': '#ffffff',
                    '--color-gray-400': '#ffffff',
                    '--color-gray-500': '#ffffff',
                    '--color-gray-600': '#ffffff',
                    '--color-gray-700': '#ffffff',
                    '--color-gray-800': '#000000',
                    '--color-gray-900': '#000000',
                    // Custom variables
                    '--color-background-primary': '#000000',
                    '--color-background-secondary': '#000000',
                    '--color-background-tertiary': '#000000',
                    '--color-background-quaternary': '#000000',
                    '--color-surface-primary': '#000000',
                    '--color-surface-secondary': '#000000',
                    '--color-surface-tertiary': '#000000',
                    '--color-surface-elevated': '#000000',
                    '--color-border-primary': '#ffffff',
                    '--color-border-secondary': '#ffffff',
                    '--color-border-tertiary': '#ffffff',
                    '--color-text-primary': '#ffffff',
                    '--color-text-secondary': '#ffffff',
                    '--color-text-tertiary': '#ffffff',
                    '--color-accent-primary': '#ffffff',
                    '--color-accent-secondary': '#ffffff',
                    '--color-interactive-primary': '#ffffff',
                    '--color-interactive-primary-hover': '#cccccc',
                    // High contrast gray mappings
                    '--color-gray-50': '#ffffff',
                    '--color-gray-100': '#ffffff',
                    '--color-gray-200': '#ffffff',
                    '--color-gray-300': '#ffffff',
                    '--color-gray-400': '#ffffff',
                    '--color-gray-500': '#ffffff',
                    '--color-gray-600': '#ffffff',
                    '--color-gray-700': '#ffffff',
                    '--color-gray-800': '#000000',
                    '--color-gray-900': '#000000'
                }
            }
        };
    }

    /**
     * Setup event listeners for theme changes
     */
    setupEventListeners() {
        // Theme service doesn't need to listen to its own events
        // This prevents recursion
    }

    /**
     * Calculate luminance of a hex color
     * @param {string} hex - Hex color value
     * @returns {number} Luminance value between 0 and 1
     */
    getLuminance(hex) {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;

        const [rs, gs, bs] = [r, g, b].map(c => {
            c /= 255;

            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }

    /**
     * Get optimal text color for a background
     * @param {string} bgColor - Background color hex
     * @param {object} theme - Theme object
     * @returns {string} CSS variable for optimal text color
     */
    getOptimalTextColor(bgColor, theme) {
        const luminance = this.getLuminance(bgColor);

        // If background is light (luminance > 0.5), use dark text, otherwise use light text
        return luminance > 0.5 ? 'var(--color-text-primary)' : 'var(--color-text-primary)';
    }

    /**
     * Apply a theme by injecting CSS variables
     * @param {string} themeName - Name of the theme to apply
     */
    applyTheme(themeName) {
        // Prevent recursion
        if (this.isApplyingTheme) {
            console.log('Theme application already in progress, skipping...');

            return;
        }

        if (!this.themes[themeName]) {
            console.warn(`Theme '${themeName}' not found, falling back to default`);

            themeName = 'default';
        }

        // Check if theme is already applied
        if (this.currentTheme === themeName) {
            console.log(`Theme '${themeName}' is already applied`);

            return;
        }

        this.isApplyingTheme = true;
        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // Remove existing theme styles
        if (this.themeStyleElement) {
            this.themeStyleElement.remove();
        }

        // Create new style element
        this.themeStyleElement = document.createElement('style');
        this.themeStyleElement.id = 'theme-override';
        this.themeStyleElement.type = 'text/css';

        // Generate CSS with theme colors
        let css = ':root {\n';

        Object.entries(theme.colors).forEach(([property, value]) => {
            css += `    ${property}: ${value} !important;\n`;
        });

        css += '}\n\n';

        // Add comprehensive overrides with intelligent contrast
        css += '/* Theme-specific overrides with contrast-aware text colors */\n';

        // Determine if this is a light or dark theme
        const isLightTheme = themeName === 'professional' || themeName === 'apple';
        const primaryTextColor = isLightTheme ? 'var(--color-text-primary)' : 'var(--color-text-primary)';
        const secondaryTextColor = isLightTheme ? 'var(--color-text-secondary)' : 'var(--color-text-secondary)';
        const tertiaryTextColor = isLightTheme ? 'var(--color-text-tertiary)' : 'var(--color-text-tertiary)';

        // Body and main background classes
        css += `body.bg-gray-800 { background-color: var(--color-gray-800) !important; color: ${primaryTextColor} !important; }\n`;
        css += `body.text-gray-200 { color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-800 { background-color: var(--color-gray-800) !important; color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-700 { background-color: var(--color-gray-700) !important; color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-600 { background-color: var(--color-gray-600) !important; color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-900 { background-color: var(--color-gray-900) !important; color: ${primaryTextColor} !important; }\n`;
        css += '.bg-white { background-color: var(--color-surface-primary) !important; color: var(--color-text-primary) !important; }\n';

        // Text color classes with intelligent defaults
        css += `.text-white { color: ${primaryTextColor} !important; }\n`;
        css += `.text-gray-200 { color: ${isLightTheme ? 'var(--color-gray-800)' : 'var(--color-gray-200)'} !important; }\n`;
        css += `.text-gray-300 { color: ${isLightTheme ? 'var(--color-gray-700)' : 'var(--color-gray-300)'} !important; }\n`;
        css += `.text-gray-400 { color: ${isLightTheme ? 'var(--color-gray-600)' : 'var(--color-gray-400)'} !important; }\n`;
        css += `.text-gray-500 { color: ${isLightTheme ? 'var(--color-gray-500)' : 'var(--color-gray-500)'} !important; }\n`;
        css += `.text-gray-600 { color: ${isLightTheme ? 'var(--color-gray-400)' : 'var(--color-gray-600)'} !important; }\n`;
        css += `.text-gray-700 { color: ${isLightTheme ? 'var(--color-gray-300)' : 'var(--color-gray-700)'} !important; }\n`;
        css += `.text-gray-800 { color: ${isLightTheme ? 'var(--color-gray-200)' : 'var(--color-gray-800)'} !important; }\n`;

        // Border color classes
        css += '.border-gray-500 { border-color: var(--color-gray-500) !important; }\n';
        css += '.border-gray-600 { border-color: var(--color-gray-600) !important; }\n';
        css += '.border-gray-700 { border-color: var(--color-gray-700) !important; }\n';

        // Hover states with contrast-aware colors
        css += `.hover\\:bg-gray-700:hover { background-color: var(--color-gray-700) !important; color: ${primaryTextColor} !important; }\n`;
        css += `.hover\\:text-white:hover { color: ${primaryTextColor} !important; }\n`;
        css += `.group-hover\\:text-white:hover { color: ${primaryTextColor} !important; }\n`;

        // Specific contrast fixes for common problematic combinations
        css += '/* High contrast text for light backgrounds */\n';
        if (isLightTheme) {
            css += '.bg-gray-800 .text-gray-200, .bg-gray-700 .text-gray-200, .bg-gray-600 .text-gray-200 { color: var(--color-gray-800) !important; }\n';
            css += '.bg-gray-800 .text-gray-300, .bg-gray-700 .text-gray-300, .bg-gray-600 .text-gray-300 { color: var(--color-gray-700) !important; }\n';
            css += '.bg-gray-800 .text-gray-400, .bg-gray-700 .text-gray-400, .bg-gray-600 .text-gray-400 { color: var(--color-gray-600) !important; }\n';
        }

        // Ensure drawer backgrounds have proper text contrast
        css += '/* Drawer contrast fixes */\n';
        css += `#controls-drawer, #mobile-controls-drawer { color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-800\\/50 { color: ${primaryTextColor} !important; }\n`;

        // Force contrast on all text elements within themed backgrounds
        css += '/* Force high contrast text on all backgrounds */\n';
        css += 'body, body * { color: inherit; }\n';
        css += `.bg-gray-800, .bg-gray-700, .bg-gray-600, .bg-gray-900 { color: ${primaryTextColor} !important; }\n`;
        css += `.bg-gray-800 *, .bg-gray-700 *, .bg-gray-600 *, .bg-gray-900 * { color: ${primaryTextColor} !important; }\n`;

        // Specific fixes for input fields and form elements
        css += '/* Form element contrast fixes */\n';
        css += `input, select, textarea { color: ${primaryTextColor} !important; }\n`;
        css += `input::placeholder, textarea::placeholder { color: ${isLightTheme ? 'var(--color-gray-600)' : 'var(--color-gray-400)'} !important; }\n`;

        // Ensure all text within semi-transparent backgrounds is visible
        css += `.bg-gray-800\\/50 *, .bg-gray-700\\/50 *, .bg-gray-600\\/50 * { color: ${primaryTextColor} !important; }\n`;

        // Override hardcoded backgrounds with theme colors
        css += '/* Hardcoded background overrides */\n';
        css += '.list-view { background: var(--color-gray-800) !important; border-color: var(--color-gray-700) !important; }\n';
        css += `.list-view * { color: ${primaryTextColor} !important; }\n`;

        // Override other common hardcoded backgrounds
        css += '/* Additional hardcoded background fixes */\n';
        css += '.loading-placeholder-content { background: var(--color-gray-800) !important; border-color: var(--color-gray-700) !important; }\n';
        css += '.list-metadata span { background: var(--color-gray-700) !important; }\n';
        css += '.image-meta span { background: var(--color-gray-700) !important; }\n';
        css += '.image-actions button { background: var(--color-gray-700) !important; border-color: var(--color-gray-600) !important; }\n';
        css += '.image-actions button:hover { background: var(--color-gray-600) !important; border-color: var(--color-gray-500) !important; }\n';

        // Override backdrop and overlay backgrounds
        css += '.drawer-backdrop { background: rgba(0, 0, 0, 0.8) !important; }\n';
        css += '.mobile-drawer { background: var(--color-gray-900) !important; }\n';
        css += '.mobile-overlay { background: rgba(0, 0, 0, 0.8) !important; }\n';

        // Focus states and accent colors
        css += '.focus\\:ring-blue-500:focus { --tw-ring-color: var(--color-accent-primary) !important; }\n';
        css += '.focus\\:ring-purple-500:focus { --tw-ring-color: var(--color-accent-primary) !important; }\n';
        css += '.focus\\:ring-yellow-500:focus { --tw-ring-color: var(--color-accent-primary) !important; }\n';
        css += '.group-hover\\:border-blue-400:hover { border-color: var(--color-accent-primary) !important; }\n';
        css += '.group-hover\\:border-purple-400:hover { border-color: var(--color-accent-primary) !important; }\n';

        // Placeholder text
        css += '.placeholder-gray-400::placeholder { color: var(--color-gray-400) !important; }\n';

        // Gradient backgrounds
        css += '.bg-gradient-to-b { background-image: linear-gradient(to bottom, var(--color-gray-900), var(--color-gray-800), var(--color-gray-900)) !important; }\n';

        // Opacity variations
        css += '.bg-gray-800\\/50 { background-color: color-mix(in srgb, var(--color-gray-800) 50%, transparent) !important; }\n';
        css += '.border-gray-700\\/50 { border-color: color-mix(in srgb, var(--color-gray-700) 50%, transparent) !important; }\n';

        this.themeStyleElement.textContent = css;

        // Inject into the end of the body for maximum specificity
        document.body.appendChild(this.themeStyleElement);

        // Save theme preference
        localStorage.setItem('imageHarvest_theme', themeName);

        // Dispatch theme changed event
        this.dispatchThemeChangedEvent(themeName, theme);

        // Reset flag
        this.isApplyingTheme = false;

        console.log(`Applied theme: ${theme.name}`);
    }

    /**
     * Dispatch theme changed event
     * @param {string} themeName - Name of the applied theme
     * @param {Object} theme - Theme object
     */
    dispatchThemeChangedEvent(themeName, theme) {
        const event = new CustomEvent('themeChanged', {
            detail: {
                theme: themeName,
                themeData: theme,
                timestamp: Date.now()
            }
        });

        document.dispatchEvent(event);
    }

    /**
     * Get available themes
     * @returns {Object} Available themes
     */
    getThemes() {
        return this.themes;
    }

    /**
     * Get current theme
     * @returns {string} Current theme name
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get current theme data
     * @returns {Object} Current theme object
     */
    getCurrentThemeData() {
        return this.themes[this.currentTheme];
    }

    /**
     * Switch to a specific theme
     * @param {string} themeName - Name of the theme to switch to
     */
    switchTheme(themeName) {
        this.applyTheme(themeName);
    }

    /**
     * Reset to default theme
     */
    resetToDefault() {
        this.applyTheme('default');
    }

    /**
     * Get theme preview colors for UI display
     * @param {string} themeName - Name of the theme
     * @returns {Object} Preview colors
     */
    getThemePreview(themeName) {
        const theme = this.themes[themeName];

        if (!theme) {
            return null;
        }

        return {
            primary: theme.colors['--color-accent-primary'] || '#4a9eff',
            secondary: theme.colors['--color-accent-secondary'] || '#7b68ee',
            background: theme.colors['--color-background-primary'] || '#0a0a0a',
            surface: theme.colors['--color-surface-primary'] || '#0f0f0f'
        };
    }
}

// Initialize theme service when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeService = new ThemeService();
});

// Export for global access
window.ThemeService = ThemeService;
