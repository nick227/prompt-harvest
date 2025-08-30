import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage.js';

test.describe('Home Page', () => {
    let homePage;

    test.beforeEach(async ({ page }) => {
        homePage = new HomePage(page);
        await homePage.navigateToHome();
    });

    test('should load home page successfully', async () => {
        await expect(page).toHaveTitle(/Image Harvest/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('should display prompt input field', async () => {
        await expect(page.locator('#prompt-input')).toBeVisible();
    });

    test('should display generate button', async () => {
        await expect(page.locator('#generate-button')).toBeVisible();
    });

    test('should display provider selection', async () => {
        await expect(page.locator('#provider-select')).toBeVisible();
    });

    test('should display guidance input', async () => {
        await expect(page.locator('#guidance-input')).toBeVisible();
    });

    test('should allow entering a prompt', async () => {
        const testPrompt = 'A beautiful sunset over mountains';
        await homePage.enterPrompt(testPrompt);
        
        const promptValue = await page.locator('#prompt-input').inputValue();
        expect(promptValue).toBe(testPrompt);
    });

    test('should allow selecting a provider', async () => {
        await homePage.selectProvider('test-provider');
        
        const selectedValue = await page.locator('#provider-select').inputValue();
        expect(selectedValue).toBe('test-provider');
    });

    test('should allow setting guidance value', async () => {
        await homePage.setGuidance(15);
        
        const guidanceValue = await page.locator('#guidance-input').inputValue();
        expect(guidanceValue).toBe('15');
    });

    test('should display image grid', async () => {
        await expect(page.locator('.image-grid')).toBeVisible();
    });

    test('should handle empty prompt submission', async () => {
        await homePage.generateImage();
        
        // Should show error or validation message
        await expect(page.locator('.error-message, .validation-error')).toBeVisible();
    });

    test('should handle invalid guidance value', async () => {
        await homePage.enterPrompt('Test prompt');
        await homePage.setGuidance('invalid');
        await homePage.generateImage();
        
        // Should show validation error
        await expect(page.locator('.error-message, .validation-error')).toBeVisible();
    });
});
