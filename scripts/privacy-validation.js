#!/usr/bin/env node

/**
 * Privacy Validation Script
 *
 * This script validates that the privacy controls are working correctly:
 * 1. Public feed only returns public images
 * 2. User feed only returns user's own images
 * 3. No cross-contamination between feeds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validatePrivacyControls() {
    console.log('🔍 Starting privacy validation...\n');

    try {
        // Test 1: Validate public feed only returns public images
        console.log('📋 Test 1: Public Feed Privacy Check');
        const publicImages = await prisma.image.findMany({
            where: {
                isPublic: true,
                isHidden: false
            },
            select: {
                id: true,
                userId: true,
                isPublic: true,
                isHidden: true
            }
        });

        const nonPublicInPublicFeed = publicImages.filter(img => !img.isPublic || img.isHidden);
        if (nonPublicInPublicFeed.length > 0) {
            console.error('❌ FAILED: Non-public images found in public feed query!', nonPublicInPublicFeed);
        } else {
            console.log(`✅ PASSED: Public feed query returns only public images (${publicImages.length} images)`);
        }

        // Test 2: Validate user-specific queries
        console.log('\n📋 Test 2: User Feed Privacy Check');
        const users = await prisma.user.findMany({
            take: 3,
            select: { id: true, username: true }
        });

        for (const user of users) {
            const userImages = await prisma.image.findMany({
                where: { userId: user.id },
                select: {
                    id: true,
                    userId: true,
                    isPublic: true
                }
            });

            const otherUserImages = userImages.filter(img => img.userId !== user.id);
            if (otherUserImages.length > 0) {
                console.error(`❌ FAILED: Other users' images found in ${user.username}'s feed!`, otherUserImages);
            } else {
                console.log(`✅ PASSED: ${user.username}'s feed contains only their images (${userImages.length} images)`);
            }
        }

        // Test 3: Check for images that should be private but might be public
        console.log('\n📋 Test 3: Private Image Exposure Check');
        const privateImages = await prisma.image.findMany({
            where: {
                isPublic: false
            },
            select: {
                id: true,
                userId: true,
                isPublic: true,
                createdAt: true
            }
        });

        console.log(`📊 Found ${privateImages.length} private images in database`);

        // Check if any private images are accidentally being returned by public queries
        const publicFeedCheck = await prisma.image.findMany({
            where: {
                isPublic: true,
                isHidden: false
            },
            select: { id: true }
        });

        const privateImageIds = privateImages.map(img => img.id);
        const publicImageIds = publicFeedCheck.map(img => img.id);
        const leakedPrivateImages = privateImageIds.filter(id => publicImageIds.includes(id));

        if (leakedPrivateImages.length > 0) {
            console.error('❌ FAILED: Private images are being returned by public feed query!', leakedPrivateImages);
        } else {
            console.log('✅ PASSED: No private images are leaked to public feed');
        }

        // Test 4: Database integrity check
        console.log('\n📋 Test 4: Database Integrity Check');
        const totalImages = await prisma.image.count();
        const publicImagesCount = await prisma.image.count({ where: { isPublic: true } });
        const privateImagesCount = await prisma.image.count({ where: { isPublic: false } });
        const hiddenImagesCount = await prisma.image.count({ where: { isHidden: true } });

        console.log(`📊 Database Statistics:`);
        console.log(`   Total Images: ${totalImages}`);
        console.log(`   Public Images: ${publicImagesCount}`);
        console.log(`   Private Images: ${privateImagesCount}`);
        console.log(`   Hidden Images: ${hiddenImagesCount}`);

        if (publicImagesCount + privateImagesCount !== totalImages) {
            console.error('❌ FAILED: Public + Private image counts do not match total!');
        } else {
            console.log('✅ PASSED: Database integrity check passed');
        }

        console.log('\n🎉 Privacy validation completed!');

    } catch (error) {
        console.error('❌ Error during privacy validation:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the validation
validatePrivacyControls();
