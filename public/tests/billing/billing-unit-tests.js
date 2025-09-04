/**
 * Unit Tests for Billing System Core Modules
 * Tests individual modules in isolation
 */

// Unit Tests for BillingAPIManager
class BillingAPIManagerTests {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    setupTests() {
        // Test API manager initialization
        this.runner.test('BillingAPIManager should initialize with correct configuration', () => {
            const apiManager = new BillingAPIManager();
            
            expect(apiManager.config).toBeDefined();
            expect(apiManager.endpoints).toBeDefined();
            expect(apiManager.errorMessages).toBeDefined();
            expect(apiManager.config.RETRY_ATTEMPTS).toBe(3);
            expect(apiManager.endpoints.BALANCE).toBe('/api/credits/balance');
        });

        // Test getBalance method
        this.runner.test('getBalance should return balance from API', async () => {
            const apiManager = new BillingAPIManager();
            const mockResponse = { balance: 150 };
            
            // Mock the retryOperation method
            apiManager.retryOperation = jest.fn().mockResolvedValue(mockResponse);
            
            const result = await apiManager.getBalance();
            
            expect(result).toBe(150);
            expect(apiManager.retryOperation).toHaveBeenCalled();
        });

        // Test getBalance error handling
        this.runner.test('getBalance should throw error on API failure', async () => {
            const apiManager = new BillingAPIManager();
            
            // Mock the retryOperation method to throw
            apiManager.retryOperation = jest.fn().mockRejectedValue(new Error('API Error'));
            
            await expect(apiManager.getBalance()).rejects.toThrow('Failed to load current balance');
        });

        // Test getCreditPackages method
        this.runner.test('getCreditPackages should return packages from API', async () => {
            const apiManager = new BillingAPIManager();
            const mockResponse = { packages: [{ id: '1', name: 'Test Package' }] };
            
            apiManager.retryOperation = jest.fn().mockResolvedValue(mockResponse);
            
            const result = await apiManager.getCreditPackages();
            
            expect(result).toEqual([{ id: '1', name: 'Test Package' }]);
            expect(apiManager.retryOperation).toHaveBeenCalled();
        });

        // Test createCheckoutSession method
        this.runner.test('createCheckoutSession should create valid checkout session', async () => {
            const apiManager = new BillingAPIManager();
            const mockResponse = {
                success: true,
                checkoutUrl: 'https://checkout.stripe.com/test'
            };
            
            apiManager.retryOperation = jest.fn().mockResolvedValue(mockResponse);
            
            const result = await apiManager.createCheckoutSession('package-1', 'success', 'cancel');
            
            expect(result).toEqual(mockResponse);
            expect(apiManager.retryOperation).toHaveBeenCalled();
        });

        // Test createCheckoutSession error handling
        this.runner.test('createCheckoutSession should throw error on invalid response', async () => {
            const apiManager = new BillingAPIManager();
            const mockResponse = { success: false };
            
            apiManager.retryOperation = jest.fn().mockResolvedValue(mockResponse);
            
            await expect(apiManager.createCheckoutSession('package-1', 'success', 'cancel'))
                .rejects.toThrow('Payment processing failed. Please try again.');
        });

        // Test retryOperation with exponential backoff
        this.runner.test('retryOperation should retry with exponential backoff', async () => {
            const apiManager = new BillingAPIManager();
            const mockOperation = jest.fn()
                .mockRejectedValueOnce(new Error('First failure'))
                .mockRejectedValueOnce(new Error('Second failure'))
                .mockResolvedValueOnce('Success');
            
            const result = await apiManager.retryOperation(mockOperation, 3);
            
            expect(result).toBe('Success');
            expect(mockOperation).toHaveBeenCalledTimes(3);
        });
    }

    run() {
        return this.runner.run();
    }
}

// Unit Tests for BillingDataManager
class BillingDataManagerTests {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    setupTests() {
        // Test data manager initialization
        this.runner.test('BillingDataManager should initialize with empty state', () => {
            const dataManager = new BillingDataManager();
            
            expect(dataManager.state.currentUser).toBeNull();
            expect(dataManager.state.creditPackages).toEqual([]);
            expect(dataManager.state.isLoading).toBe(false);
            expect(dataManager.state.cache.size).toBe(0);
        });

        // Test cache operations
        this.runner.test('setCachedData and getCachedData should work correctly', () => {
            const dataManager = new BillingDataManager();
            const testData = { test: 'data' };
            
            dataManager.setCachedData('test-key', testData);
            const retrieved = dataManager.getCachedData('test-key');
            
            expect(retrieved).toEqual(testData);
            expect(dataManager.state.cache.size).toBe(1);
        });

        // Test cache timeout
        this.runner.test('getCachedData should return null for expired cache', async () => {
            const dataManager = new BillingDataManager();
            const testData = { test: 'data' };
            
            dataManager.setCachedData('test-key', testData);
            
            // Fast forward time to expire cache
            const originalDateNow = Date.now;
            Date.now = jest.fn(() => originalDateNow() + dataManager.config.CACHE_TIMEOUT + 1000);
            
            const retrieved = dataManager.getCachedData('test-key');
            
            expect(retrieved).toBeNull();
            expect(dataManager.state.cache.size).toBe(0);
            
            // Restore Date.now
            Date.now = originalDateNow;
        });

        // Test loading state management
        this.runner.test('setLoading and isLoading should manage loading state', () => {
            const dataManager = new BillingDataManager();
            
            expect(dataManager.isLoading()).toBe(false);
            
            dataManager.setLoading(true);
            expect(dataManager.isLoading()).toBe(true);
            
            dataManager.setLoading(false);
            expect(dataManager.isLoading()).toBe(false);
        });

