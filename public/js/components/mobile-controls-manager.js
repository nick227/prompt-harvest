// Mobile Controls Manager - Handles mobile hamburger menu and full-screen controls
class MobileControlsManager {
    constructor() {
        this.isOpen = false;
        this.hamburgerButton = null;
        this.overlay = null;
        this.mobileDrawer = null;
        this.closeButton = null;
        this.isMobile = window.innerWidth <= 768;
        this.init();
    }

    init() {
        // Only initialize on mobile devices
        if (!this.isMobile) {
            return;
        }

        // Wait for unified drawer component to create the mobile drawer
        this.waitForUnifiedMobileDrawer();
    }

    waitForUnifiedMobileDrawer() {
        const checkMobileDrawer = () => {
            // Wait for unified drawer component to create the mobile drawer
            if (window.unifiedDrawerComponent && window.unifiedDrawerComponent.mobileOverlay && window.unifiedDrawerComponent.mobileDrawer) {
                this.hamburgerButton = document.getElementById('mobile-hamburger');
                this.overlay = window.unifiedDrawerComponent.mobileOverlay;
                this.mobileDrawer = window.unifiedDrawerComponent.mobileDrawer;
                this.closeButton = document.getElementById('mobile-close-btn');

                if (!this.hamburgerButton || !this.overlay || !this.mobileDrawer || !this.closeButton) {
                    console.warn('Mobile controls elements not found');
                    return;
                }

                this.setupEventListeners();
                this.setupResizeListener();
                this.syncWithDesktopDrawer();

                // Ensure overlay starts hidden
                this.overlay.classList.add('hidden');
            } else {
                // Retry after a short delay
                setTimeout(checkMobileDrawer, 100);
            }
        };

        checkMobileDrawer();
    }

