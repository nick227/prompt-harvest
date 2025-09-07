import jwt from 'jsonwebtoken';

// Create a test JWT token
const testUserId = 'test-user-123';
const testToken = jwt.sign(
    { userId: testUserId },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '1h' }
);

console.log('🔑 Test JWT Token:', testToken);

// Test the API with authentication
const testApi = async () => {
    try {
        const response = await fetch('http://localhost:3200/api/image/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            },
            body: JSON.stringify({
                prompt: 'test image with authentication',
                providers: ['flux'],
                guidance: 10
            })
        });

        const result = await response.json();
        console.log('✅ API Response:', JSON.stringify(result, null, 2));

        if (result.success && result.data) {
            console.log('🎉 Image generation successful!');
            console.log('Image ID:', result.data.id);
            console.log('Image URL:', result.data.imageUrl);
        } else {
            console.log('❌ Image generation failed:', result.error || result.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

testApi();
