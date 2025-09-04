/**
 * Integration Tests for Billing System
 * Tests interactions between modules and system behavior
 */

// Integration Tests for Billing System Components
class BillingIntegrationTests {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    setupTests() {
        // Test complete billing system initialization
        this.runner.test('BillingManager should initialize all components correctly', async () => {
            // Setup mock environment
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            // Mock API service
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get
                .mockResolvedValueOnce({ balance: 150 })
                .mockResolvedValueOnce({ packages: TestUtils.createTestData().packages });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            expect(billingManager.isSystemInitialized()).toBe(true);
            expect(billingManager.apiManager).toBeDefined();
            expect(billingManager.dataManager).toBeDefined();
            expect(billingManager.domManager).toBeDefined();
            expect(billingManager.uiManager).toBeDefined();
            
            TestUtils.cleanup();
        });

        // Test data flow from API to UI
        this.runner.test('Data should flow correctly from API through all layers', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const testData = TestUtils.createTestData();
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(testData.user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get
                .mockResolvedValueOnce({ balance: testData.balance })
                .mockResolvedValueOnce({ packages: testData.packages })
                .mockResolvedValueOnce(testData.stats);
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Verify data flowed through all layers
            expect(billingManager.getCurrentUser()).toEqual(testData.user);
            expect(billingManager.getCreditPackagesFromState()).toEqual(testData.packages);
            expect(billingManager.domManager.elements.currentCredits.textContent).toBe('150');
            
            TestUtils.cleanup();
        });

        // Test caching behavior across modules
        this.runner.test('Caching should work across all modules', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ balance: 150 });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // First call should hit API
            expect(mockAPIService.get).toHaveBeenCalledTimes(1);
            
            // Second call should use cache
            await billingManager.getBalance();
            expect(mockAPIService.get).toHaveBeenCalledTimes(1); // Still 1, not 2
            
            // Clear cache and verify API is called again
            billingManager.clearCache();
            await billingManager.getBalance();
            expect(mockAPIService.get).toHaveBeenCalledTimes(2);
            
            TestUtils.cleanup();
        });

        // Test error handling across modules
        this.runner.test('Errors should be handled consistently across modules', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockRejectedValue(new Error('Network error'));
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Verify error is displayed in UI
            expect(billingManager.domManager.elements.currentCredits.textContent).toBe('Error');
            
            TestUtils.cleanup();
        });

        // Test user interaction flow
        this.runner.test('User interactions should trigger correct system responses', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ packages: TestUtils.createTestData().packages });
            mockAPIService.post.mockResolvedValue({
                success: true,
                checkoutUrl: 'https://checkout.stripe.com/test'
            });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Simulate package selection
            const packageElement = billingManager.domManager.elements.packagesGrid.querySelector('[data-package-id="package-1"]');
            const selectButton = packageElement.querySelector('.select-package-btn');
            
            TestUtils.triggerEvent(selectButton, 'click');
            
            // Verify loading state is set
            expect(billingManager.isLoading()).toBe(true);
            
            // Wait for async operation
            await TestUtils.wait(100);
            
            // Verify API was called
            expect(mockAPIService.post).toHaveBeenCalledWith('/api/credits/purchase', expect.any(Object));
            
            TestUtils.cleanup();
        });

        // Test promo code redemption flow
        this.runner.test('Promo code redemption should work end-to-end', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ balance: 150 });
            mockAPIService.post.mockResolvedValue({
                success: true,
                credits: 50
            });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Set promo code
            billingManager.domManager.elements.promoCodeInput.value = 'TESTCODE';
            
            // Trigger redemption
            TestUtils.triggerEvent(billingManager.domManager.elements.redeemPromoBtn, 'click');
            
            // Wait for async operation
            await TestUtils.wait(100);
            
            // Verify API was called with correct data
            expect(mockAPIService.post).toHaveBeenCalledWith('/api/credits/redeem', {
                promoCode: 'TESTCODE'
            });
            
            TestUtils.cleanup();
        });

        // Test URL parameter handling
        this.runner.test('URL parameters should be handled correctly', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ packages: TestUtils.createTestData().packages });
            
            window.apiService = mockAPIService;
            
            // Mock URL with success parameter
            TestUtils.mockLocation('http://localhost/billing.html?success=true&package=package-1');
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Verify success message is shown
            expect(billingManager.domManager.elements.successMessage.style.display).toBe('block');
            
            TestUtils.cleanup();
        });

        // Test system state consistency
        this.runner.test('System state should remain consistent across operations', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ balance: 150 });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Verify initial state
            const initialState = billingManager.getSystemStatus();
            expect(initialState.initialized).toBe(true);
            expect(initialState.loading).toBe(false);
            expect(initialState.user).toBeDefined();
            
            // Perform operation
            await billingManager.refresh();
            
            // Verify state remains consistent
            const finalState = billingManager.getSystemStatus();
            expect(finalState.initialized).toBe(true);
            expect(finalState.user).toEqual(initialState.user);
            
            TestUtils.cleanup();
        });

        // Test concurrent operations
        this.runner.test('Concurrent operations should not interfere with each other', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ balance: 150 });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Start multiple concurrent operations
            const promises = [
                billingManager.getBalance(),
                billingManager.getCreditPackages(),
                billingManager.getUserStats()
            ];
            
            // All should complete successfully
            const results = await Promise.allSettled(promises);
            expect(results.every(r => r.status === 'fulfilled')).toBe(true);
            
            TestUtils.cleanup();
        });
    }

    run() {
        return this.runner.run();
    }
}

