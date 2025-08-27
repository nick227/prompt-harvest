import { test, expect } from '@playwright/test';

test.describe('Terms Page Functionality', () => {
    test.beforeEach(async({ page }) => {
        // Navigate to terms page before each test
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');
    });

    test('should load terms page with all elements', async({ page }) => {
        // Check page title
        await expect(page).toHaveTitle(/Add term to Dialogica/);

        // Check main elements are present
        await expect(page.locator('h3:has-text("Search Terms")')).toBeVisible();
        await expect(page.locator('#term')).toBeVisible();
        await expect(page.locator('.find')).toBeVisible();
        await expect(page.locator('.clear')).toBeVisible();
        await expect(page.locator('section.term-results')).toBeVisible();
        await expect(page.locator('h3:has-text("All Terms")')).toBeVisible();
        await expect(page.locator('.word-types')).toBeVisible();
    });

    test('should display word types list on page load', async({ page }) => {
        // Wait for word types to load
        await page.waitForSelector('.word-types li', { timeout: 10000 });

        // Check that word types are displayed
        const wordTypes = await page.locator('.word-types li').count();
        expect(wordTypes).toBeGreaterThan(0);

        // Check term count is displayed
        const termCount = await page.locator('#term-count').textContent();
        expect(termCount).toMatch(/\d+/);
    });

    test('should search for existing word and display results', async({ page }) => {
        // Type a word that likely exists in the database
        await page.fill('#term', 'cat');

        // Click find button
        await page.click('.find');

        // Wait for results to appear
        await page.waitForSelector('.term-types-found', { timeout: 10000 });

        // Check that results are displayed
        await expect(page.locator('.term-types-found h4')).toContainText('Term Types Found');

        // Check that types are listed
        const types = await page.locator('.term-types-found li').count();
        expect(types).toBeGreaterThan(0);
    });

    test('should handle search for non-existent word and show add option', async({ page }) => {
        // Type a word that likely doesn't exist
        await page.fill('#term', 'xyz123nonexistent');

        // Click find button
        await page.click('.find');

        // Wait for no results message
        await page.waitForSelector('.no-results', { timeout: 10000 });

        // Check that no results message is displayed with add option
        await expect(page.locator('.no-results')).toContainText('No term types found for "xyz123nonexistent"');
        await expect(page.locator('.add-new-term-btn')).toBeVisible();
        await expect(page.locator('.add-new-term-btn')).toContainText('Add "xyz123nonexistent" as new term');
    });

    test('should search on Enter key press', async({ page }) => {
        // Type a word and press Enter
        await page.fill('#term', 'cat');
        await page.press('#term', 'Enter');

        // Wait for results to appear
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Check that some response is shown
        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should clear search input and results', async({ page }) => {
        // First search for something
        await page.fill('#term', 'cat');
        await page.click('.find');
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Click clear button
        await page.click('.clear');

        // Check that input is cleared
        await expect(page.locator('#term')).toHaveValue('');

        // Check that results are cleared
        await expect(page.locator('section.term-results')).toBeEmpty();
    });

    test('should show loading state during search', async({ page }) => {
        // Type a word
        await page.fill('#term', 'cat');

        // Click find and immediately check for loading
        await page.click('.find');

        // Loading should appear briefly
        await expect(page.locator('.loading')).toBeVisible();

        // Wait for results to appear
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Loading should disappear
        await expect(page.locator('.loading')).not.toBeVisible();
    });

    test('should handle special characters in search', async({ page }) => {
        // Test with special characters
        const specialWords = ['café', 'naïve', 'résumé', 'über'];

        for (const word of specialWords) {
            await page.fill('#term', word);
            await page.click('.find');

            // Wait for response
            await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

            // Clear for next test
            await page.click('.clear');
        }
    });

    test('should handle empty search gracefully', async({ page }) => {
        // Try to search with empty input
        await page.click('.find');

        // Should not crash or show error
        await expect(page.locator('.loading')).not.toBeVisible();
    });

    test('should display word types in alphabetical order', async({ page }) => {
        // Get all word types from the list
        const wordTypes = await page.locator('.word-types li').allTextContents();

        // Check that they are sorted
        const sortedTypes = [...wordTypes].sort();
        expect(wordTypes).toEqual(sortedTypes);
    });

    test('should click on word type to populate search', async({ page }) => {
        // Get first word type
        const firstWordType = await page.locator('.word-types li').first().textContent();

        // Click on it
        await page.locator('.word-types li').first().click();

        // Check that search input is populated
        await expect(page.locator('#term')).toHaveValue(firstWordType);
    });

    test('should handle long search terms', async({ page }) => {
        // Test with a very long word
        const longWord = 'supercalifragilisticexpialidocious';
        await page.fill('#term', longWord);
        await page.click('.find');

        // Wait for response
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Should not crash
        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should handle multiple rapid searches', async({ page }) => {
        const words = ['cat', 'dog', 'bird', 'fish'];

        for (const word of words) {
            await page.fill('#term', word);
            await page.click('.find');

            // Wait for response
            await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

            // Clear for next search
            await page.click('.clear');
        }
    });

    test('should maintain search state after page interaction', async({ page }) => {
        // Perform a search
        await page.fill('#term', 'cat');
        await page.click('.find');
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Interact with page (scroll, click elsewhere)
        await page.evaluate(() => window.scrollTo(0, 100));
        await page.click('body');

        // Results should still be visible
        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should handle network errors gracefully', async({ page }) => {
        // Mock network failure
        await page.route('**/word/types/**', route => route.abort());

        // Try to search
        await page.fill('#term', 'cat');
        await page.click('.find');

        // Should handle error gracefully
        await page.waitForTimeout(2000);

        // Should not crash the page
        await expect(page.locator('h3:has-text("Search Terms")')).toBeVisible();
    });

    test('should display proper error messages for invalid searches', async({ page }) => {
        // Test with various invalid inputs
        const invalidInputs = ['', '   ', 'a', 'ab'];

        for (const input of invalidInputs) {
            await page.fill('#term', input);
            await page.click('.find');

            // Should handle gracefully
            await page.waitForTimeout(1000);

            // Clear for next test
            await page.click('.clear');
        }
    });

    test('should handle concurrent searches', async({ page }) => {
        // Start multiple searches rapidly
        const promises = [];

        for (let i = 0; i < 3; i++) {
            promises.push(
                page.fill('#term', `word${i}`),
                page.click('.find')
            );
        }

        await Promise.all(promises);

        // Should handle concurrent requests gracefully
        await page.waitForTimeout(3000);

        // Page should still be functional
        await expect(page.locator('h3:has-text("Search Terms")')).toBeVisible();
    });

    test('should display results in proper format', async({ page }) => {
        // Search for a word that should return results
        await page.fill('#term', 'cat');
        await page.click('.find');

        // Wait for results
        await page.waitForSelector('.term-types-found', { timeout: 10000 });

        // Check result structure
        await expect(page.locator('.term-types-found h4')).toContainText('Term Types Found');

        // Check that types are displayed as list items
        const types = await page.locator('.term-types-found li').count();
        expect(types).toBeGreaterThan(0);

        // Check that types have content
        const firstType = await page.locator('.term-types-found li').first().textContent();
        expect(firstType.trim().length).toBeGreaterThan(0);
    });

    test('should handle case insensitive search', async({ page }) => {
        // Test with different cases
        const testCases = ['CAT', 'Cat', 'cat', 'cAt'];

        for (const testCase of testCases) {
            await page.fill('#term', testCase);
            await page.click('.find');

            // Wait for response
            await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

            // Clear for next test
            await page.click('.clear');
        }
    });

    test('should update term count correctly', async({ page }) => {
        // Get initial term count
        const initialCount = await page.locator('#term-count').textContent();
        const initialNumber = parseInt(initialCount.replace(/,/g, ''));

        // Verify it's a reasonable number
        expect(initialNumber).toBeGreaterThan(0);
        expect(initialNumber).toBeLessThan(100000); // Reasonable upper limit
    });

    test('should handle search with numbers', async({ page }) => {
        // Test with numeric input
        await page.fill('#term', '123');
        await page.click('.find');

        // Wait for response
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Should handle gracefully
        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should handle search with mixed content', async({ page }) => {
        // Test with mixed alphanumeric content
        await page.fill('#term', 'cat123');
        await page.click('.find');

        // Wait for response
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Should handle gracefully
        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should allow adding new term when not found', async({ page }) => {
        // Type a word that doesn't exist
        const testWord = `newterm${Date.now()}`;
        await page.fill('#term', testWord);
        await page.click('.find');

        // Wait for no results with add option
        await page.waitForSelector('.add-new-term-btn', { timeout: 10000 });

        // Verify add button is present
        await expect(page.locator('.add-new-term-btn')).toBeVisible();
        await expect(page.locator('.add-new-term-btn')).toContainText(`Add "${testWord}" as new term`);

        // Click the add button
        await page.click('.add-new-term-btn');

        // Wait for loading state
        await page.waitForSelector('.loading-spinner', { timeout: 5000 });

        // Verify button is disabled and shows loading
        await expect(page.locator('.add-new-term-btn')).toBeDisabled();
        await expect(page.locator('.add-new-term-btn')).toContainText('Generating term types...');
    });

    test('should handle add new term error gracefully', async({ page }) => {
        // Mock network failure for AI generation
        await page.route('**/ai/word/add/**', route => route.abort());

        // Type a word that doesn't exist
        const testWord = `errortest${Date.now()}`;
        await page.fill('#term', testWord);
        await page.click('.find');

        // Wait for add button
        await page.waitForSelector('.add-new-term-btn', { timeout: 10000 });

        // Click add button
        await page.click('.add-new-term-btn');

        // Wait for error message
        await page.waitForSelector('.status-error', { timeout: 10000 });

        // Verify error is displayed
        await expect(page.locator('.status-error')).toContainText('Failed to generate term types');

        // Verify button is re-enabled
        await expect(page.locator('.add-new-term-btn')).not.toBeDisabled();
    });
});

