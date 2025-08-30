import { test, expect } from '@playwright/test';

test.describe('Simple E2E Tests', () => {
    test('should load home page', async ({ page }) => {
        await page.goto('http://localhost:3200/');
        await expect(page).toHaveTitle(/Image Harvest/);
    });

    test('should have basic elements', async ({ page }) => {
        await page.goto('http://localhost:3200/');
        await expect(page.locator('body')).toBeVisible();
    });

    test('should handle API endpoints', async ({ page }) => {
        const response = await page.request.get('http://localhost:3200/feed');
        expect(response.status()).toBe(200);
    });
});
