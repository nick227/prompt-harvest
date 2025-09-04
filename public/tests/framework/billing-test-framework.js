/**
 * Billing System Test Suite
 * Comprehensive testing for the modular billing system
 */

// Test utilities and helpers
const TestUtils = {
    // Mock DOM elements
    createMockElements() {
        const elements = {
            currentCredits: document.createElement('div'),
            paymentHistory: document.createElement('div'),
            creditHistory: document.createElement('div'),
            totalImages: document.createElement('div'),
            monthlyUsage: document.createElement('div'),
            totalPurchased: document.createElement('div'),
            accountCreated: document.createElement('div'),
            packagesGrid: document.createElement('div'),
            creditPackages: document.createElement('div'),
            usageSummary: document.createElement('div'),
            promoCodeInput: document.createElement('input'),
            redeemPromoBtn: document.createElement('button'),
            promoMessage: document.createElement('div'),
            errorMessage: document.createElement('div'),
            successMessage: document.createElement('div'),
            addCreditsBtn: document.createElement('button')
        };

        // Set IDs for selectors
        elements.currentCredits.id = 'current-credits';
        elements.paymentHistory.id = 'payment-history';
        elements.creditHistory.id = 'credit-history';
        elements.totalImages.id = 'total-images';
        elements.monthlyUsage.id = 'monthly-usage';
        elements.totalPurchased.id = 'total-purchased';
        elements.accountCreated.id = 'account-created';
        elements.packagesGrid.id = 'packages-grid';
        elements.creditPackages.id = 'credit-packages';
        elements.usageSummary.id = 'usage-summary';
        elements.promoCodeInput.id = 'promo-code-input';
        elements.redeemPromoBtn.id = 'redeem-promo-btn';
        elements.promoMessage.id = 'promo-message';
        elements.errorMessage.id = 'error-message';
        elements.successMessage.id = 'success-message';
        elements.addCreditsBtn.id = 'add-credits-btn';

        return elements;
    },

    // Mock API service
    createMockAPIService() {
        return {
            get: jest.fn(),
            post: jest.fn(),
            put: jest.fn(),
            delete: jest.fn()
        };
    },

    // Mock user system
    createMockUserSystem() {
        return {
            isAuthenticated: jest.fn(),
            getUser: jest.fn(),
            isInitialized: true
        };
    },

    // Mock window.location
    mockLocation(url = 'http://localhost/billing.html') {
        delete window.location;
        window.location = new URL(url);
    },

    // Mock fetch
    mockFetch(response) {
        global.fetch = jest.fn(() =>
            Promise.resolve({
                ok: true,
                json: () => Promise.resolve(response)
            })
        );
    },

    // Create test data
    createTestData() {
        return {
            user: {
                id: 'test-user-123',
                email: 'test@example.com',
                createdAt: '2024-01-01T00:00:00Z'
            },
            balance: 150,
            packages: [
                {
                    id: 'package-1',
                    name: 'Starter Pack',
                    credits: 100,
                    price: 999,
                    popular: false
                },
                {
                    id: 'package-2',
                    name: 'Pro Pack',
                    credits: 500,
                    price: 3999,
                    popular: true
                }
            ],
            stats: {
                totalImages: 25,
                monthlyCredits: 75,
                totalCredits: 200,
                user: {
                    createdAt: '2024-01-01T00:00:00Z'
                }
            },
            paymentHistory: [
                {
                    id: 'payment-1',
                    amount: 999,
                    status: 'completed',
                    date: '2024-01-15T00:00:00Z'
                }
            ],
            creditHistory: [
                {
                    id: 'credit-1',
                    credits: 100,
                    type: 'purchase',
                    date: '2024-01-15T00:00:00Z'
                }
            ]
        };
    },

    // Wait for async operations
    async wait(ms = 100) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Trigger events
    triggerEvent(element, eventType, options = {}) {
        const event = new Event(eventType, { bubbles: true, ...options });
        element.dispatchEvent(event);
    },

    // Clean up after tests
    cleanup() {
        // Clear all mocks
        jest.clearAllMocks();
        
        // Reset DOM
        document.body.innerHTML = '';
        
        // Reset window.location
        delete window.location;
        window.location = new URL('http://localhost/billing.html');
    }
};

// Test runner
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            total: 0
        };
    }

    // Add test
    test(name, testFunction) {
        this.tests.push({ name, testFunction });
    }

    // Run all tests
    async run() {
        console.log('🧪 Starting Billing System Test Suite...\n');

        for (const test of this.tests) {
            try {
                await test.testFunction();
                console.log(`✅ PASS: ${test.name}`);
                this.results.passed++;
            } catch (error) {
                console.error(`❌ FAIL: ${test.name}`);
                console.error(`   Error: ${error.message}`);
                this.results.failed++;
            }
            this.results.total++;
        }

        this.printResults();
    }

    // Print test results
    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`Total: ${this.results.total}`);
        console.log(`Passed: ${this.results.passed}`);
        console.log(`Failed: ${this.results.failed}`);
        console.log(`Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);
    }
}

// Global test runner
window.TestRunner = TestRunner;
window.TestUtils = TestUtils;
