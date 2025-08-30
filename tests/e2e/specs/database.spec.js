import { test, expect } from '@playwright/test';
import databaseClient from '../../../src/database/PrismaClient.js';

test.describe('Database Integration', () => {
    let prisma;

    test.beforeAll(async () => {
        await databaseClient.connect();
        prisma = databaseClient.getClient();
    });

    test.afterAll(async () => {
        await databaseClient.disconnect();
    });

    test.describe('User Operations', () => {
        test('should connect to database successfully', async () => {
            const healthCheck = await databaseClient.healthCheck();
            expect(healthCheck.status).toBe('healthy');
        });

        test('should get database statistics', async () => {
            const stats = await databaseClient.getStats();

            expect(stats).toBeDefined();
            expect(stats.users).toBeGreaterThanOrEqual(0);
            expect(stats.images).toBeGreaterThanOrEqual(0);
            expect(stats.likes).toBeGreaterThanOrEqual(0);
            expect(stats.tags).toBeGreaterThanOrEqual(0);
            expect(stats.prompts).toBeGreaterThanOrEqual(0);
            expect(stats.wordTypes).toBeGreaterThanOrEqual(0);
        });

        test('should find test user', async () => {
            const user = await prisma.user.findFirst({
                where: { email: 'test@example.com' }
            });

            expect(user).toBeDefined();
            expect(user.email).toBe('test@example.com');
            expect(user.username).toBe('testuser');
        });

        test('should find test image', async () => {
            const image = await prisma.image.findFirst({
                where: { id: 'test-image-123' }
            });

            expect(image).toBeDefined();
            expect(image.id).toBe('test-image-123');
            expect(image.prompt).toBe('Test prompt for E2E testing');
        });
    });

    test.describe('Image Operations', () => {
        test('should query images with pagination', async () => {
            const images = await prisma.image.findMany({
                take: 5,
                skip: 0,
                orderBy: { createdAt: 'desc' }
            });

            expect(images).toBeDefined();
            expect(images.length).toBeLessThanOrEqual(5);
        });

        test('should count images by user', async () => {
            const count = await prisma.image.count({
                where: { userId: 'test-user-123' }
            });

            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('should find images with specific provider', async () => {
            const images = await prisma.image.findMany({
                where: { provider: 'test-provider' },
                take: 10
            });

            expect(images).toBeDefined();
            expect(Array.isArray(images)).toBe(true);
        });
    });

    test.describe('Like Operations', () => {
        test('should query likes table', async () => {
            const likes = await prisma.likes.findMany({
                take: 10
            });

            expect(likes).toBeDefined();
            expect(Array.isArray(likes)).toBe(true);
        });

        test('should find likes by image', async () => {
            const likes = await prisma.likes.findMany({
                where: { imageId: 'test-image-123' }
            });

            expect(likes).toBeDefined();
            expect(Array.isArray(likes)).toBe(true);
        });
    });

    test.describe('Tag Operations', () => {
        test('should query tags table', async () => {
            const tags = await prisma.tags.findMany({
                take: 10
            });

            expect(tags).toBeDefined();
            expect(Array.isArray(tags)).toBe(true);
        });

        test('should find tags by image', async () => {
            const tags = await prisma.tags.findMany({
                where: { imageId: 'test-image-123' }
            });

            expect(tags).toBeDefined();
            expect(Array.isArray(tags)).toBe(true);
        });
    });

    test.describe('Prompt Operations', () => {
        test('should query prompts table', async () => {
            const prompts = await prisma.prompts.findMany({
                take: 10
            });

            expect(prompts).toBeDefined();
            expect(Array.isArray(prompts)).toBe(true);
        });

        test('should find prompts by user', async () => {
            const prompts = await prisma.prompts.findMany({
                where: { userId: 'test-user-123' },
                take: 10
            });

            expect(prompts).toBeDefined();
            expect(Array.isArray(prompts)).toBe(true);
        });
    });

    test.describe('Word Type Operations', () => {
        test('should query word_types table', async () => {
            const wordTypes = await prisma.word_types.findMany({
                take: 10
            });

            expect(wordTypes).toBeDefined();
            expect(Array.isArray(wordTypes)).toBe(true);
        });

        test('should find word types by word', async () => {
            const wordTypes = await prisma.word_types.findMany({
                where: {
                    word: {
                        contains: 'test',
                        mode: 'insensitive'
                    }
                },
                take: 5
            });

            expect(wordTypes).toBeDefined();
            expect(Array.isArray(wordTypes)).toBe(true);
        });
    });

    test.describe('Data Integrity', () => {
        test('should maintain referential integrity', async () => {
            // Test that images reference valid users
            const imagesWithUsers = await prisma.image.findMany({
                include: {
                    user: true
                },
                take: 5
            });

            expect(imagesWithUsers).toBeDefined();
            expect(Array.isArray(imagesWithUsers)).toBe(true);

            // All images should have valid user references
            for (const image of imagesWithUsers) {
                expect(image.user).toBeDefined();
            }
        });

        test('should handle null values correctly', async () => {
            const imagesWithNullRating = await prisma.image.findMany({
                where: { rating: null },
                take: 5
            });

            expect(imagesWithNullRating).toBeDefined();
            expect(Array.isArray(imagesWithNullRating)).toBe(true);
        });
    });
});
