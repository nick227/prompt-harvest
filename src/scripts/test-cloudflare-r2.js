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

    try {
        // Test 1: Configuration Validation
        const isConfigured = cloudflareR2Config.isConfigured();


        if (!isConfigured) {

            return;
        }

        // Test 2: Service Initialization Check
        const isInitialized = cloudflareR2Service.isInitialized();


        if (!isInitialized) {

            return;
        }

        // Test 3: Service Health Check
        const health = await cloudflareR2Service.getHealth();


        if (health.status !== 'healthy') {

            return;
        }

        // Test 4: Image Storage Service CDN Check
        const cdnConfigured = imageStorageService.isCDNConfigured();


        // Test 5: Create Test Image Buffer
        const testImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        const testFilename = `test_${Date.now()}.png`;


        // Test 6: Save Image to R2
        const publicUrl = await cloudflareR2Service.saveImage(testImageBuffer, testFilename, {
            contentType: 'image/png',
            metadata: {
                test: 'true',
                uploadedBy: 'test-script'
            }
        });


        // Test 7: Check Image Exists
        const exists = await cloudflareR2Service.imageExists(testFilename);


        // Test 8: Get Image Info
        const imageInfo = await cloudflareR2Service.getImageInfo(testFilename);


        // Test 9: Test ImageStorageService with CDN
        const originalStorageType = imageStorageService.getStorageType();

        // Switch to CDN
        imageStorageService.setStorageType('cdn');

        // Test save through ImageStorageService
        const testFilename2 = `test_service_${Date.now()}.png`;
        const serviceUrl = await imageStorageService.saveImage(testImageBuffer, testFilename2);


        // Test delete through ImageStorageService
        const deleteSuccess = await imageStorageService.deleteImage(serviceUrl);


        // Switch back to original storage type
        imageStorageService.setStorageType(originalStorageType);

        // Test 10: Cleanup - Delete Test Images
        const deleteSuccess1 = await cloudflareR2Service.deleteImage(testFilename);


        // Test 11: Final Health Check
        const finalHealth = await cloudflareR2Service.getHealth();



    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
testCloudflareR2().catch(console.error);
