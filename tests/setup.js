// Mock DOM elements and browser APIs for testing
global.document = {
    createElement: jest.fn(() => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        setAttribute: jest.fn(),
        getAttribute: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            contains: jest.fn(),
            toggle: jest.fn()
        },
        style: {},
        innerHTML: '',
        textContent: '',
        value: ''
    })),
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

global.window = {
    location: {
        href: 'http://localhost:3200'
    },
    localStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    sessionStorage: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    fetch: jest.fn(),
    XMLHttpRequest: jest.fn()
};

// Mock console methods to reduce noise in tests
global.console = {
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock fetch
global.fetch = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn()
}));

// Mock global prompt function
global.prompt = jest.fn();

// Mock SweetAlert
global.Swal = {
    fire: jest.fn(),
    confirm: jest.fn(),
    alert: jest.fn()
};

// Mock Hammer.js
global.Hammer = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn()
}));