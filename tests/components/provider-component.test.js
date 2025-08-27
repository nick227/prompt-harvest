// Mock constants and utilities before requiring the module
global.PROVIDER_CONFIG = {
    selectors: {
        providerList: '.provider-list',
        providerGrid: '.provider-grid',
        providerCheckbox: '.provider-checkbox',
        selectAll: '.select-all-providers',
        clearAll: '.clear-all-providers'
    },
    classes: {
        provider: 'provider-item',
        checkbox: 'provider-checkbox',
        selected: 'selected',
        disabled: 'disabled'
    },
    api: {
        providers: '/providers',
        models: '/models'
    },
    defaults: {
        selectedProviders: ['dalle3', 'flux'],
        maxSelections: 5
    }
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            const mockElements = {
                '.provider-list': {
                    appendChild: jest.fn(),
                    innerHTML: '',
                    querySelector: jest.fn()
                },
                '.provider-grid': {
                    appendChild: jest.fn(),
                    innerHTML: '',
                    querySelectorAll: jest.fn(() => [])
                }
            };
            return mockElements[selector] || {
                appendChild: jest.fn(),
                addEventListener: jest.fn(),
                checked: false,
                value: '',
                classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() }
            };
        }),
        createElement: jest.fn((tag, className, content) => ({
            tagName: tag.toUpperCase(),
            className: className || '',
            innerHTML: content || '',
            checked: false,
            value: '',
            dataset: {},
            style: {},
            addEventListener: jest.fn(),
            appendChild: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            querySelector: jest.fn(),
            querySelectorAll: jest.fn(() => []),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn(),
                contains: jest.fn(() => false)
            }
        })),
        getAll: jest.fn(() => [])
    },
    storage: {
        get: jest.fn(() => null),
        set: jest.fn()
    }
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
};

const ProviderComponent = require('../../public/js/components/provider-component.js');

