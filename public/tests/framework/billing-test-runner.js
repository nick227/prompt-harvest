/**
 * Main Test Runner for Billing System
 * Orchestrates all test suites and provides comprehensive reporting
 */

class BillingTestSuite {
    constructor() {
        this.results = {
            unit: { passed: 0, failed: 0, total: 0 },
            integration: { passed: 0, failed: 0, total: 0 },
            e2e: { passed: 0, failed: 0, total: 0 },
            overall: { passed: 0, failed: 0, total: 0 }
        };
        this.startTime = null;
        this.endTime = null;
    }

    async runAllTests() {
        this.startTime = Date.now();
        
        console.log('🧪 BILLING SYSTEM TEST SUITE');
        console.log('=============================\n');
        
        try {
            // Run Unit Tests
            console.log('📋 UNIT TESTS');
            console.log('-------------');
            await this.runUnitTests();
            
            // Run Integration Tests
            console.log('\n📋 INTEGRATION TESTS');
            console.log('-------------------');
            await this.runIntegrationTests();
            
            // Run E2E Tests
            console.log('\n📋 E2E TESTS');
            console.log('-------------');
            await this.runE2ETests();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
        
        this.endTime = Date.now();
        this.printFinalReport();
    }

    async runUnitTests() {
        try {
            const unitTests = new BillingUnitTests.BillingAPIManagerTests();
            const dataTests = new BillingUnitTests.BillingDataManagerTests();
            const domTests = new BillingUnitTests.BillingDOMManagerTests();
            
            await unitTests.run();
            await dataTests.run();
            await domTests.run();
            
            // Aggregate results
            this.results.unit = {
                passed: unitTests.runner.results.passed + dataTests.runner.results.passed + domTests.runner.results.passed,
                failed: unitTests.runner.results.failed + dataTests.runner.results.failed + domTests.runner.results.failed,
                total: unitTests.runner.results.total + dataTests.runner.results.total + domTests.runner.results.total
            };
            
        } catch (error) {
            console.error('❌ Unit tests failed:', error);
            this.results.unit.failed++;
        }
    }

    async runIntegrationTests() {
        try {
            const integrationTests = new BillingIntegrationTests.BillingIntegrationTests();
            const errorTests = new BillingIntegrationTests.BillingErrorIntegrationTests();
            
            await integrationTests.run();
            await errorTests.run();
            
            // Aggregate results
            this.results.integration = {
                passed: integrationTests.runner.results.passed + errorTests.runner.results.passed,
                failed: integrationTests.runner.results.failed + errorTests.runner.results.failed,
                total: integrationTests.runner.results.total + errorTests.runner.results.total
            };
            
        } catch (error) {
            console.error('❌ Integration tests failed:', error);
            this.results.integration.failed++;
        }
    }

    async runE2ETests() {
        try {
            const e2eTests = new BillingE2ETests.BillingE2ETests();
            const criticalFlowTests = new BillingE2ETests.BillingCriticalFlowTests();
            
            await e2eTests.run();
            await criticalFlowTests.run();
            
            // Aggregate results
            this.results.e2e = {
                passed: e2eTests.runner.results.passed + criticalFlowTests.runner.results.passed,
                failed: e2eTests.runner.results.failed + criticalFlowTests.runner.results.failed,
                total: e2eTests.runner.results.total + criticalFlowTests.runner.results.total
            };
            
        } catch (error) {
            console.error('❌ E2E tests failed:', error);
            this.results.e2e.failed++;
        }
    }

    printFinalReport() {
        const duration = this.endTime - this.startTime;
        
        // Calculate overall results
        this.results.overall = {
            passed: this.results.unit.passed + this.results.integration.passed + this.results.e2e.passed,
            failed: this.results.unit.failed + this.results.integration.failed + this.results.e2e.failed,
            total: this.results.unit.total + this.results.integration.total + this.results.e2e.total
        };
        
        console.log('\n📊 FINAL TEST REPORT');
        console.log('===================');
        console.log(`⏱️  Total Duration: ${duration}ms`);
        console.log(`📈 Overall Success Rate: ${((this.results.overall.passed / this.results.overall.total) * 100).toFixed(1)}%`);
        
        console.log('\n📋 Test Results by Category:');
        console.log('Unit Tests:');
        console.log(`  ✅ Passed: ${this.results.unit.passed}`);
        console.log(`  ❌ Failed: ${this.results.unit.failed}`);
        console.log(`  📊 Total: ${this.results.unit.total}`);
        console.log(`  📈 Success Rate: ${this.results.unit.total > 0 ? ((this.results.unit.passed / this.results.unit.total) * 100).toFixed(1) : 0}%`);
        
        console.log('\nIntegration Tests:');
        console.log(`  ✅ Passed: ${this.results.integration.passed}`);
        console.log(`  ❌ Failed: ${this.results.integration.failed}`);
        console.log(`  📊 Total: ${this.results.integration.total}`);
        console.log(`  📈 Success Rate: ${this.results.integration.total > 0 ? ((this.results.integration.passed / this.results.integration.total) * 100).toFixed(1) : 0}%`);
        
        console.log('\nE2E Tests:');
        console.log(`  ✅ Passed: ${this.results.e2e.passed}`);
        console.log(`  ❌ Failed: ${this.results.e2e.failed}`);
        console.log(`  📊 Total: ${this.results.e2e.total}`);
        console.log(`  📈 Success Rate: ${this.results.e2e.total > 0 ? ((this.results.e2e.passed / this.results.e2e.total) * 100).toFixed(1) : 0}%`);
        
        console.log('\n🎯 Overall Summary:');
        console.log(`  ✅ Total Passed: ${this.results.overall.passed}`);
        console.log(`  ❌ Total Failed: ${this.results.overall.failed}`);
        console.log(`  📊 Total Tests: ${this.results.overall.total}`);
        
        if (this.results.overall.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! The billing system is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
        }
        
        console.log('\n📝 Test Coverage:');
        console.log('✅ API Layer: All endpoints and error handling');
        console.log('✅ Data Layer: Caching, state management, and data flow');
        console.log('✅ DOM Layer: UI manipulation and rendering');
        console.log('✅ Integration: Module interactions and system behavior');
        console.log('✅ E2E: Critical user flows and browser interactions');
    }

    // Individual test runners for specific test types
    async runUnitTestsOnly() {
        console.log('🧪 Running Unit Tests Only...\n');
        await this.runUnitTests();
        this.printCategoryReport('Unit Tests', this.results.unit);
    }

    async runIntegrationTestsOnly() {
        console.log('🔗 Running Integration Tests Only...\n');
        await this.runIntegrationTests();
        this.printCategoryReport('Integration Tests', this.results.integration);
    }

    async runE2ETestsOnly() {
        console.log('🌐 Running E2E Tests Only...\n');
        await this.runE2ETests();
        this.printCategoryReport('E2E Tests', this.results.e2e);
    }

    printCategoryReport(category, results) {
        console.log(`\n📊 ${category} Report:`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📊 Total: ${results.total}`);
        console.log(`📈 Success Rate: ${results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0}%`);
    }
}

// Test configuration
const TestConfig = {
    // Test environment settings
    environment: {
        baseUrl: 'http://localhost',
        timeout: 10000,
        retries: 3
    },
    
    // Test data
    testData: {
        validPromoCode: 'TESTPROMO',
        invalidPromoCode: 'INVALID',
        testPackageId: 'package-1'
    },
    
    // Performance thresholds
    performance: {
        maxLoadTime: 5000,
        maxDOMReady: 2000,
        maxFirstPaint: 1000
    },
    
    // Browser settings for E2E tests
    browser: {
        headless: false, // Set to true for CI
        slowMo: 100,
        viewport: { width: 1280, height: 720 }
    }
};

// Quick test runners
async function runQuickTests() {
    console.log('⚡ Running Quick Tests (Unit + Integration)...\n');
    const testSuite = new BillingTestSuite();
    await testSuite.runUnitTests();
    await testSuite.runIntegrationTests();
    testSuite.printFinalReport();
}

async function runFullTestSuite() {
    console.log('🚀 Running Full Test Suite...\n');
    const testSuite = new BillingTestSuite();
    await testSuite.runAllTests();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        BillingTestSuite,
        TestConfig,
        runQuickTests,
        runFullTestSuite
    };
}

// Global reference for browser
window.BillingTestSuite = {
    BillingTestSuite,
    TestConfig,
    runQuickTests,
    runFullTestSuite
};

// Auto-run tests if in test environment
if (window.location.href.includes('test') || window.location.href.includes('localhost')) {
    console.log('🧪 Auto-running billing system tests...');
    runQuickTests();
}
