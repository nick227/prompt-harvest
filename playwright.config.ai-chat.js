/**
 * Playwright Configuration for AI Chat E2E Tests
 *
 * Configuration for end-to-end testing of AI chat widget
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    testMatch: ['**/ai-chat-e2e.test.js'],
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: 'playwright-report/ai-chat' }],
        ['json', { outputFile: 'test-results/ai-chat-results.json' }]
    ],
    use: {
        baseURL: 'http://localhost:3200',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] }
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] }
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] }
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] }
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] }
        }
    ],
    webServer: {
        command: 'npm start',
        url: 'http://localhost:3200',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000
    }
});
