// Controls Drawer Component - Manages the collapsible side drawer for generation controls
class ControlsDrawer {
    constructor() {
        this.isOpen = true; // Start with drawer open
        this.drawer = null;
        this.overlay = null;
        this.toggleButton = null;
        this.closedToggleButton = null;
        this.isMobile = window.innerWidth <= 768; // mobile breakpoint
        this.isInitialized = false;
        this.init();
    }

    init() {
        // Don't initialize on mobile - let mobile controls manager handle it
        if (this.isMobile) {
            return;
        }

        // Prevent multiple initializations
        if (this.isInitialized) {
            return;
        }

        // Wait for unified drawer component to create the drawer
        this.waitForUnifiedDrawer();

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.setupResizeListener();

        // Set initial state - drawer should be visible by default on desktop
        if (this.drawer) {
            this.drawer.classList.remove('-translate-x-full');
        }

        // Update toggle button visibility
        this.updateToggleButtonVisibility();

        this.isInitialized = true;
    }

    waitForUnifiedDrawer() {
        const checkDrawer = () => {
            // Wait for unified drawer component to create the drawer
            if (window.unifiedDrawerComponent && window.unifiedDrawerComponent.desktopDrawer) {
                this.drawer = window.unifiedDrawerComponent.desktopDrawer;
                this.overlay = document.getElementById('drawer-overlay');
                this.toggleButton = document.getElementById('toggle-drawer');
                this.closedToggleButton = document.getElementById('drawer-toggle-closed');

                // Check which elements are missing and log specific warnings
                const missingElements = [];
                if (!this.drawer) {
                    missingElements.push('controls-drawer');
                }
                if (!this.overlay) {
                    missingElements.push('drawer-overlay');
                }
                if (!this.toggleButton) {
                    missingElements.push('toggle-drawer');
                }
                if (!this.closedToggleButton) {
                    missingElements.push('drawer-toggle-closed');
                }

                if (missingElements.length > 0) {
                    // Only log once and only in debug mode to reduce console noise
                    if (window.DEBUG_MODE) {
                        console.warn('Controls drawer elements not found:', missingElements.join(', '));
                    }
                    // Only return if critical elements are missing
                    if (!this.drawer) {
                        console.warn('Critical drawer element missing, skipping initialization');
                        return;
                    }
                }

                // Set initial state - drawer should be visible by default on desktop
                if (this.drawer) {
                    this.drawer.classList.remove('-translate-x-full');
                    this.drawer.style.display = 'block'; // Make visible
                }

                // Update toggle button visibility
                this.updateToggleButtonVisibility();
            } else {
                // Retry after a short delay
                setTimeout(checkDrawer, 100);
            }
        };

        checkDrawer();
    }

