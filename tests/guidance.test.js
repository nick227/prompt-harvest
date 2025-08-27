// Guidance Module Tests

// Mock constants and utilities before requiring the module
global.GUIDANCE_CONFIG = {
    defaultTop: 10,
    defaultBottom: 10,
    selectors: {
        top: 'select[name="guidance-top"]',
        bottom: 'select[name="guidance-bottom"]'
    },
    storage: {
        top: 'guidance-top',
        bottom: 'guidance-bottom'
    }
};

global.Utils = {
    storage: {
        get: jest.fn(),
        set: jest.fn()
    },
    dom: {
        get: jest.fn((selector) => {
            return document.querySelector(selector);
        })
    }
};

const GuidanceManager = require('../public/js/modules/guidance/guidance-manager.js');

describe('GuidanceManager', () => {
    let guidanceManager;
    let mockTopSelect;
    let mockBottomSelect;

    beforeEach(() => {
        // Mock DOM elements
        mockTopSelect = {
            value: '',
            addEventListener: jest.fn()
        };
        mockBottomSelect = {
            value: '',
            addEventListener: jest.fn()
        };

        global.document.querySelector = jest.fn((selector) => {
            if (selector === GUIDANCE_CONFIG.selectors.top) {
                return mockTopSelect;
            }
            if (selector === GUIDANCE_CONFIG.selectors.bottom) {
                return mockBottomSelect;
            }
            return null;
        });

        // Reset mocks
        Utils.storage.get.mockClear();
        Utils.storage.set.mockClear();

        guidanceManager = new GuidanceManager();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('initialization', () => {
        test('should initialize with default values', () => {
            expect(guidanceManager.config).toEqual(GUIDANCE_CONFIG);
            expect(guidanceManager.isInitialized).toBe(true);
        });

        test('should load saved values from storage', () => {
            Utils.storage.get
                .mockReturnValueOnce('15') // top value
                .mockReturnValueOnce('5'); // bottom value

            guidanceManager = new GuidanceManager();

            expect(Utils.storage.get).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.top);
            expect(Utils.storage.get).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.bottom);
            expect(mockTopSelect.value).toBe('15');
            expect(mockBottomSelect.value).toBe('5');
        });

        test('should use default values when storage is empty', () => {
            Utils.storage.get.mockReturnValue(null);

            guidanceManager = new GuidanceManager();

            expect(mockTopSelect.value).toBe(GUIDANCE_CONFIG.defaultTop.toString());
            expect(mockBottomSelect.value).toBe(GUIDANCE_CONFIG.defaultBottom.toString());
        });
    });

    describe('setupGuidanceDropDowns', () => {
        test('should set up event listeners for both selects', () => {
            guidanceManager.setupGuidanceDropDowns();

            expect(mockTopSelect.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
            expect(mockBottomSelect.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        });

        test('should save top value to storage when changed', () => {
            guidanceManager.setupGuidanceDropDowns();

            // Get the change handler
            const topChangeHandler = mockTopSelect.addEventListener.mock.calls[0][1];

            // Simulate change event
            mockTopSelect.value = '20';
            topChangeHandler();

            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.top, '20');
        });

        test('should save bottom value to storage when changed', () => {
            guidanceManager.setupGuidanceDropDowns();

            // Get the change handler
            const bottomChangeHandler = mockBottomSelect.addEventListener.mock.calls[0][1];

            // Simulate change event
            mockBottomSelect.value = '8';
            bottomChangeHandler();

            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.bottom, '8');
        });
    });

    describe('getGuidanceValues', () => {
        test('should return current guidance values', () => {
            mockTopSelect.value = '15';
            mockBottomSelect.value = '5';

            const values = guidanceManager.getGuidanceValues();

            expect(values).toEqual({
                top: '15',
                bottom: '5'
            });
        });

        test('should return default values when selects are not found', () => {
            global.document.querySelector.mockReturnValue(null);

            guidanceManager = new GuidanceManager();
            const values = guidanceManager.getGuidanceValues();

            expect(values).toEqual({
                top: GUIDANCE_CONFIG.defaultTop.toString(),
                bottom: GUIDANCE_CONFIG.defaultBottom.toString()
            });
        });
    });

    describe('setGuidanceValues', () => {
        test('should set guidance values and save to storage', () => {
            guidanceManager.setGuidanceValues('20', '10');

            expect(mockTopSelect.value).toBe('20');
            expect(mockBottomSelect.value).toBe('10');
            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.top, '20');
            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.bottom, '10');
        });

        test('should handle missing select elements gracefully', () => {
            global.document.querySelector.mockReturnValue(null);

            guidanceManager = new GuidanceManager();

            expect(() => {
                guidanceManager.setGuidanceValues('20', '10');
            }).not.toThrow();
        });
    });

    describe('resetToDefaults', () => {
        test('should reset values to defaults', () => {
            guidanceManager.resetToDefaults();

            expect(mockTopSelect.value).toBe(GUIDANCE_CONFIG.defaultTop.toString());
            expect(mockBottomSelect.value).toBe(GUIDANCE_CONFIG.defaultBottom.toString());
            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.top, GUIDANCE_CONFIG.defaultTop.toString());
            expect(Utils.storage.set).toHaveBeenCalledWith(GUIDANCE_CONFIG.storage.bottom, GUIDANCE_CONFIG.defaultBottom.toString());
        });
    });

    describe('validateGuidanceValues', () => {
        test('should return true for valid values', () => {
            const isValid = guidanceManager.validateGuidanceValues('15', '5');
            expect(isValid).toBe(true);
        });

        test('should return false for invalid top value', () => {
            const isValid = guidanceManager.validateGuidanceValues('invalid', '5');
            expect(isValid).toBe(false);
        });

        test('should return false for invalid bottom value', () => {
            const isValid = guidanceManager.validateGuidanceValues('15', 'invalid');
            expect(isValid).toBe(false);
        });

        test('should return false when top is less than bottom', () => {
            const isValid = guidanceManager.validateGuidanceValues('5', '15');
            expect(isValid).toBe(false);
        });
    });

    describe('getRandomGuidanceValue', () => {
        test('should return a value between top and bottom', () => {
            mockTopSelect.value = '20';
            mockBottomSelect.value = '10';

            const randomValue = guidanceManager.getRandomGuidanceValue();

            expect(randomValue).toBeGreaterThanOrEqual(10);
            expect(randomValue).toBeLessThanOrEqual(20);
        });

        test('should handle equal top and bottom values', () => {
            mockTopSelect.value = '15';
            mockBottomSelect.value = '15';

            const randomValue = guidanceManager.getRandomGuidanceValue();

            expect(randomValue).toBe(15);
        });
    });
});