    setupEventListeners() {
        // Hamburger button click
        this.hamburgerButton.addEventListener('click', () => {
            this.open();
        });

        // Close button click
        this.closeButton.addEventListener('click', () => {
            this.close();
        });

        // Overlay click to close
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Prevent drawer content clicks from closing
        this.mobileDrawer.addEventListener('click', e => {
            e.stopPropagation();
        });

        // Handle custom checkbox clicks in mobile drawer
        this.mobileDrawer.addEventListener('click', e => {
            if (e.target.classList.contains('checkbox-custom')) {
                const checkbox = e.target.previousElementSibling;
                if (checkbox && checkbox.type === 'checkbox') {
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                    this.syncToDesktopDrawer();
                }
            }
        });

        // Handle select changes
        this.mobileDrawer.addEventListener('change', e => {
            if (e.target.tagName === 'SELECT') {
                this.syncToDesktopDrawer();
            }
        });

        // Handle input changes
        this.mobileDrawer.addEventListener('input', e => {
            if (e.target.tagName === 'INPUT') {
                this.syncToDesktopDrawer();
            }
        });

        // ESC key to close
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    setupResizeListener() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    this.init();
                } else {
                    this.cleanup();
                }
            }
        });
    }

    open() {
        if (this.isOpen) {
            return;
        }

        this.overlay.classList.remove('hidden');
        this.mobileDrawer.classList.add('open');
        this.isOpen = true;

        // Refresh all mobile controls to ensure they're up to date
        this.refreshMobileControls();

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        console.log('📱 MOBILE CONTROLS: Opened');
    }

    close() {
        if (!this.isOpen) {
            return;
        }

        this.mobileDrawer.classList.remove('open');
        this.overlay.classList.add('hidden');
        this.isOpen = false;

        // Restore body scroll
        document.body.style.overflow = '';

        console.log('📱 MOBILE CONTROLS: Closed');
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    // Sync mobile drawer with desktop drawer values
    syncWithDesktopDrawer() {
        if (window.unifiedDrawerComponent) {
            window.unifiedDrawerComponent.syncDrawers();
        } else {
            // Fallback to original sync method if unified component not available
            const desktopDrawer = document.getElementById('controls-drawer');
            if (!desktopDrawer) {
                return;
            }

            // Sync checkboxes
            const desktopCheckboxes = desktopDrawer.querySelectorAll('input[type="checkbox"]');
            desktopCheckboxes.forEach(desktopCheckbox => {
                const mobileCheckbox = this.mobileDrawer.querySelector(`input[name="${desktopCheckbox.name}"]`);
                if (mobileCheckbox) {
                    mobileCheckbox.checked = desktopCheckbox.checked;
                }
            });

            // Sync selects
            const desktopSelects = desktopDrawer.querySelectorAll('select');
            desktopSelects.forEach(desktopSelect => {
                const mobileSelect = this.mobileDrawer.querySelector(`select[name="${desktopSelect.name}"]`);
                if (mobileSelect) {
                    mobileSelect.value = desktopSelect.value;
                }
            });

            // Sync inputs
            const desktopInputs = desktopDrawer.querySelectorAll('input[type="text"], input[type="number"]');
            desktopInputs.forEach(desktopInput => {
                const mobileInput = this.mobileDrawer.querySelector(`input[name="${desktopInput.name}"], input[id="${desktopInput.id}"]`);
                if (mobileInput) {
                    mobileInput.value = desktopInput.value;
                }
            });

            // Sync provider list
            this.syncProviderList();
            this.syncPromptHistory();
        }
    }

    // Sync mobile drawer values back to desktop drawer
    syncToDesktopDrawer() {
        const desktopDrawer = document.getElementById('controls-drawer');
        if (!desktopDrawer) {
            return;
        }

        // Sync checkboxes
        const mobileCheckboxes = this.mobileDrawer.querySelectorAll('input[type="checkbox"]');
        mobileCheckboxes.forEach(mobileCheckbox => {
            const desktopCheckbox = desktopDrawer.querySelector(`input[name="${mobileCheckbox.name}"]`);
            if (desktopCheckbox) {
                desktopCheckbox.checked = mobileCheckbox.checked;
                desktopCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Sync selects
        const mobileSelects = this.mobileDrawer.querySelectorAll('select');
        mobileSelects.forEach(mobileSelect => {
            const desktopSelect = desktopDrawer.querySelector(`select[name="${mobileSelect.name}"]`);
            if (desktopSelect) {
                desktopSelect.value = mobileSelect.value;
                desktopSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Sync inputs
        const mobileInputs = this.mobileDrawer.querySelectorAll('input[type="text"], input[type="number"]');
        mobileInputs.forEach(mobileInput => {
            const desktopInput = desktopDrawer.querySelector(`input[name="${mobileInput.name}"], input[id="${mobileInput.id}"]`);
            if (desktopInput) {
                desktopInput.value = mobileInput.value;
                desktopInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    }

    // Sync provider list between desktop and mobile
    syncProviderList() {
        const desktopProviderList = document.getElementById('provider-list');
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (desktopProviderList && mobileProviderList) {
            mobileProviderList.innerHTML = desktopProviderList.innerHTML;

            // Re-bind events for mobile provider list
            this.bindMobileProviderEvents();
        }
    }

    // Sync prompt history between desktop and mobile
    syncPromptHistory() {
        const desktopPromptHistory = document.getElementById('prompt-history');
        const mobilePromptHistory = document.getElementById('mobile-prompt-history');

        if (desktopPromptHistory && mobilePromptHistory) {
            mobilePromptHistory.innerHTML = desktopPromptHistory.innerHTML;
        }
    }

    // Bind events for mobile provider list
    bindMobileProviderEvents() {
        const mobileProviderList = document.getElementById('mobile-provider-list');
        if (!mobileProviderList) {
            return;
        }

        // Remove existing event listeners to prevent duplicates
        mobileProviderList.removeEventListener('change', this.handleMobileProviderChange);

        // Bind new event listener with proper context
        this.handleMobileProviderChange = (e) => {
            if ((e.target.name === 'providers' || e.target.id === 'all') && this.isOpen) {
                // Only sync if mobile drawer is open (to prevent interference with desktop)
                this.syncToDesktopDrawer();

                // Also sync back to mobile to ensure consistency
                setTimeout(() => {
                    this.syncWithDesktopDrawer();
                }, 100);
            }
        };

        mobileProviderList.addEventListener('change', this.handleMobileProviderChange);
    }

    // Method to update provider list (called by provider manager)
    updateProviderList(html) {
        if (window.unifiedDrawerComponent) {
            window.unifiedDrawerComponent.updateProviderList(html);
        } else {
            const mobileProviderList = document.getElementById('mobile-provider-list');
            if (mobileProviderList) {
                mobileProviderList.innerHTML = html;
                this.bindMobileProviderEvents();
            }
        }

        // Always bind events after updating, even if using unified component
        setTimeout(() => {
            this.bindMobileProviderEvents();
        }, 100);
    }

    // Method to update prompt history (called by prompt history service)
    updatePromptHistory(html) {
        if (window.unifiedDrawerComponent) {
            window.unifiedDrawerComponent.updatePromptHistory(html);
        } else {
            const mobilePromptHistory = document.getElementById('mobile-prompt-history');
            if (mobilePromptHistory) {
                mobilePromptHistory.innerHTML = html;
            }
        }
    }

    // Method to refresh all mobile controls (called when opening mobile drawer)
    refreshMobileControls() {
        this.syncProviderList();
        this.syncPromptHistory();

        // Ensure mobile provider events are bound
        setTimeout(() => {
            this.bindMobileProviderEvents();
        }, 100);
    }

    // Cleanup method
    cleanup() {
        if (this.isOpen) {
            this.close();
        }
        document.body.style.overflow = '';

        // Ensure overlay is hidden
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }
    }

    // Get current state
    getState() {
        return {
            isOpen: this.isOpen,
            isMobile: this.isMobile
        };
    }
}

// Initialize mobile controls manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.mobileControlsManager = new MobileControlsManager();
});

// Export for global access
window.MobileControlsManager = MobileControlsManager;
