/**
 * Playwright Configuration for Infinite Scroll Testing
 * @type {import('@playwright/test').PlaywrightTestConfig}
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    testMatch: '**/infinite-scroll.spec.js',

    // Test timeout
    timeout: 60000, // 60 seconds per test

    // Expect timeout
    expect: {
        timeout: 10000
    },

    // Run tests in serial (one at a time) for debugging
    fullyParallel: false,

    // Fail fast on CI
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Limit workers
    workers: 1,

    // Reporter configuration
    reporter: [
        ['html', { outputFolder: 'playwright-report/infinite-scroll', open: 'never' }],
        ['list'],
        ['json', { outputFile: 'playwright-report/infinite-scroll-results.json' }]
    ],

    // Shared settings for all projects
    use: {
        // Base URL
        baseURL: 'http://localhost:3200',

        // Browser options
        headless: false, // Run in headed mode to see what's happening

        // Screenshot on failure
        screenshot: 'only-on-failure',

        // Video on failure
        video: 'retain-on-failure',

        // Trace on failure
        trace: 'on-first-retry',

        // Viewport
        viewport: { width: 1920, height: 1080 },

        // Ignore HTTPS errors
        ignoreHTTPSErrors: true,

        // Slow down operations for visibility
        slowMo: 500 // 500ms delay between actions
    },

    // Configure projects for different browsers
    projects: [
        {
            name: 'chromium',
            use: {
                ...devices['Desktop Chrome'],
                viewport: { width: 1920, height: 1080 }
            }
        }

        // Uncomment to test in other browsers
        // {
        //     name: 'firefox',
        //     use: {
        //         ...devices['Desktop Firefox'],
        //         viewport: { width: 1920, height: 1080 }
        //     }
        // },
        // {
        //     name: 'webkit',
        //     use: {
        //         ...devices['Desktop Safari'],
        //         viewport: { width: 1920, height: 1080 }
        //     }
        // }
    ]

    // Web server configuration (if needed)
    // webServer: {
    //     command: 'npm start',
    //     port: 3000,
    //     timeout: 120000,
    //     reuseExistingServer: !process.env.CI
    // }
});

