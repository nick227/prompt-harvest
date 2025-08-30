# End-to-End Testing Guide

This directory contains comprehensive end-to-end tests for the Image Harvest application using Playwright.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- MySQL database running
- Application server running on port 3200

### Running Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed

# Run tests in debug mode
npm run test:e2e:debug

# Setup test data
npm run test:e2e:setup

# Run all tests (unit + E2E)
npm run test:all
```

## 📁 Test Structure

```
tests/e2e/
├── e2e.config.js          # Playwright configuration
├── setup/
│   └── global-setup.js    # Global test setup
├── pages/
│   ├── BasePage.js        # Base page object
│   └── HomePage.js        # Home page object
├── utils/
│   └── api-helper.js      # API testing utilities
├── specs/
│   ├── home.spec.js       # Home page tests
│   ├── api.spec.js        # API endpoint tests
│   └── database.spec.js   # Database integration tests
└── screenshots/           # Test screenshots (auto-generated)
```

## 🧪 Test Categories

### 1. Home Page Tests (`home.spec.js`)
- Page loading and navigation
- Form interactions (prompt input, provider selection)
- UI element visibility
- Error handling and validation

### 2. API Tests (`api.spec.js`)
- Public endpoint functionality
- Image generation
- Image management (rating, deletion)
- Like system
- Tag system
- Error handling

### 3. Database Tests (`database.spec.js`)
- Database connectivity
- Data integrity
- CRUD operations
- Referential integrity
- Performance queries

## 🔧 Configuration

### Browser Support
- Chrome (Chromium)
- Firefox
- Safari (WebKit)
- Mobile Chrome
- Mobile Safari

### Test Environment
- Base URL: `http://localhost:3200`
- Timeout: 30 seconds for image generation
- Screenshots: On failure
- Videos: On failure
- Traces: On first retry

## 📊 Test Data

The test suite creates and uses the following test data:

### Test User
- Email: `test@example.com`
- Username: `testuser`
- ID: `test-user-123`

### Test Image
- ID: `test-image-123`
- Prompt: "Test prompt for E2E testing"
- Provider: `test-provider`
- Rating: 5

## 🎯 Writing Tests

### Page Object Model
Use the page object pattern for maintainable tests:

```javascript
import { HomePage } from '../pages/HomePage.js';

test('should generate image', async ({ page }) => {
    const homePage = new HomePage(page);
    await homePage.navigateToHome();
    await homePage.enterPrompt('A beautiful sunset');
    await homePage.generateImage();
    await expect(page.locator('.image-card')).toBeVisible();
});
```

### API Testing
Use the API helper for backend testing:

```javascript
import { ApiHelper } from '../utils/api-helper.js';

test('should get images', async () => {
    const apiHelper = new ApiHelper();
    const response = await apiHelper.getImages();
    expect(response.status).toBe(200);
});
```

### Database Testing
Test database operations directly:

```javascript
import databaseClient from '../../../src/database/PrismaClient.js';

test('should query database', async () => {
    await databaseClient.connect();
    const stats = await databaseClient.getStats();
    expect(stats.images).toBeGreaterThan(0);
    await databaseClient.disconnect();
});
```

## 🐛 Debugging

### View Test Reports
```bash
npm run test:e2e:report
```

### Debug Mode
```bash
npm run test:e2e:debug
```

### Screenshots and Videos
- Screenshots are saved in `tests/e2e/screenshots/`
- Videos are saved in `test-results/`
- Traces are saved in `test-results/`

## 🔄 Continuous Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    npm run test:e2e
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Environment Variables
- `DATABASE_URL`: MySQL connection string
- `NODE_ENV`: Set to `test` for test environment
- `CI`: Set to `true` in CI environment

## 📈 Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Clean up test data after tests
3. **Selectors**: Use stable, semantic selectors
4. **Timeouts**: Set appropriate timeouts for async operations
5. **Assertions**: Use specific, meaningful assertions
6. **Documentation**: Document complex test scenarios

## 🚨 Common Issues

### Database Connection
- Ensure MySQL is running
- Check `DATABASE_URL` environment variable
- Verify database permissions

### Server Issues
- Ensure application is running on port 3200
- Check for port conflicts
- Verify all dependencies are installed

### Selector Issues
- Use `data-testid` attributes for stable selectors
- Avoid CSS selectors that change frequently
- Test selectors in browser dev tools

## 📞 Support

For test-related issues:
1. Check the test logs for detailed error messages
2. Review screenshots and videos for visual debugging
3. Use debug mode for step-by-step execution
4. Check the application logs for backend errors
