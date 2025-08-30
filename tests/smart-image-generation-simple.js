import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const TEST_CONFIG = {
    timeout: 30000,
    testPrompt: 'a beautiful sunset over mountains, digital art',
    testProviders: ['flux'],
    testGuidance: 10,
    testUserId: 'test-user-123',
    baseUrl: 'http://localhost:3200'
};

// Test utilities
class SmartImageTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            warning: '⚠️',
            test: '🧪'
        }[type] || 'ℹ️';

        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async runTest(testName, testFunction) {
        this.results.total++;
        this.log(`Running test: ${testName}`, 'test');

        try {
            const startTime = Date.now();
            const result = await testFunction();
            const duration = Date.now() - startTime;

            this.results.passed++;
            this.log(`✅ ${testName} passed (${duration}ms)`, 'success');

            this.results.details.push({
                name: testName,
                status: 'PASSED',
                duration,
                result
            });

            return result;
        } catch (error) {
            this.results.failed++;
            this.log(`❌ ${testName} failed: ${error.message}`, 'error');

            this.results.details.push({
                name: testName,
                status: 'FAILED',
                error: error.message,
                stack: error.stack
            });

            throw error;
        }
    }

    printSummary() {
        const totalDuration = Date.now() - this.startTime;
        const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);

        console.log('\n' + '='.repeat(60));
        console.log('🧪 SMART IMAGE GENERATION TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`📊 Total Tests: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`⏱️  Total Duration: ${totalDuration}ms`);
        console.log('='.repeat(60));

        if (this.results.failed > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.results.details
                .filter(test => test.status === 'FAILED')
                .forEach(test => {
                    console.log(`  • ${test.name}: ${test.error}`);
                });
        }

        console.log('\n📋 DETAILED RESULTS:');
        this.results.details.forEach(test => {
            const status = test.status === 'PASSED' ? '✅' : '❌';
            const duration = test.duration ? ` (${test.duration}ms)` : '';
            console.log(`  ${status} ${test.name}${duration}`);
        });
    }
}

// Individual segment tests
class ImageGenerationSegments {
    constructor(testSuite) {
        this.testSuite = testSuite;
    }

    // Test 1: Server Health Check
    async testServerHealth() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/health')
            .timeout(TEST_CONFIG.timeout);

        if (response.status !== 200) {
            throw new Error(`Server health check failed with status ${response.status}`);
        }

        return response.body.data;
    }

    // Test 2: Database Connection
    async testDatabaseConnection() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/health')
            .timeout(TEST_CONFIG.timeout);

        if (!response.body.data.checks.database.healthy) {
            throw new Error('Database health check failed');
        }

        return response.body.data.checks.database;
    }

    // Test 3: File System Manager
    async testFileSystemManager() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/health')
            .timeout(TEST_CONFIG.timeout);

        if (!response.body.data.checks.fileSystem.healthy) {
            throw new Error('File system health check failed');
        }

        return response.body.data.checks.fileSystem;
    }

    // Test 4: Circuit Breaker Status
    async testCircuitBreakerStatus() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/health/image-service')
            .timeout(TEST_CONFIG.timeout);

        const circuitBreakers = response.body.data.circuitBreakers;
        const openBreakers = Object.values(circuitBreakers).filter(cb => cb.state === 'OPEN');

        if (openBreakers.length > 0) {
            throw new Error(`Circuit breakers are open: ${openBreakers.map(cb => cb.service).join(', ')}`);
        }

        return circuitBreakers;
    }

    // Test 5: Enhanced Image Service Health
    async testEnhancedImageService() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/health/image-service')
            .timeout(TEST_CONFIG.timeout);

        const serviceData = response.body.data;

        if (serviceData.status !== 'healthy') {
            throw new Error(`Service status is ${serviceData.status}`);
        }

        return serviceData;
    }

    // Test 6: File System Operations
    async testFileSystemOperations() {
        const uploadDir = path.join(__dirname, '../public/uploads');
        if (!fs.existsSync(uploadDir)) {
            throw new Error('Upload directory does not exist');
        }

        // Test if we can write a test file
        const testFilename = `test-${Date.now()}.jpg`;
        const testPath = path.join(uploadDir, testFilename);
        const testBuffer = Buffer.from('fake image data');

        fs.writeFileSync(testPath, testBuffer);

        // Verify file was created
        if (!fs.existsSync(testPath)) {
            throw new Error('Failed to create test file');
        }

        // Clean up
        fs.unlinkSync(testPath);

        return {
            uploadDir: uploadDir,
            writable: true,
            testFileCreated: true
        };
    }

    // Test 7: Image Repository Access
    async testImageRepository() {
        const response = await request(TEST_CONFIG.baseUrl)
            .get('/api/images')
            .timeout(TEST_CONFIG.timeout);

        return {
            canAccess: true,
            imageCount: response.body.data?.length || 0,
            statusCode: response.status
        };
    }

    // Test 8: Rate Limiting
    async testRateLimiting() {
        const requests = [];

        // Make multiple rapid requests
        for (let i = 0; i < 3; i++) {
            requests.push(
                request(TEST_CONFIG.baseUrl)
                    .post('/api/image/generate')
                    .send({
                        prompt: `test prompt ${i}`,
                        providers: ['flux'],
                        guidance: 10
                    })
                    .timeout(TEST_CONFIG.timeout)
            );
        }

        const responses = await Promise.all(requests);

        // Check if any were rate limited (429 status)
        const rateLimited = responses.filter(res => res.status === 429);

        if (rateLimited.length > 0) {
            return {
                rateLimited: true,
                limitedCount: rateLimited.length,
                totalRequests: responses.length
            };
        }

        return {
            rateLimited: false,
            totalRequests: responses.length
        };
    }
}

