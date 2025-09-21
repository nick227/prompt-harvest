/**
 * Theme Composer - Builds themes from color palettes
 * Provides a simple, decoupled way to create and modify themes
 */
class ThemeComposer {
    constructor() {
        console.log('🎨 ThemeComposer: Initializing...');
        this.paletteManager = new ColorPaletteManager();
        this.themeDefinitions = new Map();
        this.initializeThemeDefinitions();
        console.log(`✅ ThemeComposer: Initialized with ${this.themeDefinitions.size} theme definitions`);
    }

    /**
     * Initialize predefined theme combinations - Simplified for 5 themes
     */
    initializeThemeDefinitions() {

        // Default Dark Theme
        this.registerThemeDefinition('midnight-blue', {
            name: 'Default Dark',
            description: 'Deep midnight blue with electric cyan accents',
            type: 'dark',
            palettes: {
                theme: 'default-dark'
            }
        });

        // Apple Light Theme
        this.registerThemeDefinition('apple-light', {
            name: 'Apple Light',
            description: 'Clean Apple design with signature blue and subtle grays',
            type: 'light',
            palettes: {
                theme: 'apple-light'
            }
        });

        // Monokai Theme
        this.registerThemeDefinition('monokai-pro', {
            name: 'Monokai',
            description: 'Authentic Monokai with vibrant pink, cyan, and orange',
            type: 'dark',
            palettes: {
                theme: 'monokai'
            }
        });

        // High Contrast Theme
        this.registerThemeDefinition('high-contrast', {
            name: 'High Contrast',
            description: 'Maximum accessibility with pure black and white',
            type: 'dark',
            palettes: {
                theme: 'high-contrast'
            }
        });

        // Discord Theme
        this.registerThemeDefinition('discord-purple', {
            name: 'Discord',
            description: 'Authentic Discord colors with vibrant purple and blurple accents',
            type: 'dark',
            palettes: {
                theme: 'discord'
            }
        });

    }

    /**
     * Register a new theme definition
     */
    registerThemeDefinition(name, definition) {
        this.themeDefinitions.set(name, definition);
        console.log(`✅ Theme definition registered: ${name}`);
    }

    /**
     * Build a complete theme from palette combinations - Simplified for comprehensive palettes
     */
    buildTheme(themeName) {
        const definition = this.themeDefinitions.get(themeName);
        if (!definition) {
            throw new Error(`Theme definition '${themeName}' not found`);
        }

        console.log(`🏗️ Building theme: ${themeName}`);

        // Get the comprehensive theme palette
        const themePalette = this.paletteManager.getPalette('theme', definition.palettes.theme);

        if (!themePalette) {
            throw new Error(`Missing theme palette for '${themeName}'`);
        }

        // Create theme with comprehensive color variables
        const theme = {
            name: definition.name,
            description: definition.description,
            type: definition.type,
            colors: {
                // Tailwind CSS Variables
                '--tw-bg-opacity': '1',
                '--tw-text-opacity': '1',
                '--tw-border-opacity': '1',
                // All comprehensive theme colors
                ...themePalette
            }
        };

        console.log(`✅ Theme built: ${theme.name} with ${Object.keys(themePalette).length} color variables`);
        return theme;
    }

    /**
     * Create a custom theme by mixing palettes
     */
    createCustomTheme(name, description, type, paletteCombination) {
        const definition = {
            name,
            description,
            type,
            palettes: paletteCombination
        };

        this.registerThemeDefinition(name, definition);
        return this.buildTheme(name);
    }

    /**
     * Modify an existing theme by changing palette combinations
     */
    modifyTheme(themeName, newPaletteCombination) {
        const definition = this.themeDefinitions.get(themeName);
        if (!definition) {
            throw new Error(`Theme '${themeName}' not found for modification`);
        }

        // Update palette combination
        definition.palettes = { ...definition.palettes, ...newPaletteCombination };

        console.log(`🔄 Modified theme: ${themeName}`);
        return this.buildTheme(themeName);
    }

    /**
     * Get all available theme definitions
     */
    getThemeDefinitions() {
        const definitions = {};
        this.themeDefinitions.forEach((definition, name) => {
            definitions[name] = definition;
        });
        return definitions;
    }

    /**
     * Get all available palettes by category
     */
    getAvailablePalettes() {
        return {
            background: this.paletteManager.getPalettesByCategory('background'),
            text: this.paletteManager.getPalettesByCategory('text'),
            accent: this.paletteManager.getPalettesByCategory('accent'),
            status: this.paletteManager.getPalettesByCategory('status')
        };
    }

    /**
     * Preview a theme without applying it
     */
    previewTheme(themeName) {
        const theme = this.buildTheme(themeName);
        return {
            name: theme.name,
            description: theme.description,
            type: theme.type,
            primary: theme.colors['--color-background-primary'],
            secondary: theme.colors['--color-background-secondary'],
            accent: theme.colors['--color-accent-primary'],
            text: theme.colors['--color-text-primary']
        };
    }

    /**
     * Get theme statistics
     */
    getStats() {
        const paletteStats = this.paletteManager.getStats();
        return {
            themeDefinitions: this.themeDefinitions.size,
            paletteStats,
            availableThemes: Array.from(this.themeDefinitions.keys())
        };
    }
}

// Export for use in other modules
window.ThemeComposer = ThemeComposer;
