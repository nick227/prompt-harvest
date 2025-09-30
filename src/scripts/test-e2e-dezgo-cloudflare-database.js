/**
 * End-to-End Test: Dezgo AI Image Generation + Cloudflare R2 + Database
 *
 * This test validates the complete flow:
 * 1. Generate image using Dezgo AI (abyssorange provider)
 * 2. Save image to Cloudflare R2
 * 3. Save image metadata to database
 * 4. Verify database row with valid URL
 * 5. Cleanup test data
 */

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Import services
import { imageStorageService } from '../src/services/ImageStorageService.js';
import { cloudflareR2Service } from '../src/services/CloudflareR2Service.js';
import { cloudflareR2Config } from '../src/services/CloudflareR2Config.js';
import ImageGenerator from '../src/services/generate/ImageGenerator.js';
import DatabaseService from '../src/services/generate/DatabaseService.js';

// Load environment variables from project root
dotenv.config();

// Initialize Prisma client
const prisma = new PrismaClient();

// Test configuration
const TEST_CONFIG = {
    provider: 'abyssorange',
    prompt: 'A beautiful sunset over a mountain landscape, digital art, vibrant colors',
    guidance: 8,
    userId: `test-user-e2e-${Date.now()}`,
    testTimeout: 120000 // 2 minutes
};

// Test results tracking
const testResults = {
    startTime: null,
    endTime: null,
    duration: null,
    steps: {},
    errors: [],
    cleanup: []
};

/**
 * Log test step with timestamp
 */
const logStep = (step, message, data = {}) => {
    const timestamp = new Date().toISOString();

    if (Object.keys(data).length > 0) {
    }
    testResults.steps[step] = { message, data, timestamp };
};

/**
 * Log test error
 */
const logError = (step, error, context = {}) => {
    const errorInfo = {
        step,
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString()
    };

    console.error(`\n❌ ERROR in ${step}:`, errorInfo);
    testResults.errors.push(errorInfo);
};

/**
 * Validate environment configuration
 */
