/**
 * Theme Validator - Utility for validating theme system health
 * Helps debug theme issues and ensure proper integration
 */
class ThemeValidator {
    constructor() {
        this.issues = [];
        this.warnings = [];
        this.suggestions = [];
    }

    /**
     * Validate the entire theme system
     */
    validateThemeSystem() {

        this.resetResults();
        this.validateThemeService();
        this.validatePaletteManager();
        this.validateThemeComposer();
        this.validateThemeIntegration();
        this.validateTailwindConfig();

        this.reportResults();

        return {
            issues: this.issues,
            warnings: this.warnings,
            suggestions: this.suggestions,
            isHealthy: this.issues.length === 0
        };
    }

    /**
     * Reset validation results
     */
    resetResults() {
        this.issues = [];
        this.warnings = [];
        this.suggestions = [];
    }

    /**
     * Validate theme service
     */
    validateThemeService() {
        if (!window.themeService) {
            this.issues.push('Theme service not found on window object');

            return;
        }

        const stats = window.themeService.getThemeStats?.();

        if (!stats) {
            this.warnings.push('Theme service missing getThemeStats method');
        } else if (!stats.isHealthy) {
            this.issues.push(`Theme service unhealthy: ${JSON.stringify(stats)}`);
        }

        const currentTheme = window.themeService.getCurrentTheme();

        if (!currentTheme) {
            this.issues.push('No current theme set');
        }

        const { themes } = window.themeService;

        if (!themes || themes.size === 0) {
            this.issues.push('No themes loaded');
        }
        // Themes validated successfully
    }

    /**
     * Validate palette manager
     */
    validatePaletteManager() {
        if (!window.ColorPaletteManager) {
            this.warnings.push('ColorPaletteManager not found on window object');

            return;
        }

        try {
            const manager = new ColorPaletteManager();
            const stats = manager.getStats();

            if (stats.totalPalettes === 0) {
                this.issues.push('No palettes loaded in ColorPaletteManager');
            }
            // Palettes validated successfully

            // Check for required palette categories
            const requiredCategories = ['background', 'text', 'accent', 'status'];

            requiredCategories.forEach(category => {
                if (stats.categories[category] === 0) {
                    this.issues.push(`Missing palettes for category: ${category}`);
                }
            });
        } catch (error) {
            this.issues.push(`ColorPaletteManager error: ${error.message}`);
        }
    }

    /**
     * Validate theme composer
     */
    validateThemeComposer() {
        if (!window.ThemeComposer) {
            this.warnings.push('ThemeComposer not found on window object');

            return;
        }

        try {
            const composer = new ThemeComposer();
            const stats = composer.getStats();

            if (stats.themeDefinitions === 0) {
                this.issues.push('No theme definitions in ThemeComposer');
            }
            // Theme composer validated successfully
        } catch (error) {
            this.issues.push(`ThemeComposer error: ${error.message}`);
        }
    }

    /**
     * Validate theme integration with DOM
     */
    validateThemeIntegration() {
        // Check theme dropdowns
        const desktopSelect = document.getElementById('theme-select');
        const mobileSelect = document.getElementById('mobile-theme-select');

        if (!desktopSelect) {
            this.warnings.push('Desktop theme select not found');
        }

        if (!mobileSelect) {
            this.warnings.push('Mobile theme select not found');
        }

        // Check theme styles element
        const themeStyles = document.getElementById('theme-styles');

        if (!themeStyles) {
            this.warnings.push('Theme styles element not found in DOM');
        }

        // Check CSS variables
        const rootStyles = getComputedStyle(document.documentElement);
        const hasThemeVars = rootStyles.getPropertyValue('--color-background-primary');

        if (!hasThemeVars) {
            this.issues.push('CSS theme variables not applied to :root');
        }
        // CSS theme variables validated successfully
    }

    /**
     * Validate Tailwind configuration
     */
    validateTailwindConfig() {
        if (!window.tailwind?.config) {
            this.warnings.push('Tailwind config not found');

            return;
        }

        const { config } = window.tailwind;
        const themeColors = config.theme?.extend?.colors;

        if (!themeColors) {
            this.warnings.push('Tailwind theme colors not extended');
        } else {
            const hasThemeColors = Object.keys(themeColors).some(key => key.startsWith('theme-'));

            if (!hasThemeColors) {
                this.suggestions.push('Consider adding theme-aware Tailwind colors');
            }
            // Tailwind theme colors validated successfully
        }
    }

    /**
     * Report validation results
     */
    reportResults() {

        if (this.issues.length > 0) {
            console.error('❌ Issues found:', this.issues);
        }

        if (this.warnings.length > 0) {
            console.warn('⚠️ Warnings:', this.warnings);
        }

        if (this.suggestions.length > 0) {
            console.info('💡 Suggestions:', this.suggestions);
        }

        if (this.issues.length === 0 && this.warnings.length === 0) {
            console.log('✅ All theme validations passed successfully');
        }
    }

    /**
     * Quick health check
     */
    quickHealthCheck() {
        const hasThemeService = !!window.themeService;
        const hasCurrentTheme = !!window.themeService?.getCurrentTheme();
        const hasThemes = !!window.themeService?.themes && window.themeService.themes.size > 0;
        const hasThemeStyles = !!document.getElementById('theme-styles');

        return {
            themeService: hasThemeService,
            currentTheme: hasCurrentTheme,
            themesLoaded: hasThemes,
            stylesApplied: hasThemeStyles,
            overall: hasThemeService && hasCurrentTheme && hasThemes && hasThemeStyles
        };
    }
}

// Export for use in other modules
window.ThemeValidator = ThemeValidator;

// Auto-validate on load if in debug mode
if (window.location.search.includes('debug=true') || window.location.hash.includes('debug')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const validator = new ThemeValidator();

            validator.validateThemeSystem();
        }, 1000);
    });
}
