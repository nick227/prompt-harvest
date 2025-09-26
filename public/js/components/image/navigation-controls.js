// ============================================================================
// NAVIGATION CONTROLS - Navigation and Control Elements
// ============================================================================

/**
 * NavigationControls - Handles creation of navigation and control elements
 * Creates buttons, toggles, rating displays, and other interactive controls
 */
class NavigationControls {
    constructor(uiConfig = null) {
        this.uiConfig = uiConfig || new window.UIConfig();
    }

    // ============================================================================
    // NAVIGATION CONTROLS CONTAINER
    // ============================================================================

    /**
     * Create navigation controls container
     * @returns {HTMLElement} Navigation controls container
     */
    createNavigationControls() {
        const container = this.uiConfig.createElement('div');

        container.className = this.uiConfig.getClasses().navigationControls;
        container.setAttribute('role', 'toolbar');
        container.setAttribute('aria-label', 'Image navigation controls');

        return container;
    }

    // ============================================================================
    // BUTTON CREATION
    // ============================================================================

    /**
     * Create a generic button element
     * @param {string} text - Button text content
     * @param {Object} options - Button configuration options
     * @returns {HTMLButtonElement} Configured button element
     */
    createButton(text, options = {}) {
        const button = this.uiConfig.createElement('button');

        // Modern buttons don't need additional classes - CSS handles styling
        button.textContent = text;
        button.type = 'button';

        // Apply additional options
        this.applyButtonOptions(button, options);

        return button;
    }

    /**
     * Apply additional options to button element
     * @param {HTMLButtonElement} button - Button element
     * @param {Object} options - Options to apply
     */
    applyButtonOptions(button, options) {
        if (options.className) {
            button.classList.add(options.className);
        }
        if (options.id) {
            button.id = options.id;
        }
        if (options.title) {
            button.title = options.title;
        }
        if (options.disabled) {
            button.disabled = options.disabled;
        }
        if (options.onClick) {
            button.addEventListener('click', options.onClick);
        }
        if (options.ariaLabel) {
            button.setAttribute('aria-label', options.ariaLabel);
        }
    }

    /**
     * Create toggle button for view switching
     * @returns {HTMLButtonElement} Toggle button element
     */
    createToggleButton() {
        const button = this.uiConfig.createElement('button');

        button.className = this.uiConfig.getClasses().toggleButton;
        button.textContent = 'Toggle View';
        button.type = 'button';
        button.setAttribute('aria-label', 'Toggle between grid and list view');
        button.setAttribute('aria-pressed', 'false');

        return button;
    }

    // ============================================================================
    // PUBLIC STATUS TOGGLE
    // ============================================================================

    /**
     * Create public status toggle control
     * @param {boolean} isPublic - Current public status
     * @returns {HTMLElement} Public status toggle container
     */
    createPublicStatusToggle(isPublic) {
        const container = this.uiConfig.createElement('div');

        container.className = this.uiConfig.getClasses().publicStatusToggle;

        // Create checkbox
        const checkbox = this.createPublicStatusCheckbox(isPublic);

        // Create label
        const label = this.createPublicStatusLabel(isPublic);

        // Assemble container
        container.appendChild(checkbox);
        container.appendChild(label);

        return container;
    }

    /**
     * Create public status checkbox
     * @param {boolean} isPublic - Current public status
     * @returns {HTMLInputElement} Checkbox element
     */
    createPublicStatusCheckbox(isPublic) {
        const checkbox = this.uiConfig.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.checked = isPublic;
        checkbox.setAttribute('aria-label', 'Toggle public visibility');
        checkbox.setAttribute('data-action', 'toggle-public');

        return checkbox;
    }

    /**
     * Create public status label
     * @param {boolean} isPublic - Current public status
     * @returns {HTMLLabelElement} Label element
     */
    createPublicStatusLabel(_isPublic) {
        const label = this.uiConfig.createElement('label');

        label.textContent = 'Public';
        label.setAttribute('for', 'public-status-checkbox');

        return label;
    }

    // ============================================================================
    // RATING DISPLAY
    // ============================================================================


    // ============================================================================
    // NAVIGATION SPACER
    // ============================================================================

    /**
     * Create navigation spacer element
     * @returns {HTMLElement} Spacer element
     */
    createNavigationSpacer() {
        const spacer = this.uiConfig.createElement('div');

        spacer.className = this.uiConfig.getClasses().navigationSpacer;
        spacer.setAttribute('aria-hidden', 'true');

        return spacer;
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Update button state
     * @param {HTMLButtonElement} button - Button element
     * @param {Object} state - New button state
     */
    updateButtonState(button, state) {
        if (state.disabled !== undefined) {
            button.disabled = state.disabled;
        }

        if (state.text !== undefined) {
            button.textContent = state.text;
        }

        if (state.className !== undefined) {
            button.className = state.className;
        }

        if (state.ariaPressed !== undefined) {
            button.setAttribute('aria-pressed', state.ariaPressed);
        }
    }


    /**
     * Update public status toggle
     * @param {HTMLElement} toggleElement - Toggle container element
     * @param {boolean} isPublic - New public status
     */
    updatePublicStatusToggle(toggleElement, isPublic) {
        const checkbox = toggleElement.querySelector('input[type="checkbox"]');
        const label = toggleElement.querySelector('label');

        if (checkbox) {
            checkbox.checked = isPublic;
        }

        if (label) {
            label.textContent = isPublic ? 'Public' : 'Private';
        }
    }

    /**
     * Get button by text content
     * @param {HTMLElement} container - Container to search in
     * @param {string} text - Button text to find
     * @returns {HTMLButtonElement|null} Found button or null
     */
    getButtonByText(container, text) {
        const buttons = container.querySelectorAll('button');

        for (const button of buttons) {
            if (button.textContent.trim() === text) {
                return button;
            }
        }

        return null;
    }

    /**
     * Get all buttons in container
     * @param {HTMLElement} container - Container to search in
     * @returns {NodeList} List of button elements
     */
    getAllButtons(container) {
        return container.querySelectorAll('button');
    }
}

// ============================================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================================

// Make class available globally
window.NavigationControls = NavigationControls;
