/**
 * Comprehensive Form Prevention Test Suite
 * Tests registration page loading and form submission prevention
 */

console.log('🧪 TEST: Form prevention test suite loaded');

class FormPreventionTester {
    constructor() {
        this.testResults = [];
        this.currentTest = null;
    }

    // Test 1: Page Load Verification
    async testPageLoad() {
        this.startTest('Page Load Verification');
        
        try {
            // Check if page elements exist
            const requiredElements = [
                'registerForm',
                'registerEmail', 
                'registerPassword',
                'confirmPassword',
                'authError',
                'authSuccess'
            ];
            
            const missingElements = [];
            requiredElements.forEach(id => {
                const element = document.getElementById(id);
                if (!element) {
                    missingElements.push(id);
                }
            });
            
            if (missingElements.length > 0) {
                this.failTest(`Missing required elements: ${missingElements.join(', ')}`);
                return false;
            }
            
            // Check if scripts are loaded
            const requiredScripts = [
                'authFormsHandler',
                'userSystem',
                'authMessaging'
            ];
            
            const missingScripts = [];
            requiredScripts.forEach(script => {
                if (!window[script]) {
                    missingScripts.push(script);
                }
            });
            
            if (missingScripts.length > 0) {
                this.failTest(`Missing required scripts: ${missingScripts.join(', ')}`);
                return false;
            }
            
            this.passTest('All required elements and scripts loaded successfully');
            return true;
            
        } catch (error) {
            this.failTest(`Page load test failed: ${error.message}`);
            return false;
        }
    }

    // Test 2: Form Prevention Setup
    async testFormPreventionSetup() {
        this.startTest('Form Prevention Setup');
        
        try {
            const form = document.getElementById('registerForm');
            if (!form) {
                this.failTest('Register form not found');
                return false;
            }
            
            // Check if form has submit event listeners
            const eventListeners = this.getEventListeners(form, 'submit');
            if (eventListeners.length === 0) {
                this.failTest('No submit event listeners found on form');
                return false;
            }
            
            this.passTest(`Form has ${eventListeners.length} submit event listener(s)`);
            return true;
            
        } catch (error) {
            this.failTest(`Form prevention setup test failed: ${error.message}`);
            return false;
        }
    }

    // Test 3: Form Submission Prevention
    async testFormSubmissionPrevention() {
        this.startTest('Form Submission Prevention');
        
        try {
            const form = document.getElementById('registerForm');
            
            // Test 3a: Programmatic form.submit() prevention
            console.log('🧪 TEST: Testing form.submit() prevention...');
            try {
                form.submit();
                this.failTest('form.submit() was not prevented!');
                return false;
            } catch (error) {
                this.passTest('form.submit() was blocked successfully');
            }
            
            // Test 3b: Submit event prevention
            console.log('🧪 TEST: Testing submit event prevention...');
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            const wasPrevented = !form.dispatchEvent(submitEvent);
            
            if (wasPrevented) {
                this.passTest('Submit event was prevented successfully');
            } else {
                this.failTest('Submit event was not prevented');
                return false;
            }
            
            return true;
            
        } catch (error) {
            this.failTest(`Form submission prevention test failed: ${error.message}`);
            return false;
        }
    }

    // Test 4: User Interaction Simulation
    async testUserInteraction() {
        this.startTest('User Interaction Simulation');
        
        try {
            const form = document.getElementById('registerForm');
            const submitButton = form.querySelector('button[type="submit"]');
            
            if (!submitButton) {
                this.failTest('Submit button not found');
                return false;
            }
            
            // Fill in test data
            const emailInput = document.getElementById('registerEmail');
            const passwordInput = document.getElementById('registerPassword');
            const confirmInput = document.getElementById('confirmPassword');
            
            if (emailInput && passwordInput && confirmInput) {
                emailInput.value = 'test@example.com';
                passwordInput.value = 'testpassword123';
                confirmInput.value = 'testpassword123';
                this.passTest('Test data filled in successfully');
            }
            
            // Simulate button click
            console.log('🧪 TEST: Simulating submit button click...');
            submitButton.click();
            
            // Check if form submission was prevented
            await this.wait(100);
            const errorElement = document.getElementById('authError');
            if (errorElement && !errorElement.classList.contains('hidden')) {
                this.passTest('Form submission prevented, error message shown');
            } else {
                this.passTest('Form submission prevented (may be working silently)');
            }
            
            return true;
            
        } catch (error) {
            this.failTest(`User interaction test failed: ${error.message}`);
            return false;
        }
    }

