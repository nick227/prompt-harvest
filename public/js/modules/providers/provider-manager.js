// provider manager - handles dynamic provider list population
class ProviderManager {
    constructor() {
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
            { value: 'ink', label: 'Ink Punk' }
        ];
        this.init();
        this.bindEvents();
    }

    init() {
        this.providerList = document.getElementById('provider-list');
        if (this.providerList) {
            this.populateProviders();
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

    populateProviders() {

        if (!this.providerList) {
            console.warn('Provider list container not found');

            return;
        }

        // clear existing content
        this.providerList.innerHTML = '';

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
    }

    bindEvents() {
        if (!this.providerList) {
            return;
        }

        // handle "all" checkbox functionality
        this.providerList.addEventListener('change', e => {
            if (e.target.id === 'all') {
                this.handleAllCheckbox(e.target.checked);
            } else if (e.target.name === 'providers') {
                this.handleProviderCheckbox();
            }
        });
    }

    handleAllCheckbox(checked) {
        const providerCheckboxes = this.providerList.querySelectorAll('input[name="providers"]');

        providerCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    handleProviderCheckbox() {
        const providerCheckboxes = this.providerList.querySelectorAll('input[name="providers"]');
        const allCheckbox = this.providerList.querySelector('#all');

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
            console.warn('Provider list not ready, returning empty selection');

            return selected;
        }

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
}

// global exports for backward compatibility
window.ProviderManager = ProviderManager;

// Let app.js handle initialization to avoid conflicts
// Auto-initialization removed to prevent double initialization

// ES module export (only if this file is loaded as a module)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProviderManager;
}
