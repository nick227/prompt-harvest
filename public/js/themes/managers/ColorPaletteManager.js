/**
 * Color Palette Manager - Centralized color palette system
 * Provides flexible, decoupled color management for themes
 */
class ColorPaletteManager {
    constructor() {
        // console.log('🎨 ColorPaletteManager: Initializing color palettes...');
        this.palettes = new Map();
        this.initializePalettes();
        // console.log(`✅ ColorPaletteManager: Initialized with ${this.palettes.size} palettes`);
    }

    /**
     * Initialize all color palettes - Focused on 5 themes with granular control
     */
    initializePalettes() {
        // Default Dark Theme (Midnight Blue)
        this.registerPalette('theme', 'default-dark', this.getDefaultDarkThemePalette());

        // Apple Light Theme
        this.registerPalette('theme', 'apple-light', this.getAppleLightThemePalette());

        // Monokai Theme
        this.registerPalette('theme', 'monokai', this.getMonokaiThemePalette());

        // High Contrast Theme
        this.registerPalette('theme', 'high-contrast', this.getHighContrastThemePalette());

        // Discord Theme
        this.registerPalette('theme', 'discord', this.getDiscordThemePalette());
    }

    /**
     * Register a color palette
     */
    registerPalette(category, name, palette) {
        const key = `${category}-${name}`;

        this.palettes.set(key, {
            category,
            name,
            ...palette
        });
        // console.log(`✅ Palette registered: ${key}`);
    }

    /**
     * Get a specific palette
     */
    getPalette(category, name) {
        const key = `${category}-${name}`;

        return this.palettes.get(key);
    }

    /**
     * Get all palettes by category
     */
    getPalettesByCategory(category) {
        const categoryPalettes = {};

        this.palettes.forEach((palette, _key) => {
            if (palette.category === category) {
                categoryPalettes[palette.name] = palette;
            }
        });

        return categoryPalettes;
    }

    /**
     * Combine multiple palettes into a theme
     */
    combinePalettes(backgroundPalette, textPalette, accentPalette, statusPalette) {
        return {
            ...backgroundPalette,
            ...textPalette,
            ...accentPalette,
            ...statusPalette
        };
    }

    // ===== COMPREHENSIVE THEME PALETTES =====