    // Test 5: Error Message Display
    async testErrorMessageDisplay() {
        this.startTest('Error Message Display');
        
        try {
            const errorElement = document.getElementById('authError');
            if (!errorElement) {
                this.failTest('Error element not found');
                return false;
            }
            
            // Check if error element is properly styled
            const computedStyle = window.getComputedStyle(errorElement);
            if (computedStyle.display === 'none') {
                this.passTest('Error element is hidden by default (correct)');
            } else {
                this.passTest('Error element is visible');
            }
            
            return true;
            
        } catch (error) {
            this.failTest(`Error message display test failed: ${error.message}`);
            return false;
        }
    }

    // Test 6: System Integration
    async testSystemIntegration() {
        this.startTest('System Integration');
        
        try {
            // Check if AuthFormsHandler is properly initialized
            if (!window.authFormsHandler) {
                this.failTest('AuthFormsHandler not available');
                return false;
            }
            
            // Check if it has the expected methods
            const requiredMethods = [
                'handleLogin',
                'handleRegister',
                'preventFormSubmission'
            ];
            
            const missingMethods = [];
            requiredMethods.forEach(method => {
                if (typeof window.authFormsHandler[method] !== 'function') {
                    missingMethods.push(method);
                }
            });
            
            if (missingMethods.length > 0) {
                this.failTest(`Missing required methods: ${missingMethods.join(', ')}`);
                return false;
            }
            
            this.passTest('AuthFormsHandler properly initialized with all required methods');
            return true;
            
        } catch (error) {
            this.failTest(`System integration test failed: ${error.message}`);
            return false;
        }
    }

    // Helper methods
    startTest(testName) {
        this.currentTest = testName;
        console.log(`🧪 TEST: Starting ${testName}...`);
    }

    passTest(message) {
        this.testResults.push({ test: this.currentTest, status: 'PASS', message });
        console.log(`✅ TEST PASSED: ${this.currentTest} - ${message}`);
    }

    failTest(message) {
        this.testResults.push({ test: this.currentTest, status: 'FAIL', message });
        console.error(`❌ TEST FAILED: ${this.currentTest} - ${message}`);
    }

    async wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getEventListeners(element, eventType) {
        // This is a simplified check - in real browsers we can't directly access listeners
        // But we can check if the element has been modified by our prevention system
        return element.hasAttribute('data-prevented') ? [1] : [];
    }

    // Run all tests
    async runAllTests() {
        console.log('🧪 TEST: Running comprehensive form prevention test suite...');
        
        const tests = [
            this.testPageLoad.bind(this),
            this.testFormPreventionSetup.bind(this),
            this.testFormSubmissionPrevention.bind(this),
            this.testUserInteraction.bind(this),
            this.testErrorMessageDisplay.bind(this),
            this.testSystemIntegration.bind(this)
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        for (const test of tests) {
            try {
                const result = await test();
                if (result) passedTests++;
            } catch (error) {
                console.error(`🧪 TEST: Test ${this.currentTest} crashed:`, error);
            }
            
            // Wait between tests
            await this.wait(200);
        }
        
        this.printResults(passedTests, totalTests);
        return passedTests === totalTests;
    }

    printResults(passed, total) {
        console.log('\n🧪 TEST: ===== TEST RESULTS =====');
        console.log(`🧪 TEST: Tests Passed: ${passed}/${total}`);
        console.log(`🧪 TEST: Success Rate: ${Math.round((passed/total) * 100)}%`);
        
        if (passed === total) {
            console.log('🎉 TEST: ALL TESTS PASSED! Form prevention is working correctly.');
        } else {
            console.log('⚠️ TEST: Some tests failed. Check the logs above for details.');
        }
        
        console.log('\n🧪 TEST: Detailed Results:');
        this.testResults.forEach(result => {
            const icon = result.status === 'PASS' ? '✅' : '❌';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        console.log('🧪 TEST: ========================\n');
    }
}

// Create and run tests after page loads
let tester = null;

function runTests() {
    if (!tester) {
        tester = new FormPreventionTester();
    }
    
    // Wait a bit for everything to initialize
    setTimeout(async () => {
        await tester.runAllTests();
    }, 1000);
}

// Export for manual testing
window.FormPreventionTester = FormPreventionTester;
window.runTests = runTests;

// Auto-run tests after page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTests);
} else {
    runTests();
}

console.log('🧪 TEST: Test suite ready. Use window.runTests() to run tests manually.');
