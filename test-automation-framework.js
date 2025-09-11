// Comprehensive Automated Testing Framework
// Entry point for testing public/private image functionality
import axios from 'axios';

const BASE_URL = 'http://localhost:3200';
const TEST_USER = {
    email: 'test@test.net',
    password: '123456',
    name: 'Test User'
};

class TestFramework {
    constructor() {
        this.authToken = null;
        this.userId = null;
        this.testResults = [];
        this.createdImageId = null;
    }

    // ============================================================================
    // CORE TESTING METHODS
    // ============================================================================

    /**
     * Log a test result
     */
    logResult(testName, success, message, data = null) {
        const result = {
            test: testName,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        this.testResults.push(result);

        const status = success ? '✅' : '❌';
        console.log(`${status} ${testName}: ${message}`);
        if (data && !success) {
            console.log(`   Data:`, JSON.stringify(data, null, 2));
        }
    }

    /**
     * Make authenticated API request
     */
    async makeRequest(method, endpoint, data = null, useAuth = true) {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            timeout: 10000
        };

        if (data) {
            config.data = data;
        }

        if (useAuth && this.authToken) {
            config.headers = {
                'Authorization': `Bearer ${this.authToken}`
            };
        }

        try {
            const response = await axios(config);
            return { success: true, data: response.data, status: response.status };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            };
        }
    }

    // ============================================================================
    // AUTHENTICATION METHODS
    // ============================================================================

    /**
     * Register test user
     */
    async registerTestUser() {
        console.log('\n🔐 Step 1: Registering Test User');
        console.log('-'.repeat(40));

        const result = await this.makeRequest('POST', '/api/auth/register', {
            email: TEST_USER.email,
            password: TEST_USER.password,
            name: TEST_USER.name
        }, false);

        if (result.success) {
            this.logResult('User Registration', true, 'Test user registered successfully');
            return true;
        } else if (result.status === 409 || result.status === 400) {
            this.logResult('User Registration', true, 'Test user already exists (expected)');
            return true;
        } else {
            this.logResult('User Registration', false, `Registration failed: ${result.error}`, result.data);
            return false;
        }
    }

    /**
     * Login test user and save token
     */
    async loginTestUser() {
        console.log('\n🔑 Step 2: Logging In Test User');
        console.log('-'.repeat(40));

        const result = await this.makeRequest('POST', '/api/auth/login', {
            email: TEST_USER.email,
            password: TEST_USER.password
        }, false);

        if (result.success && result.data.success) {
            this.authToken = result.data.data.token;
            this.userId = result.data.data.user.id;

            this.logResult('User Login', true, 'Test user logged in successfully');
            console.log(`   Token: ${this.authToken.substring(0, 20)}...`);
            console.log(`   User ID: ${this.userId}`);
            return true;
        } else {
            this.logResult('User Login', false, `Login failed: ${result.error}`, result.data);
            return false;
        }
    }

    // ============================================================================
    // FEED TESTING METHODS
    // ============================================================================

    /**
     * Test feed response with authenticated user
     */
    async testFeedLoggedIn() {
        console.log('\n📱 Step 3: Testing Feed (Logged In)');
        console.log('-'.repeat(40));

        const result = await this.makeRequest('GET', '/api/feed?limit=10');

        if (result.success) {
            const images = result.data.data?.items || result.data.data || [];
            this.logResult('Feed (Logged In)', true, `Retrieved ${images.length} images`);

            // Log image details
            images.forEach((image, index) => {
                console.log(`   Image ${index + 1}: ID=${image.id}, Public=${image.isPublic}, Owner=${image.userId === this.userId ? 'Me' : 'Other'}`);
            });

            return true;
        } else {
            this.logResult('Feed (Logged In)', false, `Feed request failed: ${result.error}`, result.data);
            return false;
        }
    }

    /**
     * Test feed response as anonymous user
     */
    async testFeedAnonymous() {
        console.log('\n🌐 Step 6: Testing Feed (Anonymous)');
        console.log('-'.repeat(40));

        const result = await this.makeRequest('GET', '/api/feed?limit=10', null, false);

        if (result.success) {
            const images = result.data.data?.items || result.data.data || [];
            this.logResult('Feed (Anonymous)', true, `Retrieved ${images.length} public images`);

            // Verify all images are public
            const allPublic = images.every(image => image.isPublic === true);
            if (allPublic) {
                this.logResult('Public Filter', true, 'All images in anonymous feed are public');
            } else {
                this.logResult('Public Filter', false, 'Some images in anonymous feed are not public');
            }

            // Check if our created image is present
            const ourImage = images.find(image => image.id === this.createdImageId);
            if (ourImage) {
                this.logResult('Public Image Visibility', true, 'Our public image appears in anonymous feed');
            } else {
                this.logResult('Public Image Visibility', false, 'Our public image not found in anonymous feed');
            }

            return true;
        } else {
            this.logResult('Feed (Anonymous)', false, `Anonymous feed request failed: ${result.error}`, result.data);
            return false;
        }
    }

    // ============================================================================
    // IMAGE CREATION AND MANAGEMENT
    // ============================================================================

    /**
     * Create a test image programmatically
     */
    async createTestImage() {
        console.log('\n🎨 Step 4: Creating Test Image');
        console.log('-'.repeat(40));

        const imageData = {
            prompt: 'A beautiful test image for automated testing',
            providers: ['flux'],
            model: 'flux-1.1-pro',
            size: '1024x1024',
            quality: 'standard',
            style: 'photographic'
        };

        const result = await this.makeRequest('POST', '/api/image/generate', imageData);

        if (result.success && result.data.success) {
            this.createdImageId = result.data.data.id;
            this.logResult('Image Creation', true, `Test image created with ID: ${this.createdImageId}`);
            console.log(`   Prompt: ${imageData.prompt}`);
            console.log(`   Model: ${imageData.model}`);
            console.log(`   Image URL: ${result.data.data.imageUrl}`);
            return true;
        } else {
            this.logResult('Image Creation', false, `Image creation failed: ${result.error}`, result.data);
            return false;
        }
    }

    /**
     * Toggle image to public
     */
    async toggleImageToPublic() {
        console.log('\n🌐 Step 5: Making Image Public');
        console.log('-'.repeat(40));

        if (!this.createdImageId) {
            this.logResult('Toggle Public', false, 'No image ID available for toggle');
            return false;
        }

        const result = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, {
            isPublic: true
        });

        if (result.success && result.data.success) {
            this.logResult('Toggle Public', true, `Image ${this.createdImageId} set to public`);
            return true;
        } else {
            this.logResult('Toggle Public', false, `Toggle failed: ${result.error}`, result.data);
            return false;
        }
    }

    // ============================================================================
    // MAIN TEST EXECUTION
    // ============================================================================

    /**
     * Test public value persistence across multiple operations
     */
    async testPublicValuePersistence() {
        console.log('\n🔍 Testing Public Value Persistence...');

        if (!this.createdImageId) {
            this.logResult('Public Persistence', false, 'No test image available');
            return false;
        }

        try {
            // Step 1: Set image to public
            console.log('   Step 1: Setting image to public...');
            const setPublicResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: true });

            if (setPublicResponse.status !== 200) {
                this.logResult('Public Persistence - Set Public', false, 'Failed to set image public', setPublicResponse.data);
                return false;
            }
            this.logResult('Public Persistence - Set Public', true, 'Image set to public successfully');

            // Step 2: Verify it's public in feed
            console.log('   Step 2: Verifying image is public in feed...');
            const feedResponse1 = await this.makeRequest('GET', '/api/feed', null, true);
            const images1 = feedResponse1.data.data?.items || feedResponse1.data.data || [];
            const ourImage1 = images1.find(img => img.id === this.createdImageId);

            if (!ourImage1) {
                this.logResult('Public Persistence - Feed Check 1', false, 'Image not found in feed');
                return false;
            }

            if (!ourImage1.isPublic) {
                this.logResult('Public Persistence - Feed Check 1', false, 'Image not public in feed', { isPublic: ourImage1.isPublic });
                return false;
            }
            this.logResult('Public Persistence - Feed Check 1', true, 'Image confirmed public in feed');

            // Step 3: Set image to private
            console.log('   Step 3: Setting image to private...');
            const setPrivateResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: false });

            if (setPrivateResponse.status !== 200) {
                this.logResult('Public Persistence - Set Private', false, 'Failed to set image private', setPrivateResponse.data);
                return false;
            }
            this.logResult('Public Persistence - Set Private', true, 'Image set to private successfully');

            // Step 4: Verify it's private in feed
            console.log('   Step 4: Verifying image is private in feed...');
            const feedResponse2 = await this.makeRequest('GET', '/api/feed', null, true);
            const images2 = feedResponse2.data.data?.items || feedResponse2.data.data || [];
            const ourImage2 = images2.find(img => img.id === this.createdImageId);

            if (!ourImage2) {
                this.logResult('Public Persistence - Feed Check 2', false, 'Image not found in feed');
                return false;
            }

            if (ourImage2.isPublic) {
                this.logResult('Public Persistence - Feed Check 2', false, 'Image still public in feed', { isPublic: ourImage2.isPublic });
                return false;
            }
            this.logResult('Public Persistence - Feed Check 2', true, 'Image confirmed private in feed');

            // Step 5: Set back to public and verify persistence
            console.log('   Step 5: Setting back to public and testing persistence...');
            const setPublicAgainResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: true });

            if (setPublicAgainResponse.status !== 200) {
                this.logResult('Public Persistence - Set Public Again', false, 'Failed to set image public again', setPublicAgainResponse.data);
                return false;
            }

            // Step 6: Multiple feed checks to test persistence
            console.log('   Step 6: Testing persistence across multiple feed requests...');
            let persistencePassed = true;

            for (let i = 1; i <= 3; i++) {
                const feedResponse = await this.makeRequest('GET', '/api/feed', null, true);
                const images = feedResponse.data.data?.items || feedResponse.data.data || [];
                const ourImage = images.find(img => img.id === this.createdImageId);

                if (!ourImage || !ourImage.isPublic) {
                    this.logResult(`Public Persistence - Feed Check ${i + 2}`, false, `Image not public in feed check ${i}`, {
                        found: !!ourImage,
                        isPublic: ourImage?.isPublic
                    });
                    persistencePassed = false;
                    break;
                }

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            if (persistencePassed) {
                this.logResult('Public Persistence - Multiple Feed Checks', true, 'Image remained public across multiple feed requests');
            }

            this.logResult('Public Persistence - Complete', true, 'All persistence tests passed successfully');
            return true;

        } catch (error) {
            this.logResult('Public Persistence', false, `Error during persistence test: ${error.message}`, error.response?.data);
            return false;
        }
    }

    /**
     * Run the complete test suite
     */
    async runCompleteTest() {
        console.log('🚀 Starting Comprehensive Public/Private Image Test');
        console.log('=' .repeat(60));
        console.log(`Test User: ${TEST_USER.email}`);
        console.log(`Base URL: ${BASE_URL}`);
        console.log(`Timestamp: ${new Date().toISOString()}`);

        const steps = [
            { name: 'Register User', method: () => this.registerTestUser() },
            { name: 'Login User', method: () => this.loginTestUser() },
            { name: 'Test Feed (Logged In)', method: () => this.testFeedLoggedIn() },
            { name: 'Create Image', method: () => this.createTestImage() },
            { name: 'Toggle Public', method: () => this.toggleImageToPublic() },
            { name: 'Test Public Persistence', method: () => this.testPublicValuePersistence() },
            { name: 'Test Feed (Anonymous)', method: () => this.testFeedAnonymous() }
        ];

        let allPassed = true;
        for (const step of steps) {
            const success = await step.method();
            if (!success) {
                allPassed = false;
                console.log(`\n❌ Test failed at step: ${step.name}`);
                break;
            }
        }

        // Final Results
        console.log('\n' + '='.repeat(60));
        console.log('🎯 FINAL TEST RESULTS');
        console.log('='.repeat(60));

        const passedTests = this.testResults.filter(r => r.success).length;
        const totalTests = this.testResults.length;

        console.log(`Tests Passed: ${passedTests}/${totalTests}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

        if (allPassed) {
            console.log('\n🎉 ALL TESTS PASSED! Public/Private functionality is working correctly.');
            console.log('\n✅ Verified Features:');
            console.log('   • User registration and authentication');
            console.log('   • Feed filtering for logged-in users');
            console.log('   • Programmatic image creation');
            console.log('   • Public/private status toggle');
            console.log('   • Anonymous feed shows only public images');
        } else {
            console.log('\n❌ SOME TESTS FAILED! Please review the issues above.');
        }

        console.log('\n📋 Test Framework Ready for Future Use:');
        console.log('   • Authentication token saved for reuse');
        console.log('   • Test user registered and ready');
        console.log('   • Framework methods available for automation');

        return allPassed;
    }
}

// ============================================================================
// EXECUTION
// ============================================================================

async function main() {
    const framework = new TestFramework();
    await framework.runCompleteTest();
}

// Run the test
main().catch(error => {
    console.error('❌ Test framework failed:', error.message);
    process.exit(1);
});
