// ============================================================================
// IMAGE UI MANAGER - Main Manager Class for Image UI Components
// ============================================================================

/**
 * ImageUI - Main orchestrator class for all image UI components
 * Coordinates between different UI modules and provides a unified API
 */
class ImageUI {
    constructor() {
        // Initialize UI configuration
        this.uiConfig = new window.UIConfig();

        // Initialize component modules
        this.imageElements = new window.ImageElements(this.uiConfig);
        this.navigationControls = new window.NavigationControls(this.uiConfig);
        this.fullscreenComponents = new window.FullscreenComponents(this.uiConfig);

        // Expose config properties directly for backward compatibility
        this.config = this.uiConfig.getConfig();

        // Initialize component state
        this.initializeState();
    }

    // ============================================================================
    // INITIALIZATION
    // ============================================================================

    /**
     * Initialize component state
     */
    initializeState() {
        this.activeFullscreenContainer = null;
        this.activeInfoBox = null;
        this.isFullscreenOpen = false;
    }

    // ============================================================================
    // IMAGE ELEMENT DELEGATION
    // ============================================================================

    /**
     * Create a complete image element with all necessary attributes and handlers
     * @param {Object} imageData - Image data object containing id, url, and metadata
     * @returns {HTMLImageElement} Configured image element
     * @throws {Error} If imageData is invalid or missing required properties
     */
    createImageElement(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.imageElements.createImageElement(imageData);
    }

    /**
     * Create image wrapper element that contains the image and additional UI elements
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Image wrapper element
     * @throws {Error} If imageData is invalid
     */
    createImageWrapper(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.imageElements.createImageWrapper(imageData);
    }

    // ============================================================================
    // FULLSCREEN COMPONENT DELEGATION
    // ============================================================================

    /**
     * Create fullscreen container element
     * @returns {HTMLElement} Fullscreen container element
     */
    createFullscreenContainer() {
        const container = this.fullscreenComponents.createFullscreenContainer();

        this.activeFullscreenContainer = container;

        return container;
    }

    /**
     * Create fullscreen image container that can hold image, controls, and info box
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Fullscreen image container element
     * @throws {Error} If imageData is invalid
     */
    createFullscreenImageContainer(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.fullscreenComponents.createFullscreenImageContainer(imageData);
    }

    /**
     * Create fullscreen image element
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Fullscreen image element
     * @throws {Error} If imageData is invalid
     */
    createFullscreenImage(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }

