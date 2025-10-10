// provider manager - handles dynamic provider list population
class ProviderManager {
    constructor() {
        this.providers = []; // Will be loaded dynamically from API
        this.providersLoaded = false;
        this.saveTimeout = null; // For debouncing save operations
        this.isUpdatingMobile = false; // Prevent infinite mobile update loops
        this.initAsync();
        this.bindEvents();
    }

    /**
     * Async initialization to load providers from API
     */
    async initAsync() {
        await this.init();
    }

    async init() {
        this.providerList = document.getElementById('provider-list');

        // Load providers from API first
        await this.loadProvidersFromAPI();

        if (this.providerList) {
            this.populateProviders();
            this.bindEvents();
        } else {
            console.warn('Provider list container not found, will retry when DOM is ready');

            // Retry initialization when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.providerList = document.getElementById('provider-list');
                    if (this.providerList) {
                        this.populateProviders();
                        this.bindEvents();
                    }
                });
            }
        }
    }

    /**
     * Load providers from API dynamically
     */
    async loadProvidersFromAPI() {
        try {

            const response = await fetch('/api/providers/models/all');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success || !data.data.models) {
                throw new Error('Invalid API response format');
            }

            // Transform API data to provider format
            this.providers = data.data.models.map(model => ({
                value: model.name,
                label: model.displayName
            }));

            this.providersLoaded = true;

        } catch (error) {
            console.error('❌ Failed to load providers from API:', error);

            // Fallback to static providers for compatibility
            this.providers = [
                { value: 'flux', label: 'Flux' },
                { value: 'dalle', label: 'Dalle3' },
                { value: 'juggernaut', label: 'Juggernaut' },
                { value: 'juggernautReborn', label: 'Juggernaut Reborn' },
                { value: 'redshift', label: 'Red Shift' },
                { value: 'absolute', label: 'Absolute Reality' },
                { value: 'realisticvision', label: 'Realistic Vision' },
                { value: 'icbinp', label: 'Icbinp' },
                { value: 'icbinp_seco', label: 'Icbinp2' },
                { value: 'hasdx', label: 'Hasdx' },
                { value: 'dreamshaper', label: 'Dreamshaper' },
                { value: 'dreamshaperLighting', label: 'Dreamshaper Lightning' },
                { value: 'nightmareshaper', label: 'Nightmare Shaper' },
                { value: 'openjourney', label: 'Open Journey' },
                { value: 'analogmadness', label: 'Analog Madness' },
                { value: 'portraitplus', label: 'Portrait Plus' },
                { value: 'tshirt', label: 'Tshirt Design' },
                { value: 'abyssorange', label: 'Abyss Orange' },
                { value: 'cyber', label: 'Cyber Real' },
                { value: 'disco', label: 'Disco' },
                { value: 'synthwave', label: 'Synthwave' },
                { value: 'lowpoly', label: 'Low Poly' },
                { value: 'bluepencil', label: 'Blue Pencil' },
                { value: 'ink', label: 'Ink Punk' },
                { value: 'nanoBanana', label: 'Google Imagen 3' }
            ];

        }
    }

    populateProviders() {

        if (!this.providerList) {
            console.warn('Provider list container not found');

            return;
        }

        // clear existing content
        this.providerList.innerHTML = '';

        // Load saved selections from localStorage
        const savedSelections = this.loadProviderSelections();

        // add provider checkboxes
        this.providers.forEach(provider => {
            const label = document.createElement('label');

            label.className = 'flex items-center gap-1 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors';

            const checkbox = document.createElement('input');

            checkbox.type = 'checkbox';
            checkbox.value = provider.value;
            checkbox.id = provider.value;
            checkbox.name = 'providers';
            checkbox.className = 'mr-1';

            // Restore saved selection
            if (savedSelections.includes(provider.value)) {
                checkbox.checked = true;
            }

            const span = document.createElement('span');

            span.style.whiteSpace = 'nowrap';
            span.textContent = provider.label;
            label.appendChild(checkbox);
            label.appendChild(span);
            this.providerList.appendChild(label);
        });

        // add "all" checkbox at the end
        const allLabel = document.createElement('label');

        allLabel.className = 'flex items-center gap-1 cursor-pointer hover:bg-gray-700 px-2 py-1 rounded transition-colors';

        const allCheckbox = document.createElement('input');

        allCheckbox.type = 'checkbox';
        allCheckbox.id = 'all';
        allCheckbox.className = 'all-providers mr-1';

        const allSpan = document.createElement('span');

        allSpan.textContent = 'all';

        allLabel.appendChild(allCheckbox);
        allLabel.appendChild(allSpan);
        this.providerList.appendChild(allLabel);

        // After restoring checkboxes and adding "all" checkbox, update states
        setTimeout(() => {
            this.handleProviderCheckbox();
            this.ensureDefaultProvider();
            this.updateButtonState();
            // Sort providers after loading saved selections
            this.sortProviderList();

            // No need to sync with mobile since we have a single responsive drawer
        }, 0);
    }

    bindEvents() {
        if (!this.providerList) {
            return;
        }

        // handle "all" checkbox functionality
        this.providerList.addEventListener('change', e => {
            const wasChecked = e.target.checked;

            // Use setTimeout to ensure the checkbox state is properly set before sorting
            setTimeout(() => {
                if (e.target.id === 'all') {
                    this.handleAllCheckbox(wasChecked);
                    // Don't call handleProviderCheckbox() for "all" checkbox to prevent state override
                } else if (e.target.name === 'providers') {
                    this.handleProviderCheckbox();
                }

                // Always sort the list
                this.sortProviderList();

                // Only scroll to top when checking (not when unchecking)
                if (wasChecked) {
                    this.scrollProviderList();
                }

                // Update button state immediately after provider changes
                this.updateButtonState();

                // Save selections to localStorage whenever they change
                // Add a small delay to prevent multiple rapid saves
                clearTimeout(this.saveTimeout);
                this.saveTimeout = setTimeout(() => {
                    this.saveProviderSelections();
                }, 100);
            }, 0);
        });
    }

    sortProviderList() {
        if (!this.providerList) {
            return;
        }

        // Get all provider labels (which contain the checkboxes)
        const providerLabels = Array.from(this.providerList.querySelectorAll('label'));

        // Filter out the "all" label
        const providerLabelsOnly = providerLabels.filter(label => {
            const checkbox = label.querySelector('input[name="providers"]');

            return checkbox !== null;
        });


        // Sort by checked status first (checked at top), then alphabetically
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

        // Create a document fragment to avoid multiple DOM reflows
        const fragment = document.createDocumentFragment();

        // Add sorted provider labels to fragment
        providerLabelsOnly.forEach(label => {
            fragment.appendChild(label);
        });

        // Find the "all" label to maintain its position at the end
        const allCheckbox = this.providerList.querySelector('#all');
        const allLabel = allCheckbox ? allCheckbox.closest('label') : null;

        if (allLabel) {
            fragment.appendChild(allLabel);
        }

        // Clear the container and append the fragment
        this.providerList.innerHTML = '';
        this.providerList.appendChild(fragment);

        // No need to sync with mobile since we have a single responsive drawer
    }

    scrollProviderList() {
        if (!this.providerList) {
            return;
        }

        // Get the currently checked providers
        const checkedProviders = this.providerList.querySelectorAll('input[name="providers"]:checked');

        if (checkedProviders.length > 0) {
            // If there are checked providers, scroll to the top to show them
            // Use smooth scrolling for better UX
            this.providerList.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        // If no providers are checked, don't scroll (keep current position)
    }

    handleAllCheckbox(checked) {
        const providerCheckboxes = this.providerList.querySelectorAll('input[name="providers"]');

        providerCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });

        // Update the "all" checkbox state to match
        const allCheckbox = this.providerList.querySelector('#all');

        if (allCheckbox) {
            allCheckbox.checked = checked;
            allCheckbox.indeterminate = false;
        }

        // Sort and scroll after handling all checkbox
        this.sortProviderList();
        if (checked) {
            this.scrollProviderList();
        }
    }

    handleProviderCheckbox() {
        if (!this.providerList) {
            return;
        }

        const providerCheckboxes = this.providerList.querySelectorAll('input[name="providers"]');
        const allCheckbox = this.providerList.querySelector('#all');

        if (!allCheckbox) {
            return;
        }

        const checkedCount = Array.from(providerCheckboxes).filter(cb => cb.checked).length;
        const totalCount = providerCheckboxes.length;

        // update "all" checkbox state
        if (checkedCount === 0) {
            allCheckbox.checked = false;
            allCheckbox.indeterminate = false;
        } else if (checkedCount === totalCount) {
            allCheckbox.checked = true;
            allCheckbox.indeterminate = false;
        } else {
            allCheckbox.checked = false;
            allCheckbox.indeterminate = true;
        }
    }

    getSelectedProviders() {
        const selected = [];

        if (!this.providerList) {

            return selected;
        }

        // Always use desktop provider list as source of truth
        const providerCheckboxes = this.providerList.querySelectorAll('input[name="providers"]:checked');

        providerCheckboxes.forEach(checkbox => {
            selected.push(checkbox.value);
        });

        return selected;
    }

    selectAllProviders() {
        const allCheckbox = this.providerList.querySelector('#all');

        if (allCheckbox) {
            allCheckbox.checked = true;
            this.handleAllCheckbox(true);
        }
    }

    clearAllProviders() {
        const allCheckbox = this.providerList.querySelector('#all');

        if (allCheckbox) {
            allCheckbox.checked = false;
            this.handleAllCheckbox(false);
            // After clearing all, ensure Flux is selected as default
            this.ensureDefaultProvider();
        }
    }

    addProvider(value, label) {
        this.providers.push({ value, label });
        this.populateProviders();
    }

    removeProvider(value) {
        this.providers = this.providers.filter(p => p.value !== value);
        this.populateProviders();
    }

    updateProvider(value, newLabel) {
        const provider = this.providers.find(p => p.value === value);

        if (provider) {
            provider.label = newLabel;
            this.populateProviders();
        }
    }

    // localStorage methods for persistence
    saveProviderSelections() {
        const selectedProviders = this.getSelectedProviders();

        localStorage.setItem('selectedProviders', JSON.stringify(selectedProviders));
    }

    loadProviderSelections() {
        try {
            const saved = localStorage.getItem('selectedProviders');

            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.warn('⚠️ PROVIDER MANAGER: Failed to load provider selections from localStorage:', error);
        }

        // Default selection: Flux as the primary default model
        return ['flux'];
    }

    clearProviderSelections() {
        localStorage.removeItem('selectedProviders');
    }

    /**
     * Ensure at least one provider is selected (default to Flux if none selected)
     */
    ensureDefaultProvider() {
        const selectedProviders = this.getSelectedProviders();

        if (selectedProviders.length === 0) {

            // Set Flux as default on desktop
            const fluxCheckbox = this.providerList.querySelector('input[value="flux"]');

            if (fluxCheckbox) {
                fluxCheckbox.checked = true;
                // Trigger change event to ensure proper state updates
                fluxCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Mobile will be handled by the updateProviderList call that happens after this

            // Save the selection
            this.saveProviderSelections();
        }
    }

    updateButtonState() {
        // Notify the images manager to update the button state
        // Use a small delay to ensure the images manager is ready
        setTimeout(() => {
            // Trigger ImageUIState button update if available
            if (window.imagesManager && window.imagesManager.ui && window.imagesManager.ui.updateButtonState) {
                window.imagesManager.ui.updateButtonState();
            }
        }, 100);
    }
}

// Global export for browser compatibility
if (typeof window !== 'undefined') {
    window.ProviderManager = ProviderManager;
}

// Export for testing (using both names for backward compatibility)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderManager;
    // Also export as ProviderComponent for tests expecting that name
    module.exports.ProviderComponent = ProviderManager;
}
