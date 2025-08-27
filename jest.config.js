export default {
    testEnvironment: 'node',
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/public/js/$1'
    },
    collectCoverageFrom: [
        'public/js/**/*.js',
        '!public/js/**/*.test.js',
        '!public/js/**/*.spec.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    testMatch: [
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.spec.js'
    ],
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/tests/e2e/'
    ],
    testEnvironmentOptions: {
        url: 'http://localhost:3200'
    },
    setupFiles: ['<rootDir>/tests/setup.js']
};