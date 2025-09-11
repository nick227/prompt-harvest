// Standalone Public Value Persistence Test
// Tests that public/private status persists correctly across operations
import axios from 'axios';

const BASE_URL = 'http://localhost:3200';
const TEST_USER = {
    email: 'test@test.net',
    password: '123456'
};

class PublicPersistenceTest {
    constructor() {
        this.authToken = null;
        this.createdImageId = null;
    }

    async makeRequest(method, endpoint, data = null, useAuth = true) {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        if (useAuth && this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        if (data) {
            config.data = data;
        }

        return axios(config);
    }

    async login() {
        console.log('🔑 Logging in test user...');
        try {
            const response = await this.makeRequest('POST', '/api/auth/login', {
                email: TEST_USER.email,
                password: TEST_USER.password
            }, false);

            if (response.status === 200 && response.data.success && response.data.data?.token) {
                this.authToken = response.data.data.token;
                console.log('✅ Login successful');
                return true;
            } else {
                console.log('❌ Login failed:', response.data);
                return false;
            }
        } catch (error) {
            console.log('❌ Login error:', error.response?.data || error.message);
            return false;
        }
    }

    async findExistingImage() {
        console.log('🔍 Finding existing image for testing...');
        try {
            const response = await this.makeRequest('GET', '/api/feed');
            const images = response.data.data?.items || response.data.data || [];

            if (images.length > 0) {
                // Find the first image that belongs to the current user
                const userImage = images.find(img => img.userId || !img.isPublic);
                if (userImage) {
                    this.createdImageId = userImage.id;
                    console.log(`✅ Found existing image for testing: ${this.createdImageId}`);
                    console.log(`   Current status: ${userImage.isPublic ? 'Public' : 'Private'}`);
                    return true;
                }
            }

            console.log('❌ No suitable images found for testing');
            return false;
        } catch (error) {
            console.log('❌ Error finding existing image:', error.response?.data || error.message);
            return false;
        }
    }

    async testPublicPersistence() {
        console.log('\n🔍 Testing Public Value Persistence...');

        if (!this.createdImageId) {
            console.log('❌ No test image available');
            return false;
        }

        try {
            // Step 1: Set image to public
            console.log('   Step 1: Setting image to public...');
            const setPublicResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: true });

            if (setPublicResponse.status !== 200) {
                console.log('❌ Failed to set image public:', setPublicResponse.data);
                return false;
            }
            console.log('✅ Image set to public successfully');

            // Step 2: Verify it's public in feed
            console.log('   Step 2: Verifying image is public in feed...');
            const feedResponse1 = await this.makeRequest('GET', '/api/feed');
            const images1 = feedResponse1.data.data?.items || feedResponse1.data.data || [];
            const ourImage1 = images1.find(img => img.id === this.createdImageId);

            if (!ourImage1) {
                console.log('❌ Image not found in feed');
                return false;
            }

            if (!ourImage1.isPublic) {
                console.log('❌ Image not public in feed:', { isPublic: ourImage1.isPublic });
                return false;
            }
            console.log('✅ Image confirmed public in feed');

            // Step 3: Set image to private
            console.log('   Step 3: Setting image to private...');
            const setPrivateResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: false });

            if (setPrivateResponse.status !== 200) {
                console.log('❌ Failed to set image private:', setPrivateResponse.data);
                return false;
            }
            console.log('✅ Image set to private successfully');

            // Step 4: Verify it's private in feed
            console.log('   Step 4: Verifying image is private in feed...');
            const feedResponse2 = await this.makeRequest('GET', '/api/feed');
            const images2 = feedResponse2.data.data?.items || feedResponse2.data.data || [];
            const ourImage2 = images2.find(img => img.id === this.createdImageId);

            if (!ourImage2) {
                console.log('❌ Image not found in feed');
                return false;
            }

            if (ourImage2.isPublic) {
                console.log('❌ Image still public in feed:', { isPublic: ourImage2.isPublic });
                return false;
            }
            console.log('✅ Image confirmed private in feed');

            // Step 5: Set back to public and test persistence
            console.log('   Step 5: Setting back to public and testing persistence...');
            const setPublicAgainResponse = await this.makeRequest('PUT', `/api/images/${this.createdImageId}/public-status`, { isPublic: true });

            if (setPublicAgainResponse.status !== 200) {
                console.log('❌ Failed to set image public again:', setPublicAgainResponse.data);
                return false;
            }

            // Step 6: Multiple feed checks to test persistence
            console.log('   Step 6: Testing persistence across multiple feed requests...');

            for (let i = 1; i <= 5; i++) {
                const feedResponse = await this.makeRequest('GET', '/api/feed');
                const images = feedResponse.data.data?.items || feedResponse.data.data || [];
                const ourImage = images.find(img => img.id === this.createdImageId);

                if (!ourImage || !ourImage.isPublic) {
                    console.log(`❌ Image not public in feed check ${i}:`, {
                        found: !!ourImage,
                        isPublic: ourImage?.isPublic
                    });
                    return false;
                }

                console.log(`✅ Feed check ${i}: Image remains public`);

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            console.log('✅ All persistence tests passed successfully');
            return true;

        } catch (error) {
            console.log('❌ Error during persistence test:', error.response?.data || error.message);
            return false;
        }
    }

    async runTest() {
        console.log('🚀 Starting Public Value Persistence Test');
        console.log('='.repeat(50));

        const steps = [
            { name: 'Login', method: () => this.login() },
            { name: 'Find Existing Image', method: () => this.findExistingImage() },
            { name: 'Test Public Persistence', method: () => this.testPublicPersistence() }
        ];

        let allPassed = true;
        for (const step of steps) {
            console.log(`\n📋 ${step.name}...`);
            const success = await step.method();
            if (!success) {
                allPassed = false;
                console.log(`\n❌ Test failed at step: ${step.name}`);
                break;
            }
        }

        console.log('\n' + '='.repeat(50));
        if (allPassed) {
            console.log('🎉 ALL PERSISTENCE TESTS PASSED!');
            console.log('✅ Public/private status persists correctly across operations');
        } else {
            console.log('❌ PERSISTENCE TESTS FAILED!');
            console.log('🔍 Check the issues above for details');
        }

        return allPassed;
    }
}

// Run the test
async function main() {
    const test = new PublicPersistenceTest();
    await test.runTest();
}

main().catch(console.error);
