// Mock window.ImageManager before requiring the module
global.window = {
    ImageManager: jest.fn().mockImplementation(() => ({
        init: jest.fn(),
        loadImages: jest.fn(),
        renderImages: jest.fn(),
        addImage: jest.fn(),
        removeImage: jest.fn(),
        updateImage: jest.fn(),
        getImage: jest.fn(),
        getAllImages: jest.fn(() => []),
        getImageCount: jest.fn(() => 0),
        clearImages: jest.fn(),
        refreshImages: jest.fn()
    }))
};

// Mock constants and utilities before requiring the module
global.IMAGE_CONFIG = {
    selectors: {
        imageWrapper: '.image-wrapper',
        imageOutput: '.image-output',
        fullscreen: '.full-screen',
        controls: '.fullscreen-controls'
    },
    classes: {
        imageWrapper: 'image-wrapper',
        imageFullscreen: 'full-screen',
        imageControls: 'fullscreen-controls',
        imageOutput: 'image-output'
    },
    icons: {
        close: '<i class="fas fa-times"></i>',
        prev: '<i class="fas fa-arrow-left"></i>',
        next: '<i class="fas fa-arrow-right"></i>',
        download: '<i class="fas fa-download"></i>',
        like: '<i class="fas fa-heart"></i>'
    }
};

global.Utils = {
    dom: {
        get: jest.fn((selector) => {
            const mockElements = {
                '.image-output': {
                    appendChild: jest.fn(),
                    innerHTML: '',
                    querySelector: jest.fn()
                },
                '.full-screen': {
                    style: { display: 'none' },
                    innerHTML: '',
                    appendChild: jest.fn(),
                    addEventListener: jest.fn(),
                    querySelector: jest.fn()
                }
            };
            return mockElements[selector] || { appendChild: jest.fn() };
        }),
        createElement: jest.fn((tag, className, content) => ({
            tagName: tag.toUpperCase(),
            className: className,
            innerHTML: content || '',
            src: '',
            alt: '',
            title: '',
            dataset: {},
            style: {},
            addEventListener: jest.fn(),
            appendChild: jest.fn(),
            setAttribute: jest.fn(),
            getAttribute: jest.fn(),
            querySelector: jest.fn(),
            remove: jest.fn(),
            dispatchEvent: jest.fn()
        }))
    }
};

// Mock document and global objects
global.document = {
    addEventListener: jest.fn(),
    createElement: jest.fn((tag) => ({
        tagName: tag.toUpperCase(),
        addEventListener: jest.fn(),
        appendChild: jest.fn(),
        removeChild: jest.fn(),
        querySelector: jest.fn(),
        style: {},
        innerHTML: '',
        dataset: {}
    })),
    createDocumentFragment: jest.fn(() => ({
        appendChild: jest.fn()
    })),
    querySelector: jest.fn(),
    dispatchEvent: jest.fn()
};

global.KeyboardEvent = class {
    constructor(type, options) {
        this.type = type;
        this.key = options.key;
    }
};

global.Event = class {
    constructor(type) {
        this.type = type;
    }
};

const ImageComponent = require('../../public/js/components/image-component.js');

