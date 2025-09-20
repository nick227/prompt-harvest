#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';

async function simpleTestImages() {
    try {
        console.log('🔍 Simple test of images table data...');

        await databaseClient.connect();
        const prisma = databaseClient.getClient();

        // Get total count
        const count = await prisma.image.count();
        console.log(`📊 Total images in database: ${count}`);

        // Get sample images
        const sampleImages = await prisma.image.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' }
        });

        console.log('\n📋 Sample images (most recent):');
        sampleImages.forEach((img, index) => {
            console.log(`\n${index + 1}. ID: ${img.id}`);
            console.log(`   Provider: ${img.provider}`);
            console.log(`   Prompt: ${img.prompt.substring(0, 60)}...`);
            console.log(`   ImageUrl: ${img.imageUrl}`);
            console.log(`   Guidance: ${img.guidance}`);
            console.log(`   Created: ${img.createdAt.toLocaleString()}`);
        });

        // Test provider distribution
        const providerStats = await prisma.image.groupBy({
            by: ['provider'],
            _count: {
                provider: true
            },
            orderBy: {
                _count: {
                    provider: 'desc'
                }
            }
        });

        console.log('\n📈 Provider distribution:');
        providerStats.forEach(stat => {
            console.log(`   ${stat.provider}: ${stat._count.provider} images`);
        });

        // Simple data quality check
        const allImages = await prisma.image.findMany({
            select: {
                prompt: true,
                imageUrl: true
            }
        });

        const emptyPrompts = allImages.filter(img => !img.prompt || img.prompt.trim() === '').length;
        const emptyUrls = allImages.filter(img => !img.imageUrl || img.imageUrl.trim() === '').length;

        console.log('\n🔍 Data quality check:');
        console.log(`   Images with empty prompts: ${emptyPrompts}`);
        console.log(`   Images with empty URLs: ${emptyUrls}`);
        console.log(`   Data quality: ${((count - emptyPrompts - emptyUrls) / count * 100).toFixed(1)}%`);

        await databaseClient.disconnect();
        console.log('\n✅ Test completed successfully!');

    } catch (error) {
        console.error('❌ Error testing images data:', error);
        process.exit(1);
    }
}

simpleTestImages();
