require('dotenv').config();
const { cloudflareR2Service } = require('./src/services/CloudflareR2Service.js');
const { imageStorageService } = require('./src/services/ImageStorageService.js');
const { PrismaClient } = require('@prisma/client');

async function test() {

    try {
    // Test 1: R2 Health
        const health = await cloudflareR2Service.getHealth();


        // Test 2: CDN Configuration
        const cdnConfigured = imageStorageService.isCDNConfigured();


        // Test 3: Database Connection
        const prisma = new PrismaClient();

        await prisma.$connect();
        const imageCount = await prisma.image.count();


        // Test 4: Create test image
        const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        const filename = `test-${Date.now()}.png`;

        // Switch to CDN
        const originalType = imageStorageService.getStorageType();

        imageStorageService.setStorageType('cdn');

        const imageUrl = await imageStorageService.saveImage(testBuffer, filename, {
            contentType: 'image/png',
            metadata: { test: 'validation' }
        });


        // Test 5: Verify image exists
        const exists = await imageStorageService.imageExists(imageUrl);


        // Test 6: Save to database
        const DatabaseService = require('./src/services/generate/DatabaseService.js').default;

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


        // Test 7: Verify database row
        const dbImage = await prisma.image.findUnique({
            where: { id: savedImage._id }
        });


        // Cleanup
        await imageStorageService.deleteImage(imageUrl);
        await prisma.image.delete({ where: { id: savedImage._id } });
        imageStorageService.setStorageType(originalType);
        await prisma.$disconnect();



    } catch (error) {
        process.exit(1);
    }
}

test();
