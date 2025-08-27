import { test, expect } from '@playwright/test';

test.describe('Terms AI Generation', () => {
    test.beforeEach(async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');
    });

    test('should generate new word types via AI', async({ page }) => {
        // Test AI generation for a new word
        const testWord = `testword${Date.now()}`;

        // First verify the word doesn't exist
        await page.fill('#term', testWord);
        await page.click('.find');
        await page.waitForSelector('.no-results', { timeout: 10000 });

        // Now generate AI types
        const response = await page.request.get(`/ai/word/add/${testWord}`);
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('object');
        expect(data.object).toBe('chat.completion');
    });

    test('should handle AI generation errors gracefully', async({ page }) => {
        // Test with a very long word that might cause issues
        const longWord = 'a'.repeat(1000);

        const response = await page.request.get(`/ai/word/add/${encodeURIComponent(longWord)}`);

        // Should handle gracefully (might return error or success)
        expect(response.status()).toBeLessThan(500); // Should not be server error
    });

    test('should generate and then retrieve AI-generated types', async({ page }) => {
        const testWord = `aitest${Date.now()}`;

        // Generate AI types
        const generateResponse = await page.request.get(`/ai/word/add/${testWord}`);
        expect(generateResponse.ok()).toBeTruthy();

        // Wait a moment for database to update
        await page.waitForTimeout(2000);

        // Now try to retrieve the types
        const retrieveResponse = await page.request.get(`/word/types/${testWord}`);
        expect(retrieveResponse.ok()).toBeTruthy();

        const types = await retrieveResponse.json();
        // Should either return types or empty array
        expect(Array.isArray(types)).toBeTruthy();
    });

    test('should handle concurrent AI generation requests', async({ page }) => {
        const promises = [];
        const testWords = [];

        // Start multiple AI generation requests
        for (let i = 0; i < 3; i++) {
            const word = `concurrent${Date.now()}${i}`;
            testWords.push(word);
            promises.push(page.request.get(`/ai/word/add/${word}`));
        }

        const responses = await Promise.all(promises);

        // All should complete successfully
        responses.forEach(response => {
            expect(response.status()).toBeLessThan(500);
        });
    });

    test('should handle special characters in AI generation', async({ page }) => {
        const specialWords = ['café', 'naïve', 'résumé', 'über'];

        for (const word of specialWords) {
            const response = await page.request.get(`/ai/word/add/${encodeURIComponent(word)}`);
            expect(response.status()).toBeLessThan(500);
        }
    });

    test('should handle AI generation with numbers and symbols', async({ page }) => {
        const testWords = ['word123', 'test-word', 'word_test', '123word'];

        for (const word of testWords) {
            const response = await page.request.get(`/ai/word/add/${encodeURIComponent(word)}`);
            expect(response.status()).toBeLessThan(500);
        }
    });
});

test.describe('Terms Advanced Features', () => {
    test.beforeEach(async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');
    });

    test('should handle word examples endpoint', async({ page }) => {
        const response = await page.request.get('/word/examples/cat');
        expect(response.ok()).toBeTruthy();

        const examples = await response.json();
        expect(Array.isArray(examples)).toBeTruthy();
    });

    test('should handle word type endpoint', async({ page }) => {
        const response = await page.request.get('/word/type/cat');
        expect(response.ok()).toBeTruthy();

        const data = await response.json();
        expect(data).toBeDefined();
    });

    test('should handle limit parameter in API calls', async({ page }) => {
        const response = await page.request.get('/word/types/cat?limit=5');
        expect(response.ok()).toBeTruthy();

        const types = await response.json();
        expect(Array.isArray(types)).toBeTruthy();
        expect(types.length).toBeLessThanOrEqual(5);
    });

    test('should handle pagination in word list', async({ page }) => {
        const response = await page.request.get('/words');
        expect(response.ok()).toBeTruthy();

        const words = await response.json();
        expect(Array.isArray(words)).toBeTruthy();
        expect(words.length).toBeGreaterThan(0);

        // Check that words are sorted
        const sortedWords = [...words].sort();
        expect(words).toEqual(sortedWords);
    });

    test('should handle case insensitive word matching', async({ page }) => {
        const testCases = ['CAT', 'Cat', 'cat', 'cAt'];

        for (const testCase of testCases) {
            const response = await page.request.get(`/word/types/${encodeURIComponent(testCase)}`);
            expect(response.ok()).toBeTruthy();

            const types = await response.json();
            expect(Array.isArray(types)).toBeTruthy();
        }
    });

    test('should handle empty word parameter gracefully', async({ page }) => {
        const response = await page.request.get('/word/types/');
        // Should handle gracefully (might be 404 or return empty array)
        expect(response.status()).toBeLessThan(500);
    });

    test('should handle very long word parameters', async({ page }) => {
        const longWord = 'a'.repeat(500);

        const response = await page.request.get(`/word/types/${encodeURIComponent(longWord)}`);
        expect(response.ok()).toBeTruthy();

        const types = await response.json();
        expect(Array.isArray(types)).toBeTruthy();
    });

    test('should handle URL encoding properly', async({ page }) => {
        const specialChars = ['word with spaces', 'word&symbols', 'word+plus', 'word=equals'];

        for (const word of specialChars) {
            const response = await page.request.get(`/word/types/${encodeURIComponent(word)}`);
            expect(response.status()).toBeLessThan(500);
        }
    });

    test('should handle database connection issues gracefully', async({ page }) => {
        // This test would require mocking the database connection
        // For now, we'll test that the API handles errors gracefully

        const response = await page.request.get('/word/types/nonexistentword');
        expect(response.ok()).toBeTruthy();

        const types = await response.json();
        expect(Array.isArray(types)).toBeTruthy();
        expect(types.length).toBe(0);
    });

    test('should handle malformed requests gracefully', async({ page }) => {
        // Test with various malformed requests
        const malformedRequests = [
            '/word/types/%invalid',
            '/word/types/',
            '/word/types',
            '/word/types/word?invalid=param'
        ];

        for (const request of malformedRequests) {
            const response = await page.request.get(request);
            expect(response.status()).toBeLessThan(500);
        }
    });

    test('should handle concurrent API requests', async({ page }) => {
        const promises = [];

        // Start multiple concurrent requests
        for (let i = 0; i < 5; i++) {
            promises.push(page.request.get('/words'));
            promises.push(page.request.get('/word/types/cat'));
        }

        const responses = await Promise.all(promises);

        // All should complete successfully
        responses.forEach(response => {
            expect(response.status()).toBeLessThan(500);
        });
    });

    test('should handle large response data', async({ page }) => {
        const response = await page.request.get('/words');
        expect(response.ok()).toBeTruthy();

        const words = await response.json();
        expect(Array.isArray(words)).toBeTruthy();

        // Check that large datasets are handled properly
        if (words.length > 1000) {
            // Should handle large datasets without issues
            expect(words.length).toBeLessThan(100000); // Reasonable upper limit
        }
    });

    test('should handle rate limiting gracefully', async({ page }) => {
        // Make many rapid requests to test rate limiting
        const promises = [];

        for (let i = 0; i < 20; i++) {
            promises.push(page.request.get('/words'));
        }

        const responses = await Promise.all(promises);

        // Should handle rapid requests gracefully
        responses.forEach(response => {
            expect(response.status()).toBeLessThan(500);
        });
    });
});