    setupEventListeners() {
        // Toggle drawer (from drawer header)
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                this.toggle();
            });
        }

        // Toggle drawer (from closed state button)
        if (this.closedToggleButton) {
            this.closedToggleButton.addEventListener('click', () => {
                this.open();
            });
        }

        // Don't close on overlay click - users should keep drawer open
        // this.overlay.addEventListener('click', () => {
        //     this.close();
        // });

        // ESC key handler removed per user request

        // Prevent drawer content clicks from closing drawer
        if (this.drawer) {
            this.drawer.addEventListener('click', e => {
                e.stopPropagation();
            });

            // Handle custom checkbox clicks in drawer
            this.drawer.addEventListener('click', e => {
                if (e.target.classList.contains('checkbox-custom')) {
                    const checkbox = e.target.previousElementSibling;

                    if (checkbox && checkbox.type === 'checkbox') {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            });
        }

        // Handle custom checkbox clicks in main form (for photogenic, artistic, etc.)
        document.addEventListener('click', e => {
            if (e.target.classList.contains('checkbox-custom')) {
                const checkbox = e.target.previousElementSibling;

                if (checkbox && checkbox.type === 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

                    // Log checkbox state for debugging
                    console.log(`📋 CHECKBOX: ${checkbox.name} is now ${checkbox.checked ? 'checked' : 'unchecked'}`);
                }
            }
        });
    }

    setupKeyboardShortcuts() {
        // Add keyboard shortcut to toggle drawer (Ctrl/Cmd + Shift + C)
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            // If switching between mobile and desktop, reinitialize
            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    // Switching to mobile - cleanup and let mobile controls manager handle it
                    this.cleanup();
                } else {
                    // Switching to desktop - reinitialize
                    this.init();
                }
            }
        });
    }

    open() {
        if (this.isOpen) {
            return;
        }

        if (!this.drawer) {
            console.warn('🎛️ DRAWER: Cannot open - drawer element not found');
            return;
        }

        // Desktop: slide in from left
        if (!this.isMobile) {
            this.drawer.classList.remove('-translate-x-full');
        }

        // Mobile: slide up from bottom
        if (this.isMobile) {
            this.drawer.classList.remove('translate-y-full');
        }

        if (this.overlay) {
            this.overlay.classList.remove('hidden');
        }

        this.isOpen = true;

        // Update toggle button visibility
        this.updateToggleButtonVisibility();

        // Focus first input in drawer
        const firstInput = this.drawer.querySelector('input, select, button');

        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }

        console.log('🎛️ DRAWER: Opened');
    }

    close() {
        if (!this.isOpen) {
            return;
        }

        if (!this.drawer) {
            console.warn('🎛️ DRAWER: Cannot close - drawer element not found');
            return;
        }

        // Desktop: slide out to left
        if (!this.isMobile) {
            this.drawer.classList.add('-translate-x-full');
        }

        // Mobile: slide down to bottom
        if (this.isMobile) {
            this.drawer.classList.add('translate-y-full');
        }

        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }

        this.isOpen = false;

        // Update toggle button visibility
        this.updateToggleButtonVisibility();

        console.log('🎛️ DRAWER: Closed');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // Update toggle button visibility and icons
    updateToggleButtonVisibility() {
        // Update toggle button icon
        if (this.toggleButton) {
            const icon = this.toggleButton.querySelector('svg path');

            if (icon) {
                if (this.isOpen) {
                    // Show left arrow (close)
                    icon.setAttribute('d', 'M11 19l-7-7 7-7m8 14l-7-7 7-7');
                } else {
                    // Show right arrow (open)
                    icon.setAttribute('d', 'M13 5l7 7-7 7M5 5l7 7-7 7');
                }
            }
        }

        // Show/hide closed toggle button
        if (this.closedToggleButton) {
            if (this.isOpen) {
                this.closedToggleButton.classList.add('hidden');
            } else {
                this.closedToggleButton.classList.remove('hidden');
            }
        }
    }

    // Method to update drawer state based on current form values
    updateFromForm() {
        if (!this.isOpen) {
            return;
        }

        // This method can be called to sync drawer controls with main form
        // Useful when form values are changed programmatically
        console.log('🎛️ DRAWER: Syncing with form values');
    }

    // Method to get current drawer state
    getState() {
        return {
            isOpen: this.isOpen,
            controls: this.getControlValues()
        };
    }

    // Get all control values from the drawer
    getControlValues() {
        const controls = {};

        // Get checkbox values
        const checkboxes = this.drawer.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            controls[checkbox.name] = checkbox.checked;
        });

        // Get select values
        const selects = this.drawer.querySelectorAll('select');

        selects.forEach(select => {
            controls[select.name] = select.value;
        });

        // Get input values
        const inputs = this.drawer.querySelectorAll('input[type="text"], input[type="number"]');

        inputs.forEach(input => {
            controls[input.name || input.id] = input.value;
        });

        return controls;
    }

    // Method to set control values in the drawer
    setControlValues(values) {
        Object.keys(values).forEach(key => {
            const element = this.drawer.querySelector(`[name="${key}"], #${key}`);

            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = values[key];
                } else {
                    element.value = values[key];
                }
            }
        });
    }

    // Method to reset all controls to default values
    resetControls() {
        const checkboxes = this.drawer.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });

        const selects = this.drawer.querySelectorAll('select');

        selects.forEach(select => {
            select.selectedIndex = 0;
        });

        const inputs = this.drawer.querySelectorAll('input[type="text"], input[type="number"]');

        inputs.forEach(input => {
            if (input.name === 'maxNum') {
                input.value = '3'; // Default value
            } else {
                input.value = '';
            }
        });

        console.log('🎛️ DRAWER: Controls reset to defaults');
    }

    // Method to show/hide specific sections
    toggleSection(sectionName, show = null) {
        const section = this.drawer.querySelector(`[data-section="${sectionName}"]`);

        if (section) {
            if (show === null) {
                section.classList.toggle('hidden');
            } else {
                section.classList.toggle('hidden', !show);
            }
        }
    }

    // Method to add custom controls to the drawer
    addCustomControl(html, section = 'custom') {
        let customSection = this.drawer.querySelector(`[data-section="${section}"]`);

        if (!customSection) {
            customSection = document.createElement('div');
            customSection.setAttribute('data-section', section);
            customSection.className = 'mb-6';
            const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);

            customSection.innerHTML = `
                <h3 class="text-lg font-semibold mb-3 text-gray-400">${sectionTitle}</h3>
                <div class="space-y-3"></div>
            `;
            this.drawer.querySelector('.p-4').appendChild(customSection);
        }

        const container = customSection.querySelector('.space-y-3');

        container.insertAdjacentHTML('beforeend', html);
    }

    // Method to remove custom controls
    removeCustomSection(section) {
        const customSection = this.drawer.querySelector(`[data-section="${section}"]`);

        if (customSection) {
            customSection.remove();
        }
    }

    // Method to get drawer dimensions for responsive behavior
    getDimensions() {
        return {
            width: this.drawer.offsetWidth,
            height: this.drawer.offsetHeight,
            isMobile: window.innerWidth < 768
        };
    }

    // Method to handle responsive behavior
    handleResize() {
        const dimensions = this.getDimensions();

        if (dimensions.isMobile && this.isOpen) {
            // On mobile, make drawer full width
            this.drawer.classList.remove('w-80');

            this.drawer.classList.add('w-full');
        } else {
            // On desktop, use fixed width
            this.drawer.classList.remove('w-full');

            this.drawer.classList.add('w-80');
        }
    }

    // Cleanup method for when switching to mobile
    cleanup() {
        if (this.isOpen) {
            this.close();
        }
        // Remove event listeners if needed
        // Note: In a production app, you'd want to properly remove event listeners
    }
}

// Initialize drawer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.controlsDrawer = new ControlsDrawer();

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.controlsDrawer) {
            window.controlsDrawer.handleResize();
        }
    });
});

// Export for global access
window.ControlsDrawer = ControlsDrawer;