// Full process tests
class FullProcessTests {
    constructor(testSuite) {
        this.testSuite = testSuite;
    }

    // Test 9: Complete Image Generation Flow
    async testCompleteImageGeneration() {
        const startTime = Date.now();

        const response = await request(TEST_CONFIG.baseUrl)
            .post('/api/image/generate')
            .send({
                prompt: TEST_CONFIG.testPrompt,
                providers: TEST_CONFIG.testProviders,
                guidance: TEST_CONFIG.testGuidance,
                multiplier: false,
                mixup: false,
                mashup: false
            })
            .timeout(TEST_CONFIG.timeout);

        const duration = Date.now() - startTime;

        // Validate response structure
        if (!response.body.success) {
            throw new Error('Response indicates failure');
        }

        const data = response.body.data;
        if (!data.id || !data.prompt || !data.imageUrl) {
            throw new Error('Missing required fields in response');
        }

        // Check if image file actually exists
        const imagePath = path.join(__dirname, '../public', data.imageUrl);
        if (!fs.existsSync(imagePath)) {
            throw new Error('Generated image file does not exist');
        }

        return {
            imageId: data.id,
            prompt: data.prompt,
            imageUrl: data.imageUrl,
            provider: data.provider,
            duration,
            fileExists: true
        };
    }

    // Test 10: Error Handling - Invalid Provider
    async testErrorHandlingInvalidProvider() {
        const response = await request(TEST_CONFIG.baseUrl)
            .post('/api/image/generate')
            .send({
                prompt: TEST_CONFIG.testPrompt,
                providers: ['invalid-provider'],
                guidance: 10
            })
            .timeout(TEST_CONFIG.timeout);

        // Should return 400 for invalid provider
        if (response.status !== 400) {
            throw new Error(`Expected 400 status, got ${response.status}`);
        }

        return {
            errorHandled: true,
            statusCode: response.status,
            errorMessage: response.body.error
        };
    }

    // Test 11: Error Handling - Empty Prompt
    async testErrorHandlingEmptyPrompt() {
        const response = await request(TEST_CONFIG.baseUrl)
            .post('/api/image/generate')
            .send({
                prompt: '',
                providers: ['flux'],
                guidance: 10
            })
            .timeout(TEST_CONFIG.timeout);

        // Should return 400 for empty prompt
        if (response.status !== 400) {
            throw new Error(`Expected 400 status, got ${response.status}`);
        }

        return {
            errorHandled: true,
            statusCode: response.status,
            errorMessage: response.body.error
        };
    }

