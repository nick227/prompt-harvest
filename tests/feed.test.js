// Feed Module Tests

// Mock constants and utilities before requiring the module
global.FEED_CONFIG = {
    requestLimit: 3,
    imageLimit: 30,
    defaultPrompt: '',
    imagesSelector: 'section.images',
    promptOutputSelector: '.prompt-output',
    scrollDelay: 2000,
    timeouts: {
        scrollDelay: 2000
    }
};

global.API_ENDPOINTS = {
    FEED: '/feed'
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            return document.querySelector(selector);
        }),
        createElement: jest.fn((tag, className, content) => {
            const element = {
                src: '',
                alt: '',
                title: '',
                dataset: {},
                appendChild: jest.fn(),
                textContent: content || ''
            };
            if (className) element.className = className;
            return element;
        })
    }
};

const FeedManager = require('../public/js/modules/feed/feed-manager.js');

describe('FeedManager', () => {
    let feedManager;
    let mockFetch;

    beforeEach(() => {
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock window.scrollTo
        global.window.scrollTo = jest.fn();

        // Mock DOM elements
        global.document.body = {
            innerHTML: `
                <section class="images"></section>
                <div class="prompt-output"></div>
            `
        };

        // Mock querySelector to return actual elements
        global.document.querySelector = jest.fn((selector) => {
            if (selector === 'section.images') {
                return { appendChild: jest.fn() };
            }
            if (selector === '.prompt-output') {
                return { appendChild: jest.fn(), innerHTML: '' };
            }
            if (selector === '.prompt-output li') {
                return { textContent: 'test prompt' };
            }
            if (selector === 'img') {
                return { src: 'test-image.jpg', alt: 'test prompt' };
            }
            return null;
        });

        feedManager = new FeedManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with default values', () => {
            expect(feedManager.currentPageCount).toBe(0);
            expect(feedManager.isSetupComplete).toBe(false);
            expect(feedManager.config.requestLimit).toBe(3);
            expect(feedManager.config.imageLimit).toBe(30);
        });

        test('should load configuration from constants', () => {
            expect(feedManager.config).toEqual({
                requestLimit: 3,
                imageLimit: 30,
                defaultPrompt: '',
                imagesSelector: 'section.images'
            });
        });
    });

    describe('setupFeed', () => {
        test('should call setupFeedPromptsNew on initialization', async() => {
            const setupSpy = jest.spyOn(feedManager, 'setupFeedPromptsNew');

            await feedManager.setupFeed();

            expect(setupSpy).toHaveBeenCalled();
        });

        test('should scroll to top after setup', async() => {
            const scrollSpy = jest.spyOn(window, 'scrollTo');

            await feedManager.setupFeed();

            // Wait for setTimeout
            await new Promise(resolve => setTimeout(resolve, 2100));

            expect(scrollSpy).toHaveBeenCalledWith(0, 0);
        });
    });

    describe('setupFeedPromptsNew', () => {
        test('should fetch data with correct URL', async() => {
            const mockResponse = { json: () => Promise.resolve([]) };
            mockFetch.mockResolvedValue(mockResponse);

            await feedManager.setupFeedPromptsNew();

            expect(mockFetch).toHaveBeenCalledWith(
                `${API_ENDPOINTS.FEED}?limit=3&page=0`
            );
        });

        test('should increment page count after successful fetch', async() => {
            const mockResponse = { json: () => Promise.resolve([]) };
            mockFetch.mockResolvedValue(mockResponse);

            const initialCount = feedManager.currentPageCount;
            await feedManager.setupFeedPromptsNew();

            expect(feedManager.currentPageCount).toBe(initialCount + 1);
        });

        test('should process results in reverse order', async() => {
            const mockResults = [
                { id: 1, prompt: 'test1' },
                { id: 2, prompt: 'test2' },
                { id: 3, prompt: 'test3' }
            ];
            const mockResponse = { json: () => Promise.resolve(mockResults) };
            mockFetch.mockResolvedValue(mockResponse);

            const addPromptSpy = jest.spyOn(feedManager, 'addPromptToOutput');
            const addImageSpy = jest.spyOn(feedManager, 'addImageToOutput');

            await feedManager.setupFeedPromptsNew();

            // Should be called in reverse order
            expect(addPromptSpy).toHaveBeenNthCalledWith(1, mockResults[2]);
            expect(addPromptSpy).toHaveBeenNthCalledWith(2, mockResults[1]);
            expect(addPromptSpy).toHaveBeenNthCalledWith(3, mockResults[0]);
        });

        test('should handle fetch errors gracefully', async() => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await feedManager.setupFeedPromptsNew();

            expect(consoleSpy).toHaveBeenCalledWith('Feed fetch error:', expect.any(Error));
        });
    });

    describe('addPromptToOutput', () => {
        test('should create prompt element with correct content', () => {
            const result = { prompt: 'test prompt', id: '123' };

            feedManager.addPromptToOutput(result);

            const promptElement = document.querySelector('.prompt-output li');
            expect(promptElement).toBeTruthy();
            expect(promptElement.textContent).toContain('test prompt');
        });

        test('should handle result without prompt gracefully', () => {
            const result = { id: '123' };

            expect(() => {
                feedManager.addPromptToOutput(result);
            }).not.toThrow();
        });
    });

    describe('addImageToOutput', () => {
        test('should create image element with correct attributes', () => {
            const result = {
                image: 'test-image.jpg',
                prompt: 'test prompt',
                id: '123'
            };

            feedManager.addImageToOutput(result);

            const imageElement = document.querySelector('img');
            expect(imageElement).toBeTruthy();
            expect(imageElement.src).toContain('test-image.jpg');
            expect(imageElement.alt).toBe('test prompt');
        });

        test('should handle result without image gracefully', () => {
            const result = { prompt: 'test', id: '123' };

            expect(() => {
                feedManager.addImageToOutput(result);
            }).not.toThrow();
        });
    });

    describe('loadMoreImages', () => {
        test('should call setupFeedPromptsNew when called', async() => {
            const setupSpy = jest.spyOn(feedManager, 'setupFeedPromptsNew');

            await feedManager.loadMoreImages();

            expect(setupSpy).toHaveBeenCalled();
        });
    });

    describe('resetFeed', () => {
        test('should reset page count and clear output', () => {
            feedManager.currentPageCount = 5;
            document.querySelector('.prompt-output').innerHTML = '<li>test</li>';

            feedManager.resetFeed();

            expect(feedManager.currentPageCount).toBe(0);
            expect(document.querySelector('.prompt-output').innerHTML).toBe('');
        });
    });
});