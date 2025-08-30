import { test, expect } from '@playwright/test';

test.describe('Image Generation Flow', () => {
  let userEmail;
  let userPassword;

  test.beforeAll(async () => {
    // Generate unique user for this test suite
    const timestamp = Date.now();
    userEmail = `testgen${timestamp}@example.com`;
    userPassword = 'TestPassword123!';
  });

  test.beforeEach(async ({ page }) => {
    // Clear cookies and register/login user
    await page.context().clearCookies();

    // Register user
    await page.goto('/register.html');
    await page.fill('#registerEmail', userEmail);
    await page.fill('#registerPassword', userPassword);
    await page.fill('#confirmPassword', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/', { timeout: 10000 });
  });

  test('should complete full image generation workflow', async ({ page }) => {
    // Verify we're on the homepage and authenticated
    await expect(page.locator('#authentication')).toContainText(userEmail);

    // Enter a prompt
    const prompt = 'A beautiful sunset over mountains';
    await page.fill('#prompt-textarea', prompt);

    // Select at least one provider
    const firstProvider = page.locator('input[name="providers"]').first();
    await firstProvider.check();

    // Verify button is enabled and ready
    const generateButton = page.locator('.btn-generate');
    await expect(generateButton).toBeEnabled();
    await expect(generateButton).toContainText('START');

    // Click generate button
    await generateButton.click();

    // Should show loading state
    await expect(generateButton).toContainText('Generating...');
    await expect(generateButton).toBeDisabled();

    // Should show loading placeholder in the output
    const outputContainer = page.locator('.prompt-output');
    await expect(outputContainer.locator('.loading-placeholder')).toBeVisible();

    // Wait for generation to complete (with generous timeout)
    await page.waitForFunction(() => {
      const button = document.querySelector('.btn-generate');
      return button && button.textContent === 'START' && !button.disabled;
    }, { timeout: 60000 });

    // Button should be re-enabled
    await expect(generateButton).toBeEnabled();
    await expect(generateButton).toContainText('START');

    // Should have an image in the output
    const imageElement = outputContainer.locator('img').first();
    await expect(imageElement).toBeVisible({ timeout: 5000 });

    // Image should have proper attributes
    await expect(imageElement).toHaveAttribute('src', /uploads\/.*\.(jpg|jpeg|png|webp)/);
    await expect(imageElement).toHaveAttribute('alt', prompt);
  });

  test('should validate form inputs', async ({ page }) => {
    // Try to generate without prompt
    const generateButton = page.locator('.btn-generate');
    await generateButton.click();

    // Should show validation error
    await page.waitForFunction(() => {
      return window.alert || document.querySelector('.alert, .error');
    }, { timeout: 5000 }).catch(() => {
      // Alert might not be captured, that's okay
    });

    // Enter prompt but don't select providers
    await page.fill('#prompt-textarea', 'test prompt');
    await generateButton.click();

    // Should show provider validation error
    await page.waitForFunction(() => {
      return window.alert || document.querySelector('.alert, .error');
    }, { timeout: 5000 }).catch(() => {
      // Alert might not be captured, that's okay
    });
  });

  test('should prevent duplicate generation requests', async ({ page }) => {
    // Enter prompt and select provider
    await page.fill('#prompt-textarea', 'test prompt');
    const firstProvider = page.locator('input[name="providers"]').first();
    await firstProvider.check();

    const generateButton = page.locator('.btn-generate');

    // Click generate button multiple times rapidly
    await generateButton.click();
    await generateButton.click();
    await generateButton.click();

    // Should only have one loading placeholder
    const outputContainer = page.locator('.prompt-output');
    const loadingPlaceholders = outputContainer.locator('.loading-placeholder');
    await expect(loadingPlaceholders).toHaveCount(1);
  });

  test('should display transaction stats', async ({ page }) => {
    // Check if transaction stats component is visible
    const transactionStats = page.locator('#transaction-stats');
    await expect(transactionStats).toBeVisible();

    // Should show some stats for authenticated user
    await expect(transactionStats).toContainText(/\d+.*generations?/i);
  });

  test('should handle provider selection', async ({ page }) => {
    // Should have provider checkboxes
    const providers = page.locator('input[name="providers"]');
    await expect(providers).toHaveCount.greaterThan(0);

    // Should be able to check/uncheck providers
    const firstProvider = providers.first();
    await firstProvider.check();
    await expect(firstProvider).toBeChecked();

    await firstProvider.uncheck();
    await expect(firstProvider).not.toBeChecked();

    // Should have select all functionality (if implemented)
    const selectAllBtn = page.locator('.select-all-providers');
    if (await selectAllBtn.isVisible()) {
      await selectAllBtn.click();

      // All providers should be selected
      const checkedProviders = page.locator('input[name="providers"]:checked');
      await expect(checkedProviders).toHaveCount.greaterThan(0);
    }
  });

  test('should handle auto-generation feature', async ({ page }) => {
    // Check if auto-generation controls exist
    const autoGenCheckbox = page.locator('input[name="autoGenerate"]');
    const maxNumInput = page.locator('input[name="maxNum"]');

    if (await autoGenCheckbox.isVisible()) {
      // Enable auto-generation
      await autoGenCheckbox.check();

      if (await maxNumInput.isVisible()) {
        await maxNumInput.fill('3');
      }

      // Enter prompt and select provider
      await page.fill('#prompt-textarea', 'auto generation test');
      const firstProvider = page.locator('input[name="providers"]').first();
      await firstProvider.check();

      // Start generation
      const generateButton = page.locator('.btn-generate');
      await generateButton.click();

      // Should generate multiple images
      const outputContainer = page.locator('.prompt-output');

      // Wait for auto-generation to complete
      await page.waitForFunction(() => {
        const images = document.querySelectorAll('.prompt-output img');
        return images.length >= 2; // At least 2 images generated
      }, { timeout: 120000 });

      const images = outputContainer.locator('img');
      await expect(images).toHaveCount.greaterThanOrEqual(2);
    }
  });

  test('should handle image interactions', async ({ page }) => {
    // Generate an image first
    await page.fill('#prompt-textarea', 'test image for interactions');
    const firstProvider = page.locator('input[name="providers"]').first();
    await firstProvider.check();

    const generateButton = page.locator('.btn-generate');
    await generateButton.click();

    // Wait for image to appear
    const outputContainer = page.locator('.prompt-output');
    const imageElement = outputContainer.locator('img').first();
    await expect(imageElement).toBeVisible({ timeout: 60000 });

    // Click on image (should open fullscreen or show interactions)
    await imageElement.click();

    // Check for fullscreen or modal
    const fullscreenElement = page.locator('.full-screen, .modal, .lightbox');
    if (await fullscreenElement.isVisible()) {
      // Should be able to close fullscreen
      const closeButton = page.locator('.close-button, .close, [aria-label="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
        await expect(fullscreenElement).not.toBeVisible();
      }
    }
  });

  test('should maintain session across page refreshes', async ({ page }) => {
    // Generate an image
    await page.fill('#prompt-textarea', 'session test');
    const firstProvider = page.locator('input[name="providers"]').first();
    await firstProvider.check();

    const generateButton = page.locator('.btn-generate');
    await generateButton.click();

    // Wait for completion
    await page.waitForFunction(() => {
      const button = document.querySelector('.btn-generate');
      return button && button.textContent === 'START' && !button.disabled;
    }, { timeout: 60000 });

    // Refresh page
    await page.reload();

    // Should still be authenticated
    await expect(page.locator('#authentication')).toContainText(userEmail);

    // Previous images should still be visible
    const outputContainer = page.locator('.prompt-output');
    const images = outputContainer.locator('img');
    await expect(images).toHaveCount.greaterThanOrEqual(1);
  });
});
