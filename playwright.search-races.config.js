import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e/search-races',
    fullyParallel: false,
    workers: 1,
    reporter: 'list',
    projects: [{
        name: 'chromium',
        use: { ...devices['Desktop Chrome'] }
    }]
});
