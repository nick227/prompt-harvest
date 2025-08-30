import { test, expect } from '@playwright/test';
import { ApiHelper } from '../utils/api-helper.js';

test.describe('API Endpoints', () => {
    let apiHelper;

    test.beforeEach(async () => {
        apiHelper = new ApiHelper();
    });

    test.describe('Public Endpoints', () => {
        test('should get images successfully', async () => {
            const response = await apiHelper.getImages();

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should get feed successfully', async () => {
            const response = await apiHelper.getFeed();

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should get images count successfully', async () => {
            const response = await apiHelper.get('/images/count');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should get image tags successfully', async () => {
            const response = await apiHelper.getImageTags('test-image-123');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should get cache stats successfully', async () => {
            const response = await apiHelper.getCacheStats();

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should clear cache successfully', async () => {
            const response = await apiHelper.clearCache();

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });
    });

    test.describe('Image Generation', () => {
        test('should generate image with valid prompt', async () => {
            const response = await apiHelper.generateImage(
                'A beautiful sunset over mountains',
                ['test-provider'],
                10
            );

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should handle empty prompt', async () => {
            const response = await apiHelper.generateImage('', ['test-provider'], 10);

            expect(response.status).toBe(400);
        });

        test('should handle invalid provider', async () => {
            const response = await apiHelper.generateImage(
                'Test prompt',
                ['invalid-provider'],
                10
            );

            expect(response.status).toBe(400);
        });
    });

    test.describe('Image Management', () => {
        test('should update image rating', async () => {
            const response = await apiHelper.updateImageRating('test-image-123', 5);

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should handle invalid rating value', async () => {
            const response = await apiHelper.updateImageRating('test-image-123', 15);

            expect(response.status).toBe(400);
        });

        test('should handle non-existent image', async () => {
            const response = await apiHelper.updateImageRating('non-existent-id', 5);

            expect(response.status).toBe(404);
        });
    });

    test.describe('Like System', () => {
        test('should like an image', async () => {
            const response = await apiHelper.likeImage('test-image-123');

            expect(response.status).toBe(201);
            expect(response.data).toBeDefined();
        });

        test('should unlike an image', async () => {
            const response = await apiHelper.unlikeImage('test-image-123');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should check if image is liked', async () => {
            const response = await apiHelper.checkIfLiked('test-image-123');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });
    });

    test.describe('Tag System', () => {
        test('should add tag to image', async () => {
            const response = await apiHelper.addTag('test-image-123', 'landscape');

            expect(response.status).toBe(201);
            expect(response.data).toBeDefined();
        });

        test('should remove tag from image', async () => {
            const response = await apiHelper.removeTag('test-image-123', 'landscape');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });

        test('should get image tags', async () => {
            const response = await apiHelper.getImageTags('test-image-123');

            expect(response.status).toBe(200);
            expect(response.data).toBeDefined();
        });
    });

    test.describe('Error Handling', () => {
        test('should handle 404 for non-existent endpoint', async () => {
            const response = await apiHelper.get('/non-existent-endpoint');

            expect(response.status).toBe(404);
        });

        test('should handle invalid JSON in request body', async () => {
            const response = await apiHelper.makeRequest('/image/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: 'invalid json'
            });

            expect(response.status).toBe(400);
        });
    });
});
