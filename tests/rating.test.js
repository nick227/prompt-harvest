// Rating Module Tests

// Mock constants and utilities before requiring the module
global.RATING_CONFIG = {
    selectors: {
        filter: '.rating-filter',
        promptOutput: 'ul.prompt-output > li',
        fullscreen: '.full-screen',
        rating: '.rating'
    },
    keyCodes: {
        one: 49,
        two: 50,
        three: 51,
        four: 52,
        five: 53
    },
    api: {
        rating: '/api/images'
    }
};

global.CSS_CLASSES = {
    IMAGE_FULLSCREEN: 'full-screen'
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            return document.querySelector(selector);
        }),
        getAll: jest.fn((selector) => {
            return document.querySelectorAll(selector);
        })
    },
    async: {
        debounce: jest.fn((fn, delay) => fn)
    }
};

const RatingManager = require('../public/js/modules/rating/rating-manager.js');

describe('RatingManager', () => {
    let ratingManager;
    let mockFetch;
    let mockFilterElement;
    let mockFullscreenElement;
    let mockRatingElement;

    beforeEach(() => {
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock DOM elements
        mockFilterElement = {
            addEventListener: jest.fn()
        };

        mockFullscreenElement = {
            querySelector: jest.fn(() => ({
                dataset: { id: '123', rating: '3' },
                src: 'test-image.jpg'
            }))
        };

        mockRatingElement = {
            innerHTML: ''
        };

        global.document.querySelector = jest.fn((selector) => {
            if (selector === RATING_CONFIG.selectors.filter) {
                return mockFilterElement;
            }
            if (selector === `.${CSS_CLASSES.IMAGE_FULLSCREEN}`) {
                return mockFullscreenElement;
            }
            if (selector === RATING_CONFIG.selectors.rating) {
                return mockRatingElement;
            }
            return null;
        });

        // Create mock items with proper structure
        const mockItems = [{
                querySelector: jest.fn(() => ({ dataset: { rating: '5' } })),
                style: { display: 'block' }
            },
            {
                querySelector: jest.fn(() => ({ dataset: { rating: '3' } })),
                style: { display: 'block' }
            }
        ];

        global.document.querySelectorAll = jest.fn((selector) => {
            if (selector === RATING_CONFIG.selectors.promptOutput) {
                return mockItems;
            }
            return [];
        });

        global.document.addEventListener = jest.fn();

        // Reset mocks
        jest.clearAllMocks();

        ratingManager = new RatingManager();

        // Store reference to mock items for test assertions
        ratingManager.mockItems = mockItems;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with correct configuration', () => {
            expect(ratingManager.config).toEqual(RATING_CONFIG);
            expect(ratingManager.isInitialized).toBe(true);
        });

        test('should set up keyboard listeners on initialization', () => {
            expect(global.document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should set up rating filter on initialization', () => {
            expect(mockFilterElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('keyboard listeners', () => {
        test('should handle number key 1-5 when fullscreen is active', async() => {
            const keyDownHandler = global.document.addEventListener.mock.calls[0][1];
            const tagImageSpy = jest.spyOn(ratingManager, 'tagImage');

            // Simulate pressing '3' key
            const mockEvent = { keyCode: 51 };
            await keyDownHandler(mockEvent);

            expect(tagImageSpy).toHaveBeenCalledWith(3);
        });

        test('should not handle keys when fullscreen is not active', async() => {
            global.document.querySelector.mockReturnValue(null); // No fullscreen element

            const keyDownHandler = global.document.addEventListener.mock.calls[0][1];
            const tagImageSpy = jest.spyOn(ratingManager, 'tagImage');

            const mockEvent = { keyCode: 51 };
            await keyDownHandler(mockEvent);

            expect(tagImageSpy).not.toHaveBeenCalled();
        });

        test('should not handle keys outside 1-5 range', async() => {
            const keyDownHandler = global.document.addEventListener.mock.calls[0][1];
            const tagImageSpy = jest.spyOn(ratingManager, 'tagImage');

            // Test key '6' (keyCode 54)
            const mockEvent = { keyCode: 54 };
            await keyDownHandler(mockEvent);

            expect(tagImageSpy).not.toHaveBeenCalled();
        });

        test('should convert keyCode to rating correctly', async() => {
            const keyDownHandler = global.document.addEventListener.mock.calls[0][1];
            const tagImageSpy = jest.spyOn(ratingManager, 'tagImage');

            // Test all valid keys
            for (let keyCode = 49; keyCode <= 53; keyCode++) {
                const expectedRating = keyCode - 48;
                const mockEvent = { keyCode };
                await keyDownHandler(mockEvent);
                expect(tagImageSpy).toHaveBeenCalledWith(expectedRating);
            }
        });
    });

    describe('tagImage', () => {
        test('should send PUT request with correct rating', async() => {
            const mockResponse = { ok: true };
            mockFetch.mockResolvedValue(mockResponse);

            await ratingManager.tagImage(4);

            expect(mockFetch).toHaveBeenCalledWith('/api/images/123/rating', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: 4 })
            });
        });

        test('should update image dataset and rating display on success', async() => {
            const mockResponse = { ok: true };
            mockFetch.mockResolvedValue(mockResponse);
            const mockImg = { dataset: { id: '123', rating: '' } };
            mockFullscreenElement.querySelector.mockReturnValue(mockImg);

            await ratingManager.tagImage(5);

            expect(mockImg.dataset.rating).toBe(5);
            expect(mockRatingElement.innerHTML).toBe('Rating: 5');
        });

        test('should handle API errors gracefully', async() => {
            const mockResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };
            mockFetch.mockResolvedValue(mockResponse);
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            await ratingManager.tagImage(3);

            expect(consoleSpy).toHaveBeenCalledWith('Error:', 500, 'Internal Server Error');
        });

        test('should handle missing fullscreen wrapper gracefully', async() => {
            global.document.querySelector.mockReturnValue(null);

            expect(async() => {
                await ratingManager.tagImage(3);
            }).not.toThrow();

            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('should handle network errors gracefully', async() => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await ratingManager.tagImage(3);

            expect(consoleSpy).toHaveBeenCalledWith('Rating error:', expect.any(Error));
        });
    });

    describe('rating filter', () => {
        test('should filter by specific rating', () => {
            const filterHandler = mockFilterElement.addEventListener.mock.calls[0][1];
            const mockEvent = { target: { textContent: '5' } };

            filterHandler(mockEvent);

            // Item with rating 5 should be visible, item with rating 3 should be hidden
            expect(ratingManager.mockItems[0].style.display).toBe('block');
            expect(ratingManager.mockItems[1].style.display).toBe('none');
        });

        test('should show all items when filter is "all"', () => {
            const filterHandler = mockFilterElement.addEventListener.mock.calls[0][1];
            const mockEvent = { target: { textContent: 'all' } };

            filterHandler(mockEvent);

            expect(ratingManager.mockItems[0].style.display).toBe('block');
            expect(ratingManager.mockItems[1].style.display).toBe('block');
        });

        test('should handle missing filter element gracefully', () => {
            global.document.querySelector.mockReturnValue(null);

            expect(() => {
                new RatingManager();
            }).not.toThrow();
        });
    });

    describe('filterByRatings', () => {
        test('should filter images by rating value', () => {
            ratingManager.filterByRatings('3');

            expect(ratingManager.mockItems[0].style.display).toBe('none'); // rating 5
            expect(ratingManager.mockItems[1].style.display).toBe('block'); // rating 3
        });

        test('should show all items for "all" filter', () => {
            ratingManager.filterByRatings('all');

            expect(ratingManager.mockItems[0].style.display).toBe('block');
            expect(ratingManager.mockItems[1].style.display).toBe('block');
        });

        test('should handle items without images gracefully', () => {
            global.document.querySelectorAll.mockReturnValue([
                { querySelector: jest.fn(() => null), style: { display: 'block' } }
            ]);

            expect(() => {
                ratingManager.filterByRatings('5');
            }).not.toThrow();
        });
    });

    describe('utility methods', () => {
        test('should get current filter value', () => {
            mockFilterElement.textContent = '4';
            const filterValue = ratingManager.getCurrentFilter();
            expect(filterValue).toBe('4');
        });

        test('should set filter value', () => {
            const setFilterSpy = jest.spyOn(ratingManager, 'filterByRatings');

            ratingManager.setFilter('2');

            expect(setFilterSpy).toHaveBeenCalledWith('2');
        });

        test('should validate rating values', () => {
            expect(ratingManager.validateRating(1)).toBe(true);
            expect(ratingManager.validateRating(5)).toBe(true);
            expect(ratingManager.validateRating(0)).toBe(false);
            expect(ratingManager.validateRating(6)).toBe(false);
            expect(ratingManager.validateRating('invalid')).toBe(false);
        });

        test('should get rating statistics', () => {
            const stats = ratingManager.getRatingStats();

            expect(stats).toEqual({
                total: 2,
                ratings: {
                    '3': 1,
                    '5': 1
                }
            });
        });

        test('should clear all ratings', () => {
            const clearSpy = jest.spyOn(ratingManager, 'filterByRatings');

            ratingManager.clearFilter();

            expect(clearSpy).toHaveBeenCalledWith('all');
        });
    });
});