/**
 * Jest Configuration for Blog Frontend Tests
 * Specialized configuration for testing blog frontend components
 */

export default {
    // Test environment
    testEnvironment: 'jsdom',

    // Test file patterns
    testMatch: [
        '**/tests/frontend/**/*.test.js'
    ],

    // Module name mapping for ES modules
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/public/$1',
        '^@js/(.*)$': '<rootDir>/public/js/$1',
        '^@css/(.*)$': '<rootDir>/public/css/$1'
    },

    // Transform configuration
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Setup files
    setupFilesAfterEnv: [
        '<rootDir>/tests/frontend/setup.js'
    ],

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage/blog-frontend',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'public/js/pages/blog-*.js',
        'public/js/services/blog-service.js',
        'public/js/utils/ContentEditor.js',
        'public/js/utils/MediaRenderer.js',
        'public/js/utils/ThumbnailFallback.js',
        '!**/node_modules/**',
        '!**/coverage/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Test timeout
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Module file extensions
    moduleFileExtensions: ['js', 'json'],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/coverage/',
        '/dist/'
    ],

    // Global setup (optional)
    // globalSetup: '<rootDir>/tests/frontend/global-setup.js',

    // Global teardown (optional)
    // globalTeardown: '<rootDir>/tests/frontend/global-teardown.js'
};
