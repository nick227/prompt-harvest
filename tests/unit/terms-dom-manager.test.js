/**
 * TermsDOMManager Unit Tests
 * Tests the DOM manipulation and term row creation functionality
 */

// tests/unit/terms-dom-manager.test.js
const TermsDOMManager = require('../../public/js/modules/terms/terms-dom-manager.js');

// Mock TERMS_CONSTANTS
const mockTERMS_CONSTANTS = {
    CLASSES: {
        TERM_ROW: 'term-row',
        TERM_WORD: 'term-word',
        TERM_TYPES: 'term-types',
        HIDDEN: 'hidden',
        SKELETON: 'skeleton',
        SKELETON_ROW: 'skeleton'
    },
    SELECTORS: {
        TOGGLE_BUTTON: '.term-toggle',
        TERM_TYPES: '.term-types'
    }
};

// Mock DOM elements
const mockRow = {
    className: '',
    dataset: {},
    querySelector: jest.fn(),
    addEventListener: jest.fn()
};

const mockToggleButton = {
    addEventListener: jest.fn(),
    querySelector: jest.fn()
};

const mockTermTypes = {
    classList: {
        toggle: jest.fn(),
        add: jest.fn(),
        remove: jest.fn()
    }
};

describe('TermsDOMManager', () => {
    let termsDOMManager;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Mock window.TERMS_CONSTANTS
        global.window = {
            TERMS_CONSTANTS: mockTERMS_CONSTANTS
        };

        // Mock document.createElement
        global.document = {
            createElement: jest.fn((tag) => {
                const element = {
                    tagName: tag.toUpperCase(),
                    className: '',
                    dataset: {},
                    classList: {
                        add: jest.fn(),
                        remove: jest.fn(),
                        toggle: jest.fn()
                    },
                    innerHTML: '',
                    appendChild: jest.fn(),
                    insertBefore: jest.fn(),
                    querySelector: jest.fn(),
                    addEventListener: jest.fn()
                };
                return element;
            })
        };

        // Create instance
        termsDOMManager = new TermsDOMManager();
    });

    afterEach(() => {
        // Clean up
        jest.clearAllMocks();
    });

    describe('Term Row Creation', () => {
        test('should create term row with word and types', () => {
            const term = { word: 'test', types: ['noun', 'verb'] };
            const index = 0;

            const row = termsDOMManager.createTermRow(term, index);

            expect(row.tagName).toBe('DIV');
            expect(row.className).toBe('term-row');
            expect(row.dataset.index).toBe(index);
            expect(row.dataset.term).toBe('test');
        });

        test('should create term row without types', () => {
            const term = { word: 'test' };
            const index = 1;

            const row = termsDOMManager.createTermRow(term, index);

            expect(row.tagName).toBe('DIV');
            expect(row.className).toBe('term-row');
            expect(row.dataset.index).toBe(index);
        });

        test('should handle string types input', () => {
            const term = 'test';
            const index = 2;

            const row = termsDOMManager.createTermRow(term, index);

            expect(row.tagName).toBe('DIV');
            expect(row.className).toBe('term-row');
            expect(row.dataset.index).toBe(index);
            expect(row.dataset.term).toBe('test');
        });
    });

    describe('Skeleton Row Creation', () => {
        test('should create skeleton row with proper structure', () => {
            const skeleton = termsDOMManager.createSkeletonRow();

            expect(skeleton.tagName).toBe('DIV');
            // Check that the element has the expected classes
            expect(skeleton.className).toContain('term-row');
            expect(skeleton.className).toContain('skeleton');
        });
    });

    describe('Utility Methods', () => {
        test('should get term types from data', () => {
            const termData = { types: ['noun', 'verb'] };
            const types = termsDOMManager.getTermTypes(termData);

            expect(types).toEqual(['noun', 'verb']);
        });

        test('should handle missing types gracefully', () => {
            const termData = {};
            const types = termsDOMManager.getTermTypes(termData);

            expect(types).toEqual([]);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing DOM elements gracefully', () => {
            expect(() => {
                termsDOMManager.createTermRow('test');
            }).not.toThrow();
        });
    });
});
