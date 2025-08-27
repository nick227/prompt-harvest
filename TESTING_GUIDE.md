# 🧪 Testing & Linting Guide

## 📋 Overview

This guide covers the comprehensive testing and linting setup for the AI Image Generation Platform. The project now includes:

- **Enhanced ESLint Configuration** with 100+ rules
- **Prettier Code Formatting** for consistent style
- **Jest Unit Testing** with coverage reporting
- **Playwright E2E Testing** with multiple browsers
- **Automated Test Runner** for easy execution

## 🚀 Quick Start

### Prerequisites

1. **Install Dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Start the Server:**
   ```bash
   npm start
   ```

3. **Run All Tests:**
   ```bash
   node test-runner.js
   ```

## 📋 Available Commands

### Linting Commands

```bash
# Basic linting
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Strict linting (no warnings allowed)
npm run lint:strict

# Code formatting with Prettier
npm run lint:format

# Check formatting without changes
npm run lint:check
```

### Testing Commands

```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch

# E2E tests (headless)
npm run test:e2e

# E2E tests (headed - see browser)
npm run test:e2e:headed

# E2E tests with UI
npm run test:e2e:ui

# E2E tests in debug mode
npm run test:e2e:debug
```

### Quality Assurance Commands

```bash
# Full quality check (linting + testing)
npm run quality

# Pre-commit checks
npm run pre-commit

# Complete test suite
node test-runner.js
```

## 🔧 Test Runner

The `test-runner.js` script provides a unified interface for running all tests and checks:

```bash
# Run everything
node test-runner.js

# Run specific checks
node test-runner.js lint
node test-runner.js lint:fix
node test-runner.js test
node test-runner.js e2e
node test-runner.js quality
```

## 📊 ESLint Configuration

### Key Features

- **100+ Rules** covering code quality, style, and best practices
- **ES2022 Support** with modern JavaScript features
- **Browser & Node.js** environments
- **Jest Testing** environment support
- **Custom Overrides** for different file types

### Rule Categories

#### Error Prevention
- `no-undef`, `no-unused-vars`, `no-console`
- `no-eval`, `no-implied-eval`, `no-new-func`
- `no-script-url`, `no-debugger`

#### Best Practices
- `prefer-const`, `no-var`, `eqeqeq`
- `curly`, `no-multiple-empty-lines`
- `no-trailing-spaces`, `no-unused-expressions`

#### Code Style
- `indent`, `quotes`, `semi`
- `comma-dangle`, `object-curly-spacing`
- `arrow-spacing`, `space-before-blocks`

#### ES6+ Features
- `prefer-arrow-callback`, `prefer-destructuring`
- `prefer-template`, `object-shorthand`
- `no-duplicate-imports`, `prefer-spread`

### Customization

Edit `.eslintrc.json` to modify rules:

```json
{
  "rules": {
    "no-console": "off",  // Allow console statements
    "max-len": ["warn", { "code": 150 }]  // Increase line length
  }
}
```

## 🎨 Prettier Configuration

### Features

- **Consistent Formatting** across the entire codebase
- **Single Quotes** for strings
- **120 Character** line length
- **4 Space** indentation
- **Trailing Commas** disabled
- **Unix Line Endings**

### Configuration

Edit `.prettierrc` to customize formatting:

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "singleQuote": false
}
```

## 🧪 Unit Testing (Jest)

### Test Structure

```
tests/
├── basic.test.js          # Basic functionality tests
├── api.test.js           # API endpoint tests
├── auth.test.js          # Authentication tests
├── feed.test.js          # Feed functionality tests
├── guidance.test.js      # Guidance system tests
├── prompts.test.js       # Prompt handling tests
├── rating.test.js        # Rating system tests
├── stats.test.js         # Statistics tests
└── setup.js             # Test setup and utilities
```

### Running Tests

```bash
# All tests
npm test

# Specific test file
npm test -- tests/feed.test.js

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

