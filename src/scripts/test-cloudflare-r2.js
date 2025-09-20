/**
 * Test Script for Cloudflare R2 Implementation
 * 
 * This script tests the Cloudflare R2 integration to ensure
 * everything is working correctly before switching to CDN storage.
 */

import { imageStorageService } from '../src/services/ImageStorageService.js';
import { cloudflareR2Service } from '../src/services/CloudflareR2Service.js';
import { cloudflareR2Config } from '../src/services/CloudflareR2Config.js';

async function testCloudflareR2() {
    console.log('🧪 Testing Cloudflare R2 Implementation...\n');

    try {
        // Test 1: Configuration Validation
        console.log('1️⃣ Testing configuration validation...');
        const isConfigured = cloudflareR2Config.isConfigured();
        console.log(`   Configuration valid: ${isConfigured ? '✅' : '❌'}`);
        
        if (!isConfigured) {
            console.log('❌ Configuration test failed. Please check your environment variables.');
            return;
        }

        // Test 2: Service Initialization Check
        console.log('\n2️⃣ Testing service initialization...');
        const isInitialized = cloudflareR2Service.isInitialized();
        console.log(`   Service initialized: ${isInitialized ? '✅' : '❌'}`);

        if (!isInitialized) {
            console.log('❌ Service not initialized. Check your configuration.');
            return;
        }

        // Test 3: Service Health Check
        console.log('\n3️⃣ Testing service health...');
        const health = await cloudflareR2Service.getHealth();
        console.log(`   Health status: ${health.status === 'healthy' ? '✅' : '❌'}`);
        console.log(`   Service: ${health.service}`);
        console.log(`   Bucket: ${health.bucket}`);

        if (health.status !== 'healthy') {
            console.log('❌ Health check failed:', health.error);
            return;
        }

        // Test 4: Image Storage Service CDN Check
        console.log('\n4️⃣ Testing ImageStorageService CDN configuration...');
        const cdnConfigured = imageStorageService.isCDNConfigured();
        console.log(`   CDN configured: ${cdnConfigured ? '✅' : '❌'}`);

        // Test 5: Create Test Image Buffer
        console.log('\n5️⃣ Creating test image buffer...');
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        const testFilename = `test_${Date.now()}.png`;
        console.log(`   Test filename: ${testFilename}`);

        // Test 6: Save Image to R2
        console.log('\n6️⃣ Testing image upload to Cloudflare R2...');
        const publicUrl = await cloudflareR2Service.saveImage(testImageBuffer, testFilename, {
            contentType: 'image/png',
            metadata: {
                test: 'true',
                uploadedBy: 'test-script'
            }
        });
        console.log(`   ✅ Image uploaded successfully!`);
        console.log(`   Public URL: ${publicUrl}`);

        // Test 7: Check Image Exists
        console.log('\n7️⃣ Testing image existence check...');
        const exists = await cloudflareR2Service.imageExists(testFilename);
        console.log(`   Image exists: ${exists ? '✅' : '❌'}`);

        // Test 8: Get Image Info
        console.log('\n8️⃣ Testing image info retrieval...');
        const imageInfo = await cloudflareR2Service.getImageInfo(testFilename);
        console.log(`   ✅ Image info retrieved:`);
        console.log(`   - Size: ${imageInfo.size} bytes`);
        console.log(`   - Content Type: ${imageInfo.contentType}`);
        console.log(`   - Last Modified: ${imageInfo.lastModified}`);

        // Test 9: Test ImageStorageService with CDN
        console.log('\n9️⃣ Testing ImageStorageService with CDN...');
        const originalStorageType = imageStorageService.getStorageType();
        
        // Switch to CDN
        imageStorageService.setStorageType('cdn');
        console.log(`   Switched to CDN storage`);

        // Test save through ImageStorageService
        const testFilename2 = `test_service_${Date.now()}.png`;
        const serviceUrl = await imageStorageService.saveImage(testImageBuffer, testFilename2);
        console.log(`   ✅ Image saved via ImageStorageService: ${serviceUrl}`);

        // Test delete through ImageStorageService
        const deleteSuccess = await imageStorageService.deleteImage(serviceUrl);
        console.log(`   Image deleted via ImageStorageService: ${deleteSuccess ? '✅' : '❌'}`);

        // Switch back to original storage type
        imageStorageService.setStorageType(originalStorageType);
        console.log(`   Switched back to ${originalStorageType} storage`);

        // Test 10: Cleanup - Delete Test Images
        console.log('\n🔟 Cleaning up test images...');
        const deleteSuccess1 = await cloudflareR2Service.deleteImage(testFilename);
        console.log(`   Test image 1 deleted: ${deleteSuccess1 ? '✅' : '❌'}`);

        // Test 11: Final Health Check
        console.log('\n1️⃣1️⃣ Final health check...');
        const finalHealth = await cloudflareR2Service.getHealth();
        console.log(`   Final health status: ${finalHealth.status === 'healthy' ? '✅' : '❌'}`);

        console.log('\n🎉 All tests passed! Cloudflare R2 is ready to use.');
        console.log('\n📋 To switch to CDN storage, update your ImageStorageService:');
        console.log('   imageStorageService.setStorageType("cdn");');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCloudflareR2().catch(console.error);
