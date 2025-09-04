#!/usr/bin/env node

/**
 * Create initial promo codes for the credits system
 * Run: node scripts/create-promo-codes.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promoCodes = [
    {
        code: 'WELCOME10',
        credits: 10,
        maxRedemptions: 1000,
        description: 'Welcome bonus - 10 free credits for new users'
    },
    {
        code: 'BETA50',
        credits: 50,
        maxRedemptions: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        description: 'Beta tester bonus - 50 credits'
    },
    {
        code: 'LAUNCH25',
        credits: 25,
        maxRedemptions: 500,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        description: 'Launch week bonus - 25 credits'
    }
];

async function createPromoCodes() {
    try {
        console.log('💳 Creating promo codes...');

        for (const promoData of promoCodes) {
            // Check if code already exists
            const existing = await prisma.promoCode.findUnique({
                where: { code: promoData.code }
            });

            if (existing) {
                console.log(`⚠️  Promo code ${promoData.code} already exists, skipping...`);
                continue;
            }

            // Create new promo code
            const promo = await prisma.promoCode.create({
                data: {
                    code: promoData.code,
                    credits: promoData.credits,
                    maxRedemptions: promoData.maxRedemptions,
                    expiresAt: promoData.expiresAt || null
                }
            });

            console.log(`✅ Created promo code: ${promo.code} (${promo.credits} credits)`);
        }

        console.log('💳 Promo code creation completed!');

    } catch (error) {
        console.error('❌ Error creating promo codes:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

createPromoCodes();
