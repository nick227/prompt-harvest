// Jest setup file for Node testing environment with browser mocks
import { TextEncoder, TextDecoder } from 'util';
import { JSDOM } from 'jsdom';

// Polyfills for Node environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Setup a basic DOM environment for Node tests
const { window } = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3200',
  pretendToBeVisual: false,
  resources: 'usable',
  canvas: undefined // Disable canvas to avoid native dependency issues
});

// Set global window and document
global.window = window;
global.document = window.document;
global.navigator = window.navigator;

// Mock fetch globally
global.fetch = jest.fn();

// Mock additional window methods
window.alert = jest.fn();
window.confirm = jest.fn();
window.prompt = jest.fn();
window.scrollTo = jest.fn();

// Mock localStorage and sessionStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', { value: mockStorage });
Object.defineProperty(window, 'sessionStorage', { value: mockStorage });

// Mock ResizeObserver if needed
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver if needed
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';

  // Reset window globals that might be set by tests
  Object.keys(window).forEach(key => {
    if (key.includes('Manager') || key.includes('Component') || key.includes('Api')) {
      delete window[key];
    }
  });
});