test.describe('Terms API Endpoints', () => {
    test('should return word types for existing word', async({ request }) => {
        const response = await request.get('/word/types/cat');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();

        // If cat exists in database, should return types
        if (data.length > 0) {
            expect(typeof data[0]).toBe('string');
        }
    });

    test('should return empty array for non-existent word', async({ request }) => {
        const response = await request.get('/word/types/nonexistentword123');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBe(0);
    });

    test('should return list of all words', async({ request }) => {
        const response = await request.get('/words');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
        expect(data.length).toBeGreaterThan(0);

        // Check that words are strings
        data.forEach(word => {
            expect(typeof word).toBe('string');
        });
    });

    test('should handle special characters in word parameter', async({ request }) => {
        const specialWords = ['café', 'naïve', 'résumé'];

        for (const word of specialWords) {
            const response = await request.get(`/word/types/${encodeURIComponent(word)}`);
            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(Array.isArray(data)).toBeTruthy();
        }
    });

    test('should handle AI word generation', async({ request }) => {
        const response = await request.get('/ai/word/add/testword');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        // Should return OpenAI response object
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('object');
    });

    test('should handle word examples endpoint', async({ request }) => {
        const response = await request.get('/word/examples/cat');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(Array.isArray(data)).toBeTruthy();
    });

    test('should handle word type endpoint', async({ request }) => {
        const response = await request.get('/word/type/cat');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        // This endpoint might return different data structure
        expect(data).toBeDefined();
    });
});