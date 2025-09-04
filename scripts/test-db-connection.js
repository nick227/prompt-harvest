/**
 * Simple database connection test
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');

        // Test basic connection
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Test a simple query
        const userCount = await prisma.user.count();
        console.log(`📊 Found ${userCount} users in database`);

        // Test promo codes table
        const promoCount = await prisma.promoCode.count();
        console.log(`🎫 Found ${promoCount} promo codes in database`);

        console.log('🎉 Database connection test completed successfully!');

    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

testConnection();
