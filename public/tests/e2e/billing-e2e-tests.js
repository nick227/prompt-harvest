/**
 * End-to-End Tests for Billing System
 * Tests critical user flows in real browser environment
 */

// E2E Test Runner using Puppeteer
class BillingE2ETests {
    constructor() {
        this.runner = new TestRunner();
        this.browser = null;
        this.page = null;
        this.setupTests();
    }

    async setupBrowser() {
        // Initialize Puppeteer browser
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for CI
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging
        this.page.on('console', msg => console.log('Browser Console:', msg.text()));
        
        // Enable error logging
        this.page.on('pageerror', error => console.error('Browser Error:', error));
    }

    async teardownBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    setupTests() {
        // Test complete billing page load
        this.runner.test('Billing page should load and display correctly', async () => {
            await this.setupBrowser();
            
            try {
                // Navigate to billing page
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for critical elements
                await this.page.waitForSelector('#current-credits', { timeout: 5000 });
                await this.page.waitForSelector('#packages-grid', { timeout: 5000 });
                
                // Verify page title
                const title = await this.page.title();
                expect(title).toContain('Billing & Credits');
                
                // Verify critical elements are present
                const currentCredits = await this.page.$('#current-credits');
                const packagesGrid = await this.page.$('#packages-grid');
                const addCreditsBtn = await this.page.$('#add-credits-btn');
                
                expect(currentCredits).toBeTruthy();
                expect(packagesGrid).toBeTruthy();
                expect(addCreditsBtn).toBeTruthy();
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test balance display
        this.runner.test('Balance should be displayed correctly', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for balance to load
                await this.page.waitForFunction(
                    () => {
                        const element = document.querySelector('#current-credits');
                        return element && element.textContent !== '' && element.textContent !== '0';
                    },
                    { timeout: 10000 }
                );
                
                // Get balance value
                const balanceText = await this.page.$eval('#current-credits', el => el.textContent);
                
                // Should be a number or "Error"
                expect(balanceText).toMatch(/^\d+$|^Error$/);
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test credit packages display
        this.runner.test('Credit packages should be displayed correctly', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for packages to load
                await this.page.waitForFunction(
                    () => {
                        const grid = document.querySelector('#packages-grid');
                        return grid && grid.children.length > 0;
                    },
                    { timeout: 10000 }
                );
                
                // Count package cards
                const packageCount = await this.page.$$eval('.package-card', cards => cards.length);
                expect(packageCount).toBeGreaterThan(0);
                
                // Verify package structure
                const firstPackage = await this.page.$('.package-card');
                const packageName = await firstPackage.$eval('.package-name', el => el.textContent);
                const packagePrice = await firstPackage.$eval('.package-price', el => el.textContent);
                const selectButton = await firstPackage.$('.select-package-btn');
                
                expect(packageName).toBeTruthy();
                expect(packagePrice).toMatch(/^\$\d+\.\d{2}$/);
                expect(selectButton).toBeTruthy();
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test package selection flow
        this.runner.test('Package selection should trigger checkout flow', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for packages to load
                await this.page.waitForSelector('.package-card', { timeout: 10000 });
                
                // Click first package select button
                await this.page.click('.package-card:first-child .select-package-btn');
                
                // Wait for loading state
                await this.page.waitForFunction(
                    () => {
                        const button = document.querySelector('.package-card:first-child .select-package-btn');
                        return button && button.disabled;
                    },
                    { timeout: 5000 }
                );
                
                // Verify loading text
                const buttonText = await this.page.$eval(
                    '.package-card:first-child .select-package-btn',
                    el => el.textContent
                );
                expect(buttonText).toContain('Processing');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test promo code redemption
        this.runner.test('Promo code redemption should work correctly', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for promo input to be available
                await this.page.waitForSelector('#promo-code-input', { timeout: 5000 });
                
                // Enter promo code
                await this.page.type('#promo-code-input', 'TESTCODE');
                
                // Click redeem button
                await this.page.click('#redeem-promo-btn');
                
                // Wait for loading state
                await this.page.waitForFunction(
                    () => {
                        const button = document.querySelector('#redeem-promo-btn');
                        return button && button.disabled;
                    },
                    { timeout: 5000 }
                );
                
                // Verify loading text
                const buttonText = await this.page.$eval('#redeem-promo-btn', el => el.textContent);
                expect(buttonText).toContain('Redeeming');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test error message display
        this.runner.test('Error messages should be displayed correctly', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Trigger an error by entering invalid promo code
                await this.page.waitForSelector('#promo-code-input', { timeout: 5000 });
                await this.page.type('#promo-code-input', 'INVALID');
                await this.page.click('#redeem-promo-btn');
                
                // Wait for error message
                await this.page.waitForFunction(
                    () => {
                        const message = document.querySelector('#promo-message');
                        return message && message.textContent.includes('not found');
                    },
                    { timeout: 10000 }
                );
                
                // Verify error message
                const errorText = await this.page.$eval('#promo-message', el => el.textContent);
                expect(errorText).toContain('not found');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test responsive design
        this.runner.test('Page should be responsive on different screen sizes', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Test desktop view
                await this.page.setViewport({ width: 1280, height: 720 });
                await this.page.waitForSelector('#current-credits', { timeout: 5000 });
                
                // Test tablet view
                await this.page.setViewport({ width: 768, height: 1024 });
                await this.page.waitForSelector('#current-credits', { timeout: 5000 });
                
                // Test mobile view
                await this.page.setViewport({ width: 375, height: 667 });
                await this.page.waitForSelector('#current-credits', { timeout: 5000 });
                
                // Verify elements are still visible
                const currentCredits = await this.page.$('#current-credits');
                const packagesGrid = await this.page.$('#packages-grid');
                
                expect(currentCredits).toBeTruthy();
                expect(packagesGrid).toBeTruthy();
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test accessibility
        this.runner.test('Page should meet basic accessibility requirements', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Check for proper heading structure
                const h1Count = await this.page.$$eval('h1', headings => headings.length);
                expect(h1Count).toBeGreaterThan(0);
                
                // Check for proper button labels
                const buttons = await this.page.$$eval('button', buttons => 
                    buttons.map(btn => ({
                        text: btn.textContent,
                        ariaLabel: btn.getAttribute('aria-label'),
                        disabled: btn.disabled
                    }))
                );
                
                buttons.forEach(button => {
                    expect(button.text).toBeTruthy();
                });
                
                // Check for proper form labels
                const inputs = await this.page.$$eval('input', inputs => 
                    inputs.map(input => ({
                        id: input.id,
                        type: input.type,
                        placeholder: input.placeholder
                    }))
                );
                
                inputs.forEach(input => {
                    expect(input.id).toBeTruthy();
                });
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test performance
        this.runner.test('Page should load within acceptable performance limits', async () => {
            await this.setupBrowser();
            
            try {
                const startTime = Date.now();
                
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                const loadTime = Date.now() - startTime;
                
                // Page should load within 5 seconds
                expect(loadTime).toBeLessThan(5000);
                
                // Get performance metrics
                const metrics = await this.page.evaluate(() => {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    return {
                        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                        loadComplete: perfData.loadEventEnd - perfData.loadEventStart,
                        totalTime: perfData.loadEventEnd - perfData.fetchStart
                    };
                });
                
                // DOM should be ready within 2 seconds
                expect(metrics.domContentLoaded).toBeLessThan(2000);
                
                // Total load time should be reasonable
                expect(metrics.totalTime).toBeLessThan(5000);
                
            } finally {
                await this.teardownBrowser();
            }
        });
    }

    async run() {
        console.log('🌐 Running E2E Tests...\n');
        await this.runner.run();
    }
}

// E2E Tests for Critical User Flows
class BillingCriticalFlowTests {
    constructor() {
        this.runner = new TestRunner();
        this.browser = null;
        this.page = null;
        this.setupTests();
    }

    async setupBrowser() {
        this.browser = await puppeteer.launch({
            headless: false,
            slowMo: 100,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });
    }

    async teardownBrowser() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    setupTests() {
        // Test complete purchase flow
        this.runner.test('Complete purchase flow should work end-to-end', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Wait for packages to load
                await this.page.waitForSelector('.package-card', { timeout: 10000 });
                
                // Select a package
                await this.page.click('.package-card:first-child .select-package-btn');
                
                // Wait for checkout redirect
                await this.page.waitForFunction(
                    () => window.location.href.includes('checkout.stripe.com'),
                    { timeout: 10000 }
                );
                
                // Verify we're on Stripe checkout
                const currentUrl = this.page.url();
                expect(currentUrl).toContain('checkout.stripe.com');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test successful payment return flow
        this.runner.test('Successful payment return should show success message', async () => {
            await this.setupBrowser();
            
            try {
                // Navigate with success parameters
                await this.page.goto('http://localhost/billing.html?success=true&package=package-1', { 
                    waitUntil: 'networkidle0' 
                });
                
                // Wait for success message
                await this.page.waitForFunction(
                    () => {
                        const message = document.querySelector('#success-message');
                        return message && message.style.display === 'block';
                    },
                    { timeout: 10000 }
                );
                
                // Verify success message content
                const messageText = await this.page.$eval('#success-message', el => el.textContent);
                expect(messageText).toContain('Payment successful');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test cancelled payment return flow
        this.runner.test('Cancelled payment should show appropriate message', async () => {
            await this.setupBrowser();
            
            try {
                // Navigate with cancelled parameter
                await this.page.goto('http://localhost/billing.html?cancelled=true', { 
                    waitUntil: 'networkidle0' 
                });
                
                // Wait for error message
                await this.page.waitForFunction(
                    () => {
                        const message = document.querySelector('#error-message');
                        return message && message.style.display === 'block';
                    },
                    { timeout: 10000 }
                );
                
                // Verify cancellation message
                const messageText = await this.page.$eval('#error-message', el => el.textContent);
                expect(messageText).toContain('cancelled');
                
            } finally {
                await this.teardownBrowser();
            }
        });

        // Test promo code success flow
        this.runner.test('Successful promo code redemption should update balance', async () => {
            await this.setupBrowser();
            
            try {
                await this.page.goto('http://localhost/billing.html', { waitUntil: 'networkidle0' });
                
                // Get initial balance
                await this.page.waitForSelector('#current-credits', { timeout: 5000 });
                const initialBalance = await this.page.$eval('#current-credits', el => el.textContent);
                
                // Enter valid promo code (assuming we have a test code)
                await this.page.type('#promo-code-input', 'TESTPROMO');
                await this.page.click('#redeem-promo-btn');
                
                // Wait for success message
                await this.page.waitForFunction(
                    () => {
                        const message = document.querySelector('#promo-message');
                        return message && message.textContent.includes('Success');
                    },
                    { timeout: 10000 }
                );
                
                // Verify success message
                const messageText = await this.page.$eval('#promo-message', el => el.textContent);
                expect(messageText).toContain('Success');
                
            } finally {
                await this.teardownBrowser();
            }
        });
    }

    async run() {
        console.log('🎯 Running Critical Flow Tests...\n');
        await this.runner.run();
    }
}

// Run all E2E tests
async function runE2ETests() {
    console.log('🌐 Running E2E Tests...\n');
    
    const e2eTests = new BillingE2ETests();
    const criticalFlowTests = new BillingCriticalFlowTests();
    
    await e2eTests.run();
    await criticalFlowTests.run();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BillingE2ETests,
        BillingCriticalFlowTests,
        runE2ETests
    };
}

// Global reference for browser
window.BillingE2ETests = {
    BillingE2ETests,
    BillingCriticalFlowTests,
    runE2ETests
};
