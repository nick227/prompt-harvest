// provider Component - Handles AI model provider selection and management
class ProviderComponent {
    constructor () {
        this.config = PROVIDER_CONFIG || {};
        this.isInitialized = false;
        this.providers = [];
        this.selectedProviders = new Set();
    }

    init () {
        this.loadSelections();
        this.setupEventListeners();
        this.isInitialized = true;
    }

    setupEventListeners () {
        const selectAllBtn = Utils.dom.get(this.config.selectors.selectAll);
        const clearAllBtn = Utils.dom.get(this.config.selectors.clearAll);

        if (selectAllBtn && typeof selectAllBtn.addEventListener === 'function') {
            selectAllBtn.addEventListener('click', () => this.handleSelectAllClick());
        }

        if (clearAllBtn && typeof clearAllBtn.addEventListener === 'function') {
            clearAllBtn.addEventListener('click', () => this.handleClearAllClick());
        }
    }

    // provider Loading Methods
    async loadProviders () {
        try {
            const response = await fetch(this.config.api.providers);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.providers = await response.json();

            return this.providers;
        } catch (error) {
            this.providers = [];

            return [];
        }
    }

    getEnabledProviders () {
        return this.providers.filter((provider) => provider.enabled);
    }

    getProviderById (id) {
        const provider = this.providers.find((p) => p.id === id);

        return provider || null;
    }

    // provider Rendering Methods
    createProviderCheckbox (provider) {
        const checkbox = Utils.dom.createElement('input', this.config.classes.checkbox);

        checkbox.type = 'checkbox';
        checkbox.value = provider.id;
        checkbox.checked = this.selectedProviders.has(provider.id);
        checkbox.addEventListener('change', (e) => this.handleProviderChange(e));

        return checkbox;
    }

    createProviderLabel (provider) {
        const label = Utils.dom.createElement('label', 'provider-label');
        const costText = provider.cost ? ` (${this.formatCurrency(provider.cost)})` : '';

        label.innerHTML = `${provider.name}${costText}`;

        return label;
    }

    createProviderItem (provider) {
        if (!this.isValidProvider(provider.id)) {
            return Utils.dom.createElement('div');
        }

        const item = Utils.dom.createElement('div', this.config.classes.provider);

        item.dataset.providerId = provider.id;

        const checkbox = this.createProviderCheckbox(provider);
        const label = this.createProviderLabel(provider);

        item.appendChild(checkbox);
        item.appendChild(label);

        // add selected class if provider is selected
        if (this.selectedProviders.has(provider.id)) {
            item.classList.add(this.config.classes.selected);
        }

        return item;
    }

    renderProviders () {
        const gridContainer = Utils.dom.get(this.config.selectors.providerGrid);

        if (!gridContainer) {
            return;
        }

        // clear existing content
        gridContainer.innerHTML = '';

        // set default selections if none exist
        if (this.selectedProviders.size === 0) {
            this.config.defaults.selectedProviders.forEach((id) => {
                this.selectedProviders.add(id);
            });
        }

        // render enabled providers
        const enabledProviders = this.getEnabledProviders();

        enabledProviders.forEach((provider) => {
            const item = this.createProviderItem(provider);

            gridContainer.appendChild(item);
        });

        this.updateUI();
    }

    // selection Management Methods
    toggleProvider (providerId) {
        if (!this.isValidProvider(providerId)) {
            return false;
        }

        if (this.selectedProviders.has(providerId)) {
            this.selectedProviders.delete(providerId);

            return true;
        } else {
            // check if we've reached the maximum selections
            if (this.selectedProviders.size >= this.config.defaults.maxSelections) {
                return false;
            }

            this.selectedProviders.add(providerId);

            return true;
        }
    }

    selectAllProviders () {
        this.clearAllProviders();

        const enabledProviders = this.getEnabledProviders();
        const maxSelections = Math.min(enabledProviders.length, this.config.defaults.maxSelections);

        for (let i = 0; i < maxSelections; i++) {
            this.selectedProviders.add(enabledProviders[i].id);
        }

        this.updateUI();
        this.saveSelections();
    }

