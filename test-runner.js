#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
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

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
    log(`\n${colors.cyan}🔄 ${description}...${colors.reset}`);
    try {
        const result = execSync(command, {
            stdio: 'inherit',
            encoding: 'utf8',
            cwd: process.cwd()
        });
        log(`${colors.green}✅ ${description} completed successfully${colors.reset}`);
        return true;
    } catch (error) {
        log(`${colors.red}❌ ${description} failed${colors.reset}`, 'red');
        return false;
    }
}

function checkFileExists(filePath) {
    return fs.existsSync(path.join(process.cwd(), filePath));
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    log(`${colors.bright}🧪 AI Image Generation Platform - Test Runner${colors.reset}`, 'bright');
    log(`${colors.blue}================================================${colors.reset}`, 'blue');

    let allPassed = true;

    switch (command) {
        case 'lint':
            log(`${colors.yellow}📋 Running Linting Checks${colors.reset}`, 'yellow');
            allPassed = runCommand('npm run lint', 'ESLint check') && allPassed;
            break;

        case 'lint:fix':
            log(`${colors.yellow}🔧 Running Linting Fixes${colors.reset}`, 'yellow');
            allPassed = runCommand('npm run lint:fix', 'ESLint auto-fix') && allPassed;
            break;

        case 'lint:strict':
            log(`${colors.yellow}🔍 Running Strict Linting${colors.reset}`, 'yellow');
            allPassed = runCommand('npm run lint:strict', 'Strict ESLint check') && allPassed;
            break;

        case 'format':
            log(`${colors.magenta}🎨 Running Code Formatting${colors.reset}`, 'magenta');
            allPassed = runCommand('npm run lint:format', 'Prettier formatting') && allPassed;
            break;

        case 'test':
            log(`${colors.cyan}🧪 Running Unit Tests${colors.reset}`, 'cyan');
            allPassed = runCommand('npm test', 'Jest unit tests') && allPassed;
            break;

        case 'test:coverage':
            log(`${colors.cyan}📊 Running Tests with Coverage${colors.reset}`, 'cyan');
            allPassed = runCommand('npm run test:coverage', 'Jest tests with coverage') && allPassed;
            break;

        case 'e2e':
            log(`${colors.blue}🌐 Running E2E Tests${colors.reset}`, 'blue');
            allPassed = runCommand('npm run test:e2e', 'Playwright E2E tests') && allPassed;
            break;

        case 'e2e:headed':
            log(`${colors.blue}👁️ Running E2E Tests (Headed)${colors.reset}`, 'blue');
            allPassed = runCommand('npm run test:e2e:headed', 'Playwright E2E tests (headed)') && allPassed;
            break;

        case 'quality':
            log(`${colors.green}🏆 Running Full Quality Check${colors.reset}`, 'green');
            allPassed = runCommand('npm run quality', 'Full quality check') && allPassed;
            break;

        case 'pre-commit':
            log(`${colors.green}🚀 Running Pre-commit Checks${colors.reset}`, 'green');
            allPassed = runCommand('npm run pre-commit', 'Pre-commit checks') && allPassed;
            break;

        case 'all':
        default:
            log(`${colors.bright}🚀 Running Complete Test Suite${colors.reset}`, 'bright');

            // Check if server is running
            log(`${colors.yellow}🔍 Checking if server is running...${colors.reset}`, 'yellow');
            try {
                execSync('curl -s http://localhost:3200 > /dev/null', { stdio: 'ignore' });
                log(`${colors.green}✅ Server is running${colors.reset}`, 'green');
            } catch (error) {
                log(`${colors.red}❌ Server is not running. Please start the server first:${colors.reset}`, 'red');
                log(`${colors.cyan}   npm start${colors.reset}`, 'cyan');
                process.exit(1);
            }

            // Run all checks
            allPassed = runCommand('npm run lint:fix', 'ESLint auto-fix') && allPassed;
            allPassed = runCommand('npm run lint:format', 'Prettier formatting') && allPassed;
            allPassed = runCommand('npm run test:coverage', 'Unit tests with coverage') && allPassed;
            allPassed = runCommand('npm run test:e2e', 'E2E tests') && allPassed;
            break;
    }

    // Final summary
    log(`\n${colors.bright}📋 Test Summary${colors.reset}`, 'bright');
    log(`${colors.blue}================${colors.reset}`, 'blue');

    if (allPassed) {
        log(`${colors.green}🎉 All tests passed! Your code is ready for production.${colors.reset}`, 'green');
        process.exit(0);
    } else {
        log(`${colors.red}💥 Some tests failed. Please fix the issues before proceeding.${colors.reset}`, 'red');
        process.exit(1);
    }
}

// Handle process termination
process.on('SIGINT', () => {
    log(`\n${colors.yellow}⚠️ Test run interrupted by user${colors.reset}`, 'yellow');
    process.exit(1);
});

process.on('SIGTERM', () => {
    log(`\n${colors.yellow}⚠️ Test run terminated${colors.reset}`, 'yellow');
    process.exit(1);
});

// Run the main function
main();