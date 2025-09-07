import jwt from 'jsonwebtoken';
import databaseClient from './src/database/PrismaClient.js';

const prisma = databaseClient.getClient();

// Create a test user first
const createTestUser = async () => {
    try {
        // Try to find existing test user
        let user = await prisma.user.findFirst({
            where: { email: 'test@example.com' }
        });

        if (!user) {
            // Create new test user
            user = await prisma.user.create({
                data: {
                    email: 'test@example.com',
                    username: 'testuser',
                    password: 'hashedpassword123',
                    creditBalance: 100
                }
            });
            console.log('✅ Created test user:', user.id);
        } else {
            console.log('✅ Found existing test user:', user.id);
        }

        return user;
    } catch (error) {
        console.error('❌ Error creating/finding test user:', error);
        throw error;
    }
};

// Test the API with a real user
const testApiWithRealUser = async () => {
    try {
        // Create/get test user
        const user = await createTestUser();

        // Create JWT token for real user
        const testToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '1h' }
        );

        console.log('🔑 JWT Token for real user:', testToken);

        // Test the API
        const response = await fetch('http://localhost:3200/api/image/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            },
            body: JSON.stringify({
                prompt: 'test image with real user',
                providers: ['flux'],
                guidance: 10
            })
        });

        const result = await response.json();
        console.log('✅ API Response:', JSON.stringify(result, null, 2));

        if (result.success && result.data && result.data.id) {
            console.log('🎉 Image generation successful!');
            console.log('Image ID:', result.data.id);
            console.log('Image URL:', result.data.imageUrl);
            console.log('User ID:', result.data.userId);
        } else {
            console.log('❌ Image generation failed:', result.error || result.message);
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
};

testApiWithRealUser();
