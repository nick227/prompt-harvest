// Unified Drawer Component - Refactored for DRY principles
class UnifiedDrawerComponent {
    constructor() {
        this.isMobile = window.innerWidth <= 768;
        this.desktopDrawer = null;
        this.mobileOverlay = null;
        this.mobileDrawer = null;
        this.desktopToggleButton = null;

        // Common styling constants
        this.styles = {
            drawer: 'fixed left-0 top-0 h-full w-80 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto shadow-2xl border-r border-gray-700',
            mobileOverlay: 'fixed inset-0 bg-black bg-opacity-50 z-40 hidden mobile-only',
            mobileDrawer: 'fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white transform transition-transform duration-300 ease-in-out z-50 overflow-y-auto',
            toggleButton: 'fixed top-4 left-4 z-50 w-10 h-10 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-600 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-200 ease-in-out desktop-only',
            container: 'bg-gray-800/50 rounded-xl p-4 border border-gray-700/50',
            title: 'text-lg font-semibold',
            section: 'mb-8 max-sm:mb-4'
        };

        // Common checkbox names for persistence
        this.checkboxNames = ['autoDownload', 'autoPublic', 'photogenic', 'artistic', 'mixup', 'mashup'];

        this.init();
    }

    init() {
        this.createDesktopDrawer();
        this.createMobileDrawer();
        this.setupResponsiveBehavior();
        this.setupCheckboxPersistence();
    }

    // Helper method to get variant-specific classes
    getVariantClasses(variant = 'desktop', baseClasses = {}) {
        const isMobile = variant === 'mobile';

        return {
            section: isMobile ? 'mb-8' : this.styles.section,
            title: isMobile ? this.styles.title : `${this.styles.title} max-sm:text-base`,
            titleContainer: isMobile ? 'flex items-center gap-2 mb-4' : 'flex items-center gap-2 mb-4 max-sm:mb-2',
            container: isMobile ? this.styles.container : `${this.styles.container} max-sm:p-3`,
            ...baseClasses
        };
    }

    // Helper method to get variant-specific IDs
    getVariantId(baseId, variant = 'desktop') {
        return variant === 'mobile' ? `mobile-${baseId}` : baseId;
    }

    createDesktopDrawer() {

        const existingDrawer = document.getElementById('controls-drawer');

        if (existingDrawer) {
            this.desktopDrawer = existingDrawer;
            this.setupDrawerCloseButton();
            this.createDesktopToggleButton();

            return;
        }

        this.desktopDrawer = document.createElement('div');
        this.desktopDrawer.id = 'controls-drawer';
        this.desktopDrawer.className = this.styles.drawer;
        this.desktopDrawer.innerHTML = this.getDrawerContent();

        setTimeout(() => this.setupDrawerCloseButton(), 10);

        const main = document.querySelector('main');

        if (main) {
            main.parentNode.insertBefore(this.desktopDrawer, main);
        }

        this.createDesktopToggleButton();
    }