```javascript
describe('Feature Name', () => {
    beforeEach(() => {
        // Setup before each test
    });

    test('should do something', () => {
        // Test implementation
        expect(result).toBe(expected);
    });

    test('should handle errors', async () => {
        // Async test with error handling
        await expect(asyncFunction()).rejects.toThrow();
    });
});
```

## 🌐 E2E Testing (Playwright)

### Test Structure

```
tests/e2e/
├── app.spec.js           # Main application tests
├── image-generation.spec.js  # Image generation tests
└── search-filtering.spec.js  # Search functionality tests
```

### Browser Support

- **Chromium** (Chrome/Edge)
- **Firefox**
- **WebKit** (Safari)
- **Mobile Chrome** (Pixel 5)
- **Mobile Safari** (iPhone 12)

### Running E2E Tests

```bash
# All browsers (headless)
npm run test:e2e

# Specific browser
npx playwright test --project=chromium

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# UI mode
npm run test:e2e:ui
```

### Writing E2E Tests

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should work correctly', async ({ page }) => {
        // Navigate and interact
        await page.click('#button');
        await page.fill('#input', 'text');
        
        // Assert results
        await expect(page.locator('.result')).toBeVisible();
        await expect(page.locator('#input')).toHaveValue('text');
    });
});
```

## 📈 Coverage Reports

### Unit Test Coverage

Run `npm run test:coverage` to generate coverage reports:

- **HTML Report**: `coverage/lcov-report/index.html`
- **LCOV Report**: `coverage/lcov.info`
- **Console Summary**: Shows coverage percentages

### E2E Test Reports

Playwright generates multiple report formats:

- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit Report**: `test-results/results.xml`

## 🔍 Debugging Tests

### Unit Tests

```bash
# Debug specific test
npm test -- --testNamePattern="should work"

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### E2E Tests

```bash
# Debug mode (headed)
npm run test:e2e:debug

# UI mode (interactive)
npm run test:e2e:ui

# Debug specific test
npx playwright test --grep "should work"
```

## 🚨 Common Issues

### Linting Issues

1. **Trailing Spaces**: Use `npm run lint:fix`
2. **Unused Variables**: Remove or prefix with `_`
3. **Console Statements**: Remove or disable rule
4. **Line Length**: Break long lines or increase limit

### Testing Issues

1. **Server Not Running**: Start with `npm start`
2. **Timeout Errors**: Increase timeout in test config
3. **Element Not Found**: Check selectors and wait times
4. **Async Issues**: Use proper `await` statements

### E2E Issues

1. **Browser Not Found**: Run `npx playwright install`
2. **Element Not Visible**: Add proper waits
3. **Network Errors**: Check server connectivity
4. **Mobile Tests**: Verify viewport settings

## 📝 Best Practices

### Code Quality

1. **Run linting before commits**
2. **Fix all warnings and errors**
3. **Use consistent formatting**
4. **Write meaningful test descriptions**

### Testing Strategy

1. **Unit tests for business logic**
2. **E2E tests for user workflows**
3. **Test error conditions**
4. **Maintain test data separately**

### Performance

1. **Run tests in parallel when possible**
2. **Use appropriate timeouts**
3. **Clean up test data**
4. **Mock external dependencies**

## 🔧 Configuration Files

### ESLint
- `.eslintrc.json` - Main configuration
- `package.json` - Scripts and dependencies

### Prettier
- `.prettierrc` - Formatting rules

### Jest
- `jest.config.js` - Test configuration
- `.babelrc` - Babel configuration

### Playwright
- `playwright.config.js` - E2E test configuration

## 📚 Additional Resources

- [ESLint Documentation](https://eslint.org/docs/)
- [Prettier Documentation](https://prettier.io/docs/)
- [Jest Documentation](https://jestjs.io/docs/)
- [Playwright Documentation](https://playwright.dev/docs/)

## 🤝 Contributing

When contributing to the project:

1. **Run full test suite**: `node test-runner.js`
2. **Fix all linting issues**: `npm run lint:fix`
3. **Ensure tests pass**: `npm test && npm run test:e2e`
4. **Update documentation** if needed

---

**Happy Testing! 🎉**