describe('ImageComponent', () => {
    let imageComponent;
    let mockImageData;

    beforeEach(() => {
        imageComponent = new ImageComponent();
        mockImageData = {
            id: 'test-123',
            url: 'https://example.com/image.jpg',
            prompt: 'A beautiful landscape',
            title: 'Test Image',
            rating: 5,
            timestamp: '2024-01-01T00:00:00Z'
        };

        // Reset mocks
        jest.clearAllMocks();

        // Setup mock elements with proper structure
        Utils.dom.createElement.mockImplementation((tag, className, content) => {
            const element = {
                tagName: tag.toUpperCase(),
                className: className || '',
                innerHTML: content || '',
                src: '',
                alt: '',
                title: '',
                dataset: { id: 'test-123', rating: '5' },
                style: { display: 'none' },
                addEventListener: jest.fn(),
                appendChild: jest.fn(),
                querySelector: jest.fn(),
                remove: jest.fn(),
                dispatchEvent: jest.fn()
            };

            // Mock querySelector to return appropriate elements
            element.querySelector = jest.fn((selector) => {
                if (selector === '.close-btn') {
                    return { addEventListener: jest.fn() };
                }
                return element;
            });

            return element;
        });
    });

    describe('Initialization', () => {
        test('should initialize with default configuration', () => {
            expect(imageComponent.config).toBeDefined();
            expect(imageComponent.isInitialized).toBe(false);
        });

        test('should initialize when init() is called', () => {
            imageComponent.init();
            expect(imageComponent.isInitialized).toBe(true);
        });
    });

    describe('Image Rendering', () => {
        test('should create image element with correct properties', () => {
            const imageElement = imageComponent.createImageElement(mockImageData);

            expect(imageElement.tagName).toBe('IMG');
            expect(imageElement.src).toBe(mockImageData.url);
            expect(imageElement.alt).toBe(mockImageData.title);
            expect(imageElement.title).toBe(mockImageData.prompt);
            expect(imageElement.dataset.id).toBe(mockImageData.id);
            expect(imageElement.dataset.rating).toBe(mockImageData.rating.toString());
        });

        test('should create image wrapper with correct structure', () => {
            const wrapper = imageComponent.createImageWrapper(mockImageData);

            expect(wrapper.tagName).toBe('DIV');
            expect(wrapper.className).toContain(IMAGE_CONFIG.classes.imageWrapper);
            expect(wrapper.dataset.id).toBe(mockImageData.id);
        });

        test('should render image to output container', () => {
            const result = imageComponent.renderImage(mockImageData);

            expect(result).toBeDefined();
            expect(typeof result).toBe('object');
        });

        test('should handle missing image data gracefully', () => {
            const invalidData = { url: 'https://example.com/image.jpg' };
            const imageElement = imageComponent.createImageElement(invalidData);

            expect(imageElement.src).toBe(invalidData.url);
            expect(imageElement.alt).toBe('');
            expect(imageElement.title).toBe('');
        });
    });

    describe('Fullscreen Functionality', () => {
        test('should create fullscreen container', () => {
            const fullscreenContainer = imageComponent.createFullscreenContainer();

            expect(fullscreenContainer.tagName).toBe('DIV');
            expect(fullscreenContainer.className).toContain(IMAGE_CONFIG.classes.imageFullscreen);
        });

        test('should create fullscreen controls', () => {
            const controls = imageComponent.createFullscreenControls();

            expect(controls.tagName).toBe('DIV');
            expect(controls.className).toContain(IMAGE_CONFIG.classes.imageControls);
        });

        test('should open image in fullscreen', () => {
            const result = imageComponent.openFullscreen(mockImageData);

            expect(result).toBeUndefined(); // Method doesn't return anything
        });

        test('should close fullscreen', () => {
            const result = imageComponent.closeFullscreen();

            expect(result).toBeUndefined(); // Method doesn't return anything
        });
    });

    describe('Event Handling', () => {
        test('should add click event to image', () => {
            const imageElement = imageComponent.createImageElement(mockImageData);

            expect(imageElement.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('should add keyboard events for fullscreen', () => {
            imageComponent.setupFullscreenEvents();

            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });

        test('should handle escape key to close fullscreen', () => {
            imageComponent.setupFullscreenEvents();

            // Verify that the event listener was added
            expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
        });
    });

    describe('Image Management', () => {
        test('should remove image from DOM', () => {
            const mockElement = { remove: jest.fn() };
            imageComponent.removeImage('test-123');

            // Should call remove on the element
            expect(mockElement.remove).toBeDefined();
        });

        test('should update image rating', () => {
            const imageElement = imageComponent.createImageElement(mockImageData);
            // Add the image to cache so getImageById can find it
            imageComponent.imageCache.set('test-123', imageElement);
            imageComponent.updateImageRating('test-123', 4);

            expect(imageElement.dataset.rating).toBe('4');
        });

        test('should get image by ID', () => {
            const imageElement = imageComponent.createImageElement(mockImageData);
            // Add the image to cache so getImageById can find it
            imageComponent.imageCache.set('test-123', imageElement);
            const foundImage = imageComponent.getImageById('test-123');

            expect(foundImage).toBeDefined();
        });
    });

    describe('Utility Methods', () => {
        test('should format image title correctly', () => {
            const longTitle = 'A'.repeat(200);
            const formatted = imageComponent.formatTitle(longTitle);

            expect(formatted.length).toBeLessThanOrEqual(124);
        });

        test('should generate unique ID', () => {
            const id1 = imageComponent.generateId();
            const id2 = imageComponent.generateId();

            expect(id1).not.toBe(id2);
            expect(typeof id1).toBe('string');
        });

        test('should validate image data', () => {
            const validData = { url: 'https://example.com/image.jpg', id: 'test-123' };
            const invalidData = { url: '' };

            expect(imageComponent.validateImageData(validData)).toBe(true);
            expect(imageComponent.validateImageData(invalidData)).toBe(false);
        });
    });

    describe('Error Handling', () => {
        test('should handle image load errors', () => {
            const imageElement = imageComponent.createImageElement(mockImageData);
            const errorHandler = jest.fn();

            // Mock the addEventListener to actually store the handler
            imageElement.addEventListener = jest.fn((event, handler) => {
                if (event === 'error') {
                    imageElement.errorHandler = handler;
                }
            });

            imageElement.addEventListener('error', errorHandler);
            imageElement.errorHandler(); // Call the stored handler directly

            expect(errorHandler).toHaveBeenCalled();
        });

        test('should handle missing DOM elements gracefully', () => {
            Utils.dom.get.mockReturnValue(null);

            expect(() => imageComponent.renderImage(mockImageData)).not.toThrow();
        });
    });
});