    setupDrawerCloseButton() {
        const closeBtn = document.getElementById('desktop-drawer-close-btn');

        if (closeBtn) {
            closeBtn.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.closeDesktopDrawer();
            });
        }
    }

    closeDesktopDrawer() {
        if (!this.desktopDrawer) {
            return;
        }

        this.desktopDrawer.style.transform = 'translateX(-100%)';
        this.updateToggleButtonIcon(false);
    }

    createDesktopToggleButton() {
        const existingToggle = document.getElementById('desktop-drawer-toggle');

        if (existingToggle) {
            this.desktopToggleButton = existingToggle;

            return;
        }

        this.desktopToggleButton = document.createElement('button');
        this.desktopToggleButton.id = 'desktop-drawer-toggle';
        this.desktopToggleButton.className = this.styles.toggleButton;
        this.desktopToggleButton.setAttribute('aria-label', 'Toggle Controls Drawer');
        this.desktopToggleButton.setAttribute('title', 'Toggle Controls Drawer');

        this.updateToggleButtonIcon(true);

        this.desktopToggleButton.addEventListener('click', () => this.toggleDesktopDrawer());

        document.body.appendChild(this.desktopToggleButton);
    }

    updateToggleButtonIcon(isOpen) {
        if (!this.desktopToggleButton) {
            return;
        }

        const icon = isOpen ? 'close' : 'hamburger';
        const title = isOpen ? 'Close Controls Drawer' : 'Open Controls Drawer';

        this.desktopToggleButton.innerHTML = this.getIconSVG(icon);

        this.desktopToggleButton.setAttribute('title', title);
    }

    getIconSVG(type) {
        const icons = {
            close: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>',
            hamburger: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>'
        };

        return `<svg class="w-5 h-5 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">${
            icons[type]
        }</svg>`;
    }

    toggleDesktopDrawer() {
        if (!this.desktopDrawer) {
            return;
        }

        const isHidden = this.desktopDrawer.style.transform === 'translateX(-100%)';

        this.desktopDrawer.style.transform = isHidden ? 'translateX(0)' : 'translateX(-100%)';

        this.updateToggleButtonIcon(!isHidden);
    }

    createMobileDrawer() {
        const existingOverlay = document.getElementById('mobile-controls-overlay');

        if (existingOverlay) {
            this.mobileOverlay = existingOverlay;
            this.mobileDrawer = document.getElementById('mobile-controls-drawer');

            return;
        }

        this.mobileOverlay = document.createElement('div');
        this.mobileOverlay.id = 'mobile-controls-overlay';
        this.mobileOverlay.className = this.styles.mobileOverlay;

        this.mobileDrawer = document.createElement('div');
        this.mobileDrawer.id = 'mobile-controls-drawer';
        this.mobileDrawer.className = this.styles.mobileDrawer;
        this.mobileDrawer.innerHTML = this.getMobileDrawerContent();

        this.mobileOverlay.appendChild(this.mobileDrawer);

        if (this.desktopDrawer) {
            this.desktopDrawer.parentNode.insertBefore(this.mobileOverlay, this.desktopDrawer.nextSibling);
        }
    }

    getDrawerContent() {
        return `
            <div class="flex items-center justify-between p-4 border-b border-gray-700 drawer-header">
                <h2 class="text-xl font-semibold text-white">Controls</h2>
                <button id="desktop-drawer-close-btn" class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    ${this.getIconSVG('close')}
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
            <div class="flex items-center justify-between p-4 border-b border-gray-700">
                <h2 class="text-xl font-semibold text-white justify-center align-center flex w-full">Controls</h2>
                <button id="mobile-close-btn" class="p-2 rounded-lg hover:bg-gray-700 transition-colors">
                    ${this.getIconSVG('close')}
                </button>
            </div>
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
                            class="w-full bg-white text-gray-800 px-3 py-2 rounded
                            focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>
            </div>
        `;
    }

    getProvidersSection(variant = 'desktop') {
        const classes = this.getVariantClasses(variant);
        const providerListId = this.getVariantId('provider-list', variant);

        return `
            <div class="${classes.section}" data-section="providers">
                <div class="${classes.titleContainer}">
                    <h3 class="${classes.title} text-green-400">Models</h3>
                </div>
                <div class="${classes.container}">
                    <div id="${providerListId}" class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <!-- Providers will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    getSettingsSection(variant = 'desktop') {
        const classes = this.getVariantClasses(variant);
        const multiplierId = this.getVariantId('multiplier', variant);

        return `
            <div class="${classes.section}" data-section="settings">
                <div class="${classes.titleContainer}">
                    <h3 class="${classes.title} text-blue-400">Settings</h3>
                </div>
                ${this.getCheckboxGroup(['autoPublic', 'autoDownload'], classes.container)}
                <div class="${classes.container}">
                    ${this.getGuidanceSelects()}
                </div>
                <div class="${classes.container}">
                    ${this.getEnhancementSection(multiplierId)}
                </div>
            </div>
        `;
    }

    getCheckboxGroup(checkboxNames, containerClass) {
        return checkboxNames.map(name => `
            <div class="${containerClass}">
                <label class="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" name="${name}"
                        class="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded
                        focus:ring-blue-500 focus:ring-2" />
                    <span class="text-gray-200 group-hover:text-white transition-colors">
                        ${this.getCheckboxLabel(name)}
                    </span>
                </label>
            </div>
        `).join('');
    }

    getCheckboxLabel(name) {
        const labels = {
            autoPublic: 'Auto Public',
            autoDownload: 'Auto Download',
            photogenic: 'Photogenic',
            artistic: 'Artistic',
            mixup: 'Mixup',
            mashup: 'Mashup'
        };

        return labels[name] || name;
    }

    getGuidanceSelects() {
        const guidanceOptions = this.generateGuidanceOptions();

        return `
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Bottom Guidance</label>
                <select class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    name="guidance-bottom">
                    ${guidanceOptions}
                </select>
            </div>
            <div class="space-y-2">
                <label class="block text-sm font-medium text-gray-300">Top Guidance</label>
                <select class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                    name="guidance-top">
                    ${guidanceOptions}
                </select>
            </div>
        `;
    }

    generateGuidanceOptions() {
        const options = ['<option value>None</option>'];

        for (let i = 1; i <= 20; i++) {
            let label;

            if (i === 1) {
                label = '1 - Minimal';
            } else if (i === 5) {
                label = '5 - Balanced';
            } else if (i === 10) {
                label = '10 - Strong';
            } else if (i === 20) {
                label = '20 - Maximum';
            } else {
                label = i.toString();
            }

            options.push(`<option value="${i}">${label}</option>`);
        }

        return options.join('');
    }

    getEnhancementSection(multiplierId) {
        return `
            <div class="space-y-2 mb-4">
                <label class="block text-sm font-medium text-gray-300">Multiplier Text</label>
                <input type="text" id="${multiplierId}" placeholder="Enter enhancement text..."
                    class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                    focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                    transition-all placeholder-gray-400" />
            </div>
            <div class="flex gap-12">
                ${this.getEnhancementCheckboxes(['mixup', 'mashup'])}
            </div>
            <div class="flex gap-4">
                ${this.getEnhancementCheckboxes(['photogenic', 'artistic'])}
            </div>
        `;
    }

    getEnhancementCheckboxes(names) {
        return names.map(name => `
            <label class="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" name="${name}"
                    class="w-5 h-5 text-purple-600 bg-gray-700 border-gray-600 rounded
                    focus:ring-purple-500 focus:ring-2" />
                <span class="text-gray-200 group-hover:text-white transition-colors">
                    ${this.getCheckboxLabel(name)}
                </span>
            </label>
        `).join('');
    }

    getThemeSection(variant = 'desktop') {
        const classes = this.getVariantClasses(variant);
        const themeSelectId = this.getVariantId('theme-select', variant);

        return `
            <div class="${classes.section}" data-section="theme">
                <div class="${classes.titleContainer}">
                    <h3 class="${classes.title} text-purple-400">🎨 Theme</h3>
                </div>
                <div class="${classes.container}">
                    <div class="space-y-3">
                        <label class="block text-sm font-medium text-gray-300">Choose Theme</label>
                        <select id="${themeSelectId}"
                            class="w-full bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600
                            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                            transition-all">
                            <option value="default">🌙 Default Dark</option>
                            <option value="apple">🍎 Apple Light</option>
                            <option value="monokai">🎨 Monokai</option>
                            <option value="highcontrast">⚫ High Contrast</option>
                            <option value="discord">💜 Discord</option>
                        </select>
                        <div class="text-xs text-gray-400 mt-2">Themes instantly change all site colors</div>
                    </div>
                </div>
            </div>
        `;
    }

    getPromptHistorySection(variant = 'desktop') {
        const classes = this.getVariantClasses(variant);
        const historyId = this.getVariantId('prompt-history', variant);

        return `
            <div class="${classes.section}" data-section="history">
                <div class="${classes.titleContainer}">
                    <h3 class="${classes.title} text-blue-400">History</h3>
                </div>
                <div class="${classes.container}">
                    <div id="${historyId}" class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <!-- Prompt history will be populated by JavaScript -->
                    </div>
                </div>
            </div>
        `;
    }

    getFaqSection(variant = 'desktop') {
        const classes = this.getVariantClasses(variant);

        return `
            <div class="${classes.section}" data-section="faq">
                <div class="${classes.titleContainer}">
                    <h3 class="${classes.title} text-blue-400">Pages</h3>
                </div>
                <div class="${classes.container}">
                    <div class="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                        <a href="/" class="flex justify-between w-full">Home</a>
                        <a href="/billing.html" class="flex justify-between w-full">Account</a>
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
        if (window.controlsDrawer?.handleResize) {
            window.controlsDrawer.handleResize();
        }

        if (window.mobileControlsManager) {
            if (this.isMobile) {
                this.createMobileDrawer();
                window.mobileControlsManager.reinit();
            } else {
                window.mobileControlsManager.cleanup();
            }
        }

        // Handle desktop toggle button visibility
        if (this.desktopToggleButton) {
            this.desktopToggleButton.style.display = this.isMobile ? 'none' : 'block';
        }
    }

    // Consolidated sync methods
    syncDrawers() {
        if (!this.desktopDrawer || !this.mobileDrawer) {
            return;
        }

        this.syncFormControls();

        this.syncProviderList();

        this.syncPromptHistory();
    }

    syncFormControls() {
        this.syncFormElements('input[type="checkbox"]', element => element.checked);

        this.syncFormElements('select', element => element.value);

        this.syncFormElements('input[type="text"], input[type="number"]', element => element.value);
    }

    syncFormElements(selector, getValue) {
        const desktopElements = this.desktopDrawer.querySelectorAll(selector);

        desktopElements.forEach(desktopElement => {
            const mobileElement = this.mobileDrawer.querySelector(
                `[name="${desktopElement.name}"], [id="${desktopElement.id}"]`
            );

            if (mobileElement) {
                const value = getValue(desktopElement);

                if (mobileElement.type === 'checkbox') {
                    mobileElement.checked = value;
                } else {
                    mobileElement.value = value;
                }
            }
        });
    }

    syncProviderList() {
        const desktopProviderList = document.getElementById('provider-list');
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (!desktopProviderList || !mobileProviderList) {
            return;
        }

        const desktopCheckboxes = desktopProviderList.querySelectorAll(
            'input[name="providers"], input[id="all"]'
        );
        const _mobileCheckboxes = mobileProviderList.querySelectorAll(
            'input[name="providers"], input[id="all"]'
        );

        desktopCheckboxes.forEach(desktopCheckbox => {
            const mobileCheckbox = mobileProviderList.querySelector(
                `[name="${desktopCheckbox.name}"], [id="${desktopCheckbox.id}"]`
            );

            if (mobileCheckbox) {
                mobileCheckbox.checked = desktopCheckbox.checked;
                mobileCheckbox.indeterminate = desktopCheckbox.indeterminate;
            }
        });
    }

    syncPromptHistory() {
        const desktopPromptHistory = document.getElementById('prompt-history');
        const mobilePromptHistory = document.getElementById('mobile-prompt-history');

        if (desktopPromptHistory && mobilePromptHistory) {
            mobilePromptHistory.innerHTML = desktopPromptHistory.innerHTML;
        }
    }

    // Consolidated form value methods
    getFormValues(variant = 'desktop') {
        const drawer = variant === 'mobile' ? this.mobileDrawer : this.desktopDrawer;

        if (!drawer) {
            return {};
        }

        const values = {};
        const elements = drawer.querySelectorAll('input, select');

        elements.forEach(element => {
            const key = element.name || element.id;

            if (key) {
                values[key] = element.type === 'checkbox'
                    ? element.checked
                    : element.value;
            }
        });

        return values;
    }

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

    setCurrentTheme(themeName) {
        const themeSelects = ['theme-select', 'mobile-theme-select'];

        themeSelects.forEach(id => {
            const select = document.getElementById(id);

            if (select) {
                select.value = themeName;
            }
        });
    }

    updateProviderList(html) {
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (!mobileProviderList) {
            return;
        }

        const isMobileUpdate = window.mobileControlsManager?.isUpdatingFromMobile;

        if (isMobileUpdate) {
            this.sortMobileProviderList();

            return;
        }

        // Preserve checkbox states
        const currentStates = this.preserveCheckboxStates(mobileProviderList);

        mobileProviderList.innerHTML = html;

        this.restoreCheckboxStates(mobileProviderList, currentStates);
    }

    preserveCheckboxStates(container) {
        const states = new Map();
        const checkboxes = container.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            states.set(checkbox.name || checkbox.id, {
                checked: checkbox.checked,
                indeterminate: checkbox.indeterminate
            });
        });

        return states;
    }

    restoreCheckboxStates(container, states) {
        states.forEach((state, key) => {
            const checkbox = container.querySelector(`[name="${key}"], [id="${key}"]`);

            if (checkbox) {
                checkbox.checked = state.checked;

                checkbox.indeterminate = state.indeterminate;
            }
        });
    }

    sortMobileProviderList() {
        const mobileProviderList = document.getElementById('mobile-provider-list');

        if (!mobileProviderList) {
            return;
        }

        const providerLabels = Array.from(mobileProviderList.querySelectorAll('label'))
            .filter(label => label.querySelector('input[name="providers"]'));

        providerLabels.sort((a, b) => {
            const checkboxA = a.querySelector('input[name="providers"]');
            const checkboxB = b.querySelector('input[name="providers"]');

            const isCheckedA = checkboxA.checked;
            const isCheckedB = checkboxB.checked;

            if (isCheckedA && !isCheckedB) {
                return -1;
            }
            if (!isCheckedA && isCheckedB) {
                return 1;
            }

            const labelA = a.querySelector('span').textContent.toLowerCase();
            const labelB = b.querySelector('span').textContent.toLowerCase();

            return labelA.localeCompare(labelB);
        });

        const fragment = document.createDocumentFragment();

        providerLabels.forEach(label => fragment.appendChild(label));

        const allCheckbox = mobileProviderList.querySelector('#all');
        const allLabel = allCheckbox?.closest('label');

        if (allLabel) {
            fragment.appendChild(allLabel);
        }

        mobileProviderList.innerHTML = '';
        mobileProviderList.appendChild(fragment);

        const checkedProviders = mobileProviderList.querySelectorAll('input[name="providers"]:checked');

        if (checkedProviders.length > 0) {
            mobileProviderList.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    updatePromptHistory(html) {
        const historyElements = ['prompt-history', 'mobile-prompt-history'];

        historyElements.forEach(id => {
            const element = document.getElementById(id);

            if (element) {
                element.innerHTML = html;
            }
        });
    }

    // Consolidated checkbox persistence
    setupCheckboxPersistence() {
        setTimeout(() => {
            this.loadCheckboxStates();
            this.attachCheckboxListeners();
        }, 100);
    }

    saveCheckboxState(name, checked) {
        localStorage.setItem(`drawer_${name}`, checked.toString());
    }

    loadCheckboxState(name) {
        return localStorage.getItem(`drawer_${name}`) === 'true';
    }

    loadCheckboxStates() {
        this.checkboxNames.forEach(name => {
            const savedState = this.loadCheckboxState(name);

            this.setCheckboxState(name, savedState);
        });
    }

    setCheckboxState(name, checked) {
        const selectors = [
            this.desktopDrawer?.querySelector(`input[name="${name}"]`),
            this.mobileDrawer?.querySelector(`input[name="${name}"]`)
        ];

        selectors.forEach(checkbox => {
            if (checkbox) {
                checkbox.checked = checked;
            }
        });
    }

    attachCheckboxListeners() {
        this.checkboxNames.forEach(name => {
            this.attachCheckboxListener(name, 'desktop', 'mobile');
            this.attachCheckboxListener(name, 'mobile', 'desktop');
        });
    }

    attachCheckboxListener(name, sourceVariant, targetVariant) {
        const sourceDrawer = sourceVariant === 'mobile' ? this.mobileDrawer : this.desktopDrawer;
        const checkbox = sourceDrawer?.querySelector(`input[name="${name}"]`);

        if (checkbox) {
            checkbox.addEventListener('change', e => {
                this.saveCheckboxState(name, e.target.checked);
                this.syncCheckboxToTarget(name, e.target.checked, targetVariant);
            });
        }
    }

    syncCheckboxToTarget(name, checked, targetVariant) {
        const targetDrawer = targetVariant === 'mobile' ? this.mobileDrawer : this.desktopDrawer;
        const targetCheckbox = targetDrawer?.querySelector(`input[name="${name}"]`);

        if (targetCheckbox && targetCheckbox.checked !== checked) {
            targetCheckbox.checked = checked;
        }
    }
}

// Initialize unified drawer component when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.unifiedDrawerComponent = new UnifiedDrawerComponent();

    // Add utility function
    window.checkCheckboxState = name => {
        const checkbox = document.querySelector(`input[name="${name}"]`);

        return checkbox?.checked;
    };
});

// Export for global access
window.UnifiedDrawerComponent = UnifiedDrawerComponent;
