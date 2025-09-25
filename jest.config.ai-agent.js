/**
 * Jest Configuration for AI Agent Tests
 *
 * Separate configuration for AI agent E2E tests with proper ES6 module support
 */

export default {
    // Test environment
    testEnvironment: 'node',

    // ES6 module support
    transform: {},
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },

    // Test file patterns
    testMatch: [
        'tests/ai-agent-e2e.test.js'
    ],

    // Module name mapping for ES6 imports
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup/ai-agent-setup.js'],

    // Coverage configuration
    collectCoverage: true,
    coverageDirectory: 'coverage/ai-agent',
    coverageReporters: ['text', 'lcov', 'html'],
    collectCoverageFrom: [
        'src/services/AIAgentService.js',
        'src/routes/aiChatRoutes.js',
        'public/js/components/ai-chat-widget.js'
    ],

    // Test timeout
    testTimeout: 30000,

    // Verbose output
    verbose: true,

    // Clear mocks between tests
    clearMocks: true,
    restoreMocks: true,

    // Error handling
    errorOnDeprecated: true,

    // Module resolution
    moduleDirectories: ['node_modules', 'src'],

    // Transform ignore patterns
    transformIgnorePatterns: [
        'node_modules/(?!(openai)/)'
    ]
};