const validateEnvironment = () => {
    logStep('ENV_VALIDATION', 'Validating environment configuration');

    const requiredEnvVars = [
        'DEZGO_API_KEY',
        'R2_ACCOUNT_ID',
        'R2_ACCESS_KEY_ID',
        'R2_SECRET_ACCESS_KEY',
        'R2_BUCKET',
        'R2_PUBLIC_BASE_URL',
        'R2_S3_ENDPOINT',
        'DATABASE_URL'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    logStep('ENV_VALIDATION', 'Environment validation passed', {
        dezgoConfigured: !!process.env.DEZGO_API_KEY,
        cloudflareConfigured: cloudflareR2Config.isConfigured(),
        databaseConfigured: !!process.env.DATABASE_URL,
        r2Bucket: process.env.R2_BUCKET,
        r2PublicUrl: process.env.R2_PUBLIC_BASE_URL
    });
};

/**
 * Test Cloudflare R2 configuration and connectivity
 */
const testCloudflareR2Setup = async () => {
    logStep('CLOUDFLARE_SETUP', 'Testing Cloudflare R2 configuration');

    // Check if service is initialized
    if (!cloudflareR2Service.isInitialized()) {
        throw new Error('CloudflareR2Service is not initialized');
    }

    // Test health check
    const health = await cloudflareR2Service.getHealth();

    if (health.status !== 'healthy') {
        throw new Error(`Cloudflare R2 health check failed: ${health.error}`);
    }

    // Test ImageStorageService CDN configuration
    const cdnConfigured = imageStorageService.isCDNConfigured();

    if (!cdnConfigured) {
        throw new Error('ImageStorageService CDN is not configured');
    }

    logStep('CLOUDFLARE_SETUP', 'Cloudflare R2 setup validated', {
        health: health.status,
        bucket: health.bucket,
        cdnConfigured
    });
};

/**
 * Test database connectivity
 */
const testDatabaseConnectivity = async () => {
    logStep('DATABASE_SETUP', 'Testing database connectivity');

    try {
        // Test basic database connection
        await prisma.$connect();

        // Test image table access
        const imageCount = await prisma.image.count();

        logStep('DATABASE_SETUP', 'Database connectivity validated', {
            connected: true,
            imageCount
        });
    } catch (error) {
        throw new Error(`Database connectivity test failed: ${error.message}`);
    }
};

/**
 * Generate image using Dezgo AI (abyssorange provider)
 */
const generateImageWithDezgo = async () => {
    logStep('IMAGE_GENERATION', 'Generating image with Dezgo AI (abyssorange provider)');

    try {
        const result = await ImageGenerator.generateProviderImage(
            TEST_CONFIG.provider,
            TEST_CONFIG.prompt,
            TEST_CONFIG.guidance,
            TEST_CONFIG.userId
        );

        if (result.error) {
            throw new Error(`Image generation failed: ${result.error}`);
        }

        if (!result || typeof result !== 'string') {
            throw new Error('Invalid image generation result - expected base64 string');
        }

        // Validate base64 data
        const buffer = Buffer.from(result, 'base64');

        if (buffer.length === 0) {
            throw new Error('Generated image buffer is empty');
        }

        logStep('IMAGE_GENERATION', 'Image generated successfully', {
            provider: TEST_CONFIG.provider,
            prompt: `${TEST_CONFIG.prompt.substring(0, 50)}...`,
            bufferSize: buffer.length,
            base64Length: result.length
        });

        return { result, buffer };
    } catch (error) {
        logError('IMAGE_GENERATION', error, { provider: TEST_CONFIG.provider });
        throw error;
    }
};

/**
 * Save image to Cloudflare R2
 */
const saveImageToCloudflare = async imageBuffer => {
    logStep('CLOUDFLARE_SAVE', 'Saving image to Cloudflare R2');

    try {
        // Generate unique filename
        const filename = imageStorageService.generateFilename(TEST_CONFIG.provider, 'jpg');

        // Switch to CDN storage
        const originalStorageType = imageStorageService.getStorageType();

        imageStorageService.setStorageType('cdn');

        // Save image to Cloudflare R2
        const imageUrl = await imageStorageService.saveImage(imageBuffer, filename, {
            contentType: 'image/jpeg',
            metadata: {
                test: 'e2e-test',
                provider: TEST_CONFIG.provider,
                userId: TEST_CONFIG.userId,
                generatedAt: new Date().toISOString()
            }
        });

        // Verify image exists in R2
        const exists = await imageStorageService.imageExists(imageUrl);

        if (!exists) {
            throw new Error('Image was not found in Cloudflare R2 after upload');
        }

        // Get image info
        const imageInfo = await imageStorageService.getImageInfo(imageUrl);

        // Switch back to original storage type
        imageStorageService.setStorageType(originalStorageType);

        logStep('CLOUDFLARE_SAVE', 'Image saved to Cloudflare R2 successfully', {
            filename,
            imageUrl,
            size: imageInfo.size,
            contentType: imageInfo.contentType,
            storageType: imageInfo.storageType
        });

        return { imageUrl, filename, imageInfo };
    } catch (error) {
        logError('CLOUDFLARE_SAVE', error);
        throw error;
    }
};

/**
 * Save image metadata to database
 */
const saveImageToDatabase = async (imageUrl, _imageInfo) => {
    logStep('DATABASE_SAVE', 'Saving image metadata to database');

    try {
        const imageData = {
            prompt: TEST_CONFIG.prompt,
            original: TEST_CONFIG.prompt,
            provider: TEST_CONFIG.provider,
            imageUrl,
            userId: TEST_CONFIG.userId,
            guidance: TEST_CONFIG.guidance,
            model: 'abyss_orange_mix_2' // abyssorange model
        };

        const savedImage = await DatabaseService.saveImageToDatabase(imageData);

        if (!savedImage._id) {
            throw new Error('Database save failed - no ID returned');
        }

        logStep('DATABASE_SAVE', 'Image metadata saved to database successfully', {
            imageId: savedImage._id,
            imageUrl: imageData.imageUrl,
            provider: imageData.provider,
            userId: imageData.userId
        });

        return savedImage;
    } catch (error) {
        logError('DATABASE_SAVE', error);
        throw error;
    }
};

/**
 * Verify database row with valid URL
 */
const verifyDatabaseRow = async savedImage => {
    logStep('DATABASE_VERIFY', 'Verifying database row with valid URL');

    try {
        // Fetch the image from database
        const dbImage = await prisma.image.findUnique({
            where: { id: savedImage._id },
            include: {
                user: true
            }
        });

        if (!dbImage) {
            throw new Error('Image not found in database');
        }

        // Validate all required fields
        const validations = {
            id: dbImage.id === savedImage._id,
            prompt: dbImage.prompt === TEST_CONFIG.prompt,
            provider: dbImage.provider === TEST_CONFIG.provider,
            imageUrl: dbImage.imageUrl && dbImage.imageUrl.includes('http'),
            userId: dbImage.userId === TEST_CONFIG.userId,
            guidance: dbImage.guidance === TEST_CONFIG.guidance,
            model: dbImage.model === 'abyss_orange_mix_2',
            createdAt: dbImage.createdAt instanceof Date,
            isPublic: dbImage.isPublic === false // Default value
        };

        const failedValidations = Object.entries(validations)
            .filter(([_key, valid]) => !valid)
            .map(([key]) => key);

        if (failedValidations.length > 0) {
            throw new Error(`Database validation failed for fields: ${failedValidations.join(', ')}`);
        }

        // Test URL accessibility (basic check)
        const urlValid = dbImage.imageUrl.startsWith('http') &&
                        (dbImage.imageUrl.includes('cloudflare') || dbImage.imageUrl.includes('r2'));

        if (!urlValid) {
            throw new Error(`Invalid image URL format: ${dbImage.imageUrl}`);
        }

        logStep('DATABASE_VERIFY', 'Database row verification passed', {
            imageId: dbImage.id,
            imageUrl: dbImage.imageUrl,
            validations,
            urlValid
        });

        return dbImage;
    } catch (error) {
        logError('DATABASE_VERIFY', error);
        throw error;
    }
};

/**
 * Cleanup test data
 */
const cleanupTestData = async (imageUrl, imageId) => {
    logStep('CLEANUP', 'Cleaning up test data');

    const cleanupResults = {
        imageDeleted: false,
        databaseRowDeleted: false,
        errors: []
    };

    try {
        // Delete image from Cloudflare R2
        if (imageUrl) {
            try {
                const originalStorageType = imageStorageService.getStorageType();

                imageStorageService.setStorageType('cdn');
                const deleted = await imageStorageService.deleteImage(imageUrl);

                imageStorageService.setStorageType(originalStorageType);
                cleanupResults.imageDeleted = deleted;
                logStep('CLEANUP', 'Image deleted from Cloudflare R2', { deleted });
            } catch (error) {
                cleanupResults.errors.push(`Image deletion failed: ${error.message}`);
                logError('CLEANUP_IMAGE', error);
            }
        }

        // Delete database row
        if (imageId) {
            try {
                await prisma.image.delete({
                    where: { id: imageId }
                });
                cleanupResults.databaseRowDeleted = true;
                logStep('CLEANUP', 'Database row deleted', { imageId });
            } catch (error) {
                cleanupResults.errors.push(`Database deletion failed: ${error.message}`);
                logError('CLEANUP_DATABASE', error);
            }
        }

        testResults.cleanup.push(cleanupResults);

        if (cleanupResults.errors.length > 0) {
            logStep('CLEANUP', 'Cleanup completed with errors', cleanupResults);
        } else {
            logStep('CLEANUP', 'Cleanup completed successfully', cleanupResults);
        }
    } catch (error) {
        logError('CLEANUP', error);
        cleanupResults.errors.push(`Cleanup failed: ${error.message}`);
    }
};

/**
 * Main E2E test function
 */
const runE2ETest = async () => {
    testResults.startTime = Date.now();


    let imageUrl = null;
    let imageId = null;
    let dbImage = null;

    try {
        // Step 1: Validate environment
        validateEnvironment();

        // Step 2: Test Cloudflare R2 setup
        await testCloudflareR2Setup();

        // Step 3: Test database connectivity
        await testDatabaseConnectivity();

        // Step 4: Generate image with Dezgo AI
        const { buffer } = await generateImageWithDezgo();

        // Step 5: Save image to Cloudflare R2
        const { imageUrl: savedImageUrl, imageInfo } = await saveImageToCloudflare(buffer);

        imageUrl = savedImageUrl;

        // Step 6: Save image metadata to database
        const savedImage = await saveImageToDatabase(imageUrl, imageInfo);

        imageId = savedImage._id;

        // Step 7: Verify database row
        dbImage = await verifyDatabaseRow(savedImage);

        // Test completed successfully
        testResults.endTime = Date.now();
        testResults.duration = testResults.endTime - testResults.startTime;


        return {
            success: true,
            imageId,
            imageUrl,
            dbImage,
            duration: testResults.duration
        };

    } catch (error) {
        testResults.endTime = Date.now();
        testResults.duration = testResults.endTime - testResults.startTime;


        return {
            success: false,
            error: error.message,
            duration: testResults.duration,
            steps: testResults.steps,
            errors: testResults.errors
        };
    } finally {
        // Always cleanup test data
        await cleanupTestData(imageUrl, imageId);

        // Close database connection
        await prisma.$disconnect();
    }
};

/**
 * Run the test with timeout
 */
const runTestWithTimeout = async () => new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        reject(new Error(`Test timed out after ${TEST_CONFIG.testTimeout}ms`));
    }, TEST_CONFIG.testTimeout);

    runE2ETest()
        .then(result => {
            clearTimeout(timeout);
            resolve(result);
        })
        .catch(error => {
            clearTimeout(timeout);
            reject(error);
        });
});

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTestWithTimeout()
        .then(result => {
            if (result.success) {
                process.exit(0);
            } else {
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('\n💥 E2E Test Result: CRASHED');
            console.error('Error:', error.message);
            process.exit(1);
        });
}

export { runE2ETest, TEST_CONFIG };