    clearAllProviders () {
        this.selectedProviders.clear();
        this.updateUI();
        this.saveSelections();
    }

    getSelectedProviders () {
        return Array.from(this.selectedProviders);
    }

    // event Handlers
    handleProviderChange (event) {
        const providerId = event.target.value;
        const isChecked = event.target.checked;

        if (isChecked) {
            if (this.selectedProviders.size >= this.config.defaults.maxSelections) {
                event.target.checked = false;
                alert(`Maximum ${this.config.defaults.maxSelections} providers can be selected`);

                return;
            }
            this.selectedProviders.add(providerId);
        } else {
            this.selectedProviders.delete(providerId);
        }

        this.updateUI();
        this.saveSelections();
    }

    handleSelectAllClick () {
        this.selectAllProviders();
    }

    handleClearAllClick () {
        this.clearAllProviders();
    }

    // persistence Methods
    saveSelections () {
        const selections = this.getSelectedProviders();

        Utils.storage.set('selectedProviders', selections);
    }

    loadSelections () {
        try {
            const saved = Utils.storage.get('selectedProviders');

            if (Array.isArray(saved)) {
                this.selectedProviders = new Set(saved);
            } else {
                // use defaults for null, undefined, or invalid data
                this.selectedProviders = new Set();
            }
        } catch (error) {
            this.selectedProviders = new Set();
        }
    }

    // uI Update Methods
    updateUI () {
        // update checkbox states
        this.selectedProviders.forEach((providerId) => {
            const checkbox = Utils.dom.get(`input[value="${providerId}"]`);

            if (checkbox) {
                checkbox.checked = true;
            }

            const item = Utils.dom.get(`[data-provider-id="${providerId}"]`);

            if (item && item.classList && typeof item.classList.add === 'function') {
                item.classList.add(this.config.classes.selected);
            }
        });

        // disable checkboxes if max reached
        if (this.selectedProviders.size >= this.config.defaults.maxSelections) {
            const checkboxes = Utils.dom.getAll('input[type="checkbox"]');

            if (checkboxes) {
                checkboxes.forEach((checkbox) => {
                    if (!checkbox.checked) {
                        checkbox.disabled = true;
                    }
                });
            }
        } else {
            // re-enable all checkboxes
            const checkboxes = Utils.dom.getAll('input[type="checkbox"]');

            if (checkboxes) {
                checkboxes.forEach((checkbox) => {
                    checkbox.disabled = false;
                });
            }
        }
    }

    // utility Methods
    isValidProvider (providerId) {
        return typeof providerId === 'string' && providerId.trim() !== '';
    }

    calculateTotalCost () {
        let totalCost = 0;

        this.selectedProviders.forEach((providerId) => {
            const provider = this.getProviderById(providerId);

            if (provider && provider.cost) {
                totalCost += provider.cost;
            }
        });

        return totalCost;
    }

    formatCurrency (amount) {
        return `$${amount.toFixed(3)}`;
    }

    // public API Methods
    async initialize () {
        await this.loadProviders();
        this.renderProviders();
        this.init();
    }

    refresh () {
        this.renderProviders();
    }

    getSelectionSummary () {
        const selected = this.getSelectedProviders();
        const totalCost = this.calculateTotalCost();

        return {
            count: selected.length,
            providers: selected,
            totalCost,
            formattedCost: this.formatCurrency(totalCost)
        };
    }

    // export functions for global access (maintaining backward compatibility)
    renderProvidersGlobal () {
        return this.renderProviders();
    }

    getSelectedProvidersGlobal () {
        return this.getSelectedProviders();
    }

    selectProviderGlobal (providerId) {
        return this.toggleProvider(providerId);
    }
}

// export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderComponent;
}

// initialize global instance
if (typeof window !== 'undefined') {
    window.ProviderComponent = ProviderComponent;
    window.providerComponent = new ProviderComponent();
}
