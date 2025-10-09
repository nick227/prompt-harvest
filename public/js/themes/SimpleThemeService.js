/**
 * Simple Theme Service - Clean, focused theme management
 * Eliminates over-engineering while maintaining functionality
 */
class SimpleThemeService {
    constructor() {
        this.currentTheme = 'default';
        this.themes = new Map();
        this.themeElement = null;
        this.paletteManager = new ColorPaletteManager();
        this.themeComposer = new ThemeComposer();
        this.init();
    }

    /**
     * Initialize the theme service
     */
    init() {
        try {
            // Load saved theme or use default
            const savedTheme = localStorage.getItem('imageHarvest_theme') || 'default';

            this.loadThemes();
            this.applyTheme(savedTheme);
            this.setupEventListeners();
            // SimpleThemeService initialized successfully
        } catch (error) {
            console.error('❌ Failed to initialize SimpleThemeService:', error);
            // Apply fallback theme
            this.applyFallbackTheme();
        }
    }

    /**
     * Load all available themes
     */
    loadThemes() {
        // Map old theme names to new palette-based names
        const themeMapping = {
            default: 'midnight-blue',
            apple: 'apple-light',
            monokai: 'monokai-pro',
            highcontrast: 'high-contrast',
            discord: 'discord-purple'
        };

        Object.entries(themeMapping).forEach(([oldName, newName]) => {
            try {
                const theme = this.themeComposer.buildTheme(newName);

                this.themes.set(oldName, theme);
            } catch (error) {
                console.error(`❌ Failed to load theme ${oldName} (${newName}):`, error);
                // Create a fallback theme for missing themes
                this.createFallbackTheme(oldName, newName);
            }
        });

    }

    /**
     * Create a fallback theme when the original fails to load
     */
    createFallbackTheme(oldName, newName) {
        const fallbackTheme = {
            name: `${newName} (Fallback)`,
            description: `Fallback theme for ${oldName}`,
            type: 'dark',
            colors: {
                '--color-background-primary': '#1f2937',
                '--color-background-secondary': '#374151',
                '--color-text-primary': '#f9fafb',
                '--color-text-secondary': '#d1d5db',
                '--color-accent-primary': '#3b82f6',
                '--color-border-primary': '#4b5563'
            }
        };

        this.themes.set(oldName, fallbackTheme);
        console.warn(`⚠️ Created fallback theme for ${oldName}`);
    }

    /**
     * Apply a basic fallback theme when initialization fails
     */
    applyFallbackTheme() {
        const fallbackTheme = {
            name: 'Fallback Theme',
            description: 'Emergency fallback theme',
            type: 'dark',
            colors: {
                '--color-background-primary': '#000000',
                '--color-background-secondary': '#1a1a1a',
                '--color-text-primary': '#ffffff',
                '--color-text-secondary': '#cccccc',
                '--color-accent-primary': '#007acc',
                '--color-border-primary': '#333333'
            }
        };

        this.themes.set('fallback', fallbackTheme);
        this.currentTheme = 'fallback';
        this.applyTheme('fallback');
        console.warn('⚠️ Applied emergency fallback theme');
    }

    /**
     * Apply a theme
     */
    applyTheme(themeName) {
        const theme = this.themes.get(themeName);

        if (!theme) {
            console.error(`Theme '${themeName}' not found`);

            return;
        }


        // Remove existing theme styles
        if (this.themeElement) {
            this.themeElement.remove();
        }

        // Create new theme styles
        const css = this.generateCSS(theme);


        this.themeElement = document.createElement('style');
        this.themeElement.id = 'theme-styles';
        this.themeElement.textContent = css;
        document.head.appendChild(this.themeElement);


        // Update state
        this.currentTheme = themeName;
        localStorage.setItem('imageHarvest_theme', themeName);

        // Dispatch event
        this.dispatchThemeChange(theme);
    }

    /**
     * Generate CSS for a theme using ThemeCSSGenerator
     */
    generateCSS(theme) {
        return ThemeCSSGenerator.generateCSS(theme);
    }

    /**
     * Switch to a different theme
     */
    switchTheme(themeName) {
        this.applyTheme(themeName);
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Get all available themes
     */
    getThemes() {
        const themes = {};

        this.themes.forEach((theme, name) => {
            themes[name] = theme;
        });

        return themes;
    }

    /**
     * Get themes Map (for internal use)
     */
    get themesMap() {
        return this.themes;
    }

    /**
     * Get theme statistics and health check
     */
    getThemeStats() {
        return {
            totalThemes: this.themes.size,
            currentTheme: this.currentTheme,
            availableThemes: Array.from(this.themes.keys()),
            paletteStats: this.paletteManager?.getStats() || null,
            themeComposerStats: this.themeComposer?.getStats() || null,
            isHealthy: this.themes.size > 0 && this.currentTheme && this.themes.has(this.currentTheme)
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        document.addEventListener('themeChanged', event => {
            // Handle theme change events if needed
        });
    }

    /**
     * Dispatch theme change event
     */
    dispatchThemeChange(theme) {
        const event = new CustomEvent('themeChanged', {
            detail: { theme, themeName: this.currentTheme }
        });

        document.dispatchEvent(event);
    }
}

// Export for global access
window.SimpleThemeService = SimpleThemeService;
