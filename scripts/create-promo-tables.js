#!/usr/bin/env node

/**
 * Create Promo Code Tables Migration
 * Creates promo_codes and promo_redemptions tables
 */

import databaseClient from '../src/database/PrismaClient.js';

const prisma = databaseClient.getClient();

async function createPromoTables() {
    console.log('🚀 Starting promo code tables migration...');

    try {
        // Check if tables already exist
        const existingTables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('promo_codes', 'promo_redemptions')
        `;

        if (existingTables.length > 0) {
            console.log('⚠️ Promo code tables already exist:', existingTables.map(t => t.TABLE_NAME));
            console.log('✅ Migration skipped - tables already present');
            return;
        }

        // Create promo_codes table
        console.log('📝 Creating promo_codes table...');
        await prisma.$executeRaw`
            CREATE TABLE promo_codes (
                id VARCHAR(25) PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                credits INT NOT NULL,
                description VARCHAR(255),
                isActive BOOLEAN DEFAULT TRUE,
                maxRedemptions INT,
                currentRedemptions INT DEFAULT 0,
                expiresAt DATETIME,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_code (code),
                INDEX idx_isActive (isActive),
                INDEX idx_expiresAt (expiresAt)
            )
        `;

        // Create promo_redemptions table
        console.log('📝 Creating promo_redemptions table...');
        await prisma.$executeRaw`
            CREATE TABLE promo_redemptions (
                id VARCHAR(25) PRIMARY KEY,
                userId VARCHAR(25) NOT NULL,
                promoCodeId VARCHAR(25) NOT NULL,
                credits INT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY userId_promoCodeId (userId, promoCodeId),
                INDEX idx_userId (userId),
                INDEX idx_promoCodeId (promoCodeId),
                INDEX idx_createdAt (createdAt),
                FOREIGN KEY (promoCodeId) REFERENCES promo_codes(id) ON DELETE CASCADE
            )
        `;

        console.log('✅ Promo code tables created successfully!');

        // Create some sample promo codes
        console.log('🎁 Creating sample promo codes...');

        const samplePromoCodes = [
            {
                id: 'promo_welcome10',
                code: 'WELCOME10',
                credits: 10,
                description: 'Welcome bonus - 10 free credits',
                maxRedemptions: 1000,
                expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
            },
            {
                id: 'promo_launch25',
                code: 'LAUNCH25',
                credits: 25,
                description: 'Launch celebration - 25 free credits',
                maxRedemptions: 500,
                expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
            },
            {
                id: 'promo_test50',
                code: 'TEST50',
                credits: 50,
                description: 'Testing promo code - 50 free credits',
                maxRedemptions: 100,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
            }
        ];

        for (const promo of samplePromoCodes) {
            try {
                await prisma.promoCode.create({
                    data: promo
                });
                console.log(`✅ Created promo code: ${promo.code} (${promo.credits} credits)`);
            } catch (error) {
                if (error.code === 'P2002') {
                    console.log(`⚠️ Promo code ${promo.code} already exists, skipping...`);
                } else {
                    console.error(`❌ Error creating promo code ${promo.code}:`, error);
                }
            }
        }

        console.log('🎉 Promo code migration completed successfully!');
        console.log('📊 Sample promo codes created:');
        console.log('   - WELCOME10: 10 credits (1000 redemptions)');
        console.log('   - LAUNCH25: 25 credits (500 redemptions)');
        console.log('   - TEST50: 50 credits (100 redemptions)');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    createPromoTables()
        .then(() => {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        });
}

export default createPromoTables;
