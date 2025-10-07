// Simple Unified Drawer - Streamlined for single responsibility
// PromptHelpersForm is available globally

class SimpleDrawer {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.drawer = null;
        this.overlay = null;
        this.toggleButton = null;
        this.hamburgerButton = null;
        this.isOpen = false;

        // Checkbox names for persistence (excluding prompt helpers - handled by PromptHelpersForm)
        this.checkboxNames = ['autoDownload', 'autoPublic', 'mixup', 'mashup'];

        // Form field names for persistence
        this.formFieldNames = ['multiplier', 'theme'];

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.createDrawer();
                this.setupEvents();
                this.setupResponsive();
                this.loadPersistedValues();
            });
        } else {
            this.createDrawer();
            this.setupEvents();
            this.setupResponsive();
            this.loadPersistedValues();
        }
    }

    createDrawer() {
        // Create overlay for mobile
        this.overlay = document.createElement('div');
        this.overlay.id = 'mobile-controls-overlay';
        this.overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden';

        // Create the drawer
        this.drawer = document.createElement('div');
        this.drawer.id = 'controls-drawer';
        this.drawer.className = 'fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto shadow-2xl border-r border-gray-700';
        this.drawer.innerHTML = this.getDrawerContent();

        // Append to body
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.drawer);

        // Get button references (they might not exist yet)
        this.toggleButton = document.getElementById('drawer-toggle-closed');
        this.hamburgerButton = document.getElementById('mobile-hamburger');

        // Set initial state based on device type and persisted state
        this.setInitialState();

        // Update button visibility after a short delay to ensure buttons exist
        setTimeout(() => {
            this.updateButtonVisibility();
        }, 100);
    }

    setInitialState() {
        if (this.isMobile) {
            // Mobile: always start closed
            this.drawer.style.transform = 'translateX(-100%)';
            this.isOpen = false;
        } else {
            // Desktop: check persisted state
            const persistedState = localStorage.getItem('drawer-open-state');
            const shouldBeOpen = persistedState === 'true';

            if (shouldBeOpen) {
                this.drawer.style.transform = 'translateX(0)';
                this.isOpen = true;
            } else {
                this.drawer.style.transform = 'translateX(-100%)';
                this.isOpen = false;
            }
        }
    }

    getDrawerContent() {
        return `
            <div class="p-6">
                <button id="desktop-drawer-close-btn"
                    class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
                ${this.getFaqSection()}
                ${this.getProvidersSection()}
                ${this.getSettingsSection()}
                ${this.getThemeSection()}
            </div>
        `;
    }

    getSearchSection() {
        return `
            <div class="mb-8" data-section="search">
                <div class="flex gap-2">
                    <div class="search w-full">
                        <input type="text" name="image-search" placeholder="Search"
                            class="w-full bg-white text-gray-800 px-3 py-2 rounded
                                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>
        `;
    }

    getFaqSection() {
        return `
            <div class="mb-8" data-section="faq">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-yellow-400">AutoImage Pages</h3>
                </div>
                <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div class="space-y-2">
                        <a href="/">Home</a>
                    </div>
                    <div class="space-y-2 mt-4">
                        <a href="/billing.html">Account</a>
                    </div>
                    <div class="space-y-2 mt-4">
                        <a href="/faq.html">FAQ</a>
                    </div>
                    <div class="space-y-2 mt-4">
                        <a href="/blog/">Blog</a>
                    </div>
                </div>
            </div>
        `;
    }

    getProvidersSection() {
        return `
            <div class="mb-8" data-section="providers">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-green-400">Image Models</h3>
                </div>
                <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div id="provider-list" class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <!-- Providers will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    getSettingsSection() {
        return `
            <div class="mb-8" data-section="settings">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-blue-400">Site Tools</h3>
                </div>
                <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div class="space-y-4">
                        ${this.getCheckboxGroup(['autoPublic', 'autoDownload', 'mixup', 'mashup'])}

                        <!-- Prompt Helpers Section -->
                        <div id="prompt-helpers-container" class="mt-4">
                            ${PromptHelpersForm.generateHTML({ groupByCategory: true, containerClass: 'prompt-helpers-container', itemClass: 'prompt-helper-option' })}
                        </div>

                        <!-- Multiplier Text Section -->
                        <div class="mt-4 pt-4 border-t border-gray-600">
                            <div class="space-y-2">
                                <label class="block text-sm font-medium text-gray-300">Multiplier Text</label>
                                <input type="text" id="multiplier"
                                    placeholder="Enter enhancement text..."
                                    class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                                           focus:outline-none focus:ring-2 focus:ring-purple-500
                                           focus:border-transparent transition-all placeholder-gray-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getThemeSection() {
        return `
            <div class="mb-8" data-section="theme">
                <div class="flex items-center gap-2">
                    <h3 class="text-lg font-semibold text-purple-400">Theme</h3>
                </div>
                <div class="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                    <div class="space-y-3">
                        <label class="block text-sm font-medium text-gray-300">Choose Theme</label>
                        <select id="theme-select"
                            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                                   focus:outline-none focus:ring-2 focus:ring-purple-500
                                   focus:border-transparent transition-all">
                            <option value="default">🌙 Default Dark</option>
                            <option value="apple">🍎 Apple Light</option>
                            <option value="monokai">🎨 Monokai</option>
                            <option value="highcontrast">⚫ High Contrast</option>
                            <option value="discord">💜 Discord</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    getCheckboxGroup(checkboxNames) {
        return `
            <div class="space-y-3">
                ${checkboxNames.map(name => `
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" name="${name}" class="text-blue-600 focus:ring-blue-500" />
                        <span class="text-gray-200 group-hover:text-white transition-colors">
                            ${this.getCheckboxLabel(name)}
                        </span>
                    </label>
                `).join('')}
            </div>
        `;
    }

    getCheckboxLabel(name) {
        const labels = {
            autoPublic: 'Auto Public',
            autoDownload: 'Auto Download',
            mixup: 'Mixup',
            mashup: 'Mashup'
        };

        return labels[name] || name;
    }

    setupEvents() {
        // Toggle button (desktop)
        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => this.toggle());
        }

        // Hamburger button (mobile)
        if (this.hamburgerButton) {
            this.hamburgerButton.addEventListener('click', () => this.toggle());
        }

        // Close button
        const closeButton = this.drawer.querySelector('#desktop-drawer-close-btn');

        if (closeButton) {
            closeButton.addEventListener('click', () => this.close());
        }

        // Overlay click to close (mobile only)
        if (this.overlay) {
            this.overlay.addEventListener('click', e => {
                if (e.target === this.overlay) {
                    this.close();
                }
            });
        }

        // Prevent drawer content clicks from closing
        if (this.drawer) {
            this.drawer.addEventListener('click', e => e.stopPropagation());
        }

        // Setup checkbox change events to save to localStorage
        this.setupCheckboxEvents();

        // Handle form changes
        if (this.drawer) {
            this.drawer.addEventListener('change', e => {
                this.handleFormChange(e);
            });
        }
    }

    setupCheckboxEvents() {
        // Setup event listeners for all checkboxes to save to localStorage
        this.checkboxNames.forEach(name => {
            const checkbox = this.drawer.querySelector(`input[name="${name}"]`);

            if (checkbox) {
                checkbox.addEventListener('change', e => {
                    localStorage.setItem(name, e.target.checked.toString());
                });
            }
        });

        // Setup event listeners for prompt helpers
        if (window.PromptHelpersForm) {
            PromptHelpersForm.addChangeListeners(promptHelpers => {
                localStorage.setItem('promptHelpers', JSON.stringify(promptHelpers));
            }, this.drawer);
        }
    }

    handleFormChange(e) {
        const element = e.target;
        const key = element.name || element.id;

        if (!key) {
            return;
        }

        // Save to localStorage
        if (element.type === 'checkbox') {
            localStorage.setItem(key, element.checked);
        } else {
            localStorage.setItem(key, element.value);
        }

        // Handle provider changes
        if (element.name === 'providers' || element.id === 'all') {
            this.handleProviderChange();
        }

        // Handle theme changes
        if (element.id === 'theme-select') {
            this.handleThemeChange(element.value);
        }

        // Handle multiplier changes
        if (element.id === 'multiplier') {
            // Multiplier text changed
        }
    }

    handleProviderChange() {
        // Notify provider manager if it exists
        if (window.providerManager) {
            window.providerManager.handleProviderCheckbox();
            window.providerManager.sortProviderList();
            window.providerManager.saveProviderSelections();
        }
    }

    handleThemeChange(themeName) {
        // Apply theme change
        if (window.themeManager) {
            window.themeManager.switchTheme(themeName);
        }
    }

    setupResponsive() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;

            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.close();
                this.updateButtonVisibility();
                this.updateDrawerStyles();
                // Re-apply initial state after responsive change
                setTimeout(() => {
                    this.setInitialState();
                }, 100);
            }
        });
    }

    updateButtonVisibility() {
        // Handle toggle button visibility
        if (this.toggleButton) {
            this.toggleButton.style.display = this.isMobile ? 'none' : 'block';
        } else {
            // Try to find the button again
            this.toggleButton = document.getElementById('drawer-toggle-closed');
            if (this.toggleButton) {
                this.toggleButton.style.display = this.isMobile ? 'none' : 'block';
            }
        }

        // Handle mobile hamburger button visibility
        if (this.hamburgerButton) {
            this.hamburgerButton.style.display = this.isMobile ? 'block' : 'none';
        } else {
            // Try to find the button again
            this.hamburgerButton = document.getElementById('mobile-hamburger');
            if (this.hamburgerButton) {
                this.hamburgerButton.style.display = this.isMobile ? 'block' : 'none';
            }
        }
    }

    updateDrawerStyles() {
        if (this.drawer) {
            if (this.isMobile) {
                // Mobile: full screen
                this.drawer.style.width = '100vw';
                this.drawer.style.height = '100vh';
                this.drawer.style.borderRight = 'none';
                this.drawer.style.zIndex = '50';
            } else {
                // Desktop: side panel
                this.drawer.style.width = '320px';
                this.drawer.style.height = '100vh';
                this.drawer.style.borderRight = '1px solid #374151';
                this.drawer.style.zIndex = '40';
            }
        }
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        this.drawer.style.transform = 'translateX(0)';
        this.drawer.classList.add('open');

        // Persist state on desktop
        if (!this.isMobile) {
            localStorage.setItem('drawer-open-state', 'true');
        }

        // Show overlay on mobile
        if (this.isMobile && this.overlay) {
            this.overlay.classList.remove('hidden');
        }

        // Prevent body scroll on mobile
        if (this.isMobile) {
            document.body.style.overflow = 'hidden';
        }
    }

    close() {
        if (!this.isOpen) {
            return;
        }

        this.isOpen = false;
        this.drawer.style.transform = 'translateX(-100%)';
        this.drawer.classList.remove('open');

        // Persist state on desktop
        if (!this.isMobile) {
            localStorage.setItem('drawer-open-state', 'false');
        }

        // Hide overlay on mobile
        if (this.overlay) {
            this.overlay.classList.add('hidden');
        }

        // Restore body scroll on mobile
        if (this.isMobile) {
            document.body.style.overflow = '';
        }
    }

    loadPersistedValues() {
        // Load all persisted values from localStorage
        this.checkboxNames.forEach(name => {
            const saved = localStorage.getItem(name);

            if (saved !== null) {
                const checkbox = this.drawer.querySelector(`input[name="${name}"]`);

                if (checkbox) {
                    checkbox.checked = saved === 'true';
                }
            }
        });

        // Load prompt helpers from localStorage
        if (window.PromptHelpersForm) {
            const savedPromptHelpers = localStorage.getItem('promptHelpers');

            if (savedPromptHelpers) {
                try {
                    const promptHelpers = JSON.parse(savedPromptHelpers);

                    PromptHelpersForm.setFormValues(promptHelpers, this.drawer);
                } catch (error) {
                    console.warn('🔧 DRAWER: Failed to parse saved prompt helpers:', error);
                }
            }
        }

        // Load other persisted values
        const multiplier = localStorage.getItem('multiplier');

        if (multiplier) {
            const input = this.drawer.querySelector('#multiplier');

            if (input) {
                input.value = multiplier;
            }
        }

        const theme = localStorage.getItem('theme');

        if (theme) {
            const select = this.drawer.querySelector('#theme-select');

            if (select) {
                select.value = theme;
            }
        }
    }

    // Public methods for external access
    getFormValues() {
        const values = {};
        const elements = this.drawer.querySelectorAll('input, select');

        elements.forEach(element => {
            const key = element.name || element.id;

            if (key) {
                values[key] = element.type === 'checkbox' ? element.checked : element.value;
            }
        });

        // Add prompt helpers to the form values
        values.promptHelpers = PromptHelpersForm.getFormValues(this.drawer);

        return values;
    }

    setFormValues(values) {
        Object.keys(values).forEach(key => {
            if (key === 'promptHelpers') {
                // Handle prompt helpers separately
                PromptHelpersForm.setFormValues(values[key], this.drawer);
            } else {
                const element = this.drawer.querySelector(`[name="${key}"], #${key}`);

                if (element) {
                    if (element.type === 'checkbox') {
                        element.checked = values[key];
                    } else {
                        element.value = values[key];
                    }
                }
            }
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.SimpleDrawer = SimpleDrawer;
}