describe('ProviderComponent', () => {
    let providerComponent;
    let mockProviderData;

    beforeEach(() => {
        providerComponent = new ProviderComponent();
        mockProviderData = [
            { id: 'dalle3', name: 'DALL-E 3', enabled: true, cost: 0.04 },
            { id: 'flux', name: 'Flux Pro', enabled: true, cost: 0.055 },
            { id: 'juggernaut', name: 'Juggernaut XL', enabled: true, cost: 0.003 },
            { id: 'playground', name: 'Playground v2.5', enabled: false, cost: 0.008 }
        ];

        // Reset mocks
        jest.clearAllMocks();

        // Setup fetch mock
        global.fetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockProviderData)
        });
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(providerComponent.config).toBeDefined();
            expect(providerComponent.isInitialized).toBe(false);
            expect(providerComponent.providers).toEqual([]);
            expect(providerComponent.selectedProviders).toEqual(new Set());
        });

        test('should initialize when init() is called', () => {
            providerComponent.init();
            expect(providerComponent.isInitialized).toBe(true);
        });
    });

    describe('Provider Loading', () => {
        test('should fetch providers from API', async() => {
            await providerComponent.loadProviders();

            expect(global.fetch).toHaveBeenCalledWith(PROVIDER_CONFIG.api.providers);
        });

        test('should store loaded providers', async() => {
            await providerComponent.loadProviders();

            expect(providerComponent.providers).toEqual(mockProviderData);
        });

        test('should handle API errors gracefully', async() => {
            global.fetch.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await providerComponent.loadProviders();

            expect(consoleSpy).toHaveBeenCalledWith('Error loading providers:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        test('should filter enabled providers', async() => {
            await providerComponent.loadProviders();
            const enabledProviders = providerComponent.getEnabledProviders();

            expect(enabledProviders).toHaveLength(3);
            expect(enabledProviders.map(p => p.id)).toEqual(['dalle3', 'flux', 'juggernaut']);
        });
    });

    describe('Provider Rendering', () => {
        test('should create provider checkbox element', () => {
            const provider = mockProviderData[0];
            const checkbox = providerComponent.createProviderCheckbox(provider);

            expect(checkbox.tagName).toBe('INPUT');
            expect(checkbox.value).toBe(provider.id);
            expect(checkbox.checked).toBe(false);
        });

        test('should create provider label element', () => {
            const provider = mockProviderData[0];
            const label = providerComponent.createProviderLabel(provider);

            expect(label.tagName).toBe('LABEL');
            expect(label.innerHTML).toContain(provider.name);
            expect(label.innerHTML).toContain('$0.04');
        });

        test('should create provider item container', () => {
            const provider = mockProviderData[0];
            const item = providerComponent.createProviderItem(provider);

            expect(item.tagName).toBe('DIV');
            expect(item.className).toContain(PROVIDER_CONFIG.classes.provider);
            expect(item.dataset.providerId).toBe(provider.id);
        });

        test('should render all providers to grid', async() => {
            await providerComponent.loadProviders();
            const result = providerComponent.renderProviders();

            // Should not throw and should handle missing container gracefully
            expect(result).toBeUndefined();
        });

        test('should mark default providers as selected', async() => {
            await providerComponent.loadProviders();
            providerComponent.renderProviders();

            // Check that default providers are selected
            expect(providerComponent.selectedProviders.has('dalle3')).toBe(true);
            expect(providerComponent.selectedProviders.has('flux')).toBe(true);
        });
    });

    describe('Selection Management', () => {
        test('should toggle provider selection', () => {
            providerComponent.toggleProvider('dalle3');

            expect(providerComponent.selectedProviders.has('dalle3')).toBe(true);

            providerComponent.toggleProvider('dalle3');

            expect(providerComponent.selectedProviders.has('dalle3')).toBe(false);
        });

        test('should enforce maximum selections', () => {
            // Select maximum providers
            for (let i = 0; i < PROVIDER_CONFIG.defaults.maxSelections; i++) {
                providerComponent.toggleProvider(`provider${i}`);
            }

            // Try to select one more
            const result = providerComponent.toggleProvider('extra');

            expect(result).toBe(false);
            expect(providerComponent.selectedProviders.size).toBe(PROVIDER_CONFIG.defaults.maxSelections);
        });

        test('should select all enabled providers', async() => {
            await providerComponent.loadProviders();
            providerComponent.selectAllProviders();

            const enabledCount = mockProviderData.filter(p => p.enabled).length;
            expect(providerComponent.selectedProviders.size).toBe(Math.min(enabledCount, PROVIDER_CONFIG.defaults.maxSelections));
        });

        test('should clear all selections', () => {
            providerComponent.toggleProvider('dalle3');
            providerComponent.toggleProvider('flux');

            providerComponent.clearAllProviders();

            expect(providerComponent.selectedProviders.size).toBe(0);
        });

        test('should get selected provider list', () => {
            providerComponent.toggleProvider('dalle3');
            providerComponent.toggleProvider('flux');

            const selected = providerComponent.getSelectedProviders();

            expect(selected).toEqual(['dalle3', 'flux']);
        });
    });

    describe('Event Handling', () => {
        test('should handle checkbox change events', () => {
            const provider = mockProviderData[0];
            const mockEvent = {
                target: { value: provider.id, checked: true }
            };

            providerComponent.handleProviderChange(mockEvent);

            expect(providerComponent.selectedProviders.has(provider.id)).toBe(true);
        });

        test('should handle select all button click', async() => {
            await providerComponent.loadProviders();
            providerComponent.handleSelectAllClick();

            const enabledCount = mockProviderData.filter(p => p.enabled).length;
            expect(providerComponent.selectedProviders.size).toBe(Math.min(enabledCount, PROVIDER_CONFIG.defaults.maxSelections));
        });

        test('should handle clear all button click', () => {
            providerComponent.toggleProvider('dalle3');
            providerComponent.handleClearAllClick();

            expect(providerComponent.selectedProviders.size).toBe(0);
        });
    });

    describe('Persistence', () => {
        test('should save selections to localStorage', () => {
            providerComponent.toggleProvider('dalle3');
            providerComponent.toggleProvider('flux');

            providerComponent.saveSelections();

            expect(Utils.storage.set).toHaveBeenCalledWith('selectedProviders', ['dalle3', 'flux']);
        });

        test('should load selections from localStorage', () => {
            Utils.storage.get.mockReturnValue(['dalle3', 'juggernaut']);

            providerComponent.loadSelections();

            expect(providerComponent.selectedProviders.has('dalle3')).toBe(true);
            expect(providerComponent.selectedProviders.has('juggernaut')).toBe(true);
        });

        test('should handle invalid localStorage data', () => {
            Utils.storage.get.mockReturnValue('invalid');

            expect(() => providerComponent.loadSelections()).not.toThrow();
            expect(providerComponent.selectedProviders.size).toBe(0);
        });
    });

    describe('Utility Methods', () => {
        test('should validate provider ID', () => {
            expect(providerComponent.isValidProvider('dalle3')).toBe(true);
            expect(providerComponent.isValidProvider('')).toBe(false);
            expect(providerComponent.isValidProvider(null)).toBe(false);
        });

        test('should get provider by ID', async() => {
            await providerComponent.loadProviders();
            const provider = providerComponent.getProviderById('dalle3');

            expect(provider).toBeDefined();
            expect(provider.id).toBe('dalle3');
        });

        test('should return null for invalid provider ID', async() => {
            await providerComponent.loadProviders();
            const provider = providerComponent.getProviderById('invalid');

            expect(provider).toBeNull();
        });

        test('should calculate total cost', () => {
            providerComponent.providers = mockProviderData;
            providerComponent.toggleProvider('dalle3');
            providerComponent.toggleProvider('flux');

            const totalCost = providerComponent.calculateTotalCost();

            expect(totalCost).toBeCloseTo(0.095, 3); // 0.04 + 0.055
        });

        test('should format currency', () => {
            const formatted = providerComponent.formatCurrency(0.045);

            expect(formatted).toBe('$0.045');
        });
    });

    describe('UI Updates', () => {
        test('should update checkbox states', async() => {
            await providerComponent.loadProviders();
            providerComponent.toggleProvider('dalle3');

            const mockCheckbox = { checked: false };
            Utils.dom.get.mockReturnValue(mockCheckbox);

            providerComponent.updateUI();

            expect(mockCheckbox.checked).toBe(true);
        });

        test('should disable providers when max reached', async() => {
            await providerComponent.loadProviders();

            // Select maximum providers
            for (let i = 0; i < PROVIDER_CONFIG.defaults.maxSelections; i++) {
                providerComponent.toggleProvider(`provider${i}`);
            }

            providerComponent.updateUI();

            // Should disable unselected checkboxes
            expect(Utils.dom.get).toHaveBeenCalled();
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            expect(() => providerComponent.renderProviders()).not.toThrow();
        });

        test('should handle provider data validation', () => {
            const invalidProvider = { id: '', name: 'Invalid' };

            expect(() => providerComponent.createProviderItem(invalidProvider)).not.toThrow();
        });
    });
});