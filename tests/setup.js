// tests/setup.js
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

// Also set them on global for test compatibility
global.prompt = window.prompt;
global.alert = window.alert;
global.confirm = window.confirm;

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

// Mock setTimeout and clearTimeout with proper timer tracking
const mockTimers = new Map();
let timerIdCounter = 1;

global.setTimeout = jest.fn((callback, delay) => {
  const id = timerIdCounter++;
  mockTimers.set(id, { callback, delay, remaining: delay, active: true });
  return id;
});

global.clearTimeout = jest.fn((id) => {
  if (mockTimers.has(id)) {
    mockTimers.get(id).active = false;
    mockTimers.delete(id);
  }
});

// Add timer utilities to global scope for tests
global.mockTimers = mockTimers;
global.advanceTimersByTime = (ms) => {
  for (const [id, timer] of mockTimers.entries()) {
    if (timer.active && timer.remaining <= ms) {
      timer.callback();
      mockTimers.delete(id);
    } else if (timer.active) {
      timer.remaining -= ms;
    }
  }
};

// Mock console methods
global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Mock additional global objects that tests expect
global.Swal = {
  fire: jest.fn(),
  confirm: jest.fn(),
  alert: jest.fn()
};

global.Hammer = jest.fn().mockImplementation(() => ({
  on: jest.fn(),
  off: jest.fn(),
  destroy: jest.fn()
}));

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear DOM - ensure document.body exists first
  if (document.body) {
    document.body.innerHTML = '';
  }
  if (document.head) {
    document.head.innerHTML = '';
  }

  // Clear mock timers
  mockTimers.clear();
  timerIdCounter = 1;

  // Reset window globals that might be set by tests
  Object.keys(window).forEach(key => {
    if (key.includes('Manager') || key.includes('Component') || key.includes('Api')) {
      delete window[key];
    }
  });

  // Reset fetch mock
  global.fetch.mockClear();
});
