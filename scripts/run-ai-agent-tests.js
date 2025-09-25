#!/usr/bin/env node

/**
 * AI Agent Test Runner
 *
 * Comprehensive test runner for AI agent E2E tests with detailed reporting
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Test configuration
const testConfig = {
    configFile: path.join(projectRoot, 'jest.config.ai-agent.js'),
    testFile: path.join(projectRoot, 'tests/ai-agent-e2e.test.js'),
    coverageDir: path.join(projectRoot, 'coverage/ai-agent'),
    timeout: 60000 // 60 seconds
};

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Console output helpers
const log = (message, color = colors.reset) => {
    console.log(`${color}${message}${colors.reset}`);
};

const logHeader = (message) => {
    log(`\n${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}`);
    log(`${colors.bright}${colors.blue}${message}${colors.reset}`);
    log(`${colors.bright}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
};

const logSuccess = (message) => log(`${colors.green}✅ ${message}${colors.reset}`);
const logError = (message) => log(`${colors.red}❌ ${message}${colors.reset}`);
const logWarning = (message) => log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
const logInfo = (message) => log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);

// Test categories
const testCategories = [
    {
        name: 'Prompt Analysis',
        description: 'Tests AI agent prompt analysis and improvement suggestions',
        tests: [
            'should analyze basic prompt and suggest improvements',
            'should recommend Flux for photorealistic requests',
            'should suggest photogenic keywords for realistic images'
        ]
    },
    {
        name: 'Prompt Enhancement',
        description: 'Tests AI agent prompt enhancement capabilities',
        tests: [
            'should generate enhanced prompt with improvements',
            'should suggest photogenic keywords for realistic images'
        ]
    },
    {
        name: 'Settings Recommendation',
        description: 'Tests AI agent settings and model recommendations',
        tests: [
            'should recommend optimal settings for creative images',
            'should recommend Flux and photogenic for realistic images'
        ]
    },
    {
        name: 'Conversation History',
        description: 'Tests conversation context and history handling',
        tests: [
            'should include conversation history in context'
        ]
    },
    {
        name: 'Error Handling',
        description: 'Tests error handling and graceful degradation',
        tests: [
            'should handle OpenAI API errors gracefully',
            'should handle database errors gracefully'
        ]
    },
    {
        name: 'Button Actions',
        description: 'Tests interactive button functionality',
        tests: [
            'should generate correct buttons for different scenarios'
        ]
    },
    {
        name: 'Database Integration',
        description: 'Tests database operations and data persistence',
        tests: [
            'should save conversation to database',
            'should retrieve conversation history'
        ]
    }
];

// Run tests
async function runTests() {
    logHeader('AI Agent E2E Test Suite');

    logInfo('Starting AI Agent comprehensive test suite...');
    logInfo(`Test file: ${testConfig.testFile}`);
    logInfo(`Config file: ${testConfig.configFile}`);
    logInfo(`Coverage directory: ${testConfig.coverageDir}`);

    // Display test categories
    log('\n📋 Test Categories:');
    testCategories.forEach((category, index) => {
        log(`\n${index + 1}. ${colors.bright}${category.name}${colors.reset}`);
        log(`   ${category.description}`);
        log(`   Tests: ${category.tests.length} test cases`);
    });

    // Run Jest tests
    const jestArgs = [
        '--config', testConfig.configFile,
        '--verbose',
        '--detectOpenHandles',
        '--forceExit',
        '--testTimeout', testConfig.timeout.toString()
    ];

    log('\n🚀 Running tests...');

    const jestProcess = spawn('npx', ['jest', ...jestArgs], {
        cwd: projectRoot,
        stdio: 'pipe',
        shell: true
    });

    let stdout = '';
    let stderr = '';

    jestProcess.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    jestProcess.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    return new Promise((resolve, reject) => {
        jestProcess.on('close', (code) => {
            log('\n📊 Test Results:');
            console.log(stdout);

            if (stderr) {
                log('\n⚠️  Warnings/Errors:');
                console.log(stderr);
            }

            if (code === 0) {
                logSuccess('All tests passed! 🎉');
                logInfo('AI Agent system is working correctly');
                resolve({ success: true, code, stdout, stderr });
            } else {
                logError(`Tests failed with exit code ${code}`);
                logWarning('Please check the test output above for details');
                resolve({ success: false, code, stdout, stderr });
            }
        });

        jestProcess.on('error', (error) => {
            logError(`Failed to run tests: ${error.message}`);
            reject(error);
        });
    });
}

// Generate test report
function generateTestReport(results) {
    logHeader('Test Report Summary');

    if (results.success) {
        logSuccess('All AI Agent tests passed successfully!');
        logInfo('The AI agent system is functioning correctly with all expected behaviors.');
    } else {
        logError('Some tests failed. Please review the output above.');
        logWarning('Check the test failures and fix any issues before deployment.');
    }

    log('\n📈 Test Coverage:');
    logInfo('Check the coverage/ai-agent directory for detailed coverage reports');

    log('\n🔧 Next Steps:');
    if (results.success) {
        logInfo('✅ AI Agent system is ready for production');
        logInfo('✅ All OpenAI tool calling scenarios are working');
        logInfo('✅ Database integration is functioning');
        logInfo('✅ Error handling is robust');
    } else {
        logWarning('❌ Fix failing tests before proceeding');
        logWarning('❌ Review OpenAI API integration');
        logWarning('❌ Check database connection and queries');
    }
}

// Main execution
async function main() {
    try {
        const results = await runTests();
        generateTestReport(results);

        if (!results.success) {
            process.exit(1);
        }
    } catch (error) {
        logError(`Test runner failed: ${error.message}`);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { runTests, generateTestReport };
