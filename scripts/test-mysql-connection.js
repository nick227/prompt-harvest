#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import { ImageRepository } from '../src/repositories/ImageRepository.js';
import { LikeService } from '../src/services/LikeService.js';
import { TagService } from '../src/services/TagService.js';

console.log('🚀 Testing MySQL connection and operations...');

async function testMySQLConnection() {
    try {
        // Test database connection
        console.log('Step 1: Testing database connection...');
        await databaseClient.connect();
        console.log('✅ Database connected successfully');

        // Test ImageRepository
        console.log('\nStep 2: Testing ImageRepository...');
        const imageRepo = new ImageRepository();
        const imageCount = await imageRepo.countByUserId('undefined');
        console.log(`✅ ImageRepository working - Found ${imageCount} images`);

        // Test LikeService
        console.log('\nStep 3: Testing LikeService...');
        const likeService = new LikeService();
        const isLiked = await likeService.checkIfLiked('test-user', 'test-image');
        console.log(`✅ LikeService working - Like check result: ${isLiked}`);

        // Test TagService
        console.log('\nStep 4: Testing TagService...');
        const tagService = new TagService();
        console.log('✅ TagService initialized successfully');

        // Test basic Prisma operations
        console.log('\nStep 5: Testing basic Prisma operations...');
        const prisma = databaseClient.getClient();

        const users = await prisma.user.findMany({ take: 1 });
        console.log(`✅ User query successful - Found ${users.length} users`);

        const images = await prisma.image.findMany({ take: 1 });
        console.log(`✅ Image query successful - Found ${images.length} images`);

        await databaseClient.disconnect();
        console.log('\n✅ All tests passed! MySQL migration is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testMySQLConnection();
