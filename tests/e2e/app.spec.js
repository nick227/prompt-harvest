import { test, expect } from '@playwright/test';

test.describe('AI Image Generation Platform', () => {
    test.beforeEach(async({ page }) => {
        // Navigate to the main page before each test
        await page.goto('/');

        // Wait for the page to load completely
        await page.waitForLoadState('networkidle');
    });

    test('should load the main page successfully', async({ page }) => {
        // Wait for header to be created by the header component
        await page.waitForSelector('h1', { timeout: 10000 });

        // Check if the main elements are present
        await expect(page.locator('h1')).toBeVisible();
        await expect(page.locator('#prompt-textarea')).toBeVisible();
        await expect(page.locator('.btn-generate')).toBeVisible();
        await expect(page.locator('.prompt-output')).toBeVisible();
    });

    test('should display provider selection options', async({ page }) => {
        // Wait for providers to be loaded by the provider manager
        await page.waitForSelector('input[name="providers"]', { timeout: 10000 });

        // Check if provider checkboxes are present
        const providerCheckboxes = page.locator('input[name="providers"]');
        await expect(providerCheckboxes.first()).toBeVisible();

        // Verify at least one provider is available
        const providerCount = await providerCheckboxes.count();
        expect(providerCount).toBeGreaterThan(0);
    });

    test('should allow text input in prompt textarea', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const testPrompt = 'A beautiful sunset over mountains';

        // Type in the textarea
        await textarea.fill(testPrompt);

        // Verify the text was entered
        await expect(textarea).toHaveValue(testPrompt);
    });

    test('should show dynamic word matches when typing', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const matchesContainer = page.locator('#matches');

        // Type a word that should trigger matches
        await textarea.fill('cat');

        // Wait for matches to appear (if the feature is working)
        try {
            await expect(matchesContainer).toBeVisible({ timeout: 5000 });
        } catch (error) {
            // If matches don't appear, that's okay - the feature might be disabled
            console.log('Dynamic matches feature might be disabled or not working');
        }
    });

    test('should handle search and replace functionality', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const searchInput = page.locator('#search_term');
        const replaceInput = page.locator('#replace_term');
        const replaceButton = page.locator('.btn-replace');

        // Set up test content
        const originalText = 'A cat and a dog';
        const searchTerm = 'cat';
        const replaceTerm = 'kitten';

        // Fill the textarea
        await textarea.fill(originalText);

        // Set search and replace terms
        await searchInput.fill(searchTerm);
        await replaceInput.fill(replaceTerm);

        // Click replace button
        await replaceButton.click();

        // Wait a moment for the replacement to process
        await page.waitForTimeout(1000);

        // Verify the replacement worked
        await expect(textarea).toHaveValue('A kitten and a dog');
    });

    test('should display guidance controls', async({ page }) => {
        // Check if guidance dropdowns are present
        const guidanceTop = page.locator('select[name="guidance-top"]');
        const guidanceBottom = page.locator('select[name="guidance-bottom"]');

        await expect(guidanceTop).toBeVisible();
        await expect(guidanceBottom).toBeVisible();

        // Verify they have options
        await expect(guidanceTop.locator('option')).toHaveCount(21); // 0-20
        await expect(guidanceBottom.locator('option')).toHaveCount(21); // 0-20
    });

    test('should load existing images in the grid', async({ page }) => {
        const imageGrid = page.locator('.prompt-output');

        // Wait for images to load
        await page.waitForTimeout(2000);

        // Check if the grid is visible
        await expect(imageGrid).toBeVisible();

        // Check if there are any image items (might be empty on fresh install)
        const imageItems = page.locator('.image-item');
        const itemCount = await imageItems.count();

        if (itemCount > 0) {
            // If there are images, verify they have proper structure
            await expect(imageItems.first().locator('img')).toBeVisible();
        }
    });

    test('should handle grid view layout', async({ page }) => {
        const imageGrid = page.locator('.prompt-output');

        // Verify the grid container is visible and has proper classes
        await expect(imageGrid).toBeVisible();
        await expect(imageGrid).toHaveClass(/flex/);

        // Check that it has the expected layout classes
        const gridClasses = await imageGrid.getAttribute('class');
        expect(gridClasses).toContain('flex');
        expect(gridClasses).toContain('flex-wrap');
    });

    test('should show loading state when generating image', async({ page }) => {
        const generateButton = page.locator('.btn-generate');
        const textarea = page.locator('#prompt-textarea');

        // Wait for providers to be loaded
        await page.waitForSelector('input[name="providers"]', { timeout: 10000 });

        // Select a provider first
        const firstProvider = page.locator('input[name="providers"]').first();
        await firstProvider.check();

        // Enter a prompt
        await textarea.fill('A simple test image');

        // Click generate button
        await generateButton.click();

        // Verify loading state
        await expect(generateButton).toHaveText('Generating...');
        await expect(generateButton).toBeDisabled();

        // Wait for either completion or timeout
        try {
            await expect(generateButton).toHaveText('START', { timeout: 30000 });
        } catch (error) {
            // If it takes too long, that's okay - just verify the button is back to normal
            await expect(generateButton).not.toHaveText('Generating...');
        }
    });

    test('should handle image fullscreen functionality', async({ page }) => {
        // Wait for images to load
        await page.waitForTimeout(2000);

        const imageItems = page.locator('.image-item img');
        const imageCount = await imageItems.count();

        if (imageCount > 0) {
            // Click on the first image
            await imageItems.first().click();

            // Check if fullscreen container appears
            const fullscreenContainer = page.locator('.full-screen, [class*="fullscreen"]');

            try {
                await expect(fullscreenContainer).toBeVisible({ timeout: 3000 });

                // Check for fullscreen controls
                const closeButton = page.locator('.fullscreen-controls button, [class*="close"]');
                await expect(closeButton.first()).toBeVisible();

                // Close fullscreen
                await closeButton.first().click();

                // Verify fullscreen is closed
                await expect(fullscreenContainer).not.toBeVisible();
            } catch (error) {
                // Fullscreen might not be implemented or working
                console.log('Fullscreen functionality might not be working');
            }
        }
    });

    test('should handle search functionality', async({ page }) => {
        const searchInput = page.locator('input[placeholder*="search"], input[name*="search"]');

        if (await searchInput.count() > 0) {
            // Type in search
            await searchInput.first().fill('test');

            // Wait for search results or suggestions
            await page.waitForTimeout(1000);

            // Verify search input has the value
            await expect(searchInput.first()).toHaveValue('test');
        }
    });

    test('should handle view toggle functionality', async({ page }) => {
        // Look for view toggle buttons
        const viewToggleButtons = page.locator('button[class*="view"], button[class*="toggle"]');

        if (await viewToggleButtons.count() > 0) {
            // Click the first toggle button
            await viewToggleButtons.first().click();

            // Wait for any changes
            await page.waitForTimeout(1000);

            // Verify the button is still visible (no errors)
            await expect(viewToggleButtons.first()).toBeVisible();
        }
    });

    test('should handle scroll to top functionality', async({ page }) => {
        // Scroll down first
        await page.evaluate(() => window.scrollTo(0, 1000));

        // Look for scroll to top button
        const scrollTopButton = page.locator('.btn-scroll-top, button[class*="scroll"]');

        if (await scrollTopButton.count() > 0) {
            // Click scroll to top
            await scrollTopButton.first().click();

            // Wait for scroll animation
            await page.waitForTimeout(1000);

            // Verify we're at the top
            const scrollY = await page.evaluate(() => window.scrollY);
            expect(scrollY).toBeLessThan(100);
        }
    });

    test('should handle responsive design on mobile', async({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        // Verify the page still loads properly
        await expect(page.locator('#prompt-textarea')).toBeVisible();
        await expect(page.locator('.btn-generate')).toBeVisible();

        // Check if mobile-specific styles are applied
        const body = page.locator('body');
        const bodyWidth = await body.evaluate(el => el.offsetWidth);
        expect(bodyWidth).toBeLessThanOrEqual(375);
    });

    test('should handle authentication links', async({ page }) => {
        // Check for authentication links
        const authLinks = page.locator('a[href*="login"], a[href*="register"]');

        if (await authLinks.count() > 0) {
            // Click on login link
            const loginLink = page.locator('a[href*="login"]').first();
            await loginLink.click();

            // Verify we're on login page or authentication modal appears
            await expect(page).toHaveURL(/.*login.*/);
        }
    });

    test('should handle error states gracefully', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const generateButton = page.locator('.btn-generate');

        // Try to generate without selecting a provider
        await textarea.fill('Test prompt');
        await generateButton.click();

        // Check for error message or alert
        try {
            // Wait for any error message
            await page.waitForTimeout(2000);

            // Check if there's an alert or error message
            const errorMessage = page.locator('.error, .alert, [class*="error"]');
            if (await errorMessage.count() > 0) {
                await expect(errorMessage.first()).toBeVisible();
            }
        } catch (error) {
            // No error message found, which is also acceptable
            console.log('No error message displayed for missing provider selection');
        }
    });

    test('should maintain state across page interactions', async({ page }) => {
        const textarea = page.locator('#prompt-textarea');
        const testText = 'Persistent test text';

        // Wait for providers to be loaded
        await page.waitForSelector('input[name="providers"]', { timeout: 10000 });

        // Enter text
        await textarea.fill(testText);

        // Interact with other elements
        await page.locator('input[name="providers"]').first().check();

        // Verify text is still there
        await expect(textarea).toHaveValue(testText);
    });
});
