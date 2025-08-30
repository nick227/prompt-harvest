import { test, expect } from '@playwright/test';
import { setupErrorMonitoring } from './utils/error-monitor.js';

/**
 * Enhanced Authentication Flow Tests with JavaScript Error Monitoring
 * These tests would have caught the variable reference issues we just fixed
 */

test.describe('Enhanced Authentication Flow (with Error Monitoring)', () => {
  let errorMonitor;

  test.beforeEach(async ({ page }) => {
    // Setup error monitoring for this test
    errorMonitor = await setupErrorMonitoring(page);
  });

  test.afterEach(async ({ page }) => {
    // Check for any JavaScript errors after each test
    try {
      await errorMonitor.assertNoJavaScriptErrors();
    } catch (error) {
      // Log errors for debugging but don't fail the test if it was expected to have errors
      errorMonitor.logErrors();
      throw error;
    }
  });

  test('should register without JavaScript errors', async ({ page }) => {
    await page.goto('/register.html', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    // Verify no JavaScript errors on page load
    await errorMonitor.assertNoCriticalErrors();
    await errorMonitor.assertNoVariableReferenceErrors();
    await errorMonitor.assertNoSyntaxErrors();

    // Fill registration form
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);

    // Submit form and check for errors during submission
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Specifically check for the auth component errors we fixed
    await errorMonitor.assertNoVariableReferenceErrors();

    // Should show success and redirect
    await expect(page.locator('#authSuccess')).toBeVisible();
    await page.waitForURL('/', { timeout: 10000 });

    // Verify authentication display works without errors
    await expect(page.locator('#authentication')).toContainText(email);
  });

  test('should login without JavaScript errors', async ({ page }) => {
    // First register a user
    await page.goto('/register.html', { waitUntil: 'networkidle' });

    const timestamp = Date.now();
    const email = `testlogin${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });

    // Logout
    await page.click('#logoutBtn');
    await page.waitForTimeout(1000);

    // Now test login
    await page.goto('/login.html', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/', { timeout: 10000 });

    // Verify no errors during login process
    await errorMonitor.assertNoVariableReferenceErrors();
    await expect(page.locator('#authentication')).toContainText(email);
  });

  test('should handle authentication state changes without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    // Test authentication state change events
    await page.evaluate(() => {
      // Simulate auth state change that could trigger the user variable error
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { email: 'test@example.com', id: 123 }
      }));
    });

    await page.waitForTimeout(1000);
    await errorMonitor.assertNoVariableReferenceErrors();

    // Test logout state change
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: null
      }));
    });

    await page.waitForTimeout(1000);
    await errorMonitor.assertNoVariableReferenceErrors();
  });

  test('should handle feed loading without variable errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    // Wait for feed manager to be available
    await page.waitForFunction(() => {
      return window.feedManager && typeof window.feedManager.setupFeedPromptsNew === 'function';
    });

    // Trigger feed loading that would have caused the "results is not defined" error
    await page.evaluate(() => {
      if (window.feedManager) {
        window.feedManager.resetAndReload();
      }
    });

    await page.waitForTimeout(3000);

    // This would have caught the "results is not defined" error
    await errorMonitor.assertNoVariableReferenceErrors();

    // Check for specific feed-related errors
    const feedErrors = errorMonitor.getVariableReferenceErrors().filter(error =>
      error.message?.includes('setupFeedPromptsNew') ||
      error.text?.includes('setupFeedPromptsNew')
    );

    expect(feedErrors).toHaveLength(0);
  });

  test('should load all required configurations without errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    // This would have caught the "TEXTAREA_CONFIG is not defined" errors
    const configStatus = await page.evaluate(() => {
      const configs = [
        'TEXTAREA_CONFIG',
        'FEED_CONFIG',
        'GUIDANCE_CONFIG',
        'RATING_CONFIG',
        'STATS_CONFIG',
        'IMAGE_CONFIG',
        'PROVIDER_CONFIG'
      ];

      return configs.map(config => ({
        name: config,
        exists: typeof window[config] !== 'undefined',
        type: typeof window[config]
      }));
    });

    // Verify all configs loaded
    for (const config of configStatus) {
      expect(config.exists, `${config.name} should be defined`).toBe(true);
      expect(config.type, `${config.name} should be an object`).toBe('object');
    }

    await errorMonitor.assertNoCriticalErrors();
  });

  test('should initialize all managers without reference errors', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await errorMonitor.waitForApplicationReady();

    // Wait extra time for all managers to initialize
    await page.waitForTimeout(5000);

    // Check manager initialization status
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
        hasInit: window[manager] && typeof window[manager].init === 'function'
      }));
    });

    // Verify all managers are properly initialized
    for (const manager of managerStatus) {
      expect(manager.exists, `${manager.name} should exist`).toBe(true);
    }

    // This would have caught all the manager initialization errors
    await errorMonitor.assertNoVariableReferenceErrors();
    await errorMonitor.assertNoCriticalErrors();

    // Check for specific initialization errors
    const initErrors = errorMonitor.getAllErrors();
    const hasInitializationErrors = [...initErrors.consoleErrors, ...initErrors.uncaughtExceptions]
      .some(error =>
        (error.text || error.message || '').includes('Failed to initialize') ||
        (error.text || error.message || '').includes('is not defined')
      );

    expect(hasInitializationErrors, 'Should not have initialization errors').toBe(false);
  });
});