    /**
     * Default Dark Theme - Midnight Blue with Electric Cyan accents
     * Professional dark theme with excellent readability
     */
    getDefaultDarkThemePalette() {
        return {
            // === BACKGROUND COLORS ===
            '--color-background-primary': '#0a0e27',
            '--color-background-secondary': '#1a1f3a',
            '--color-background-tertiary': '#2a2f4f',
            '--color-background-quaternary': '#3a3f5f',

            // === SURFACE COLORS ===
            '--color-surface-primary': '#1a1f3a',
            '--color-surface-secondary': '#2a2f4f',
            '--color-surface-tertiary': '#3a3f5f',
            '--color-surface-elevated': '#4a4f6f',
            '--color-surface-overlay': 'rgba(10, 14, 39, 0.95)',

            // === BORDER COLORS ===
            '--color-border-primary': '#3a3f5f',
            '--color-border-secondary': '#4a4f6f',
            '--color-border-tertiary': '#5a5f7f',
            '--color-border-focus': '#00d4ff',
            '--color-border-error': '#dc2626',
            '--color-border-success': '#059669',

            // === TEXT COLORS ===
            '--color-text-primary': '#f8fafc',
            '--color-text-secondary': '#e2e8f0',
            '--color-text-tertiary': '#cbd5e1',
            '--color-text-quaternary': '#94a3b8',
            '--color-text-disabled': '#64748b',
            '--color-text-inverse': '#000000',
            '--color-text-muted': '#6b7280',
            '--color-text-subtle': '#9ca3af',
            '--color-text-placeholder': '#64748b',

            // === ACCENT COLORS ===
            '--color-accent-primary': '#00d4ff',
            '--color-accent-secondary': '#0099cc',
            '--color-accent-tertiary': '#33e0ff',
            '--color-accent-quaternary': '#b3f0ff',

            // === PROMPT TEXTAREA COLORS ===
            '--color-prompt-border': '#06b6d4',        // Cyan - electric, vibrant
            '--color-prompt-focus-border': '#0891b2',  // Darker cyan for focus

            // === SPECIAL LABEL COLORS ===
            '--color-label-auto-bg': '#ff6b35',        // Vibrant Orange - energetic, action-oriented
            '--color-label-auto-border': '#e55a2b',    // Darker orange for border
            '--color-label-auto-hover': '#ff7d4a',     // Lighter orange for hover
            '--color-label-enhance-bg': '#7c3aed',     // Purple - complementary to orange
            '--color-label-enhance-border': '#6d28d9', // Darker purple for border
            '--color-label-enhance-hover': '#8b5cf6',  // Lighter purple for hover

            // === INTERACTIVE COLORS ===
            '--color-interactive-primary': '#00d4ff',
            '--color-interactive-primary-hover': '#0099cc',
            '--color-interactive-secondary': '#3a3f5f',
            '--color-interactive-secondary-hover': '#4a4f6f',

            // === STATUS COLORS ===
            '--color-status-success': '#059669',
            '--color-status-warning': '#d97706',
            '--color-status-error': '#dc2626',
            '--color-status-info': '#0f4c75',
            '--color-rating': '#fbbf24',
            '--color-status-success-light': '#d1fae5',
            '--color-status-warning-light': '#fef3c7',
            '--color-status-error-light': '#fee2e2',
            '--color-status-info-light': '#dbeafe',

            // === COMPONENT-SPECIFIC COLORS ===
            '--color-header-background': '#1a1f3a',
            '--color-header-text': '#f8fafc',
            '--color-sidebar-background': '#2a2f4f',
            '--color-sidebar-text': '#e2e8f0',
            '--color-card-background': '#1a1f3a',
            '--color-card-border': '#3a3f5f',
            '--color-card-shadow': 'rgba(0, 0, 0, 0.3)',
            '--color-modal-background': '#1a1f3a',
            '--color-modal-overlay': 'rgba(0, 0, 0, 0.7)',
            '--color-tooltip-background': '#2a2f4f',
            '--color-tooltip-text': '#f8fafc',

            // === FORM ELEMENT COLORS ===
            '--color-input-background': '#2a2f4f',
            '--color-input-border': '#3a3f5f',
            '--color-input-focus-border': '#00d4ff',
            '--color-input-text': '#f8fafc',
            '--color-input-placeholder': '#64748b',
            '--color-select-background': '#2a2f4f',
            '--color-select-border': '#3a3f5f',
            '--color-select-option-background': '#2a2f4f',
            '--color-select-option-hover': '#3a3f5f',

            // === BUTTON COLORS ===
            '--color-button-primary-background': '#00d4ff',
            '--color-button-primary-text': '#000000',
            '--color-button-primary-hover': '#0099cc',
            '--color-button-secondary-background': '#3a3f5f',
            '--color-button-secondary-text': '#f8fafc',
            '--color-button-secondary-hover': '#4a4f6f',
            '--color-button-danger-background': '#dc2626',
            '--color-button-danger-text': '#ffffff',
            '--color-button-danger-hover': '#b91c1c',

            // === NAVIGATION COLORS ===
            '--color-nav-background': '#1a1f3a',
            '--color-nav-text': '#e2e8f0',
            '--color-nav-active': '#00d4ff',
            '--color-nav-hover': '#3a3f5f',
            '--color-nav-border': '#3a3f5f'
        };
    }

