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

const ProviderComponent = require('../../public/js/modules/providers/provider-manager.js');

describe('ProviderManager', () => {
    let providerManager;
    let mockProviderData;

    beforeEach(() => {
        // Mock DOM elements
        document.getElementById = jest.fn(() => ({
            innerHTML: '',
            appendChild: jest.fn(),
            addEventListener: jest.fn()
        }));

        providerManager = new ProviderComponent();
        mockProviderData = [
            { value: 'flux', label: 'Flux' },
            { value: 'dalle', label: 'Dalle3' },
            { value: 'juggernaut', label: 'Juggernaut' },
            { value: 'juggernautReborn', label: 'Juggernaut Reborn' }
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
        test('should initialize with default providers', () => {
            expect(providerManager.providers).toBeDefined();
            expect(Array.isArray(providerManager.providers)).toBe(true);
            expect(providerManager.providers.length).toBeGreaterThan(0);
        });

        test('should have provider list with correct structure', () => {
            const firstProvider = providerManager.providers[0];
            expect(firstProvider).toHaveProperty('value');
            expect(firstProvider).toHaveProperty('label');
        });
    });

    describe('Provider Management', () => {
        test('should have providers available', () => {
            expect(providerManager.providers.length).toBeGreaterThan(0);
        });

        test('should have flux provider', () => {
            const fluxProvider = providerManager.providers.find(p => p.value === 'flux');
            expect(fluxProvider).toBeDefined();
            expect(fluxProvider.label).toBe('Flux');
        });

        test('should have dalle provider', () => {
            const dalleProvider = providerManager.providers.find(p => p.value === 'dalle');
            expect(dalleProvider).toBeDefined();
            expect(dalleProvider.label).toBe('Dalle3');
        });
    });

    describe('Provider Rendering', () => {
        test('should initialize without errors', () => {
            expect(() => new ProviderComponent()).not.toThrow();
        });

        test('should have provider list element', () => {
            expect(document.getElementById).toHaveBeenCalledWith('provider-list');
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            document.getElementById.mockReturnValue(null);
            expect(() => new ProviderComponent()).not.toThrow();
        });
    });
});

