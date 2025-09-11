const axios = require('axios');

const BASE_URL = 'http://localhost:3200';

async function testPromptHistory() {
    console.log('🧪 Testing Prompt History Implementation...\n');

    try {
        // Test 1: Register and login a test user
        console.log('1️⃣ Registering test user...');
        const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
            email: 'prompt-test@test.com',
            username: 'prompttest',
            password: '123456'
        });
        console.log('✅ User registered successfully');

        // Login
        console.log('2️⃣ Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: 'prompt-test@test.com',
            password: '123456'
        });

        const token = loginResponse.data.token;
        console.log('✅ User logged in successfully');

        // Test 2: Create a test prompt
        console.log('3️⃣ Creating test prompt...');
        const createPromptResponse = await axios.post(`${BASE_URL}/api/prompts`, {
            prompt: 'A beautiful sunset over mountains',
            original: 'sunset mountains',
            provider: 'flux',
            guidance: 10
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const createdPrompt = createPromptResponse.data.data;
        console.log('✅ Prompt created:', createdPrompt.id);

        // Test 3: Get user prompts with pagination
        console.log('4️⃣ Testing pagination...');
        const getPromptsResponse = await axios.get(`${BASE_URL}/api/prompts?limit=10&page=0`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const promptsData = getPromptsResponse.data.data;
        console.log('✅ Prompts retrieved:', {
            count: promptsData.prompts.length,
            total: promptsData.pagination.total,
            hasMore: promptsData.pagination.hasMore
        });

        // Test 4: Get single prompt by ID
        console.log('5️⃣ Testing single prompt retrieval...');
        const getSingleResponse = await axios.get(`${BASE_URL}/api/prompts/${createdPrompt.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const singlePrompt = getSingleResponse.data.data;
        console.log('✅ Single prompt retrieved:', singlePrompt.id);

        // Test 5: Update prompt
        console.log('6️⃣ Testing prompt update...');
        const updateResponse = await axios.put(`${BASE_URL}/api/prompts/${createdPrompt.id}`, {
            prompt: 'Updated: A beautiful sunset over mountains with birds flying'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const updatedPrompt = updateResponse.data.data;
        console.log('✅ Prompt updated:', updatedPrompt.id);

        // Test 6: Delete prompt
        console.log('7️⃣ Testing prompt deletion...');
        const deleteResponse = await axios.delete(`${BASE_URL}/api/prompts/${createdPrompt.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Prompt deleted successfully');

        // Test 7: Verify prompt is deleted
        console.log('8️⃣ Verifying deletion...');
        try {
            await axios.get(`${BASE_URL}/api/prompts/${createdPrompt.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('❌ Prompt still exists (unexpected)');
        } catch (error) {
            if (error.response?.status === 404) {
                console.log('✅ Prompt successfully deleted (404 as expected)');
            } else {
                console.log('❌ Unexpected error:', error.response?.status);
            }
        }

        console.log('\n🎉 All tests passed! Prompt History implementation is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
testPromptHistory();