    /**
     * Apple Light Theme - Clean Apple design with signature blue accents
     * Professional light theme with excellent contrast
     */
    getAppleLightThemePalette() {
        return {
            // === BACKGROUND COLORS ===
            '--color-background-primary': '#ffffff',
            '--color-background-secondary': '#f8fafc',
            '--color-background-tertiary': '#f1f5f9',
            '--color-background-quaternary': '#e2e8f0',

            // === SURFACE COLORS ===
            '--color-surface-primary': '#ffffff',
            '--color-surface-secondary': '#f8fafc',
            '--color-surface-tertiary': '#f1f5f9',
            '--color-surface-elevated': '#ffffff',
            '--color-surface-overlay': 'rgba(255, 255, 255, 0.95)',

            // === BORDER COLORS ===
            '--color-border-primary': '#e2e8f0',
            '--color-border-secondary': '#cbd5e1',
            '--color-border-tertiary': '#94a3b8',
            '--color-border-focus': '#007aff',
            '--color-border-error': '#dc2626',
            '--color-border-success': '#059669',

            // === TEXT COLORS ===
            '--color-text-primary': '#0f172a',
            '--color-text-secondary': '#1e293b',
            '--color-text-tertiary': '#475569',
            '--color-text-quaternary': '#64748b',
            '--color-text-disabled': '#94a3b8',
            '--color-text-inverse': '#ffffff',
            '--color-text-muted': '#9ca3af',
            '--color-text-subtle': '#d1d5db',
            '--color-text-placeholder': '#94a3b8',

            // === ACCENT COLORS ===
            '--color-accent-primary': '#007aff',
            '--color-accent-secondary': '#0056b3',
            '--color-accent-tertiary': '#5ac8fa',
            '--color-accent-quaternary': '#bfdbfe',

            // === PROMPT TEXTAREA COLORS ===
            '--color-prompt-border': '#007aff',        // Apple Blue - signature Apple color
            '--color-prompt-focus-border': '#0051d5',  // Darker blue for focus

            // === SPECIAL LABEL COLORS ===
            '--color-label-auto-bg': '#ff3b30',        // Apple Red - vibrant, energetic
            '--color-label-auto-border': '#d70015',    // Darker red for border
            '--color-label-auto-hover': '#ff453a',     // Lighter red for hover
            '--color-label-enhance-bg': '#34c759',     // Apple Green - complementary to red
            '--color-label-enhance-border': '#30a46c', // Darker green for border
            '--color-label-enhance-hover': '#40e070',  // Lighter green for hover

            // === INTERACTIVE COLORS ===
            '--color-interactive-primary': '#007aff',
            '--color-interactive-primary-hover': '#0056b3',
            '--color-interactive-secondary': '#f1f5f9',
            '--color-interactive-secondary-hover': '#e2e8f0',

            // === STATUS COLORS ===
            '--color-status-success': '#059669',
            '--color-status-warning': '#d97706',
            '--color-status-error': '#dc2626',
            '--color-status-info': '#007aff',
            '--color-rating': '#fbbf24',
            '--color-status-success-light': '#d1fae5',
            '--color-status-warning-light': '#fef3c7',
            '--color-status-error-light': '#fee2e2',
            '--color-status-info-light': '#dbeafe',

            // === COMPONENT-SPECIFIC COLORS ===
            '--color-header-background': '#ffffff',
            '--color-header-text': '#0f172a',
            '--color-sidebar-background': '#f8fafc',
            '--color-sidebar-text': '#1e293b',
            '--color-card-background': '#ffffff',
            '--color-card-border': '#e2e8f0',
            '--color-card-shadow': 'rgba(0, 0, 0, 0.1)',
            '--color-modal-background': '#ffffff',
            '--color-modal-overlay': 'rgba(0, 0, 0, 0.5)',
            '--color-tooltip-background': '#1e293b',
            '--color-tooltip-text': '#ffffff',

            // === FORM ELEMENT COLORS ===
            '--color-input-background': '#ffffff',
            '--color-input-border': '#e2e8f0',
            '--color-input-focus-border': '#007aff',
            '--color-input-text': '#0f172a',
            '--color-input-placeholder': '#94a3b8',
            '--color-select-background': '#ffffff',
            '--color-select-border': '#e2e8f0',
            '--color-select-option-background': '#ffffff',
            '--color-select-option-hover': '#f8fafc',

            // === BUTTON COLORS ===
            '--color-button-primary-background': '#007aff',
            '--color-button-primary-text': '#ffffff',
            '--color-button-primary-hover': '#0056b3',
            '--color-button-secondary-background': '#f1f5f9',
            '--color-button-secondary-text': '#0f172a',
            '--color-button-secondary-hover': '#e2e8f0',
            '--color-button-danger-background': '#dc2626',
            '--color-button-danger-text': '#ffffff',
            '--color-button-danger-hover': '#b91c1c',

            // === NAVIGATION COLORS ===
            '--color-nav-background': '#ffffff',
            '--color-nav-text': '#1e293b',
            '--color-nav-active': '#007aff',
            '--color-nav-hover': '#f8fafc',
            '--color-nav-border': '#e2e8f0'
        };
    }

