/**
 * Cloudflare R2 + Database Validation Test
 *
 * This test validates:
 * 1. Cloudflare R2 configuration and connectivity
 * 2. Database connectivity
 * 3. Image upload to R2
 * 4. Database row creation with valid URL
 * 5. Cleanup
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
dotenv.config();

// Import services
import { imageStorageService } from '../src/services/ImageStorageService.js';
import { cloudflareR2Service } from '../src/services/CloudflareR2Service.js';
import { cloudflareR2Config } from '../src/services/CloudflareR2Config.js';
import DatabaseService from '../src/services/feed/DatabaseService.js';

// Initialize Prisma client
const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
    provider: 'abyssorange',
    prompt: 'Test image for Cloudflare R2 validation',
    guidance: 8,
    userId: `test-cloudflare-${Date.now()}`
};

console.log('🚀 Starting Cloudflare R2 + Database Validation Test');
console.log('='.repeat(60));

async function runTest() {
    let imageUrl = null;
    let imageId = null;

    try {
        // Step 1: Validate environment
        console.log('\n1️⃣ Validating environment...');
        const requiredVars = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE_URL', 'R2_S3_ENDPOINT', 'DATABASE_URL'];
        const missing = requiredVars.filter(v => !process.env[v]);

        if (missing.length > 0) {
            throw new Error(`Missing environment variables: ${missing.join(', ')}`);
        }

        console.log('✅ Environment validation passed');
        console.log(`   R2 Bucket: ${process.env.R2_BUCKET}`);
        console.log(`   R2 Public URL: ${process.env.R2_PUBLIC_BASE_URL}`);

        // Step 2: Test Cloudflare R2 configuration
        console.log('\n2️⃣ Testing Cloudflare R2 configuration...');

        if (!cloudflareR2Config.isConfigured()) {
            throw new Error('Cloudflare R2 configuration is invalid');
        }

        if (!cloudflareR2Service.isInitialized()) {
            throw new Error('CloudflareR2Service is not initialized');
        }

        const health = await cloudflareR2Service.getHealth();

        if (health.status !== 'healthy') {
            throw new Error(`R2 health check failed: ${health.error}`);
        }

        console.log('✅ Cloudflare R2 configuration validated');
        console.log(`   Status: ${health.status}`);
        console.log(`   Bucket: ${health.bucket}`);

        // Step 3: Test database connectivity
        console.log('\n3️⃣ Testing database connectivity...');

        await prisma.$connect();
        const imageCount = await prisma.image.count();

        console.log('✅ Database connectivity validated');
        console.log('   Connected: true');
        console.log(`   Current images: ${imageCount}`);

        // Step 4: Create test image buffer
        console.log('\n4️⃣ Creating test image buffer...');

        // Create a simple test image (1x1 pixel PNG)
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        const filename = imageStorageService.generateFilename(TEST_CONFIG.provider, 'png');

        console.log('✅ Test image buffer created');
        console.log(`   Filename: ${filename}`);
        console.log(`   Buffer size: ${testImageBuffer.length} bytes`);

        // Step 5: Upload to Cloudflare R2
        console.log('\n5️⃣ Uploading to Cloudflare R2...');

        const originalStorageType = imageStorageService.getStorageType();

        imageStorageService.setStorageType('cdn');

        const uploadedImageUrl = await imageStorageService.saveImage(testImageBuffer, filename, {
            contentType: 'image/png',
            metadata: {
                test: 'cloudflare-validation',
                provider: TEST_CONFIG.provider,
                userId: TEST_CONFIG.userId
            }
        });

        imageUrl = uploadedImageUrl;

        // Verify upload
        const exists = await imageStorageService.imageExists(imageUrl);

        if (!exists) {
            throw new Error('Image not found in R2 after upload');
        }

        const imageInfo = await imageStorageService.getImageInfo(imageUrl);

        imageStorageService.setStorageType(originalStorageType);

        console.log('✅ Image uploaded to Cloudflare R2');
        console.log(`   URL: ${imageUrl}`);
        console.log(`   Size: ${imageInfo.size} bytes`);
        console.log(`   Content Type: ${imageInfo.contentType}`);

        // Step 6: Save to database
        console.log('\n6️⃣ Saving to database...');

        const imageData = {
            prompt: TEST_CONFIG.prompt,
            original: TEST_CONFIG.prompt,
            provider: TEST_CONFIG.provider,
            imageUrl,
            userId: TEST_CONFIG.userId,
            guidance: TEST_CONFIG.guidance,
            model: 'abyss_orange_mix_2'
        };

        const savedImage = await DatabaseService.saveImageToDatabase(imageData);

        if (!savedImage._id) {
            throw new Error('Database save failed - no ID returned');
        }

        imageId = savedImage._id;

        console.log('✅ Image metadata saved to database');
        console.log(`   Image ID: ${imageId}`);
        console.log(`   Image URL: ${imageData.imageUrl}`);

        // Step 7: Verify database row
        console.log('\n7️⃣ Verifying database row...');

        const dbImage = await prisma.image.findUnique({
            where: { id: imageId }
        });

        if (!dbImage) {
            throw new Error('Image not found in database');
        }

        // Validate fields
        const validations = {
            id: dbImage.id === imageId,
            prompt: dbImage.prompt === TEST_CONFIG.prompt,
            provider: dbImage.provider === TEST_CONFIG.provider,
            imageUrl: dbImage.imageUrl === imageUrl,
            userId: dbImage.userId === TEST_CONFIG.userId,
            guidance: dbImage.guidance === TEST_CONFIG.guidance,
            model: dbImage.model === 'abyss_orange_mix_2',
            urlValid: dbImage.imageUrl.startsWith('http') && dbImage.imageUrl.includes('r2')
        };

        const failedValidations = Object.entries(validations)
            .filter(([_key, valid]) => !valid)
            .map(([key]) => key);

        if (failedValidations.length > 0) {
            throw new Error(`Database validation failed: ${failedValidations.join(', ')}`);
        }

        console.log('✅ Database row verification passed');
        console.log(`   All validations: ${Object.values(validations).every(v => v)}`);
        console.log(`   URL valid: ${validations.urlValid}`);

        // Test completed successfully
        console.log('\n🎉 CLOUDFLARE R2 + DATABASE VALIDATION: SUCCESS!');
        console.log('='.repeat(60));
        console.log('✅ Cloudflare R2: Working');
        console.log('✅ Database: Working');
        console.log('✅ Image Upload: Success');
        console.log('✅ Database Save: Success');
        console.log('✅ URL Validation: Passed');
        console.log(`📊 Image ID: ${imageId}`);
        console.log(`🔗 Image URL: ${imageUrl}`);
        console.log('='.repeat(60));

        return { success: true, imageId, imageUrl };

    } catch (error) {
        console.log('\n❌ CLOUDFLARE R2 + DATABASE VALIDATION: FAILED!');
        console.log('='.repeat(60));
        console.log(`Error: ${error.message}`);
        console.log('='.repeat(60));

        return { success: false, error: error.message };
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up test data...');

        try {
            if (imageUrl) {
                const originalStorageType = imageStorageService.getStorageType();

                imageStorageService.setStorageType('cdn');
                const deleted = await imageStorageService.deleteImage(imageUrl);

                console.log(`   Image deleted from R2: ${deleted ? '✅' : '❌'}`);
                imageStorageService.setStorageType(originalStorageType);
            }

            if (imageId) {
                await prisma.image.delete({ where: { id: imageId } });
                console.log('   Database row deleted: ✅');
            }

            console.log('✅ Cleanup completed');
        } catch (cleanupError) {
            console.log(`❌ Cleanup failed: ${cleanupError.message}`);
        }

        // Close database connection
        await prisma.$disconnect();
    }
}

// Run the test
runTest()
    .then(result => {
        if (result.success) {
            console.log('\n✅ Test Result: SUCCESS');
            process.exit(0);
        } else {
            console.log('\n❌ Test Result: FAILED');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('\n💥 Test Result: CRASHED');
        console.error('Error:', error.message);
        process.exit(1);
    });