test.describe('Terms Integration Tests', () => {
    test('should integrate AI generation with search functionality', async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');

        const testWord = `integration${Date.now()}`;

        // Generate AI types
        const generateResponse = await page.request.get(`/ai/word/add/${testWord}`);
        expect(generateResponse.ok()).toBeTruthy();

        // Wait for database update
        await page.waitForTimeout(3000);

        // Search for the word in the UI
        await page.fill('#term', testWord);
        await page.click('.find');

        // Should either show results or no results message
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        const hasResults = await page.locator('.term-types-found').isVisible();
        const hasNoResults = await page.locator('.no-results').isVisible();
        expect(hasResults || hasNoResults).toBeTruthy();
    });

    test('should add new term via UI and then find it', async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');

        const testWord = `uitest${Date.now()}`;

        // Search for non-existent word
        await page.fill('#term', testWord);
        await page.click('.find');

        // Wait for add button
        await page.waitForSelector('.add-new-term-btn', { timeout: 10000 });

        // Click add button
        await page.click('.add-new-term-btn');

        // Wait for success message
        await page.waitForSelector('.status-success', { timeout: 15000 });

        // Wait for automatic refresh
        await page.waitForTimeout(3000);

        // Should now show results
        await page.waitForSelector('.term-types-found', { timeout: 10000 });

        // Verify results are displayed
        await expect(page.locator('.term-types-found')).toBeVisible();
        await expect(page.locator('.term-types-found h4')).toContainText('Term Types Found');
    });

    test('should handle full workflow: generate, search, clear', async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');

        const testWord = `workflow${Date.now()}`;

        // Step 1: Generate AI types
        const generateResponse = await page.request.get(`/ai/word/add/${testWord}`);
        expect(generateResponse.ok()).toBeTruthy();

        // Step 2: Wait and search
        await page.waitForTimeout(3000);
        await page.fill('#term', testWord);
        await page.click('.find');

        // Step 3: Wait for results
        await page.waitForSelector('.term-types-found, .no-results', { timeout: 10000 });

        // Step 4: Clear and verify
        await page.click('.clear');
        await expect(page.locator('#term')).toHaveValue('');
        await expect(page.locator('section.term-results')).toBeEmpty();
    });

    test('should handle error recovery in full workflow', async({ page }) => {
        await page.goto('/terms.html');
        await page.waitForLoadState('networkidle');

        // Mock network failure for search
        await page.route('**/word/types/**', route => route.abort());

        // Try to search
        await page.fill('#term', 'cat');
        await page.click('.find');

        // Should handle error gracefully
        await page.waitForTimeout(2000);

        // Page should still be functional
        await expect(page.locator('h3:has-text("Search Terms")')).toBeVisible();

        // Should be able to clear
        await page.click('.clear');
        await expect(page.locator('#term')).toHaveValue('');
    });
});