// Integration Tests for Error Scenarios
class BillingErrorIntegrationTests {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    setupTests() {
        // Test authentication failure flow
        this.runner.test('Authentication failure should redirect to login', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(false);
            
            window.userSystem = mockUserSystem;
            
            // Mock window.location
            const originalLocation = window.location;
            delete window.location;
            window.location = { href: '' };
            
            const billingManager = new BillingManager();
            
            try {
                await billingManager.init();
            } catch (error) {
                // Expected to redirect
            }
            
            expect(window.location.href).toContain('/login.html');
            
            // Restore window.location
            window.location = originalLocation;
            TestUtils.cleanup();
        });

        // Test network failure recovery
        this.runner.test('System should recover from network failures', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({ balance: 150 });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // First call should fail
            expect(billingManager.domManager.elements.currentCredits.textContent).toBe('Error');
            
            // Retry should succeed
            await billingManager.refresh();
            expect(billingManager.domManager.elements.currentCredits.textContent).toBe('150');
            
            TestUtils.cleanup();
        });

        // Test invalid data handling
        this.runner.test('System should handle invalid API responses gracefully', async () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const mockUserSystem = TestUtils.createMockUserSystem();
            mockUserSystem.isAuthenticated.mockReturnValue(true);
            mockUserSystem.getUser.mockReturnValue(TestUtils.createTestData().user);
            
            window.userSystem = mockUserSystem;
            
            const mockAPIService = TestUtils.createMockAPIService();
            mockAPIService.get.mockResolvedValue({ invalid: 'response' });
            
            window.apiService = mockAPIService;
            
            const billingManager = new BillingManager();
            await billingManager.init();
            
            // Should handle invalid response gracefully
            expect(billingManager.domManager.elements.currentCredits.textContent).toBe('0');
            
            TestUtils.cleanup();
        });
    }

    run() {
        return this.runner.run();
    }
}

// Run all integration tests
async function runIntegrationTests() {
    console.log('🔗 Running Integration Tests...\n');
    
    const integrationTests = new BillingIntegrationTests();
    const errorTests = new BillingErrorIntegrationTests();
    
    await integrationTests.run();
    await errorTests.run();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BillingIntegrationTests,
        BillingErrorIntegrationTests,
        runIntegrationTests
    };
}

// Global reference for browser
window.BillingIntegrationTests = {
    BillingIntegrationTests,
    BillingErrorIntegrationTests,
    runIntegrationTests
};
