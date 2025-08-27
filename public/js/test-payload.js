// Client-side payload test for image generation
class PayloadTester {
    constructor() {
        this.testResults = [];
    }

    // Test 1: Check if providerManager is initialized
    testProviderManager() {
        console.log('=== Testing Provider Manager ===');

        const result = {
            test: 'Provider Manager Initialization',
            passed: false,
            details: {}
        };

        if (window.providerManager) {
            result.passed = true;
            result.details.providerManagerExists = true;
            result.details.providerManagerType = typeof window.providerManager;

            // Check if getSelectedProviders method exists
            if (typeof window.providerManager.getSelectedProviders === 'function') {
                result.details.getSelectedProvidersExists = true;

                // Test the method
                const selectedProviders = window.providerManager.getSelectedProviders();
                result.details.selectedProviders = selectedProviders;
                result.details.selectedProvidersType = typeof selectedProviders;
                result.details.selectedProvidersLength = selectedProviders.length;
            } else {
                result.details.getSelectedProvidersExists = false;
            }
        } else {
            result.details.providerManagerExists = false;
        }

        this.testResults.push(result);
        console.log('Provider Manager Test:', result);
        return result;
    }

    // Test 2: Check if generateImage function exists
    testGenerateImageFunction() {
        console.log('=== Testing Generate Image Function ===');

        const result = {
            test: 'Generate Image Function',
            passed: false,
            details: {}
        };

        if (typeof window.generateImage === 'function') {
            result.passed = true;
            result.details.generateImageExists = true;
            result.details.generateImageType = typeof window.generateImage;
        } else {
            result.details.generateImageExists = false;
        }

        this.testResults.push(result);
        console.log('Generate Image Function Test:', result);
        return result;
    }

    // Test 3: Simulate the actual payload creation
    async testPayloadCreation() {
        console.log('=== Testing Payload Creation ===');

        const result = {
            test: 'Payload Creation',
            passed: false,
            details: {}
        };

        try {
            // Simulate the exact flow from app.js
            const textArea = document.querySelector('#prompt-textarea');
            if (!textArea) {
                result.details.error = 'Textarea not found';
                this.testResults.push(result);
                return result;
            }

            // Set a test prompt
            const testPrompt = 'test cats';
            textArea.value = testPrompt;
            result.details.testPrompt = testPrompt;

            // Create prompt object (same as in app.js)
            const promptObj = {
                prompt: textArea.value.trim(),
                promptId: Date.now().toString(),
                original: textArea.value.trim()
            };
            result.details.promptObj = promptObj;

            // Get selected providers (same as in app.js)
            const selectedProviders = window.providerManager ? window.providerManager.getSelectedProviders() : [];
            result.details.selectedProviders = selectedProviders;
            result.details.selectedProvidersLength = selectedProviders.length;

            // Add default provider if none selected (same as in app.js)
            if (selectedProviders.length === 0) {
                selectedProviders.push('flux');
                result.details.addedDefaultProvider = true;
                result.details.finalProviders = selectedProviders;
            }

            // Create FormData (same as in images.js)
            const formData = new FormData();
            formData.append('prompt', promptObj.prompt);
            formData.append('providers', selectedProviders.join(','));
            formData.append('promptId', promptObj.promptId);
            formData.append('original', promptObj.original);

            // Add guidance values if available
            const guidanceTop = document.querySelector('select[name="guidance-top"]');
            const guidanceBottom = document.querySelector('select[name="guidance-bottom"]');

            if (guidanceTop && guidanceTop.value) {
                formData.append('guidance', guidanceTop.value);
                result.details.guidanceTop = guidanceTop.value;
            }
            if (guidanceBottom && guidanceBottom.value) {
                formData.append('guidance', guidanceBottom.value);
                result.details.guidanceBottom = guidanceBottom.value;
            }

            // Extract FormData contents for inspection
            const formDataContents = {};
            for (let [key, value] of formData.entries()) {
                formDataContents[key] = value;
            }
            result.details.formDataContents = formDataContents;

            // Test what the server would receive
            const mockRequestBody = {};
            for (let [key, value] of formData.entries()) {
                mockRequestBody[key] = value;
            }
            result.details.mockRequestBody = mockRequestBody;

            // Test server-side parsing
            const parsedPrompt = decodeURIComponent(mockRequestBody.prompt || '');
            const parsedProviders = decodeURIComponent(mockRequestBody.providers || '').split(',');
            const parsedGuidance = isNaN(mockRequestBody.guidance) ? false : parseInt(mockRequestBody.guidance);
            const parsedPromptId = mockRequestBody.promptId;
            const parsedOriginal = mockRequestBody.original;

            result.details.serverParsed = {
                prompt: parsedPrompt,
                providers: parsedProviders,
                guidance: parsedGuidance,
                promptId: parsedPromptId,
                original: parsedOriginal
            };

            result.passed = true;

        } catch (error) {
            result.details.error = error.message;
            result.details.errorStack = error.stack;
        }

        this.testResults.push(result);
        console.log('Payload Creation Test:', result);
        return result;
    }

