/**
 * Manage Promo Codes
 * View, create, and test promo codes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function listExistingPromoCodes() {
    console.log('🎫 EXISTING PROMO CODES:');
    console.log('========================');

    const promoCodes = await prisma.promoCode.findMany({
        orderBy: { createdAt: 'desc' }
    });

    if (promoCodes.length === 0) {
        console.log('No promo codes found in database.');
        return [];
    }

    promoCodes.forEach(promo => {
        const status = promo.isActive ?
            (promo.expiresAt && promo.expiresAt > new Date() ? '🟢 Active' : '🔴 Expired') :
            '🟡 Disabled';

        const expiryDate = promo.expiresAt ? promo.expiresAt.toLocaleDateString() : 'No expiry';

        console.log(`  📋 ${promo.code}:`);
        console.log(`     Credits: ${promo.credits}`);
        console.log(`     Status: ${status}`);
        console.log(`     Used: ${promo.currentRedemptions || 0}/${promo.maxRedemptions || 'unlimited'}`);
        console.log(`     Expires: ${expiryDate}`);
        console.log('');
    });

    return promoCodes;
}

async function createTestPromoCodes() {
    console.log('🏗️ CREATING TEST PROMO CODES:');
    console.log('==============================');

    const newPromoCodes = [
        {
            code: 'WELCOME5',
            credits: 25, // $5 worth (assuming 5 credits = $1)
            maxRedemptions: 100,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            isActive: true
        },
        {
            code: 'TEST10',
            credits: 50, // $10 worth
            maxRedemptions: 50,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            isActive: true
        }
    ];

    for (const promoData of newPromoCodes) {
        try {
            const existing = await prisma.promoCode.findUnique({
                where: { code: promoData.code }
            });

            if (existing) {
                console.log(`⚠️ Promo code '${promoData.code}' already exists, skipping...`);
                continue;
            }

            const promo = await prisma.promoCode.create({
                data: promoData
            });

            console.log(`✅ Created: ${promo.code} (${promo.credits} credits)`);

        } catch (error) {
            console.error(`❌ Failed to create ${promoData.code}:`, error.message);
        }
    }
}

async function testPromoRedemption() {
    console.log('\n🧪 TESTING PROMO REDEMPTION:');
    console.log('=============================');

    // Find an active promo code
    const activePromo = await prisma.promoCode.findFirst({
        where: {
            isActive: true,
            expiresAt: { gt: new Date() },
            currentRedemptions: { lt: 1000 } // Just use a high number for testing
        }
    });

    if (!activePromo) {
        console.log('❌ No active promo codes available for testing');
        return;
    }

    // Find or create a test user
    let testUser = await prisma.user.findFirst({
        where: { email: 'test@example.com' }
    });

    if (!testUser) {
        testUser = await prisma.user.create({
            data: {
                email: 'test@example.com',
                username: 'testuser',
                passwordHash: 'test-hash'
            }
        });
        console.log(`👤 Created test user: ${testUser.email}`);
    } else {
        console.log(`👤 Using existing test user: ${testUser.email}`);
    }

    // Check if already redeemed
    const existingRedemption = await prisma.promoRedemption.findFirst({
        where: {
            userId: testUser.id,
            promoCodeId: activePromo.id
        }
    });

    if (existingRedemption) {
        console.log(`⚠️ User has already redeemed promo code '${activePromo.code}'`);

        // Show current balance
        const balance = await prisma.creditLedger.aggregate({
            where: { userId: testUser.id },
            _sum: { amount: true }
        });

        console.log(`💰 Current balance: ${balance._sum.amount || 0} credits`);
        return;
    }

    console.log(`🎫 Testing redemption of '${activePromo.code}' (${activePromo.credits} credits)...`);

    try {
        await prisma.$transaction(async (tx) => {
            // Create redemption record
            await tx.promoRedemption.create({
                data: {
                    userId: testUser.id,
                    promoCodeId: activePromo.id
                }
            });

            // Update promo code count
            await tx.promoCode.update({
                where: { id: activePromo.id },
                data: { currentRedemptions: { increment: 1 } }
            });

            // Add credits to ledger
            await tx.creditLedger.create({
                data: {
                    userId: testUser.id,
                    amount: activePromo.credits,
                    type: 'promo',
                    description: `Promo code: ${activePromo.code} - ${activePromo.credits} credits`,
                    metadata: {
                        promoCode: activePromo.code,
                        promoId: activePromo.id
                    }
                }
            });
        });

        console.log(`✅ Successfully redeemed '${activePromo.code}' for ${activePromo.credits} credits`);

        // Show new balance
        const newBalance = await prisma.creditLedger.aggregate({
            where: { userId: testUser.id },
            _sum: { amount: true }
        });

        console.log(`💰 New balance: ${newBalance._sum.amount || 0} credits`);

    } catch (error) {
        console.error('❌ Redemption test failed:', error.message);
    }
}

async function showTestInstructions() {
    console.log('\n📋 TESTING INSTRUCTIONS:');
    console.log('=========================');
    console.log('1. Start your server: npm start');
    console.log('2. Go to: http://localhost:3200/billing-optimized.html');
    console.log('3. Log in as a user');
    console.log('4. Scroll to "Redeem Promo Code" section');
    console.log('5. Try these test codes:');

    const activePromoCodes = await prisma.promoCode.findMany({
        where: {
            isActive: true,
            expiresAt: { gt: new Date() }
        }
    });

    activePromoCodes.forEach(promo => {
        console.log(`   • ${promo.code} (${promo.credits} credits)`);
    });

    console.log('\n💡 Expected behaviors:');
    console.log('   • Valid codes should add credits to your balance');
    console.log('   • Used codes should show "already redeemed" error');
    console.log('   • Invalid codes should show "not found" error');
    console.log('   • Balance should update in real-time after redemption');
}

async function main() {
    try {
        console.log('🎫 PROMO CODE MANAGEMENT TOOL');
        console.log('==============================\n');

        // List existing promo codes
        await listExistingPromoCodes();

        // Create test promo codes if needed
        await createTestPromoCodes();

        // Test promo redemption
        await testPromoRedemption();

        // Show testing instructions
        await showTestInstructions();

        console.log('\n🎉 Promo code management completed!');

    } catch (error) {
        console.error('❌ Script failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
