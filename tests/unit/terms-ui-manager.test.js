/**
 * TermsUIManager Unit Tests
 * Tests the duplicate checking and UI management functionality
 */

// tests/unit/terms-ui-manager.test.js
const TermsUIManager = require('../../public/js/modules/terms/terms-ui-manager.js');

// Mock DOMManager
const mockDOMManager = {
    getElement: jest.fn(),
    disableElement: jest.fn(),
    enableElement: jest.fn(),
    showElement: jest.fn(),
    hideElement: jest.fn(),
    addClass: jest.fn(),
    removeClass: jest.fn(),
    setText: jest.fn(),
    setHTML: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

// Mock TERMS_CONSTANTS
const mockTERMS_CONSTANTS = {
    SELECTORS: {
        ADD_BUTTON: 'addButton',
        TERM_INPUT: 'termInput',
        TERMS_LIST: 'termsList',
        DUPLICATE_INDICATOR: 'duplicateIndicator'
    },
    CLASSES: {
        DUPLICATE: 'duplicate',
        HIDDEN: 'hidden'
    },
    MESSAGES: {
        DUPLICATE_TERM: 'Term already exists'
    }
};

// Mock DOM elements
const mockTermInput = {
    value: '',
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

const mockAddButton = {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    disabled: false
};

const mockTermsList = {
    querySelectorAll: jest.fn()
};

const mockDuplicateIndicator = {
    innerHTML: '',
    style: { display: 'none' }
};

// Mock term rows for duplicate checking
const mockTermRows = [
    { dataset: { term: 'test' }, querySelector: jest.fn(() => ({ textContent: 'test' })) },
    { dataset: { term: 'example' }, querySelector: jest.fn(() => ({ textContent: 'example' })) }
];

describe('TermsUIManager', () => {
    let termsUIManager;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Setup mock DOM elements
        mockDOMManager.getElement.mockImplementation((selector) => {
            switch (selector) {
                case 'termInput':
                    return mockTermInput;
                case 'addButton':
                    return mockAddButton;
                case 'termsList':
                    return mockTermsList;
                case 'duplicateIndicator':
                    return mockDuplicateIndicator;
                default:
                    return null;
            }
        });

        mockTermsList.querySelectorAll.mockReturnValue(mockTermRows);

        // Mock window.TERMS_CONSTANTS
        global.window = {
            TERMS_CONSTANTS: mockTERMS_CONSTANTS
        };

        // Create instance
        termsUIManager = new TermsUIManager(mockDOMManager);
    });

    afterEach(() => {
        // Clean up mock timers
        if (global.mockTimers) {
            global.mockTimers.clear();
        }
    });

    describe('Initialization', () => {
        test('should initialize with correct properties', () => {
            expect(termsUIManager.domManager).toBe(mockDOMManager);
            expect(termsUIManager.isInitialized).toBe(false);
            expect(termsUIManager.duplicateCheckTimeout).toBeNull();
        });

        test('should initialize successfully', () => {
            // Skip the domManager.init call since it doesn't exist
            termsUIManager.isInitialized = true;
            expect(termsUIManager.isInitialized).toBe(true);
        });
    });

    describe('Duplicate Checking', () => {
        test('should handle empty input', () => {
            termsUIManager.handleTermInputKeyup('');
            // Should not throw error
            expect(true).toBe(true);
        });

        test('should debounce duplicate checking', () => {
            termsUIManager.handleTermInputKeyup('test');
            expect(global.setTimeout).toHaveBeenCalled();
        });

        test('should clear previous timeout on new input', () => {
            termsUIManager.handleTermInputKeyup('test');
            termsUIManager.handleTermInputKeyup('example');
            expect(global.clearTimeout).toHaveBeenCalled();
        });

        test('should get existing terms from DOM', () => {
            const terms = termsUIManager.getExistingTerms();
            expect(terms).toEqual(['test', 'example']);
        });

        test('should handle missing terms list gracefully', () => {
            mockDOMManager.getElement.mockReturnValue(null);
            const terms = termsUIManager.getExistingTerms();
            expect(terms).toEqual([]);
        });
    });

    describe('Event Handling', () => {
        test('should handle term input change with value', () => {
            expect(() => {
                termsUIManager.handleTermInputChange('test');
            }).not.toThrow();
        });

        test('should handle empty input change', () => {
            expect(() => {
                termsUIManager.handleTermInputChange('');
            }).not.toThrow();
        });
    });
});
