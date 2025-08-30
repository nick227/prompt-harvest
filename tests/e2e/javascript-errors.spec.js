import { test, expect } from '@playwright/test';

/**
 * JavaScript Runtime Error Detection Tests
 * These tests would have caught the variable reference issues and syntax errors
 */

test.describe('JavaScript Runtime Error Detection', () => {
  let consoleErrors = [];
  let uncaughtExceptions = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    consoleErrors = [];
    uncaughtExceptions = [];

    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push({
          type: 'console.error',
          text: msg.text(),
          location: msg.location(),
          timestamp: new Date().toISOString()
        });
      }
    });

    // Capture uncaught exceptions
    page.on('pageerror', error => {
      uncaughtExceptions.push({
        type: 'uncaught_exception',
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    });

    // Clear cookies and storage
    await page.context().clearCookies();

    // Try to clear storage, ignore errors in test environments
    try {
      await page.evaluate(() => {
        if (typeof localStorage !== 'undefined') localStorage.clear();
        if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
      });
    } catch (error) {
      // Storage access denied - normal in some test environments
    }
  });

  test('should load homepage without JavaScript errors', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for app initialization
    await page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });

    // Additional wait for module loading
    await page.waitForTimeout(2000);

    // Check for JavaScript errors
    expect(consoleErrors, `Console errors found: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(uncaughtExceptions, `Uncaught exceptions found: ${JSON.stringify(uncaughtExceptions, null, 2)}`).toHaveLength(0);

    // Verify core modules are loaded
    const coreModulesLoaded = await page.evaluate(() => {
      return {
        Utils: typeof window.Utils !== 'undefined',
        apiService: typeof window.apiService !== 'undefined',
        app: typeof window.AppLoader !== 'undefined',
        configs: {
          TEXTAREA_CONFIG: typeof window.TEXTAREA_CONFIG !== 'undefined',
          FEED_CONFIG: typeof window.FEED_CONFIG !== 'undefined',
          IMAGE_CONFIG: typeof window.IMAGE_CONFIG !== 'undefined'
        }
      };
    });

    expect(coreModulesLoaded.Utils).toBe(true);
    expect(coreModulesLoaded.apiService).toBe(true);
    expect(coreModulesLoaded.app).toBe(true);
    expect(coreModulesLoaded.configs.TEXTAREA_CONFIG).toBe(true);
    expect(coreModulesLoaded.configs.FEED_CONFIG).toBe(true);
    expect(coreModulesLoaded.configs.IMAGE_CONFIG).toBe(true);
  });

  test('should load authentication pages without JavaScript errors', async ({ page }) => {
    // Test login page
    await page.goto('/login.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    expect(consoleErrors, `Login page console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(uncaughtExceptions, `Login page uncaught exceptions: ${JSON.stringify(uncaughtExceptions, null, 2)}`).toHaveLength(0);

    // Test register page
    await page.goto('/register.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    expect(consoleErrors, `Register page console errors: ${JSON.stringify(consoleErrors, null, 2)}`).toHaveLength(0);
    expect(uncaughtExceptions, `Register page uncaught exceptions: ${JSON.stringify(uncaughtExceptions, null, 2)}`).toHaveLength(0);
  });

  test('should handle feed loading without variable reference errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for feed manager to initialize
    await page.waitForFunction(() => {
      return window.feedManager && typeof window.feedManager.setupFeedPromptsNew === 'function';
    });

    // Trigger feed loading
    await page.evaluate(() => {
      if (window.feedManager) {
        window.feedManager.setupFeedPromptsNew();
      }
    });

    await page.waitForTimeout(2000);

    // Check for the specific errors we fixed
    const hasVariableErrors = consoleErrors.some(error =>
      error.text.includes('results is not defined') ||
      error.text.includes('user is not defined') ||
      error.text.includes('container is not defined')
    );

    expect(hasVariableErrors, `Variable reference errors found in feed loading`).toBe(false);
    expect(uncaughtExceptions.filter(e => e.name === 'ReferenceError')).toHaveLength(0);
  });

  test('should handle authentication flow without variable errors', async ({ page }) => {
    await page.goto('/register.html', { waitUntil: 'networkidle' });

    // Fill registration form
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);

    // Submit and check for auth component errors
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check for the specific auth errors we fixed
    const hasAuthErrors = consoleErrors.some(error =>
      error.text.includes('user is not defined') ||
      error.text.includes('Cannot read properties of undefined')
    );

    expect(hasAuthErrors, `Authentication component errors found`).toBe(false);
  });

  test('should detect string literal syntax errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Check for syntax errors that would be caught by the browser
    const hasSyntaxErrors = uncaughtExceptions.some(error =>
      error.name === 'SyntaxError' &&
      (error.message.includes('string literal') ||
       error.message.includes('Unterminated string'))
    );

    expect(hasSyntaxErrors, `String literal syntax errors found`).toBe(false);
  });

  test('should validate all manager initializations', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    // Wait for app initialization
    await page.waitForFunction(() => {
      return window.document.readyState === 'complete';
    });

    await page.waitForTimeout(3000);

    // Check that all managers initialized without errors
    const managerStatus = await page.evaluate(() => {
      const managers = [
        'textAreaManager',
        'feedManager',
        'guidanceManager',
        'ratingManager',
        'statsManager',
        'imagesManager'
      ];

      return managers.map(manager => ({
        name: manager,
        exists: typeof window[manager] !== 'undefined',
        initialized: window[manager] && window[manager].isInitialized !== false
      }));
    });

    // Verify no manager initialization failed
    const failedManagers = managerStatus.filter(m => !m.exists);
    expect(failedManagers, `Failed to initialize managers: ${JSON.stringify(failedManagers)}`).toHaveLength(0);

    // Check for initialization errors
    const hasInitErrors = consoleErrors.some(error =>
      error.text.includes('is not defined') ||
      error.text.includes('Failed to initialize')
    );

    expect(hasInitErrors, `Manager initialization errors found`).toBe(false);
  });

  test('should catch constants loading errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // Verify all required constants are loaded
    const constantsStatus = await page.evaluate(() => {
      const requiredConstants = [
        'TEXTAREA_CONFIG',
        'FEED_CONFIG',
        'GUIDANCE_CONFIG',
        'RATING_CONFIG',
        'STATS_CONFIG',
        'IMAGE_CONFIG',
        'PROVIDER_CONFIG'
      ];

      return requiredConstants.map(constant => ({
        name: constant,
        exists: typeof window[constant] !== 'undefined'
      }));
    });

    const missingConstants = constantsStatus.filter(c => !c.exists);
    expect(missingConstants, `Missing constants: ${JSON.stringify(missingConstants)}`).toHaveLength(0);

    // Check for constant-related errors
    const hasConstantErrors = consoleErrors.some(error =>
      error.text.includes('CONFIG is not defined')
    );

    expect(hasConstantErrors, `Constants loading errors found`).toBe(false);
  });

  test.afterEach(async ({ page }) => {
    // Log any errors found for debugging
    if (consoleErrors.length > 0 || uncaughtExceptions.length > 0) {
      console.log('\n🚨 JavaScript Errors Detected:');
      console.log('Console Errors:', JSON.stringify(consoleErrors, null, 2));
      console.log('Uncaught Exceptions:', JSON.stringify(uncaughtExceptions, null, 2));
    }
  });
});

test.describe('Specific Bug Regression Tests', () => {
  test('should not have the original variable reference bugs', async ({ page }) => {
    const errors = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Test the specific errors we just fixed
    const buggyPatterns = [
      'results is not defined',
      'user is not defined',
      'container is not defined',
      'string literal contains an unescaped line break'
    ];

    for (const pattern of buggyPatterns) {
      const hasBug = errors.some(error => error.includes(pattern));
      expect(hasBug, `Regression: "${pattern}" error found`).toBe(false);
    }
  });
});