    // Test 12: Performance Test - Single Generation
    async testPerformanceSingleGeneration() {
        const startTime = Date.now();

        const response = await request(TEST_CONFIG.baseUrl)
            .post('/api/image/generate')
            .send({
                prompt: `performance test: ${TEST_CONFIG.testPrompt}`,
                providers: ['flux'],
                guidance: 10
            })
            .timeout(TEST_CONFIG.timeout);

        const duration = Date.now() - startTime;

        if (response.status !== 200) {
            throw new Error(`Generation failed with status ${response.status}`);
        }

        return {
            duration,
            statusCode: response.status,
            success: response.body.success
        };
    }

    // Test 13: Prompt Processing (if AI service available)
    async testPromptProcessing() {
        const testPrompt = 'test ${animals} in ${colors}';

        const response = await request(TEST_CONFIG.baseUrl)
            .post('/api/image/generate')
            .send({
                prompt: testPrompt,
                providers: ['flux'],
                guidance: 10,
                multiplier: false,
                mixup: false,
                mashup: false
            })
            .timeout(TEST_CONFIG.timeout);

        if (response.status !== 200) {
            throw new Error(`Prompt processing failed with status ${response.status}`);
        }

        // Check if prompt was processed (should not contain ${} variables)
        const processedPrompt = response.body.data.prompt;
        if (processedPrompt.includes('${')) {
            throw new Error('Prompt variables were not processed');
        }

        return {
            original: testPrompt,
            processed: processedPrompt,
            promptId: response.body.data.promptId
        };
    }
}

// Main test runner
async function runSmartImageTests() {
    const testSuite = new SmartImageTestSuite();
    const segments = new ImageGenerationSegments(testSuite);
    const fullProcess = new FullProcessTests(testSuite);

    console.log('🚀 Starting Smart Image Generation Test Suite');
    console.log(`🌐 Testing against: ${TEST_CONFIG.baseUrl}`);
    console.log('='.repeat(60));

    try {
        // Individual segment tests
        await testSuite.runTest('Server Health Check', () => segments.testServerHealth());
        await testSuite.runTest('Database Connection', () => segments.testDatabaseConnection());
        await testSuite.runTest('File System Manager', () => segments.testFileSystemManager());
        await testSuite.runTest('Circuit Breaker Status', () => segments.testCircuitBreakerStatus());
        await testSuite.runTest('Enhanced Image Service Health', () => segments.testEnhancedImageService());
        await testSuite.runTest('File System Operations', () => segments.testFileSystemOperations());
        await testSuite.runTest('Image Repository Access', () => segments.testImageRepository());
        await testSuite.runTest('Rate Limiting', () => segments.testRateLimiting());

        // Full process tests
        await testSuite.runTest('Complete Image Generation Flow', () => fullProcess.testCompleteImageGeneration());
        await testSuite.runTest('Error Handling - Invalid Provider', () => fullProcess.testErrorHandlingInvalidProvider());
        await testSuite.runTest('Error Handling - Empty Prompt', () => fullProcess.testErrorHandlingEmptyPrompt());
        await testSuite.runTest('Performance - Single Generation', () => fullProcess.testPerformanceSingleGeneration());

        // Prompt processing test (may fail if no AI service configured)
        try {
            await testSuite.runTest('Prompt Processing', () => fullProcess.testPromptProcessing());
        } catch (error) {
            testSuite.log(`⚠️ Prompt processing test skipped: ${error.message}`, 'warning');
        }

    } catch (error) {
        testSuite.log(`❌ Test suite failed: ${error.message}`, 'error');
    }

    testSuite.printSummary();

    // Exit with appropriate code
    if (testSuite.results.failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Run tests if this file is executed directly
console.log('🔧 Smart test file loaded');
if (process.argv[1] && process.argv[1].endsWith('smart-image-generation-simple.js')) {
    console.log('🚀 Starting smart tests...');
    runSmartImageTests();
}

export { SmartImageTestSuite, ImageGenerationSegments, FullProcessTests, runSmartImageTests };
