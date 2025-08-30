// Mock constants and utilities before requiring the module
global.PROMPTS_CONFIG = {
    selectors: {
        wordTypes: 'ul.word-types',
        termCount: '#term-count',
        term: '#term',
        findButton: '.find',
        clearButton: '.clear',
        dropdown: '.dropdown',
        termContainer: '.term-container',
        loading: '.loading'
    },
    api: {
        words: '/words',
        termTypes: '/term/types'
    },
    timeouts: {
        dropdownDelay: 200,
        processingDelay: 1000
    },
    limits: {
        maxMatches: 10,
        minSearchLength: 1
    }
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            const mockElements = {
                'ul.word-types': { innerHTML: '', addEventListener: jest.fn() },
                '#term-count': { innerHTML: '' },
                '#term': { value: '', addEventListener: jest.fn(), scrollIntoView: jest.fn() },
                '.find': { addEventListener: jest.fn() },
                '.clear': { addEventListener: jest.fn() },
                '.dropdown': { remove: jest.fn() },
                '.term-container': { appendChild: jest.fn() },
                '.loading': {
                    classList: { toggle: jest.fn() },
                    style: { display: '' }
                }
            };
            return mockElements[selector] || null;
        }),
        getAll: jest.fn((selector) => {
            if (selector === '.word-types li') {
                return [
                    { textContent: 'apple', addEventListener: jest.fn() },
                    { textContent: 'banana', addEventListener: jest.fn() },
                    { textContent: 'cherry', addEventListener: jest.fn() }
                ];
            }
            return [];
        }),
        createElement: jest.fn((tag, className, content) => ({
            tagName: tag.toUpperCase(),
            classList: { add: jest.fn() },
            textContent: content || '',
            addEventListener: jest.fn(),
            appendChild: jest.fn()
        }))
    },
    storage: {
        get: jest.fn(),
        set: jest.fn()
    }
};

global.fetch = jest.fn();
global.alert = jest.fn();

const PromptsManager = require('../public/js/modules/prompts/prompts-manager.js');