    /**
     * Monokai Theme - Vibrant Monokai with pink, cyan, and orange accents
     * Popular developer theme with high contrast colors
     */
    getMonokaiThemePalette() {
        return {
            // === BACKGROUND COLORS ===
            '--color-background-primary': '#2d2a2e',
            '--color-background-secondary': '#221f22',
            '--color-background-tertiary': '#1c1a1d',
            '--color-background-quaternary': '#3a373b',

            // === SURFACE COLORS ===
            '--color-surface-primary': '#221f22',
            '--color-surface-secondary': '#2d2a2e',
            '--color-surface-tertiary': '#3a373b',
            '--color-surface-elevated': '#454248',
            '--color-surface-overlay': 'rgba(45, 42, 46, 0.95)',

            // === BORDER COLORS ===
            '--color-border-primary': '#3a373b',
            '--color-border-secondary': '#454248',
            '--color-border-tertiary': '#6d6a6e',
            '--color-border-focus': '#ff6188',
            '--color-border-error': '#ff6188',
            '--color-border-success': '#a9dc76',

            // === TEXT COLORS ===
            '--color-text-primary': '#f8f8f2',
            '--color-text-secondary': '#e6db74',
            '--color-text-tertiary': '#a9dc76',
            '--color-text-quaternary': '#75715e',
            '--color-text-disabled': '#75715e',
            '--color-text-inverse': '#2d2a2e',
            '--color-text-muted': '#75715e',
            '--color-text-subtle': '#6d6a6e',
            '--color-text-placeholder': '#75715e',

            // === ACCENT COLORS ===
            '--color-accent-primary': '#ff6188',
            '--color-accent-secondary': '#fc9867',
            '--color-accent-tertiary': '#a9dc76',
            '--color-accent-quaternary': '#78dce8',

            // === PROMPT TEXTAREA COLORS ===
            '--color-prompt-border': '#a9dc76',        // Monokai Green - vibrant, distinct
            '--color-prompt-focus-border': '#ff6188',  // Monokai Pink for focus

            // === SPECIAL LABEL COLORS ===
            '--color-label-auto-bg': '#ff6188',        // Monokai Pink - vibrant, energetic
            '--color-label-auto-border': '#e54a73',    // Darker pink for border
            '--color-label-auto-hover': '#ff7a9d',     // Lighter pink for hover
            '--color-label-enhance-bg': '#78dce8',     // Monokai Cyan - complementary to pink
            '--color-label-enhance-border': '#5cc6d6', // Darker cyan for border
            '--color-label-enhance-hover': '#8ee3f0',  // Lighter cyan for hover

            // === INTERACTIVE COLORS ===
            '--color-interactive-primary': '#ff6188',
            '--color-interactive-primary-hover': '#fc9867',
            '--color-interactive-secondary': '#3a373b',
            '--color-interactive-secondary-hover': '#454248',

            // === STATUS COLORS ===
            '--color-status-success': '#a9dc76',
            '--color-status-warning': '#fc9867',
            '--color-status-error': '#ff6188',
            '--color-status-info': '#78dce8',
            '--color-rating': '#e6db74',
            '--color-status-success-light': '#d4f4b7',
            '--color-status-warning-light': '#fed3b3',
            '--color-status-error-light': '#ffb3c4',
            '--color-status-info-light': '#bce8f4',

            // === COMPONENT-SPECIFIC COLORS ===
            '--color-header-background': '#221f22',
            '--color-header-text': '#f8f8f2',
            '--color-sidebar-background': '#2d2a2e',
            '--color-sidebar-text': '#e6db74',
            '--color-card-background': '#221f22',
            '--color-card-border': '#3a373b',
            '--color-card-shadow': 'rgba(0, 0, 0, 0.5)',
            '--color-modal-background': '#221f22',
            '--color-modal-overlay': 'rgba(0, 0, 0, 0.8)',
            '--color-tooltip-background': '#2d2a2e',
            '--color-tooltip-text': '#f8f8f2',

            // === FORM ELEMENT COLORS ===
            '--color-input-background': '#1c1a1d',
            '--color-input-border': '#a9dc76',
            '--color-input-focus-border': '#ff6188',
            '--color-input-text': '#f8f8f2',
            '--color-input-placeholder': '#75715e',
            '--color-select-background': '#2d2a2e',
            '--color-select-border': '#3a373b',
            '--color-select-option-background': '#2d2a2e',
            '--color-select-option-hover': '#3a373b',

            // === BUTTON COLORS ===
            '--color-button-primary-background': '#ff6188',
            '--color-button-primary-text': '#2d2a2e',
            '--color-button-primary-hover': '#fc9867',
            '--color-button-secondary-background': '#3a373b',
            '--color-button-secondary-text': '#f8f8f2',
            '--color-button-secondary-hover': '#454248',
            '--color-button-danger-background': '#ff6188',
            '--color-button-danger-text': '#2d2a2e',
            '--color-button-danger-hover': '#fc9867',

            // === NAVIGATION COLORS ===
            '--color-nav-background': '#221f22',
            '--color-nav-text': '#e6db74',
            '--color-nav-active': '#ff6188',
            '--color-nav-hover': '#3a373b',
            '--color-nav-border': '#3a373b',

            // === MONOKAI-SPECIFIC PROMPT COLORS ===
            '--color-prompt-background': '#1c1a1d',
            '--color-prompt-text': '#f8f8f2',
            '--color-prompt-border': '#a9dc76',
            '--color-prompt-focus-border': '#ff6188',
            '--color-prompt-placeholder': '#75715e'
        };
    }

