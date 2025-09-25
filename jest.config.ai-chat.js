/**
 * Jest Configuration for AI Chat Tests
 *
 * Separate configuration for AI chat testing with:
 * - Database mocking
 * - OpenAI API mocking
 * - Test environment setup
 */

export default {
    displayName: 'AI Chat Tests',
    testMatch: [
        '<rootDir>/tests/ai-chat-*.test.js'
    ],
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup/ai-chat-setup.js'],
    collectCoverageFrom: [
        'src/services/ai/**/*.js',
        'public/js/components/ai-chat-widget.js',
        'src/routes/aiChatRoutes.js'
    ],
    coverageDirectory: 'coverage/ai-chat',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },
    testTimeout: 30000,
    verbose: true,
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    testEnvironmentOptions: {
        url: 'http://localhost:3200'
    }
};