        return this.fullscreenComponents.createFullscreenImage(imageData);
    }

    /**
     * Create info box element with image metadata
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Info box element
     * @throws {Error} If imageData is invalid
     */
    createInfoBox(imageData) {
        if (!imageData) {
            throw new Error('ImageData is required');
        }
        const infoBox = this.fullscreenComponents.createInfoBox(imageData);

        this.activeInfoBox = infoBox;

        return infoBox;
    }

    // ============================================================================
    // NAVIGATION CONTROL DELEGATION
    // ============================================================================

    /**
     * Create navigation controls container
     * @returns {HTMLElement} Navigation controls container
     */
    createNavigationControls() {
        return this.navigationControls.createNavigationControls();
    }

    /**
     * Create a generic button element
     * @param {string} text - Button text content
     * @param {Object} options - Button configuration options
     * @returns {HTMLButtonElement} Configured button element
     */
    createButton(text, options = {}) {
        return this.navigationControls.createButton(text, options);
    }

    /**
     * Create toggle button for view switching
     * @returns {HTMLButtonElement} Toggle button element
     */
    createToggleButton() {
        return this.navigationControls.createToggleButton();
    }

    /**
     * Create public status toggle control
     * @param {boolean} isPublic - Current public status
     * @returns {HTMLElement} Public status toggle container
     */
    createPublicStatusToggle(isPublic) {
        return this.navigationControls.createPublicStatusToggle(isPublic);
    }


    /**
     * Create navigation spacer element
     * @returns {HTMLElement} Spacer element
     */
    createNavigationSpacer() {
        return this.navigationControls.createNavigationSpacer();
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get configuration object
     * @returns {Object} Configuration object
     */
    getConfig() {
        return this.config;
    }

    /**
     * Create DOM element with optional class name
     * @param {string} tag - HTML tag name
     * @param {string} className - Optional CSS class name
     * @returns {HTMLElement} Created DOM element
     */
    createElement(tag, className = '') {
        return this.uiConfig.createElement(tag, className);
    }

    /**
     * Get UI configuration instance
     * @returns {UIConfig} UI configuration instance
     */
    getUIConfig() {
        return this.uiConfig;
    }

    /**
     * Get image elements instance
     * @returns {ImageElements} Image elements instance
     */
    getImageElements() {
        return this.imageElements;
    }

    /**
     * Get navigation controls instance
     * @returns {NavigationControls} Navigation controls instance
     */
    getNavigationControls() {
        return this.navigationControls;
    }

    /**
     * Get fullscreen components instance
     * @returns {FullscreenComponents} Fullscreen components instance
     */
    getFullscreenComponents() {
        return this.fullscreenComponents;
    }

    // ============================================================================
    // FULLSCREEN VISIBILITY DELEGATION
    // ============================================================================

    /**
     * Show fullscreen container
     * @param {HTMLElement} container - Fullscreen container element
     */
    showFullscreenContainer(container) {
        return this.fullscreenComponents.showFullscreenContainer(container);
    }

    /**
     * Hide fullscreen container
     * @param {HTMLElement} container - Fullscreen container element
     */
    hideFullscreenContainer(container) {
        return this.fullscreenComponents.hideFullscreenContainer(container);
    }

    /**
     * Toggle fullscreen container visibility
     * @param {HTMLElement} container - Fullscreen container element
     * @returns {boolean} True if container is now visible
     */
    toggleFullscreenContainer(container) {
        return this.fullscreenComponents.toggleFullscreenContainer(container);
    }

    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================

    /**
     * Check if fullscreen is currently open
     * @returns {boolean} True if fullscreen is open
     */
    isFullscreenOpen() {
        return this.isFullscreenOpen;
    }

    /**
     * Set fullscreen state
     * @param {boolean} isOpen - Fullscreen state
     */
    setFullscreenState(isOpen) {
        this.isFullscreenOpen = isOpen;
    }

    /**
     * Get active fullscreen container
     * @returns {HTMLElement|null} Active fullscreen container or null
     */
    getActiveFullscreenContainer() {
        return this.activeFullscreenContainer;
    }

    /**
     * Get active info box
     * @returns {HTMLElement|null} Active info box or null
     */
    getActiveInfoBox() {
        return this.activeInfoBox;
    }

    /**
     * Clear active fullscreen container
     */
    clearActiveFullscreenContainer() {
        this.activeFullscreenContainer = null;
    }

    /**
     * Clear active info box
     */
    clearActiveInfoBox() {
        this.activeInfoBox = null;
    }

    // ============================================================================
    // VALIDATION METHODS
    // ============================================================================

    /**
     * Validate image data object
     * @param {Object} imageData - Image data to validate
     * @returns {boolean} True if image data is valid
     */
    validateImageData(imageData) {
        return imageData &&
               typeof imageData === 'object' &&
               imageData.id &&
               typeof imageData.id === 'string';
    }

    /**
     * Validate component state
     * @returns {Object} Validation result with status and issues
     */
    validateState() {
        const issues = [];

        if (!this.uiConfig) {
            issues.push('UI configuration not initialized');
        }

        if (!this.imageElements) {
            issues.push('Image elements not initialized');
        }

        if (!this.navigationControls) {
            issues.push('Navigation controls not initialized');
        }

        if (!this.fullscreenComponents) {
            issues.push('Fullscreen components not initialized');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    // ============================================================================
    // DEBUGGING METHODS
    // ============================================================================

    /**
     * Get component status for debugging
     * @returns {Object} Component status information
     */
    getComponentStatus() {
        return {
            uiConfig: !!this.uiConfig,
            imageElements: !!this.imageElements,
            navigationControls: !!this.navigationControls,
            fullscreenComponents: !!this.fullscreenComponents,
            isFullscreenOpen: this.isFullscreenOpen,
            hasActiveFullscreenContainer: !!this.activeFullscreenContainer,
            hasActiveInfoBox: !!this.activeInfoBox,
            configValid: this.uiConfig ? this.uiConfig.validateConfig() : false
        };
    }

    /**
     * Log component status to console
     */
    logComponentStatus() {
        console.log('ImageUI Component Status:', this.getComponentStatus());
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.ImageUI = ImageUI;
