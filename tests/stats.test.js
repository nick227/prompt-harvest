// Stats Module Tests

// Mock constants and utilities before requiring the module
global.STATS_CONFIG = {
    multiplier: 50,
    costPerImage: 0.99,
    costDivisor: 100,
    selectors: {
        imageCount: '#image-count',
        imageCost: '#image-cost'
    },
    api: {
        count: '/images/count'
    },
    currency: {
        locale: 'en-US',
        style: 'currency',
        currency: 'USD'
    }
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            return document.querySelector(selector);
        })
    },
    async: {
        debounce: jest.fn((fn, delay) => fn)
    }
};

const StatsManager = require('../public/js/modules/stats/stats-manager.js');

describe('StatsManager', () => {
    let statsManager;
    let mockFetch;
    let mockCountElement;
    let mockCostElement;
    let mockAlert;

    beforeEach(() => {
        // Mock fetch
        mockFetch = jest.fn();
        global.fetch = mockFetch;

        // Mock alert
        mockAlert = jest.fn();
        global.alert = mockAlert;

        // Mock DOM elements
        mockCountElement = {
            textContent: ''
        };

        mockCostElement = {
            textContent: ''
        };

        global.document.querySelector = jest.fn((selector) => {
            if (selector === STATS_CONFIG.selectors.imageCount) {
                return mockCountElement;
            }
            if (selector === STATS_CONFIG.selectors.imageCost) {
                return mockCostElement;
            }
            return null;
        });

        // Reset mocks
        jest.clearAllMocks();

        statsManager = new StatsManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with correct configuration', () => {
            expect(statsManager.config).toEqual(STATS_CONFIG);
            expect(statsManager.isInitialized).toBe(true);
        });

        test('should cache DOM elements on initialization', () => {
            expect(statsManager.countElement).toBe(mockCountElement);
            expect(statsManager.costElement).toBe(mockCostElement);
        });
    });

    describe('setupStatsBar', () => {
        test('should fetch image count from API', async() => {
            const mockResponse = { json: () => Promise.resolve({ count: 100 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.setupStatsBar();

            expect(mockFetch).toHaveBeenCalledWith(STATS_CONFIG.api.count);
        });

        test('should update count and cost displays', async() => {
            const mockResponse = { json: () => Promise.resolve({ count: 100 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.setupStatsBar();

            expect(mockCountElement.textContent).toBe('100');
            expect(mockCostElement.textContent).toBe('$0.99');
        });

        test('should show alert on multiplier milestone', async() => {
            const mockResponse = { json: () => Promise.resolve({ count: 50 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.setupStatsBar();

            expect(mockAlert).toHaveBeenCalledWith(
                'You have created 50 images! These images are not not free. Please consider chipping in a few bucks. Thank You!'
            );
        });

        test('should not show alert below milestone', async() => {
            const mockResponse = { json: () => Promise.resolve({ count: 25 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.setupStatsBar();

            expect(mockAlert).not.toHaveBeenCalled();
        });

        test('should not show alert for count below 10', async() => {
            const mockResponse = { json: () => Promise.resolve({ count: 0 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.setupStatsBar();

            expect(mockAlert).not.toHaveBeenCalled();
        });

        test('should handle API errors gracefully', async() => {
            mockFetch.mockRejectedValue(new Error('Network error'));
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            await statsManager.setupStatsBar();

            expect(consoleSpy).toHaveBeenCalledWith('Stats fetch error:', expect.any(Error));
        });

        test('should handle missing DOM elements gracefully', async() => {
            global.document.querySelector.mockReturnValue(null);
            const mockResponse = { json: () => Promise.resolve({ count: 100 }) };
            mockFetch.mockResolvedValue(mockResponse);

            statsManager = new StatsManager();

            expect(() => {
                statsManager.setupStatsBar();
            }).not.toThrow();
        });
    });

    describe('calculateCost', () => {
        test('should calculate cost correctly', () => {
            const cost = statsManager.calculateCost(100);
            expect(cost).toBe(0.99);
        });

        test('should handle zero count', () => {
            const cost = statsManager.calculateCost(0);
            expect(cost).toBe(0);
        });

        test('should handle large numbers', () => {
            const cost = statsManager.calculateCost(1000);
            expect(cost).toBe(9.9);
        });

        test('should handle decimal precision', () => {
            const cost = statsManager.calculateCost(150);
            expect(cost).toBe(1.485);
        });
    });

    describe('formatCurrency', () => {
        test('should format currency correctly', () => {
            const formatted = statsManager.formatCurrency(1.99);
            expect(formatted).toBe('$1.99');
        });

        test('should handle zero amount', () => {
            const formatted = statsManager.formatCurrency(0);
            expect(formatted).toBe('$0.00');
        });

        test('should handle large amounts', () => {
            const formatted = statsManager.formatCurrency(1234.56);
            expect(formatted).toBe('$1,234.56');
        });

        test('should round to nearest cent', () => {
            const formatted = statsManager.formatCurrency(1.999);
            expect(formatted).toBe('$2.00');
        });
    });

    describe('shouldShowAlert', () => {
        test('should return true for exact multiplier', () => {
            expect(statsManager.shouldShowAlert(50)).toBe(true);
            expect(statsManager.shouldShowAlert(100)).toBe(true);
            expect(statsManager.shouldShowAlert(150)).toBe(true);
        });

        test('should return false for non-multiplier', () => {
            expect(statsManager.shouldShowAlert(49)).toBe(false);
            expect(statsManager.shouldShowAlert(51)).toBe(false);
            expect(statsManager.shouldShowAlert(75)).toBe(false);
        });

        test('should return false for count below 10', () => {
            expect(statsManager.shouldShowAlert(0)).toBe(false);
            expect(statsManager.shouldShowAlert(5)).toBe(false);
            expect(statsManager.shouldShowAlert(9)).toBe(false);
        });
    });

    describe('updateDisplay', () => {
        test('should update count display', () => {
            statsManager.updateCountDisplay(500);
            expect(mockCountElement.textContent).toBe('500');
        });

        test('should update cost display', () => {
            statsManager.updateCostDisplay(250);
            expect(mockCostElement.textContent).toBe('$2.48');
        });

        test('should handle missing elements gracefully', () => {
            statsManager.countElement = null;
            statsManager.costElement = null;

            expect(() => {
                statsManager.updateCountDisplay(100);
                statsManager.updateCostDisplay(100);
            }).not.toThrow();
        });
    });

    describe('showMilestoneAlert', () => {
        test('should show milestone alert with correct message', () => {
            statsManager.showMilestoneAlert(100);

            expect(mockAlert).toHaveBeenCalledWith(
                'You have created 100 images! These images are not not free. Please consider chipping in a few bucks. Thank You!'
            );
        });
    });

    describe('getCurrentStats', () => {
        test('should return current stats', () => {
            mockCountElement.textContent = '150';
            mockCostElement.textContent = '$1.49';

            const stats = statsManager.getCurrentStats();

            expect(stats).toEqual({
                count: 150,
                cost: '$1.49'
            });
        });

        test('should handle missing elements', () => {
            statsManager.countElement = null;
            statsManager.costElement = null;

            const stats = statsManager.getCurrentStats();

            expect(stats).toEqual({
                count: 0,
                cost: '$0.00'
            });
        });
    });

    describe('refreshStats', () => {
        test('should call setupStatsBar', async() => {
            const setupSpy = jest.spyOn(statsManager, 'setupStatsBar');
            const mockResponse = { json: () => Promise.resolve({ count: 75 }) };
            mockFetch.mockResolvedValue(mockResponse);

            await statsManager.refreshStats();

            expect(setupSpy).toHaveBeenCalled();
        });
    });

    describe('getStatsHistory', () => {
        test('should return stats history', () => {
            // Add some stats to history
            statsManager.addToHistory(50, 0.50);
            statsManager.addToHistory(100, 0.99);

            const history = statsManager.getStatsHistory();

            expect(history).toHaveLength(2);
            expect(history[0].count).toBe(50);
            expect(history[1].count).toBe(100);
        });
    });

    describe('calculateProjectedCost', () => {
        test('should calculate projected cost for additional images', () => {
            const currentCount = 100;
            const additionalImages = 50;

            const projected = statsManager.calculateProjectedCost(currentCount, additionalImages);

            expect(projected.currentCost).toBe(0.99);
            expect(projected.projectedCost).toBe(1.485);
            expect(projected.additionalCost).toBeCloseTo(0.495, 5);
        });
    });
});