        // Test user management
        this.runner.test('setCurrentUser and getCurrentUser should manage user state', () => {
            const dataManager = new BillingDataManager();
            const testUser = { id: '123', email: 'test@example.com' };
            
            expect(dataManager.getCurrentUser()).toBeNull();
            
            dataManager.setCurrentUser(testUser);
            expect(dataManager.getCurrentUser()).toEqual(testUser);
        });

        // Test credit packages management
        this.runner.test('setCreditPackages and getCreditPackages should manage packages', () => {
            const dataManager = new BillingDataManager();
            const testPackages = [{ id: '1', name: 'Package 1' }];
            
            expect(dataManager.getCreditPackages()).toEqual([]);
            
            dataManager.setCreditPackages(testPackages);
            expect(dataManager.getCreditPackages()).toEqual(testPackages);
            
            // Should also cache the packages
            const cached = dataManager.getCachedData(dataManager.cacheKeys.CREDIT_PACKAGES);
            expect(cached).toEqual(testPackages);
        });

        // Test cache statistics
        this.runner.test('getCacheStats should return correct statistics', () => {
            const dataManager = new BillingDataManager();
            
            dataManager.setCachedData('key1', 'data1');
            dataManager.setCachedData('key2', 'data2');
            
            const stats = dataManager.getCacheStats();
            
            expect(stats.totalCached).toBe(2);
            expect(stats.staleKeys).toBe(0);
            expect(stats.memoryUsage).toBe(200);
        });

        // Test cache clearing
        this.runner.test('clearCache should clear all cached data', () => {
            const dataManager = new BillingDataManager();
            
            dataManager.setCachedData('key1', 'data1');
            dataManager.setCachedData('key2', 'data2');
            
            expect(dataManager.state.cache.size).toBe(2);
            
            dataManager.clearCache();
            
            expect(dataManager.state.cache.size).toBe(0);
            expect(dataManager.state.lastUpdated.size).toBe(0);
        });
    }

    run() {
        return this.runner.run();
    }
}

// Unit Tests for BillingDOMManager
class BillingDOMManagerTests {
    constructor() {
        this.runner = new TestRunner();
        this.setupTests();
    }

    setupTests() {
        // Test DOM manager initialization
        this.runner.test('BillingDOMManager should initialize and cache elements', () => {
            // Setup mock DOM
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            
            expect(domManager.elements.currentCredits).toBeDefined();
            expect(domManager.elements.paymentHistory).toBeDefined();
            expect(domManager.elements.creditHistory).toBeDefined();
            
            TestUtils.cleanup();
        });

        // Test critical elements validation
        this.runner.test('BillingDOMManager should throw error for missing critical elements', () => {
            // Don't add elements to DOM
            expect(() => new BillingDOMManager()).toThrow('Critical billing elements missing');
        });

        // Test balance display update
        this.runner.test('updateBalanceDisplay should update balance element', () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            
            domManager.updateBalanceDisplay(150);
            expect(domManager.elements.currentCredits.textContent).toBe('150');
            
            domManager.updateBalanceDisplay('Error');
            expect(domManager.elements.currentCredits.textContent).toBe('Error');
            
            TestUtils.cleanup();
        });

        // Test usage display update
        this.runner.test('updateUsageDisplay should update usage elements', () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            const stats = {
                totalImages: 25,
                monthlyCredits: 75,
                totalCredits: 200,
                user: { createdAt: '2024-01-01T00:00:00Z' }
            };
            
            domManager.updateUsageDisplay(stats);
            
            expect(domManager.elements.totalImages.textContent).toBe('25');
            expect(domManager.elements.monthlyUsage.textContent).toBe('75');
            expect(domManager.elements.totalPurchased.textContent).toBe('200');
            
            TestUtils.cleanup();
        });

        // Test credit packages rendering
        this.runner.test('renderCreditPackages should render package elements', () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            const packages = [
                {
                    id: 'package-1',
                    name: 'Test Package',
                    credits: 100,
                    price: 999,
                    popular: false
                }
            ];
            
            domManager.renderCreditPackages(packages);
            
            const packageElement = domManager.elements.packagesGrid.querySelector('[data-package-id="package-1"]');
            expect(packageElement).toBeDefined();
            expect(packageElement.querySelector('.package-name').textContent).toBe('Test Package');
            
            TestUtils.cleanup();
        });

        // Test error message display
        this.runner.test('showError should display error message', () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            
            domManager.showError('Test error message');
            
            expect(domManager.elements.errorMessage.textContent).toBe('Test error message');
            expect(domManager.elements.errorMessage.style.display).toBe('block');
            
            TestUtils.cleanup();
        });

        // Test success message display
        this.runner.test('showSuccess should display success message', () => {
            const elements = TestUtils.createMockElements();
            Object.values(elements).forEach(el => document.body.appendChild(el));
            
            const domManager = new BillingDOMManager();
            
            domManager.showSuccess('Test success message');
            
            expect(domManager.elements.successMessage.textContent).toBe('Test success message');
            expect(domManager.elements.successMessage.style.display).toBe('block');
            
            TestUtils.cleanup();
        });
    }

    run() {
        return this.runner.run();
    }
}

// Run all unit tests
async function runUnitTests() {
    console.log('🧪 Running Unit Tests...\n');
    
    const apiTests = new BillingAPIManagerTests();
    const dataTests = new BillingDataManagerTests();
    const domTests = new BillingDOMManagerTests();
    
    await apiTests.run();
    await dataTests.run();
    await domTests.run();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BillingAPIManagerTests,
        BillingDataManagerTests,
        BillingDOMManagerTests,
        runUnitTests
    };
}

// Global reference for browser
window.BillingUnitTests = {
    BillingAPIManagerTests,
    BillingDataManagerTests,
    BillingDOMManagerTests,
    runUnitTests
};
