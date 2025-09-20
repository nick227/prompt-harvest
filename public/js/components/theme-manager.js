/**
 * Theme Manager - Handles theme selection and switching in the unified drawer
 * Integrates with ThemeService to provide seamless theme switching
 */
class ThemeManager {
    constructor() {
        this.themeService = null;
        this.unifiedDrawer = null;
        this.isUpdatingDropdowns = false; // Flag to prevent recursion
        this.init();
    }

    async init() {
        // Wait for theme service to be available
        await this.waitForThemeService();

        // Wait for unified drawer to be available
        await this.waitForUnifiedDrawer();

        // Setup event listeners
        this.setupEventListeners();

        // Set initial theme in dropdowns (with small delay to ensure theme service is ready)
        setTimeout(() => {
            this.updateThemeDropdowns();
        }, 100);
    }

    /**
     * Wait for theme service to be available
     */
    waitForThemeService() {
        return new Promise((resolve) => {
            const checkThemeService = () => {
                if (window.themeService) {
                    this.themeService = window.themeService;
                    resolve();
                } else {
                    setTimeout(checkThemeService, 100);
                }
            };
            checkThemeService();
        });
    }

    /**
     * Wait for unified drawer to be available
     */
    waitForUnifiedDrawer() {
        return new Promise((resolve) => {
            const checkUnifiedDrawer = () => {
                if (window.unifiedDrawerComponent) {
                    this.unifiedDrawer = window.unifiedDrawerComponent;
                    resolve();
                } else {
                    setTimeout(checkUnifiedDrawer, 100);
                }
            };
            checkUnifiedDrawer();
        });
    }

    /**
     * Setup event listeners for theme switching
     */
    setupEventListeners() {
        // Listen for theme dropdown changes
        document.addEventListener('change', (event) => {
            if (event.target.id === 'theme-select' || event.target.id === 'mobile-theme-select') {
                this.handleThemeChange(event.target.value);
            }
        });

        // Listen for theme service events
        document.addEventListener('themeChanged', (event) => {
            this.handleThemeServiceChange(event.detail.theme);
        });
    }

    /**
     * Handle theme dropdown change
     * @param {string} themeName - Selected theme name
     */
    handleThemeChange(themeName) {
        if (this.themeService && !this.isUpdatingDropdowns) {
            console.log(`Theme changed to: ${themeName}`);
            this.themeService.switchTheme(themeName);
        }
    }

    /**
     * Handle theme service change event
     * @param {string} themeName - Theme name from service
     */
    handleThemeServiceChange(themeName) {
        // Update dropdowns to reflect the current theme without triggering events
        this.isUpdatingDropdowns = true;
        this.syncThemeDropdownsSilently(themeName);
        this.isUpdatingDropdowns = false;
    }

    /**
     * Update theme dropdowns with current theme
     */
    updateThemeDropdowns() {
        if (this.themeService && !this.isUpdatingDropdowns) {
            const currentTheme = this.themeService.getCurrentTheme();
            console.log('Theme Manager: Updating dropdowns to theme:', currentTheme);
            this.syncThemeDropdowns(currentTheme);
        }
    }

    /**
     * Sync both theme dropdowns with the specified theme
     * @param {string} themeName - Theme name to set
     */
    syncThemeDropdowns(themeName) {
        this.syncThemeDropdownsSilently(themeName);
    }

    /**
     * Sync both theme dropdowns silently (without triggering events)
     * @param {string} themeName - Theme name to set
     */
    syncThemeDropdownsSilently(themeName) {
        const desktopThemeSelect = document.getElementById('theme-select');
        const mobileThemeSelect = document.getElementById('mobile-theme-select');

        console.log('Theme Manager: Syncing dropdowns to theme:', themeName);
        console.log('Theme Manager: Desktop select found:', !!desktopThemeSelect);
        console.log('Theme Manager: Mobile select found:', !!mobileThemeSelect);

        // Temporarily remove event listeners to prevent recursion
        if (desktopThemeSelect) {
            const originalValue = desktopThemeSelect.value;
            console.log('Theme Manager: Desktop select current value:', originalValue);
            if (originalValue !== themeName) {
                desktopThemeSelect.value = themeName;
                console.log('Theme Manager: Set desktop select to:', themeName);
            }
        }

        if (mobileThemeSelect) {
            const originalValue = mobileThemeSelect.value;
            console.log('Theme Manager: Mobile select current value:', originalValue);
            if (originalValue !== themeName) {
                mobileThemeSelect.value = themeName;
                console.log('Theme Manager: Set mobile select to:', themeName);
            }
        }
    }

    /**
     * Get available themes for UI display
     * @returns {Object} Available themes
     */
    getAvailableThemes() {
        if (this.themeService) {
            return this.themeService.getThemes();
        }
        return {};
    }

    /**
     * Get current theme
     * @returns {string} Current theme name
     */
    getCurrentTheme() {
        if (this.themeService) {
            return this.themeService.getCurrentTheme();
        }
        return 'default';
    }

    /**
     * Switch to a specific theme
     * @param {string} themeName - Theme name to switch to
     */
    switchTheme(themeName) {
        if (this.themeService) {
            this.themeService.switchTheme(themeName);
        }
    }

    /**
     * Reset to default theme
     */
    resetToDefault() {
        if (this.themeService) {
            this.themeService.resetToDefault();
        }
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other components to initialize
    setTimeout(() => {
        window.themeManager = new ThemeManager();
    }, 500);
});

// Export for global access
window.ThemeManager = ThemeManager;