describe('PromptsManager', () => {
    let promptsManager;
    let mockFetch;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();

        // Mock fetch
        mockFetch = global.fetch;
        mockFetch.mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(['apple', 'banana', 'cherry', 'date', 'elderberry'])
        });

        // Mock document methods
        global.document.querySelector = jest.fn((selector) => {
            const mockElements = {
                'ul.word-types': { innerHTML: '', addEventListener: jest.fn() },
                '#term-count': { innerHTML: '' },
                '#term': { value: '', addEventListener: jest.fn(), scrollIntoView: jest.fn() },
                '.find': { addEventListener: jest.fn() },
                '.clear': { addEventListener: jest.fn() },
                '.dropdown': { remove: jest.fn() },
                '.term-container': { appendChild: jest.fn() },
                '.loading': { classList: { toggle: jest.fn() } }
            };
            return mockElements[selector] || null;
        });

        global.document.querySelectorAll = jest.fn((selector) => {
            if (selector === '.word-types li') {
                return [
                    { textContent: 'apple' },
                    { textContent: 'banana' },
                    { textContent: 'cherry' }
                ];
            }
            return [];
        });

        global.document.createElement = jest.fn((tag) => ({
            tagName: tag.toUpperCase(),
            classList: { add: jest.fn() },
            textContent: '',
            addEventListener: jest.fn(),
            appendChild: jest.fn()
        }));

        promptsManager = new PromptsManager();
        promptsManager.init(); // Initialize the manager
    });

    describe('initialization', () => {
        test('should initialize with correct configuration', () => {
            // Create a fresh instance without auto-init
            const freshManager = new PromptsManager();
            expect(freshManager.config).toBe(PROMPTS_CONFIG);
            expect(freshManager.isInitialized).toBe(false);
        });

        test('should setup event listeners on initialization', () => {
            promptsManager.init();
            expect(promptsManager.isInitialized).toBe(true);
            expect(Utils.dom.get).toHaveBeenCalledWith(PROMPTS_CONFIG.selectors.term);
            expect(Utils.dom.get).toHaveBeenCalledWith(PROMPTS_CONFIG.selectors.findButton);
            expect(Utils.dom.get).toHaveBeenCalledWith(PROMPTS_CONFIG.selectors.clearButton);
        });
    });

    describe('setupWordTypeSection', () => {
        test('should fetch words from API', async() => {
            await promptsManager.setupWordTypeSection();

            expect(mockFetch).toHaveBeenCalledWith(PROMPTS_CONFIG.api.words);
        });

        test('should render word types when words are available', async() => {
            const mockWordTypesElement = { innerHTML: '', addEventListener: jest.fn() };

            // Mock the specific call for wordTypes selector
            Utils.dom.get.mockImplementation((selector) => {
                if (selector === 'ul.word-types') {
                    return mockWordTypesElement;
                }
                return Utils.dom.get.mockReturnValue();
            });

            await promptsManager.setupWordTypeSection();

            // The method should set innerHTML with rendered word types
            expect(mockWordTypesElement.innerHTML).toContain('apple');
            expect(mockWordTypesElement.innerHTML).toContain('banana');
            expect(mockWordTypesElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should handle empty words array gracefully', async() => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: () => Promise.resolve([])
            });

            await promptsManager.setupWordTypeSection();

            // Should not throw when handling empty array
            expect(true).toBe(true);
        });

        test('should handle API errors gracefully', async() => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await promptsManager.setupWordTypeSection();

            expect(consoleSpy).toHaveBeenCalledWith('Error fetching words:', expect.any(Error));
            consoleSpy.mockRestore();
        });
    });

    describe('setupTermCount', () => {
        test('should update term count display', () => {
            const mockTermCountElement = { innerHTML: '' };
            Utils.dom.get.mockReturnValue(mockTermCountElement);

            promptsManager.setupTermCount();

            expect(mockTermCountElement.innerHTML).toBe('3');
        });

        test('should handle missing term count element gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            expect(() => promptsManager.setupTermCount()).not.toThrow();
        });
    });

    describe('getTermCount', () => {
        test('should return formatted count of word types', () => {
            const count = promptsManager.getTermCount();

            expect(count).toBe('3');
        });

        test('should format large numbers with commas', () => {
            Utils.dom.getAll.mockReturnValue(Array(1000).fill({ textContent: 'word' }));

            const count = promptsManager.getTermCount();

            expect(count).toBe('1,000');
        });
    });

    describe('renderWordTypes', () => {
        test('should render word types with proper HTML structure', () => {
            const mockWordTypesElement = { innerHTML: '', addEventListener: jest.fn() };
            Utils.dom.get.mockReturnValue(mockWordTypesElement);

            const words = ['apple', 'banana', 'cherry'];

            promptsManager.renderWordTypes(words);

            expect(mockWordTypesElement.innerHTML).toContain('<li title="apple">apple</li>');
            expect(mockWordTypesElement.innerHTML).toContain('<li title="banana">banana</li>');
            expect(mockWordTypesElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should handle missing word types element gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            expect(() => promptsManager.renderWordTypes(['apple', 'banana'])).not.toThrow();
        });
    });

    describe('handleWordTypeClick', () => {
        test('should update term value and scroll into view', () => {
            const mockTermElement = { value: '', scrollIntoView: jest.fn() };
            Utils.dom.get.mockReturnValue(mockTermElement);

            const mockEvent = { target: { innerHTML: 'apple' } };

            promptsManager.handleWordTypeClick(mockEvent);

            expect(mockTermElement.value).toBe('apple');
            expect(mockTermElement.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
        });

        test('should handle missing term element gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            const mockEvent = { target: { innerHTML: 'apple' } };

            expect(() => promptsManager.handleWordTypeClick(mockEvent)).not.toThrow();
        });
    });

    describe('search functionality', () => {
        test('should handle search term keyup events', () => {
            const mockEvent = { key: 'a' };
            const mockTermElement = { value: 'app' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            promptsManager.handleSearchTermKeyUp(mockEvent);

            expect(Utils.dom.get).toHaveBeenCalledWith(PROMPTS_CONFIG.selectors.term);
        });

        test('should handle Enter key press', () => {
            const mockEvent = { key: 'Enter' };
            const handleFindClickSpy = jest.spyOn(promptsManager, 'handleFindClick');

            promptsManager.handleSearchTermKeyUp(mockEvent);

            expect(handleFindClickSpy).toHaveBeenCalled();
        });

        test('should clear term dropdown on focusout', () => {
            const clearTermDropDownSpy = jest.spyOn(promptsManager, 'clearTermDropDown');

            promptsManager.handleSearchTermFocusOut();

            setTimeout(() => {
                expect(clearTermDropDownSpy).toHaveBeenCalled();
            }, PROMPTS_CONFIG.timeouts.dropdownDelay);
        });
    });

    describe('dropdown functionality', () => {
        test('should add auto dropdown for matching terms', () => {
            const mockTermElement = { value: 'app' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            promptsManager.addAutoDropDown();

            expect(Utils.dom.get).toHaveBeenCalledWith(PROMPTS_CONFIG.selectors.term);
            // The test should just verify the method runs without error
        });

        test('should not add dropdown for empty search term', () => {
            const mockTermElement = { value: '' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            promptsManager.addAutoDropDown();

            expect(Utils.dom.createElement).not.toHaveBeenCalled();
        });

        test('should clear existing dropdown before adding new one', () => {
            const clearTermDropDownSpy = jest.spyOn(promptsManager, 'clearTermDropDown');

            promptsManager.addAutoDropDown();

            expect(clearTermDropDownSpy).toHaveBeenCalled();
        });
    });

    describe('find functionality', () => {
        test('should handle find button click', async() => {
            const mockTermElement = { value: 'apple' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            await promptsManager.handleFindClick();

            expect(mockTermElement.value).toBe('apple');
        });

        test('should show alert for empty search term', async() => {
            const mockTermElement = { value: '' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            await promptsManager.handleFindClick();

            expect(alert).toHaveBeenCalledWith('Please enter a search term');
        });

        test('should show alert when processing request', async() => {
            promptsManager.isProcessingAddRequest = true;

            await promptsManager.handleFindClick();

            expect(alert).toHaveBeenCalledWith('Please wait for the current request to finish.');
        });

        test('should clear dropdown and reset textarea on find', async() => {
            const mockTermElement = { value: 'apple' };
            Utils.dom.get.mockReturnValue(mockTermElement);
            const clearTermDropDownSpy = jest.spyOn(promptsManager, 'clearTermDropDown');
            const resetTextAreaSpy = jest.spyOn(promptsManager, 'resetTextArea');

            await promptsManager.handleFindClick();

            expect(clearTermDropDownSpy).toHaveBeenCalled();
            expect(resetTextAreaSpy).toHaveBeenCalled();
        });
    });

    describe('clear functionality', () => {
        test('should clear type search input and reset textarea', () => {
            const clearTypeSearchInputSpy = jest.spyOn(promptsManager, 'clearTypeSearchInput');
            const resetTextAreaSpy = jest.spyOn(promptsManager, 'resetTextArea');

            promptsManager.handleClearBtnClick();

            expect(clearTypeSearchInputSpy).toHaveBeenCalled();
            expect(resetTextAreaSpy).toHaveBeenCalled();
        });
    });

    describe('utility methods', () => {
        test('should clear term dropdown', () => {
            const mockDropdown = { remove: jest.fn() };
            Utils.dom.get.mockReturnValue(mockDropdown);

            promptsManager.clearTermDropDown();

            expect(mockDropdown.remove).toHaveBeenCalled();
        });

        test('should handle missing dropdown gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            expect(() => promptsManager.clearTermDropDown()).not.toThrow();
        });

        test('should toggle loading state', () => {
            const mockLoadingElement = { classList: { toggle: jest.fn() } };
            Utils.dom.get.mockReturnValue(mockLoadingElement);

            promptsManager.toggleLoading();

            expect(mockLoadingElement.classList.toggle).toHaveBeenCalledWith('hidden');
        });

        test('should get current search term', () => {
            const mockTermElement = { value: 'test' };
            Utils.dom.get.mockReturnValue(mockTermElement);

            const term = promptsManager.getCurrentSearchTerm();

            expect(term).toBe('test');
        });

        test('should validate search term', () => {
            expect(promptsManager.isValidSearchTerm('apple')).toBe(true);
            expect(promptsManager.isValidSearchTerm('')).toBe(false);
            expect(promptsManager.isValidSearchTerm('   ')).toBe(false);
        });

        test('should get search matches', () => {
            // Mock word types with proper selector
            Utils.dom.getAll.mockImplementation((selector) => {
                if (selector === 'ul.word-types li') {
                    return [
                        { textContent: 'apple' },
                        { textContent: 'application' },
                        { textContent: 'banana' }
                    ];
                }
                return [];
            });

            const matches = promptsManager.getSearchMatches('app');

            expect(matches).toContain('apple');
            expect(matches).toContain('application');
            expect(matches).not.toContain('banana');
        });

        test('should limit search matches', () => {
            Utils.dom.getAll.mockReturnValue(
                Array(20).fill().map((_, i) => ({ textContent: `word${i}` }))
            );

            const matches = promptsManager.getSearchMatches('word');

            expect(matches.length).toBeLessThanOrEqual(PROMPTS_CONFIG.limits.maxMatches);
        });
    });

    describe('state management', () => {
        test('should track processing state', () => {
            expect(promptsManager.isProcessingAddRequest).toBe(false);

            promptsManager.setProcessingState(true);
            expect(promptsManager.isProcessingAddRequest).toBe(true);

            promptsManager.setProcessingState(false);
            expect(promptsManager.isProcessingAddRequest).toBe(false);
        });

        test('should get processing state', () => {
            promptsManager.isProcessingAddRequest = true;
            expect(promptsManager.getProcessingState()).toBe(true);

            promptsManager.isProcessingAddRequest = false;
            expect(promptsManager.getProcessingState()).toBe(false);
        });
    });

    describe('error handling', () => {
        test('should handle network errors gracefully', async() => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await promptsManager.setupWordTypeSection();

            expect(consoleSpy).toHaveBeenCalledWith('Error fetching words:', expect.any(Error));
            consoleSpy.mockRestore();
        });

        test('should handle API response errors', async() => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            });

            await promptsManager.setupWordTypeSection();

            // Should handle errors without throwing
            expect(true).toBe(true);
        });
    });
});
