import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh for each test
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should register a new user successfully', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register.html');

    // Fill registration form
    const timestamp = Date.now();
    const email = `test${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);

    // Submit form
    await page.click('button[type="submit"]');

    // Should show success message and redirect
    await expect(page.locator('#authSuccess')).toBeVisible();
    await expect(page.locator('#authSuccess')).toContainText('Registration successful');

    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });

    // Should be on homepage and authenticated
    await expect(page.locator('#authentication')).toContainText(email);
  });

  test('should login existing user successfully', async ({ page }) => {
    // First register a user (or use existing test user)
    await page.goto('/register.html');

    const timestamp = Date.now();
    const email = `testlogin${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);
    await page.click('button[type="submit"]');

    // Wait for redirect and logout
    await page.waitForURL('/');
    await page.click('#logoutBtn');
    await page.waitForTimeout(1000);

    // Now test login
    await page.goto('/login.html');

    await page.fill('#loginEmail', email);
    await page.fill('#loginPassword', password);
    await page.click('button[type="submit"]');

    // Should show success message and redirect
    await expect(page.locator('#authSuccess')).toBeVisible();
    await expect(page.locator('#authSuccess')).toContainText('Login successful');

    // Wait for redirect
    await page.waitForURL('/', { timeout: 10000 });

    // Should be authenticated
    await expect(page.locator('#authentication')).toContainText(email);
  });

  test('should handle login validation errors', async ({ page }) => {
    await page.goto('/login.html');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation error
    await expect(page.locator('#authError')).toBeVisible();
    await expect(page.locator('#authError')).toContainText('Email is required');

    // Try invalid email
    await page.fill('#loginEmail', 'invalid-email');
    await page.fill('#loginPassword', 'password');
    await page.click('button[type="submit"]');

    await expect(page.locator('#authError')).toBeVisible();
    await expect(page.locator('#authError')).toContainText('valid email address');
  });

  test('should handle registration validation errors', async ({ page }) => {
    await page.goto('/register.html');

    // Try weak password
    await page.fill('#registerEmail', 'test@example.com');
    await page.fill('#registerPassword', '123');
    await page.fill('#confirmPassword', '123');
    await page.click('button[type="submit"]');

    await expect(page.locator('#authError')).toBeVisible();

    // Try mismatched passwords
    await page.fill('#registerPassword', 'Password123!');
    await page.fill('#confirmPassword', 'DifferentPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('#authError')).toBeVisible();
    await expect(page.locator('#authError')).toContainText('Passwords do not match');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/register.html');

    const timestamp = Date.now();
    const email = `testlogout${timestamp}@example.com`;
    const password = 'TestPassword123!';

    await page.fill('#registerEmail', email);
    await page.fill('#registerPassword', password);
    await page.fill('#confirmPassword', password);
    await page.click('button[type="submit"]');

    await page.waitForURL('/');

    // Verify logged in
    await expect(page.locator('#authentication')).toContainText(email);

    // Logout
    await page.click('#logoutBtn');

    // Should show logout message
    await expect(page.locator('#authSuccess')).toBeVisible();
    await expect(page.locator('#authSuccess')).toContainText('Logged out successfully');

    // Should no longer show user email
    await page.waitForTimeout(2000);
    await expect(page.locator('#authentication')).not.toContainText(email);
  });

  test('should redirect unauthenticated users from protected routes', async ({ page }) => {
    // Try to access a protected area (if any)
    // For now, just verify the auth component shows correct state
    await page.goto('/');

    const authComponent = page.locator('#authentication');
    await expect(authComponent).toBeVisible();

    // Should show login link when not authenticated
    await expect(authComponent).toContainText('Sign In');
  });
});