    /**
     * High Contrast Theme - Maximum accessibility with pure black and white
     * WCAG AAA compliant for accessibility needs
     */
    getHighContrastThemePalette() {
        return {
            // === BACKGROUND COLORS ===
            '--color-background-primary': '#000000',
            '--color-background-secondary': '#000000',
            '--color-background-tertiary': '#000000',
            '--color-background-quaternary': '#000000',

            // === SURFACE COLORS ===
            '--color-surface-primary': '#000000',
            '--color-surface-secondary': '#000000',
            '--color-surface-tertiary': '#000000',
            '--color-surface-elevated': '#000000',
            '--color-surface-overlay': 'rgba(0, 0, 0, 0.95)',

            // === BORDER COLORS ===
            '--color-border-primary': '#ffffff',
            '--color-border-secondary': '#ffffff',
            '--color-border-tertiary': '#ffffff',
            '--color-border-focus': '#00ffff',
            '--color-border-error': '#ff0000',
            '--color-border-success': '#00ff00',

            // === TEXT COLORS ===
            '--color-text-primary': '#ffffff',
            '--color-text-secondary': '#ffffff',
            '--color-text-tertiary': '#ffffff',
            '--color-text-quaternary': '#ffffff',
            '--color-text-disabled': '#cccccc',
            '--color-text-inverse': '#000000',
            '--color-text-muted': '#ffffff',
            '--color-text-subtle': '#ffffff',
            '--color-text-placeholder': '#cccccc',

            // === ACCENT COLORS ===
            '--color-accent-primary': '#00ffff',
            '--color-accent-secondary': '#00cccc',
            '--color-accent-tertiary': '#33ffff',
            '--color-accent-quaternary': '#99ffff',

            // === PROMPT TEXTAREA COLORS ===
            '--color-prompt-border': '#ffffff',        // Pure White - maximum contrast
            '--color-prompt-focus-border': '#ffff00',  // Bright Yellow for focus

            // === SPECIAL LABEL COLORS ===
            '--color-label-auto-bg': '#ff0000',        // Pure Red - maximum contrast
            '--color-label-auto-border': '#cc0000',    // Darker red for border
            '--color-label-auto-hover': '#ff3333',     // Lighter red for hover
            '--color-label-enhance-bg': '#00ff00',     // Pure Green - complementary to red
            '--color-label-enhance-border': '#00cc00', // Darker green for border
            '--color-label-enhance-hover': '#33ff33',  // Lighter green for hover

            // === INTERACTIVE COLORS ===
            '--color-interactive-primary': '#00ffff',
            '--color-interactive-primary-hover': '#00cccc',
            '--color-interactive-secondary': '#000000',
            '--color-interactive-secondary-hover': '#333333',

            // === STATUS COLORS ===
            '--color-status-success': '#00ff00',
            '--color-status-warning': '#ffff00',
            '--color-status-error': '#ff0000',
            '--color-status-info': '#00ffff',
            '--color-rating': '#ffff00',
            '--color-status-success-light': '#003300',
            '--color-status-warning-light': '#333300',
            '--color-status-error-light': '#330000',
            '--color-status-info-light': '#003333',

            // === COMPONENT-SPECIFIC COLORS ===
            '--color-header-background': '#000000',
            '--color-header-text': '#ffffff',
            '--color-sidebar-background': '#000000',
            '--color-sidebar-text': '#ffffff',
            '--color-card-background': '#000000',
            '--color-card-border': '#ffffff',
            '--color-card-shadow': 'rgba(255, 255, 255, 0.3)',
            '--color-modal-background': '#000000',
            '--color-modal-overlay': 'rgba(0, 0, 0, 0.9)',
            '--color-tooltip-background': '#000000',
            '--color-tooltip-text': '#ffffff',

            // === FORM ELEMENT COLORS ===
            '--color-input-background': '#000000',
            '--color-input-border': '#ffffff',
            '--color-input-focus-border': '#00ffff',
            '--color-input-text': '#ffffff',
            '--color-input-placeholder': '#cccccc',
            '--color-select-background': '#000000',
            '--color-select-border': '#ffffff',
            '--color-select-option-background': '#000000',
            '--color-select-option-hover': '#333333',

            // === BUTTON COLORS ===
            '--color-button-primary-background': '#00ffff',
            '--color-button-primary-text': '#000000',
            '--color-button-primary-hover': '#00cccc',
            '--color-button-secondary-background': '#000000',
            '--color-button-secondary-text': '#ffffff',
            '--color-button-secondary-hover': '#333333',
            '--color-button-danger-background': '#ff0000',
            '--color-button-danger-text': '#ffffff',
            '--color-button-danger-hover': '#cc0000',

            // === NAVIGATION COLORS ===
            '--color-nav-background': '#000000',
            '--color-nav-text': '#ffffff',
            '--color-nav-active': '#00ffff',
            '--color-nav-hover': '#333333',
            '--color-nav-border': '#ffffff'
        };
    }

