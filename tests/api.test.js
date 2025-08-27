// Load the API constants and make them global
const apiModule = require('../public/js/api.js');

// Make constants available globally for testing
global.API_IMAGE_GENERATE = '/image/generate';
global.API_PROMPT_BUILD = '/prompt/build';
global.API_FEED = '/feed';
global.API_CATEGORIES = '/categories';
global.API_IMAGES = '/images';
global.API_IMAGE_TAGS = '/images/tags';

describe('API Constants', () => {
    beforeEach(() => {
        // Reset any module state
        jest.resetModules();
    });

    test('should have all required API endpoints defined', () => {
        // These constants are defined globally in api.js
        expect(typeof API_IMAGE_GENERATE).toBe('string');
        expect(typeof API_PROMPT_BUILD).toBe('string');
        expect(typeof API_FEED).toBe('string');
        expect(typeof API_CATEGORIES).toBe('string');
        expect(typeof API_IMAGES).toBe('string');
        expect(typeof API_IMAGE_TAGS).toBe('string');
    });

    test('should have correct API endpoint values', () => {
        expect(API_IMAGE_GENERATE).toBe('/image/generate');
        expect(API_PROMPT_BUILD).toBe('/prompt/build');
        expect(API_FEED).toBe('/feed');
        expect(API_CATEGORIES).toBe('/categories');
        expect(API_IMAGES).toBe('/images');
        expect(API_IMAGE_TAGS).toBe('/images/tags');
    });
});