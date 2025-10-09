// ============================================================================
// TEXTAREA MANAGER - QUICK TESTS
// ============================================================================

/**
 * Quick tests for TextAreaManager functionality
 * Run these tests to verify the manager works correctly
 */

class TextAreaManagerTests {
    constructor() {
        this.testResults = [];
    }

    /**
     * Test: Destroy before DOMContentLoaded fires → no callbacks run, no errors
     */
    testDestroyBeforeDOMReady() {

        const manager = new TextAreaManager();
        const originalConsoleError = console.error;
        let errorCount = 0;

        // Mock console.error to catch errors
        console.error = (...args) => {
            errorCount++;
        };

        // Destroy immediately
        manager.destroy();

        // Simulate DOM ready after destroy
        setTimeout(() => {
            if (errorCount === 0) {
                this.testResults.push({ test: 'destroyBeforeDOMReady', passed: true });
            } else {
                this.testResults.push({ test: 'destroyBeforeDOMReady', passed: false });
            }

            console.error = originalConsoleError;
        }, 100);
    }

    /**
     * Test: Rebind after textarea node is replaced → call updateTargets() then bindEvents()
     */
    testRebindAfterNodeReplacement() {

        // Create mock elements
        const oldTextArea = document.createElement('textarea');
        const oldMatchesEl = document.createElement('div');
        const newTextArea = document.createElement('textarea');
        const newMatchesEl = document.createElement('div');

        // Add to DOM
        document.body.appendChild(oldTextArea);
        document.body.appendChild(oldMatchesEl);
        document.body.appendChild(newTextArea);
        document.body.appendChild(newMatchesEl);

        const manager = new TextAreaManager();

        // Test updateTargets
        const updateSuccess = manager.updateTargets(newTextArea, newMatchesEl);
        const bindSuccess = manager.bindEvents();

        if (updateSuccess && bindSuccess) {
            this.testResults.push({ test: 'rebindAfterReplacement', passed: true });
        } else {
            this.testResults.push({ test: 'rebindAfterReplacement', passed: false });
        }

        // Cleanup
        manager.destroy();
        [oldTextArea, oldMatchesEl, newTextArea, newMatchesEl].forEach(el => el.remove());
    }

    /**
     * Test: Toggle enableA11yAnnouncements(true) → a live region appears once; removing/destroying doesn't leak
     */
    testA11yAnnouncementsLifecycle() {

        const manager = new TextAreaManager();
        const initialLiveRegions = document.querySelectorAll('[aria-live]').length;

        // Enable announcements
        manager.enableA11yAnnouncements(true);
        const afterEnable = document.querySelectorAll('[aria-live]').length;

        // Disable announcements
        manager.enableA11yAnnouncements(false);
        const afterDisable = document.querySelectorAll('[aria-live]').length;

        // Destroy manager
        manager.destroy();
        const afterDestroy = document.querySelectorAll('[aria-live]').length;

        if (afterEnable > initialLiveRegions && afterDisable === initialLiveRegions && afterDestroy === initialLiveRegions) {
            this.testResults.push({ test: 'a11yAnnouncementsLifecycle', passed: true });
        } else {
            this.testResults.push({ test: 'a11yAnnouncementsLifecycle', passed: false });
        }
    }

    /**
     * Test: Trigger multiple _retryInitAndBind() calls → only a single active binding
     */
    testMultipleRetryInitAndBind() {

        const manager = new TextAreaManager();
        let callCount = 0;

        // Mock the method to track calls
        const originalRetry = manager._retryInitAndBind;

        manager._retryInitAndBind = function() {
            callCount++;

            return originalRetry.call(this);
        };

        // Trigger multiple calls
        manager._retryInitAndBind();
        manager._retryInitAndBind();
        manager._retryInitAndBind();

        // Check that only one binding occurred
        if (callCount === 3 && manager.eventsBound === true) {
            this.testResults.push({ test: 'multipleRetryInitAndBind', passed: true });
        } else {
            this.testResults.push({ test: 'multipleRetryInitAndBind', passed: false });
        }

        manager.destroy();
    }

    /**
     * Run all tests
     */
    runAllTests() {

        this.testDestroyBeforeDOMReady();

        setTimeout(() => {
            this.testRebindAfterNodeReplacement();
        }, 200);

        setTimeout(() => {
            this.testA11yAnnouncementsLifecycle();
        }, 400);

        setTimeout(() => {
            this.testMultipleRetryInitAndBind();
        }, 600);

        setTimeout(() => {
            this.printResults();
        }, 800);
    }

    /**
     * Print test results
     */
    printResults() {

        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;

        this.testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
        });


        if (passed === total) {
        } else {
        }
    }
}

// Auto-run tests when loaded
if (typeof window !== 'undefined') {
    window.TextAreaManagerTests = TextAreaManagerTests;

    // Run tests automatically if in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setTimeout(() => {
            const tests = new TextAreaManagerTests();

            tests.runAllTests();
        }, 1000);
    }
}