    /**
     * Discord Theme - Authentic Discord colors with vibrant purple and blurple accents
     * Modern dark theme with distinctive purple highlights
     */
    getDiscordThemePalette() {
        return {
            // === BACKGROUND COLORS ===
            '--color-background-primary': '#1e1f22',
            '--color-background-secondary': '#2b2d31',
            '--color-background-tertiary': '#313338',
            '--color-background-quaternary': '#383a40',

            // === SURFACE COLORS ===
            '--color-surface-primary': '#2b2d31',
            '--color-surface-secondary': '#313338',
            '--color-surface-tertiary': '#383a40',
            '--color-surface-elevated': '#404249',
            '--color-surface-overlay': 'rgba(30, 31, 34, 0.95)',

            // === BORDER COLORS ===
            '--color-border-primary': '#383a40',
            '--color-border-secondary': '#404249',
            '--color-border-tertiary': '#6b7280',
            '--color-border-focus': '#5865f2',
            '--color-border-error': '#ed4245',
            '--color-border-success': '#3ba55c',

            // === TEXT COLORS ===
            '--color-text-primary': '#ffffff',
            '--color-text-secondary': '#dcddde',
            '--color-text-tertiary': '#b9bbbe',
            '--color-text-quaternary': '#8e9297',
            '--color-text-disabled': '#6b7280',
            '--color-text-inverse': '#1e1f22',
            '--color-text-muted': '#8e9297',
            '--color-text-subtle': '#6b7280',
            '--color-text-placeholder': '#8e9297',

            // === ACCENT COLORS ===
            '--color-accent-primary': '#5865f2',
            '--color-accent-secondary': '#4752c4',
            '--color-accent-tertiary': '#7289da',
            '--color-accent-quaternary': '#b9bbbe',

            // === PROMPT TEXTAREA COLORS ===
            '--color-prompt-border': '#7289da',        // Discord Blurple - signature color
            '--color-prompt-focus-border': '#5865f2',  // Discord Blue for focus

            // === SPECIAL LABEL COLORS ===
            '--color-label-auto-bg': '#ed4245',        // Discord Red - vibrant, energetic
            '--color-label-auto-border': '#d73e41',    // Darker red for border
            '--color-label-auto-hover': '#f04747',     // Lighter red for hover
            '--color-label-enhance-bg': '#3ba55c',     // Discord Green - complementary to red
            '--color-label-enhance-border': '#2d7d46', // Darker green for border
            '--color-label-enhance-hover': '#4caf6a',  // Lighter green for hover

            // === INTERACTIVE COLORS ===
            '--color-interactive-primary': '#5865f2',
            '--color-interactive-primary-hover': '#4752c4',
            '--color-interactive-secondary': '#383a40',
            '--color-interactive-secondary-hover': '#404249',

            // === STATUS COLORS ===
            '--color-status-success': '#3ba55c',
            '--color-status-warning': '#faa61a',
            '--color-status-error': '#ed4245',
            '--color-status-info': '#5865f2',
            '--color-rating': '#faa61a',
            '--color-status-success-light': '#a7f3d0',
            '--color-status-warning-light': '#fde68a',
            '--color-status-error-light': '#fecaca',
            '--color-status-info-light': '#c7d2fe',

            // === COMPONENT-SPECIFIC COLORS ===
            '--color-header-background': '#2b2d31',
            '--color-header-text': '#ffffff',
            '--color-sidebar-background': '#313338',
            '--color-sidebar-text': '#dcddde',
            '--color-card-background': '#2b2d31',
            '--color-card-border': '#383a40',
            '--color-card-shadow': 'rgba(0, 0, 0, 0.4)',
            '--color-modal-background': '#2b2d31',
            '--color-modal-overlay': 'rgba(0, 0, 0, 0.8)',
            '--color-tooltip-background': '#313338',
            '--color-tooltip-text': '#ffffff',

            // === FORM ELEMENT COLORS ===
            '--color-input-background': '#313338',
            '--color-input-border': '#383a40',
            '--color-input-focus-border': '#5865f2',
            '--color-input-text': '#ffffff',
            '--color-input-placeholder': '#8e9297',
            '--color-select-background': '#313338',
            '--color-select-border': '#383a40',
            '--color-select-option-background': '#313338',
            '--color-select-option-hover': '#383a40',

            // === BUTTON COLORS ===
            '--color-button-primary-background': '#5865f2',
            '--color-button-primary-text': '#ffffff',
            '--color-button-primary-hover': '#4752c4',
            '--color-button-secondary-background': '#383a40',
            '--color-button-secondary-text': '#ffffff',
            '--color-button-secondary-hover': '#404249',
            '--color-button-danger-background': '#ed4245',
            '--color-button-danger-text': '#ffffff',
            '--color-button-danger-hover': '#d73d3d',

            // === NAVIGATION COLORS ===
            '--color-nav-background': '#2b2d31',
            '--color-nav-text': '#dcddde',
            '--color-nav-active': '#5865f2',
            '--color-nav-hover': '#383a40',
            '--color-nav-border': '#383a40'
        };
    }

    /**
     * Get all available palette categories
     */
    getCategories() {
        const categories = new Set();

        this.palettes.forEach(palette => {
            categories.add(palette.category);
        });

        return Array.from(categories);
    }

    /**
     * Get palette statistics
     */
    getStats() {
        const stats = {
            totalPalettes: this.palettes.size,
            categories: this.getCategories().reduce((acc, category) => {
                acc[category] = Object.keys(this.getPalettesByCategory(category)).length;

                return acc;
            }, {})
        };

        console.log('📊 Palette Statistics:', stats);

        return stats;
    }

}

// Export for use in other modules
window.ColorPaletteManager = ColorPaletteManager;