    // Test 4: Check if server is accessible
    async testServerAccess() {
        console.log('=== Testing Server Access ===');

        const result = {
            test: 'Server Access',
            passed: false,
            details: {}
        };

        try {
            const response = await fetch('/feed', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            result.details.serverResponse = {
                status: response.status,
                statusText: response.statusText,
                ok: response.ok
            };

            if (response.ok) {
                result.passed = true;
                result.details.serverAccessible = true;
            } else {
                result.details.serverAccessible = false;
            }

        } catch (error) {
            result.details.error = error.message;
            result.details.errorType = error.name;
            result.details.serverAccessible = false;
        }

        this.testResults.push(result);
        console.log('Server Access Test:', result);
        return result;
    }

    // Test 5: Simulate actual API call (without sending)
    async testAPICallSimulation() {
        console.log('=== Testing API Call Simulation ===');

        const result = {
            test: 'API Call Simulation',
            passed: false,
            details: {}
        };

        try {
            // Create test data
            const testPrompt = 'test cats';
            const testProviders = ['flux'];
            const testPromptId = Date.now().toString();

            // Create FormData exactly as in images.js
            const formData = new FormData();
            formData.append('prompt', testPrompt);
            formData.append('providers', testProviders.join(','));
            formData.append('promptId', testPromptId);
            formData.append('original', testPrompt);

            result.details.testData = {
                prompt: testPrompt,
                providers: testProviders,
                promptId: testPromptId
            };

            result.details.formDataCreated = true;

            // Log what would be sent
            const formDataContents = {};
            for (let [key, value] of formData.entries()) {
                formDataContents[key] = value;
            }
            result.details.formDataContents = formDataContents;

            // Test the exact API endpoint
            const apiEndpoint = '/image/generate';
            result.details.apiEndpoint = apiEndpoint;

            // Simulate the fetch call (but don't actually send it)
            result.details.fetchSimulation = {
                method: 'POST',
                body: formData,
                endpoint: apiEndpoint
            };

            result.passed = true;

        } catch (error) {
            result.details.error = error.message;
        }

        this.testResults.push(result);
        console.log('API Call Simulation Test:', result);
        return result;
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Payload Tests...');

        await this.testProviderManager();
        await this.testGenerateImageFunction();
        await this.testPayloadCreation();
        await this.testServerAccess();
        await this.testAPICallSimulation();

        this.printSummary();
    }

    // Print test summary
    printSummary() {
        console.log('\n📊 PAYLOAD TEST SUMMARY');
        console.log('========================');

        const passedTests = this.testResults.filter(r => r.passed).length;
        const totalTests = this.testResults.length;

        console.log(`Tests Passed: ${passedTests}/${totalTests}`);

        this.testResults.forEach((result, index) => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${index + 1}. ${result.test}`);

            if (!result.passed && result.details.error) {
                console.log(`   Error: ${result.details.error}`);
            }
        });

        // Highlight critical issues
        const criticalIssues = this.testResults.filter(r => !r.passed);
        if (criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES FOUND:');
            criticalIssues.forEach(issue => {
                console.log(`- ${issue.test}: ${issue.details.error || 'Failed'}`);
            });
        } else {
            console.log('\n✅ All tests passed! Payload should work correctly.');
        }
    }
}

// Make it available globally
window.PayloadTester = PayloadTester;

// Auto-run tests when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {
    // Wait a bit for all modules to load
    setTimeout(async() => {
        const tester = new PayloadTester();
        await tester.runAllTests();
    }, 1000);
});

// Also provide a manual trigger
window.runPayloadTests = async() => {
    const tester = new PayloadTester();
    await tester.runAllTests();
};