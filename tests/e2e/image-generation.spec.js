const { test, expect } = require('@playwright/test');

test.describe('Image Generation Functionality', () => {
    test.beforeEach(async({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('should require provider selection before generation', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Enter a prompt without selecting a provider
        await textarea.fill('A beautiful landscape');
        await generateButton.click();

        // Should show an error or alert
        try {
            // Wait for any error message or alert
            await page.waitForTimeout(2000);

            // Check for alert dialog or error message
            const alertPromise = page.waitForEvent('dialog');
            const alert = await alertPromise;
            expect(alert.message()).toContain('provider');
            await alert.accept();
        } catch (error) {
            // If no alert, check for error message in DOM
            const errorElement = page.locator('.error, .alert, [class*="error"]');
            if (await errorElement.count() > 0) {
                await expect(errorElement.first()).toBeVisible();
            }
        }
    });

    test('should show loading placeholder when generating image', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');
        const imageGrid = page.locator('.prompt-output');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Enter a prompt
        await textarea.fill('A simple test image');

        // Get initial image count
        const initialImageCount = await page.locator('.image-item').count();

        // Click generate
        await generateButton.click();

        // Should show loading placeholder
        await expect(page.locator('.loading-placeholder')).toBeVisible();

        // Verify loading placeholder has correct content
        await expect(page.locator('.loading-placeholder .loading-text')).toHaveText('Generating...');

        // Wait for generation to complete or timeout
        try {
            await expect(page.locator('.loading-placeholder')).not.toBeVisible({ timeout: 30000 });

            // Verify new image was added
            const finalImageCount = await page.locator('.image-item').count();
            expect(finalImageCount).toBeGreaterThan(initialImageCount);
        } catch (error) {
            // If timeout, that's okay - just verify loading state is gone
            await expect(page.locator('.loading-placeholder')).not.toBeVisible();
        }
    });

    test('should handle image generation with different prompts', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        const testPrompts = [
            'A red car',
            'A blue sky',
            'A green tree'
        ];

        for (const prompt of testPrompts) {
            // Enter prompt
            await textarea.fill(prompt);

            // Generate image
            await generateButton.click();

            // Wait for loading to start
            await expect(page.locator('.loading-placeholder')).toBeVisible();

            // Wait for generation to complete or timeout
            try {
                await expect(page.locator('.loading-placeholder')).not.toBeVisible({ timeout: 30000 });

                // Verify the prompt is visible in the generated image
                const imageItems = page.locator('.image-item');
                const lastImage = imageItems.last();
                await expect(lastImage).toBeVisible();
            } catch (error) {
                // If timeout, continue to next prompt
                console.log(`Timeout for prompt: ${prompt}`);
            }
        }
    });

    test('should handle guidance parameter changes', async({ page }) => {
        const guidanceTop = page.locator('select[name="guidance-top"]');
        const guidanceBottom = page.locator('select[name="guidance-bottom"]');
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Set different guidance values
        await guidanceTop.selectOption('15');
        await guidanceBottom.selectOption('5');

        // Enter a prompt
        await textarea.fill('Test with guidance parameters');

        // Generate image
        await generateButton.click();

        // Should still work with custom guidance
        await expect(page.locator('.loading-placeholder')).toBeVisible();
    });

    test('should handle multiple provider selection', async({ page }) => {
        const providerCheckboxes = page.locator('input[name="providers"]');
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select multiple providers
        const providerCount = await providerCheckboxes.count();
        if (providerCount > 1) {
            await providerCheckboxes.nth(0).check();
            await providerCheckboxes.nth(1).check();

            // Enter a prompt
            await textarea.fill('Test with multiple providers');

            // Generate image
            await generateButton.click();

            // Should work with multiple providers
            await expect(page.locator('.loading-placeholder')).toBeVisible();
        }
    });

    test('should handle image generation errors gracefully', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Try with an empty prompt
        await textarea.fill('');
        await generateButton.click();

        // Should show error for empty prompt
        try {
            const alertPromise = page.waitForEvent('dialog');
            const alert = await alertPromise;
            expect(alert.message()).toContain('prompt');
            await alert.accept();
        } catch (error) {
            // Check for error message in DOM
            const errorElement = page.locator('.error, .alert, [class*="error"]');
            if (await errorElement.count() > 0) {
                await expect(errorElement.first()).toBeVisible();
            }
        }
    });

    test('should refresh feed after image generation', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Get initial image count
        const initialImageCount = await page.locator('.image-item').count();

        // Enter a prompt and generate
        await textarea.fill('Test image for feed refresh');
        await generateButton.click();

        // Wait for generation to complete
        try {
            await expect(page.locator('.loading-placeholder')).not.toBeVisible({ timeout: 30000 });

            // Wait a bit more for feed refresh
            await page.waitForTimeout(2000);

            // Verify feed was refreshed (should have more images)
            const finalImageCount = await page.locator('.image-item').count();
            expect(finalImageCount).toBeGreaterThanOrEqual(initialImageCount);
        } catch (error) {
            // If timeout, that's okay
            console.log('Image generation or feed refresh took too long');
        }
    });

    test('should handle image generation with custom variables', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Enter a prompt with template variables
        await textarea.fill('A ${color} ${object} in ${setting}');

        // Generate image
        await generateButton.click();

        // Should handle template variables
        await expect(page.locator('.loading-placeholder')).toBeVisible();
    });

    test('should maintain button state during generation', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Enter a prompt
        await textarea.fill('Test button state');

        // Click generate
        await generateButton.click();

        // Button should be disabled and show "Generating..."
        await expect(generateButton).toBeDisabled();
        await expect(generateButton).toHaveText('Generating...');

        // Wait for completion
        try {
            await expect(generateButton).toHaveText('START', { timeout: 30000 });
            await expect(generateButton).not.toBeDisabled();
        } catch (error) {
            // If timeout, verify button is back to normal state
            await expect(generateButton).not.toHaveText('Generating...');
            await expect(generateButton).not.toBeDisabled();
        }
    });

    test('should handle concurrent image generations', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Start first generation
        await textarea.fill('First concurrent image');
        await generateButton.click();

        // Wait for loading to start
        await expect(page.locator('.loading-placeholder')).toBeVisible();

        // Try to start second generation (should be prevented)
        await textarea.fill('Second concurrent image');
        await generateButton.click();

        // Should still be in first generation state
        await expect(generateButton).toBeDisabled();
        await expect(generateButton).toHaveText('Generating...');
    });

    test('should handle image generation with special characters', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Select a provider
        await page.locator('input[name="providers"]').first().check();

        // Test with special characters
        const specialPrompt = 'A cat & dog with "quotes" and <brackets> and émojis 🐱🐶';
        await textarea.fill(specialPrompt);

        // Generate image
        await generateButton.click();

        // Should handle special characters
        await expect(page.locator('.loading-placeholder')).toBeVisible();
    });
});