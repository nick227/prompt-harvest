/** @type {import('jest').Config} */
export default {
    // Test environment - use node to avoid canvas issues
    testEnvironment: 'node',

    // Root directory for Jest
    rootDir: '.',

    // Module file extensions
    moduleFileExtensions: ['js', 'json'],

    // Test file patterns - exclude E2E tests
    testMatch: [
        '**/tests/**/*.test.js',
        '**/tests/**/!(e2e)/**/*.spec.js',
        '**/__tests__/**/*.js'
    ],

    // Explicitly ignore E2E test directories
    testPathIgnorePatterns: [
        '/node_modules/',
        '/tests/e2e/'
    ],

    // Setup files for each test file
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Module directories
    moduleDirectories: ['node_modules', 'public/js', 'tests'],

    // Module name mapping for absolute imports
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/public/js/$1',
        '^@components/(.*)$': '<rootDir>/public/js/components/$1',
        '^@modules/(.*)$': '<rootDir>/public/js/modules/$1',
        '^@core/(.*)$': '<rootDir>/public/js/core/$1',
        '^canvas$': '<rootDir>/tests/__mocks__/canvas.js'
    },

    // Coverage configuration
    collectCoverage: true,
    collectCoverageFrom: [
        'public/js/**/*.js',
        '!public/js/**/*.test.js',
        '!public/js/**/*.spec.js',
        '!public/js/vendor/**',
        '!public/js/lib/**',
        '!public/js/terms-manager.js',
        '!tests/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html', 'json'],
    coverageThreshold: {
        global: {
            branches: 10,
            functions: 10,
            lines: 10,
            statements: 10
        }
    },

    // Transform configuration
    transform: {
        '^.+\\.js$': 'babel-jest'
    },

    // Module transformation ignores
    transformIgnorePatterns: [
        'node_modules/'
    ],

    // Test timeout
    testTimeout: 10000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true
};
