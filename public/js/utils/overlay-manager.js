/**
 * Overlay Manager - Simple overlay system using DOM elements
 * Appends and removes .loading-overlay elements inside containers
 */
class OverlayManager {
    constructor() {
        this.activeOverlays = new Set();

        // Simple configuration
        this.config = {
            defaultDuration: 1001
        };
    }

    /**
     * Show overlay for specified duration
     */
    showOverlay() {
        const containerId = 'image-container-main';
        const container = document.getElementById(containerId);

        if (!container) {
            console.warn(`⚠️ OVERLAY: Container ${containerId} not found`);

            return;
        }


        this.createOverlayElement(container);

        const duration = this.config.defaultDuration;

        // Remove overlay after duration
        setTimeout(() => {
            this.removeOverlayElement(container);
        }, duration);
    }

    /**
     * Create overlay element and append to container
     * @param {HTMLElement} container - Container element
     * @param {string} content - Overlay content
     */
    createOverlayElement(container) {
        // Remove any existing overlay
        this.removeOverlayElement(container);

        // Create overlay element
        const overlay = document.createElement('div');

        overlay.className = 'loading-overlay';
        // overlay.textContent = 'Loading...';

        // Append overlay to container
        container.prepend(overlay);

    }

    /**
     * Remove overlay element from container
     * @param {HTMLElement} container - Container element
     */
    removeOverlayElement(container) {
        const existingOverlay = container.querySelector('.loading-overlay');

        if (existingOverlay) {
            existingOverlay.remove();
        }
    }


}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OverlayManager;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.OverlayManager = OverlayManager;
}
