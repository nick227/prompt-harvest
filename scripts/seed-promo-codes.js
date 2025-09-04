/**
 * Seed Database with Promo Codes
 * Creates test promo codes for development and testing
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const promoCodes = [
    {
        code: 'WELCOME5',
        credits: 25, // $5 worth of credits (assuming 5 credits = $1)
        description: '$5 Welcome Bonus',
        maxRedemptions: 100,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        isActive: true
    },
    {
        code: 'TEST10',
        credits: 50, // $10 worth of credits
        description: '$10 Test Bonus',
        maxRedemptions: 50,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isActive: true
    },
    {
        code: 'BETA20',
        credits: 100, // $20 worth of credits
        description: '$20 Beta Tester Bonus',
        maxRedemptions: 25,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        isActive: true
    },
    {
        code: 'EXPIRED',
        credits: 25,
        description: 'Expired Test Code',
        maxRedemptions: 10,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        isActive: true
    },
    {
        code: 'DISABLED',
        credits: 25,
        description: 'Disabled Test Code',
        maxRedemptions: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: false
    }
];

async function seedPromoCodes() {
    console.log('🎫 SEED: Starting promo code seeding...');

    try {
        // Clear existing promo codes (development only)
        if (process.env.NODE_ENV === 'development') {
            console.log('🧹 SEED: Clearing existing promo codes...');
            await prisma.promoRedemption.deleteMany({});
            await prisma.promoCode.deleteMany({});
        }

        // Create promo codes
        console.log('📝 SEED: Creating promo codes...');

        for (const promoData of promoCodes) {
            try {
                const existingPromo = await prisma.promoCode.findUnique({
                    where: { code: promoData.code }
                });

                if (existingPromo) {
                    console.log(`⚠️ SEED: Promo code '${promoData.code}' already exists, skipping...`);
                    continue;
                }

                const promo = await prisma.promoCode.create({
                    data: promoData
                });

                console.log(`✅ SEED: Created promo code '${promo.code}' - ${promo.credits} credits (${promo.description})`);
            } catch (error) {
                console.error(`❌ SEED: Failed to create promo code '${promoData.code}':`, error.message);
            }
        }

        // Display summary
        console.log('\n📊 SEED: Promo Code Summary:');
        const allPromos = await prisma.promoCode.findMany({
            orderBy: { createdAt: 'desc' }
        });

        allPromos.forEach(promo => {
            const status = promo.isActive ?
                (promo.expiresAt > new Date() ? '🟢 Active' : '🔴 Expired') :
                '🟡 Disabled';

            console.log(`  ${promo.code}: ${promo.credits} credits - ${status} (${promo.redemptionCount}/${promo.maxRedemptions} used)`);
        });

        console.log('\n🎉 SEED: Promo code seeding completed successfully!');
        console.log('\n💡 Test Instructions:');
        console.log('1. Go to the billing page');
        console.log('2. Look for "Redeem Promo Code" section');
        console.log('3. Try these codes:');
        console.log('   - WELCOME5 (25 credits, should work)');
        console.log('   - TEST10 (50 credits, should work)');
        console.log('   - BETA20 (100 credits, should work)');
        console.log('   - EXPIRED (should fail - expired)');
        console.log('   - DISABLED (should fail - disabled)');
        console.log('   - INVALID (should fail - not found)');

    } catch (error) {
        console.error('❌ SEED: Promo code seeding failed:', error);
        throw error;
    }
}

async function testPromoRedemption() {
    console.log('\n🧪 TEST: Starting promo redemption test...');

    try {
        // Find a test user or create one
        let testUser = await prisma.user.findFirst({
            where: { email: { contains: 'test' } }
        });

        if (!testUser) {
            console.log('👤 TEST: Creating test user...');
            testUser = await prisma.user.create({
                data: {
                    email: 'test@example.com',
                    username: 'testuser',
                    passwordHash: 'test-hash' // This would be properly hashed in real usage
                }
            });
        }

        console.log(`👤 TEST: Using test user: ${testUser.email} (ID: ${testUser.id})`);

        // Test valid promo code redemption
        const testPromo = await prisma.promoCode.findFirst({
            where: {
                code: 'WELCOME5',
                isActive: true,
                expiresAt: { gt: new Date() }
            }
        });

        if (testPromo) {
            console.log(`🎫 TEST: Testing redemption of '${testPromo.code}'...`);

            // Check if already redeemed
            const existingRedemption = await prisma.promoRedemption.findFirst({
                where: {
                    userId: testUser.id,
                    promoCodeId: testPromo.id
                }
            });

            if (existingRedemption) {
                console.log('⚠️ TEST: User has already redeemed this promo code');
            } else {
                // Simulate redemption
                await prisma.$transaction(async (tx) => {
                    // Create redemption record
                    await tx.promoRedemption.create({
                        data: {
                            userId: testUser.id,
                            promoCodeId: testPromo.id
                        }
                    });

                    // Update promo code redemption count
                    await tx.promoCode.update({
                        where: { id: testPromo.id },
                        data: { redemptionCount: { increment: 1 } }
                    });

                    // Add credits to user ledger
                    await tx.creditLedger.create({
                        data: {
                            userId: testUser.id,
                            amount: testPromo.credits,
                            type: 'promo',
                            description: `Promo code: ${testPromo.code} - ${testPromo.description}`,
                            metadata: {
                                promoCode: testPromo.code,
                                promoId: testPromo.id
                            }
                        }
                    });

                    console.log(`✅ TEST: Successfully redeemed '${testPromo.code}' for ${testPromo.credits} credits`);
                });
            }
        }

        // Check final user balance
        const userBalance = await prisma.creditLedger.aggregate({
            where: { userId: testUser.id },
            _sum: { amount: true }
        });

        console.log(`💰 TEST: Final user balance: ${userBalance._sum.amount || 0} credits`);

    } catch (error) {
        console.error('❌ TEST: Promo redemption test failed:', error);
        throw error;
    }
}

async function main() {
    try {
        await seedPromoCodes();
        await testPromoRedemption();
    } catch (error) {
        console.error('❌ MAIN: Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { seedPromoCodes, testPromoRedemption };
