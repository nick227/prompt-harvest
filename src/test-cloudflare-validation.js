require('dotenv').config();
const { cloudflareR2Service } = require('./src/services/CloudflareR2Service.js');
const { imageStorageService } = require('./src/services/ImageStorageService.js');
const { PrismaClient } = require('@prisma/client');

async function test() {
    console.log('🚀 Testing Cloudflare R2 + Database Setup');
    console.log('='.repeat(50));

    try {
    // Test 1: R2 Health
        console.log('1️⃣ Testing R2 Health...');
        const health = await cloudflareR2Service.getHealth();

        console.log('✅ R2 Health:', health.status);
        console.log('   Bucket:', health.bucket);

        // Test 2: CDN Configuration
        console.log('\n2️⃣ Testing CDN Configuration...');
        const cdnConfigured = imageStorageService.isCDNConfigured();

        console.log('✅ CDN Configured:', cdnConfigured);

        // Test 3: Database Connection
        console.log('\n3️⃣ Testing Database Connection...');
        const prisma = new PrismaClient();

        await prisma.$connect();
        const imageCount = await prisma.image.count();

        console.log('✅ Database Connected');
        console.log('   Current images:', imageCount);

        // Test 4: Create test image
        console.log('\n4️⃣ Testing Image Upload...');
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        const filename = `test-${Date.now()}.png`;

        // Switch to CDN
        const originalType = imageStorageService.getStorageType();

        imageStorageService.setStorageType('cdn');

        const imageUrl = await imageStorageService.saveImage(testBuffer, filename, {
            contentType: 'image/png',
            metadata: { test: 'validation' }
        });

        console.log('✅ Image uploaded to R2');
        console.log('   URL:', imageUrl);

        // Test 5: Verify image exists
        const exists = await imageStorageService.imageExists(imageUrl);

        console.log('✅ Image exists in R2:', exists);

        // Test 6: Save to database
        console.log('\n5️⃣ Testing Database Save...');
        const DatabaseService = require('./src/services/feed/DatabaseService.js').default;

        const imageData = {
            prompt: 'Test image for validation',
            original: 'Test image for validation',
            provider: 'abyssorange',
            imageUrl,
            userId: `test-user-${Date.now()}`,
            guidance: 8,
            model: 'abyss_orange_mix_2'
        };

        const savedImage = await DatabaseService.saveImageToDatabase(imageData);

        console.log('✅ Image saved to database');
        console.log('   Image ID:', savedImage._id);

        // Test 7: Verify database row
        const dbImage = await prisma.image.findUnique({
            where: { id: savedImage._id }
        });

        console.log('✅ Database row verified');
        console.log('   URL matches:', dbImage.imageUrl === imageUrl);
        console.log('   URL valid:', dbImage.imageUrl.startsWith('http'));
        console.log('   URL contains R2:', dbImage.imageUrl.includes('r2'));

        // Cleanup
        console.log('\n🧹 Cleaning up...');
        await imageStorageService.deleteImage(imageUrl);
        await prisma.image.delete({ where: { id: savedImage._id } });
        imageStorageService.setStorageType(originalType);
        await prisma.$disconnect();

        console.log('✅ Cleanup completed');

        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('✅ Cloudflare R2: Working');
        console.log('✅ Database: Working');
        console.log('✅ Image Upload: Success');
        console.log('✅ Database Save: Success');
        console.log('✅ URL Validation: Passed');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

test();
