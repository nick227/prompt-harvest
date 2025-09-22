// Unified Drawer Component - Single component for both desktop and mobile drawer rendering
class UnifiedDrawerComponent {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.desktopDrawer = null;
        this.mobileOverlay = null;
        this.mobileDrawer = null;
        this.init();
    }

    init() {
        this.createDesktopDrawer();
        this.createMobileDrawer();
        this.setupResponsiveBehavior();
        this.setupCheckboxPersistence();
    }

    createDesktopDrawer() {
        const existingDrawer = document.getElementById('controls-drawer');

        if (existingDrawer) {
            this.desktopDrawer = existingDrawer;

            // Setup close button for existing drawer (with small delay to ensure DOM is ready)
            setTimeout(() => {
                this.setupDrawerCloseButton();
            }, 10);
            this.createDesktopToggleButton();

            return;
        }

        // Create desktop drawer if it doesn't exist
        this.desktopDrawer = document.createElement('div');
        this.desktopDrawer.id = 'controls-drawer';
        this.desktopDrawer.className = 'fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto shadow-2xl border-r border-gray-700';

        this.desktopDrawer.innerHTML = this.getDrawerContent();

        // Setup close button inside drawer (with small delay to ensure DOM is ready)
        setTimeout(() => {
            this.setupDrawerCloseButton();
        }, 10);

        // Insert before main content
        const main = document.querySelector('main');

        if (main) {
            main.parentNode.insertBefore(this.desktopDrawer, main);
        }

        this.createDesktopToggleButton();
    }

    setupDrawerCloseButton() {
        const closeBtn = document.getElementById('desktop-drawer-close-btn');

        if (closeBtn) {
            console.log('✅ Desktop drawer close button found and event listener attached');
            closeBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Desktop drawer close button clicked');
                this.closeDesktopDrawer();
            });
        } else {
            console.warn('⚠️ Desktop drawer close button not found!');
        }
    }

    closeDesktopDrawer() {
        console.log('🔘 closeDesktopDrawer() called');

        if (!this.desktopDrawer) {
            console.warn('⚠️ Desktop drawer not found in closeDesktopDrawer()');

            return;
        }

        console.log('✅ Closing desktop drawer');
        this.desktopDrawer.style.transform = 'translateX(-100%)';

        // Update toggle button to show hamburger icon
        if (this.desktopToggleButton) {
            this.desktopToggleButton.innerHTML = `
                <svg class="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            `;
            this.desktopToggleButton.setAttribute('title', 'Open Controls Drawer');
            console.log('✅ Toggle button updated to hamburger icon');
        }
    }

    createDesktopToggleButton() {
        // Check if toggle button already exists
        const existingToggle = document.getElementById('desktop-drawer-toggle');

        if (existingToggle) {
            this.desktopToggleButton = existingToggle;

            return;
        }

        // Create desktop toggle button
        this.desktopToggleButton = document.createElement('button');
        this.desktopToggleButton.id = 'desktop-drawer-toggle';
        this.desktopToggleButton.className = 'fixed top-4 left-4 z-50 w-10 h-10 bg-gray-800/80 hover:bg-gray-700/80 ' +
            'border border-gray-600 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 ease-in-out desktop-only';
        this.desktopToggleButton.setAttribute('aria-label', 'Toggle Controls Drawer');
        this.desktopToggleButton.setAttribute('title', 'Toggle Controls Drawer');

        // Add close icon (drawer is open by default)
        this.desktopToggleButton.innerHTML = `
            <svg class="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        `;

        // Add click event listener
        this.desktopToggleButton.addEventListener('click', () => {
            this.toggleDesktopDrawer();
        });

        // Insert into body
        document.body.appendChild(this.desktopToggleButton);

        // Drawer is open by default - no initial hiding
    }

    toggleDesktopDrawer() {
        if (!this.desktopDrawer) {
            return;
        }

        const isHidden = this.desktopDrawer.style.transform === 'translateX(-100%)';

        if (isHidden) {
            // Open drawer
            this.desktopDrawer.style.transform = 'translateX(0)';
            this.desktopToggleButton.innerHTML = `
                <svg class="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            `;
            this.desktopToggleButton.setAttribute('title', 'Close Controls Drawer');
        } else {
            // Close drawer
            this.desktopDrawer.style.transform = 'translateX(-100%)';
            this.desktopToggleButton.innerHTML = `
                <svg class="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M4 6h16M4 12h16M4 18h16"></path>
                </svg>
            `;
            this.desktopToggleButton.setAttribute('title', 'Open Controls Drawer');
        }
    }

    createMobileDrawer() {
        const existingOverlay = document.getElementById('mobile-controls-overlay');

        if (existingOverlay) {
            this.mobileOverlay = existingOverlay;
            this.mobileDrawer = document.getElementById('mobile-controls-drawer');

            return;
        }

        // Create mobile overlay and drawer
        this.mobileOverlay = document.createElement('div');
        this.mobileOverlay.id = 'mobile-controls-overlay';
        this.mobileOverlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden mobile-only';

        this.mobileDrawer = document.createElement('div');
        this.mobileDrawer.id = 'mobile-controls-drawer';
        this.mobileDrawer.className = 'fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto';

        this.mobileDrawer.innerHTML = this.getMobileDrawerContent();
        this.mobileOverlay.appendChild(this.mobileDrawer);

        // Insert after desktop drawer
        if (this.desktopDrawer) {
            this.desktopDrawer.parentNode.insertBefore(this.mobileOverlay, this.desktopDrawer.nextSibling);
        }
    }

    getDrawerContent() {
        return `
            <!-- Drawer Header with Close Button -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700 drawer-header">
                <h2 class="text-xl font-semibold text-white">Controls</h2>
                <button id="desktop-drawer-close-btn" class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <div class="p-6">
                ${this.getSearchSection()}
                ${this.getFaqSection()}
                ${this.getProvidersSection()}
                ${this.getSettingsSection()}
                ${this.getThemeSection()}
                ${this.getPromptHistorySection()}
            </div>
        `;
    }

    getMobileDrawerContent() {
        return `
            <!-- Mobile Header with Close Button -->
            <div class="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 class="text-xl font-semibold text-white justify-center align-center flex w-full">Controls</h2>
                <button id="mobile-close-btn" class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>

            <!-- Mobile Controls Content -->
            <div class="p-6">
                ${this.getFaqSection('mobile')}
                ${this.getProvidersSection('mobile')}
                ${this.getSettingsSection('mobile')}
                ${this.getThemeSection('mobile')}
                ${this.getPromptHistorySection('mobile')}
            </div>
        `;
    }

    getSearchSection() {
        return `
            <div class="mb-8 max-sm:mb-4" data-section="search">
                <div class="flex gap-2 sub-controls">
                    <div class="search w-full">
                        <input type="text" name="image-search" placeholder="Search"
                            class="w-full bg-white text-gray-800 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>
        `;
    }

    getProvidersSection(variant = 'desktop') {
        const providerListId = variant === 'mobile' ? 'mobile-provider-list' : 'provider-list';
        const sectionClass = variant === 'mobile' ? 'mb-8' : 'mb-8 max-sm:mb-4';
        const containerClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 max-sm:p-3';
        const titleClass = variant === 'mobile' ? 'text-lg font-semibold text-green-400' : 'text-lg font-semibold text-green-400 max-sm:text-base';
        const titleContainerClass = variant === 'mobile' ? 'flex items-stretch gap-2 mb-4 w-full' : 'flex items-stretch gap-2 mb-4 max-sm:mb-2 w-full';

        return `
            <div class="${sectionClass}" data-section="providers">
                <div class="${titleContainerClass}">
                    <h3 class="${titleClass}">Models</h3>
                </div>
                <div class="${containerClass}">
                    <div id="${providerListId}" class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <!-- Providers will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    getSettingsSection(variant = 'desktop') {
        const multiplierId = variant === 'mobile' ? 'mobile-multiplier' : 'multiplier';
        const sectionClass = variant === 'mobile' ? 'mb-8' : 'mb-8 max-sm:mb-4';
        const titleClass = variant === 'mobile' ? 'text-lg font-semibold text-blue-400' : 'text-lg font-semibold text-blue-400 max-sm:text-base';
        const titleContainerClass = variant === 'mobile' ? 'flex items-center gap-2 mb-4' : 'flex items-center gap-2 mb-4 max-sm:mb-2';
        const containerClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 max-sm:p-3';
        const guidanceClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4 max-sm:p-3 max-sm:space-y-3';
        const enhancementClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 space-y-4 max-sm:p-3 max-sm:space-y-3';

        return `
            <div class="${sectionClass}" data-section="settings">
                <div class="${titleContainerClass}">
                    <h3 class="${titleClass}">Settings</h3>
                </div>
                <div class="${containerClass}">
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" name="autoPublic" class="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" />
                        <span class="text-gray-200 group-hover:text-white transition-colors">Auto Public</span>
                    </label>
                </div>
                <div class="${containerClass}">
                    <label class="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" name="autoDownload" class="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2" />
                        <span class="text-gray-200 group-hover:text-white transition-colors">Auto Download</span>
                    </label>
                </div>
                <!-- Guidance Section -->
                <div class="${guidanceClass}">
                    ${this.getGuidanceSelects()}
                </div>
                <!-- Prompt Enhancement Section -->
                <div class="${enhancementClass}">
                    ${this.getEnhancementSection(multiplierId)}
                </div>
            </div>
        `;
    }

    getGuidanceSelects() {
        return `
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Bottom Guidance</label>
                <select class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" name="guidance-bottom">
                    <option value>None</option>
                    <option value="1">1 - Minimal</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 - Balanced</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10 - Strong</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20 - Maximum</option>
                </select>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Top Guidance</label>
                <select class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all" name="guidance-top">
                    <option value>None</option>
                    <option value="1">1 - Minimal</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5 - Balanced</option>
                    <option value="6">6</option>
                    <option value="7">7</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10 - Strong</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                    <option value="13">13</option>
                    <option value="14">14</option>
                    <option value="15">15</option>
                    <option value="16">16</option>
                    <option value="17">17</option>
                    <option value="18">18</option>
                    <option value="19">19</option>
                    <option value="20">20 - Maximum</option>
                </select>
            </div>
        `;
    }

    getEnhancementSection(multiplierId) {
        return `
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Multiplier Text</label>
                <input type="text" id="${multiplierId}" placeholder="Enter enhancement text..."
                    class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder-gray-400" />
            </div>
            <div class="flex gap-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="mixup" class="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2" />
                    <span class="text-gray-200 group-hover:text-white transition-colors">Mixup</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="mashup" class="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2" />
                    <span class="text-gray-200 group-hover:text-white transition-colors">Mashup</span>
                </label>
            </div>
            <div class="flex gap-4">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="photogenic" class="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2" />
                    <span class="text-gray-200 group-hover:text-white transition-colors">Photogenic</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="artistic" class="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded focus:ring-purple-500 focus:ring-2" />
                    <span class="text-gray-200 group-hover:text-white transition-colors">Artistic</span>
                </label>
            </div>
        `;
    }

    getThemeSection(variant = 'desktop') {
        const themeSelectId = variant === 'mobile' ? 'mobile-theme-select' : 'theme-select';
        const sectionClass = variant === 'mobile' ? 'mb-8' : 'mb-8 max-sm:mb-4';
        const titleClass = variant === 'mobile' ? 'text-lg font-semibold text-purple-400' : 'text-lg font-semibold text-purple-400 max-sm:text-base';
        const titleContainerClass = variant === 'mobile' ? 'flex items-center gap-2 mb-4' : 'flex items-center gap-2 mb-4 max-sm:mb-2';
        const containerClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 max-sm:p-3';

        return `
            <div class="${sectionClass}" data-section="theme">
                <div class="${titleContainerClass}">
                    <h3 class="${titleClass}">🎨 Theme</h3>
                </div>
                <div class="${containerClass}">
                    <div class="space-y-3">
                        <label class="block text-sm font-medium text-gray-300">Choose Theme</label>
                        <select id="${themeSelectId}"
                                class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all">
                            <option value="default">🌙 Default Dark</option>
                            <option value="apple">🍎 Apple Light</option>
                            <option value="monokai">🎨 Monokai</option>
                            <option value="highcontrast">⚫ High Contrast</option>
                            <option value="discord">💜 Discord</option>
                        </select>
                        <div class="text-xs text-gray-400 mt-2">
                            Themes instantly change all site colors
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getPromptHistorySection(variant = 'desktop') {
        const historyId = variant === 'mobile' ? 'mobile-prompt-history' : 'prompt-history';
        const sectionClass = variant === 'mobile' ? 'mb-8' : 'mb-8 max-sm:mb-4';
        const titleClass = variant === 'mobile' ? 'text-lg font-semibold text-blue-400' : 'text-lg font-semibold text-blue-400 max-sm:text-base';
        const titleContainerClass = variant === 'mobile' ? 'flex items-center gap-2 mb-4' : 'flex items-center gap-2 mb-4 max-sm:mb-2';
        const containerClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 max-sm:p-3';

        return `
            <div class="${sectionClass}" data-section="history">
                <div class="${titleContainerClass}">
                    <h3 class="${titleClass}">History</h3>
                </div>
                <div class="${containerClass}">
                    <div id="${historyId}" class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <!-- Prompt history will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    getFaqSection(variant = 'desktop') {
        const sectionClass = variant === 'mobile' ? 'mb-8' : 'mb-8 max-sm:mb-4';
        const titleClass = variant === 'mobile' ? 'text-lg font-semibold text-blue-400' : 'text-lg font-semibold text-blue-400 max-sm:text-base';
        const titleContainerClass = variant === 'mobile' ? 'flex items-center gap-2 mb-4' : 'flex items-center gap-2 mb-4 max-sm:mb-2';
        const containerClass = variant === 'mobile' ? 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50' : 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 max-sm:p-3';

        return `
            <div class="${sectionClass}" data-section="faq">
                <div class="${titleContainerClass}">
                    <h3 class="${titleClass}">Pages</h3>
                </div>
                <div class="${containerClass}">
                    <div class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <a href="/" class="flex justify-between w-full">Home</a>
                        <a href="/billing.html" class="flex justify-between w-full">Billing</a>
                        <a href="/faq.html" class="flex justify-between w-full">FAQ</a>
                    </div>
                </div>
            </div>
        `;
    }

    setupResponsiveBehavior() {
        window.addEventListener('resize', () => {
            const wasMobile = this.isMobile;

            this.isMobile = window.innerWidth <= 768;

            if (wasMobile !== this.isMobile) {
                this.handleResponsiveChange();
            }
        });
    }

    handleResponsiveChange() {
        // Trigger re-initialization of managers when switching between mobile/desktop
        if (window.controlsDrawer && typeof window.controlsDrawer.handleResize === 'function') {
            window.controlsDrawer.handleResize();
        }

        if (window.mobileControlsManager && typeof window.mobileControlsManager.setupResizeListener === 'function') {
            // Force re-initialization
            const wasMobile = !this.isMobile;

            if (wasMobile !== this.isMobile) {
                if (this.isMobile) {
                    // Ensure mobile drawer exists before re-initializing mobile controls
                    this.createMobileDrawer();
                    window.mobileControlsManager.reinit();
                } else {
                    window.mobileControlsManager.cleanup();
                }
            }
        }

        // Handle desktop toggle button visibility
        if (this.desktopToggleButton) {
            if (this.isMobile) {
                // Hide desktop toggle button on mobile
                this.desktopToggleButton.style.display = 'none';
            } else {
                // Show desktop toggle button on desktop
                this.desktopToggleButton.style.display = 'block';
            }
        }
    }

    // Method to sync data between desktop and mobile drawers
    syncDrawers() {
        if (!this.desktopDrawer || !this.mobileDrawer) {
            return;
        }

        // Sync form controls
        this.syncFormControls();
        this.syncProviderList();
        this.syncPromptHistory();
    }

    syncFormControls() {
        // Sync checkboxes
        const desktopCheckboxes = this.desktopDrawer.querySelectorAll('input[type="checkbox"]');

        desktopCheckboxes.forEach(desktopCheckbox => {
            const mobileCheckbox = this.mobileDrawer.querySelector(`input[name="${desktopCheckbox.name}"]`);

            if (mobileCheckbox) {
                mobileCheckbox.checked = desktopCheckbox.checked;
            }
        });

        // Sync selects
        const desktopSelects = this.desktopDrawer.querySelectorAll('select');

        desktopSelects.forEach(desktopSelect => {
            const mobileSelect = this.mobileDrawer.querySelector(`select[name="${desktopSelect.name}"], select[id="${desktopSelect.id}"]`);

            if (mobileSelect) {
                mobileSelect.value = desktopSelect.value;
            }
        });

        // Sync inputs
        const desktopInputs = this.desktopDrawer.querySelectorAll('input[type="text"], input[type="number"]');

        desktopInputs.forEach(desktopInput => {
            const mobileInput = this.mobileDrawer.querySelector(`input[name="${desktopInput.name}"], input[id="${desktopInput.id}"]`);

            if (mobileInput) {
                mobileInput.value = desktopInput.value;
            }
        });

        // Sync theme select
        const desktopThemeSelect = document.getElementById('theme-select');
        const mobileThemeSelect = document.getElementById('mobile-theme-select');

        if (desktopThemeSelect && mobileThemeSelect) {
            mobileThemeSelect.value = desktopThemeSelect.value;
        }
    }

    syncProviderList() {
        const desktopProviderList = document.getElementById('provider-list');
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (desktopProviderList && mobileProviderList) {
            // Instead of overwriting the entire HTML, sync individual checkbox states
            // This preserves mobile event listeners and state
            const desktopCheckboxes = desktopProviderList.querySelectorAll('input[name="providers"], input[id="all"]');
            const mobileCheckboxes = mobileProviderList.querySelectorAll('input[name="providers"], input[id="all"]');

            desktopCheckboxes.forEach(desktopCheckbox => {
                const mobileCheckbox = mobileProviderList.querySelector(`input[name="${desktopCheckbox.name}"], input[id="${desktopCheckbox.id}"]`);

                if (mobileCheckbox) {
                    mobileCheckbox.checked = desktopCheckbox.checked;
                    mobileCheckbox.indeterminate = desktopCheckbox.indeterminate;
                }
            });
        }
    }

    syncPromptHistory() {
        const desktopPromptHistory = document.getElementById('prompt-history');
        const mobilePromptHistory = document.getElementById('mobile-prompt-history');

        if (desktopPromptHistory && mobilePromptHistory) {
            mobilePromptHistory.innerHTML = desktopPromptHistory.innerHTML;
        }
    }

    // Method to get all form values from either drawer
    getFormValues(variant = 'desktop') {
        const drawer = variant === 'mobile' ? this.mobileDrawer : this.desktopDrawer;

        if (!drawer) {
            return {};
        }

        const values = {};

        // Get checkbox values
        const checkboxes = drawer.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            values[checkbox.name] = checkbox.checked;
            console.log(`📋 UNIFIED DRAWER: getFormValues - ${checkbox.name}: ${checkbox.checked}`);
        });

        // Get select values
        const selects = drawer.querySelectorAll('select');

        selects.forEach(select => {
            values[select.name || select.id] = select.value;
        });

        // Get input values
        const inputs = drawer.querySelectorAll('input[type="text"], input[type="number"]');

        inputs.forEach(input => {
            values[input.name || input.id] = input.value;
        });

        return values;
    }

    // Method to set form values in either drawer
    setFormValues(values, variant = 'desktop') {
        const drawer = variant === 'mobile' ? this.mobileDrawer : this.desktopDrawer;

        if (!drawer) {
            return;
        }

        Object.keys(values).forEach(key => {
            const element = drawer.querySelector(`[name="${key}"], #${key}`);

            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = values[key];
                } else {
                    element.value = values[key];
                }
            }
        });
    }

    // Method to set current theme in both drawers
    setCurrentTheme(themeName) {
        const desktopThemeSelect = document.getElementById('theme-select');
        const mobileThemeSelect = document.getElementById('mobile-theme-select');

        if (desktopThemeSelect) {
            desktopThemeSelect.value = themeName;
        }
        if (mobileThemeSelect) {
            mobileThemeSelect.value = themeName;
        }
    }

    // Method to update provider list in both drawers
    updateProviderList(html) {
        const mobileProviderList = document.getElementById('mobile-provider-list');

        // Only update mobile provider list to avoid losing desktop event listeners
        // Desktop provider list should be managed by the provider manager directly
        if (mobileProviderList) {
            // Check if this is a mobile-initiated update (don't overwrite mobile HTML, but still sort)
            const isMobileUpdate = window.mobileControlsManager && window.mobileControlsManager.isUpdatingFromMobile;

            if (isMobileUpdate) {
                console.log('🔄 UNIFIED DRAWER: Skipping mobile HTML update - mobile is managing its own state');

                // Still trigger mobile sorting even if we skip HTML update
                this.sortMobileProviderList();

                return;
            }

            // Preserve current mobile checkbox states before updating
            const currentStates = new Map();
            const mobileCheckboxes = mobileProviderList.querySelectorAll('input[type="checkbox"]');

            mobileCheckboxes.forEach(checkbox => {
                currentStates.set(checkbox.name || checkbox.id, {
                    checked: checkbox.checked,
                    indeterminate: checkbox.indeterminate
                });
            });

            console.log('🔄 UNIFIED DRAWER: Updating mobile provider list, preserving states:', currentStates);

            // Update the HTML
            mobileProviderList.innerHTML = html;

            // Restore the checkbox states
            currentStates.forEach((state, key) => {
                const checkbox = mobileProviderList.querySelector(`input[name="${key}"], input[id="${key}"]`);

                if (checkbox) {
                    checkbox.checked = state.checked;
                    checkbox.indeterminate = state.indeterminate;
                    console.log(`✅ UNIFIED DRAWER: Restored ${key} checkbox to ${state.checked}`);
                }
            });
        }
    }

    // Sort mobile provider list using the same logic as desktop
    sortMobileProviderList() {
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (!mobileProviderList) {
            return;
        }

        // Get all provider labels (which contain the checkboxes) - same logic as desktop
        const providerLabels = Array.from(mobileProviderList.querySelectorAll('label'));

        // Filter out the "all" label - same logic as desktop
        const providerLabelsOnly = providerLabels.filter(label => {
            const checkbox = label.querySelector('input[name="providers"]');

            return checkbox !== null;
        });

        // Sort by checked status first (checked at top), then alphabetically - same logic as desktop
        providerLabelsOnly.sort((a, b) => {
            const checkboxA = a.querySelector('input[name="providers"]');
            const checkboxB = b.querySelector('input[name="providers"]');

            const isCheckedA = checkboxA.checked;
            const isCheckedB = checkboxB.checked;

            // If one is checked and the other isn't, checked comes first
            if (isCheckedA && !isCheckedB) {
                return -1;
            }
            if (!isCheckedA && isCheckedB) {
                return 1;
            }

            // If both have same checked status, sort alphabetically by label text
            const labelA = a.querySelector('span').textContent.toLowerCase();
            const labelB = b.querySelector('span').textContent.toLowerCase();

            return labelA.localeCompare(labelB);
        });

        console.log('🔄 UNIFIED DRAWER: Sorting mobile provider list - checked items first, then alphabetical');

        // Create a document fragment to avoid multiple DOM reflows - same logic as desktop
        const fragment = document.createDocumentFragment();

        // Add sorted provider labels to fragment
        providerLabelsOnly.forEach(label => {
            fragment.appendChild(label);
        });

        // Find the "all" label to maintain its position at the end - same logic as desktop
        const allCheckbox = mobileProviderList.querySelector('#all');
        const allLabel = allCheckbox ? allCheckbox.closest('label') : null;

        if (allLabel) {
            fragment.appendChild(allLabel);
        }

        // Clear the container and append the fragment
        mobileProviderList.innerHTML = '';
        mobileProviderList.appendChild(fragment);

        // Scroll mobile provider list to top if there are checked items - same logic as desktop
        const checkedProviders = mobileProviderList.querySelectorAll('input[name="providers"]:checked');

        if (checkedProviders.length > 0) {
            mobileProviderList.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            console.log('📱 UNIFIED DRAWER: Scrolled mobile provider list to top');
        }

        console.log('✅ UNIFIED DRAWER: Mobile provider list sorted successfully');
    }

    // Method to update prompt history in both drawers
    updatePromptHistory(html) {
        const desktopPromptHistory = document.getElementById('prompt-history');
        const mobilePromptHistory = document.getElementById('mobile-prompt-history');

        if (desktopPromptHistory) {
            desktopPromptHistory.innerHTML = html;
        }
        if (mobilePromptHistory) {
            mobilePromptHistory.innerHTML = html;
        }
    }

    // Checkbox persistence methods
    setupCheckboxPersistence() {
        // Load saved states when drawers are created
        setTimeout(() => {
            this.loadCheckboxStates();
            this.attachCheckboxListeners();
        }, 100);
    }

    saveCheckboxState(name, checked) {
        localStorage.setItem(`drawer_${name}`, checked.toString());
        console.log(`📋 UNIFIED DRAWER: Saved ${name} checkbox state to localStorage:`, checked);
    }

    loadCheckboxState(name) {
        const saved = localStorage.getItem(`drawer_${name}`);
        return saved === 'true';
    }

    loadCheckboxStates() {
        const checkboxNames = ['autoDownload', 'autoPublic', 'photogenic', 'artistic', 'mixup', 'mashup'];

        checkboxNames.forEach(name => {
            const savedState = this.loadCheckboxState(name);

            console.log(`📋 UNIFIED DRAWER: Loading ${name} checkbox state:`, savedState);

            // Update desktop drawer
            const desktopCheckbox = this.desktopDrawer?.querySelector(`input[name="${name}"]`);
            console.log(`📋 UNIFIED DRAWER: Desktop ${name} checkbox found:`, !!desktopCheckbox);
            if (desktopCheckbox) {
                desktopCheckbox.checked = savedState;
                console.log(`📋 UNIFIED DRAWER: Desktop ${name} checkbox set to:`, desktopCheckbox.checked);
            }

            // Update mobile drawer
            const mobileCheckbox = this.mobileDrawer?.querySelector(`input[name="${name}"]`);
            if (mobileCheckbox) {
                mobileCheckbox.checked = savedState;
                console.log(`📋 UNIFIED DRAWER: Mobile ${name} checkbox set to:`, mobileCheckbox.checked);
            }
        });
    }

    attachCheckboxListeners() {
        const checkboxNames = ['autoDownload', 'autoPublic', 'photogenic', 'artistic', 'mixup', 'mashup'];

        checkboxNames.forEach(name => {
            // Desktop drawer listener
            const desktopCheckbox = this.desktopDrawer?.querySelector(`input[name="${name}"]`);
            if (desktopCheckbox) {
                desktopCheckbox.addEventListener('change', (e) => {
                    console.log(`📋 UNIFIED DRAWER: ${name} checkbox changed to ${e.target.checked}`);
                    this.saveCheckboxState(name, e.target.checked);
                    this.syncCheckboxToMobile(name, e.target.checked);
                });
            }

            // Mobile drawer listener
            const mobileCheckbox = this.mobileDrawer?.querySelector(`input[name="${name}"]`);
            if (mobileCheckbox) {
                mobileCheckbox.addEventListener('change', (e) => {
                    console.log(`📋 UNIFIED DRAWER: ${name} mobile checkbox changed to ${e.target.checked}`);
                    this.saveCheckboxState(name, e.target.checked);
                    this.syncCheckboxToDesktop(name, e.target.checked);
                });
            }
        });
    }


    syncCheckboxToMobile(name, checked) {
        const mobileCheckbox = this.mobileDrawer?.querySelector(`input[name="${name}"]`);
        if (mobileCheckbox && mobileCheckbox.checked !== checked) {
            mobileCheckbox.checked = checked;
        }
    }

    syncCheckboxToDesktop(name, checked) {
        const desktopCheckbox = this.desktopDrawer?.querySelector(`input[name="${name}"]`);
        if (desktopCheckbox && desktopCheckbox.checked !== checked) {
            desktopCheckbox.checked = checked;
        }
    }


    // Test method to verify checkbox functionality
    testCheckboxes() {
        console.log('📋 UNIFIED DRAWER: Testing checkbox functionality...');
        const testCheckboxes = ['photogenic', 'artistic'];

        testCheckboxes.forEach(name => {
            const checkbox = this.desktopDrawer?.querySelector(`input[name="${name}"]`);
            console.log(`📋 UNIFIED DRAWER: ${name} checkbox found:`, !!checkbox);
            if (checkbox) {
                console.log(`📋 UNIFIED DRAWER: ${name} checkbox checked:`, checkbox.checked);
            }
        });

        const formValues = this.getFormValues('desktop');
        console.log('📋 UNIFIED DRAWER: Form values:', formValues);
    }
}

// Initialize unified drawer component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedDrawerComponent = new UnifiedDrawerComponent();

    // Add global test function
    window.testUnifiedDrawerCheckboxes = () => {
        if (window.unifiedDrawerComponent) {
            window.unifiedDrawerComponent.testCheckboxes();
        } else {
            console.warn('unifiedDrawerComponent not available');
        }
    };

    // Add function to manually check checkbox state
    window.checkCheckboxState = (name) => {
        const checkbox = document.querySelector(`input[name="${name}"]`);
        console.log(`📋 CHECKBOX STATE: ${name}`, {
            found: !!checkbox,
            checked: checkbox?.checked,
            visualElement: checkbox?.nextElementSibling,
            visualClasses: checkbox?.nextElementSibling?.className
        });
        return checkbox?.checked;
    };
});

// Export for global access
window.UnifiedDrawerComponent = UnifiedDrawerComponent;

