/**
 * Make User Admin Script
 * Utility script to make a user an admin for testing
 */

import databaseClient from '../src/database/PrismaClient.js';

const prisma = databaseClient.getClient();

const makeUserAdmin = async (email) => {
    try {
        console.log(`🔐 Making user ${email} an admin...`);

        const user = await prisma.user.update({
            where: { email },
            data: { isAdmin: true },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            }
        });

        console.log('✅ User successfully made admin:');
        console.log(JSON.stringify(user, null, 2));

        return user;
    } catch (error) {
        if (error.code === 'P2025') {
            console.error(`❌ User with email ${email} not found`);
        } else {
            console.error('❌ Error making user admin:', error);
        }
        throw error;
    }
};

const listAdminUsers = async () => {
    try {
        console.log('👥 Listing all admin users...');

        const admins = await prisma.user.findMany({
            where: { isAdmin: true },
            select: {
                id: true,
                email: true,
                username: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        if (admins.length === 0) {
            console.log('ℹ️ No admin users found');
        } else {
            console.log(`✅ Found ${admins.length} admin users:`);
            admins.forEach((admin, index) => {
                console.log(`${index + 1}. ${admin.email} (${admin.username}) - Created: ${admin.createdAt.toISOString().split('T')[0]}`);
            });
        }

        return admins;
    } catch (error) {
        console.error('❌ Error listing admin users:', error);
        throw error;
    }
};

// Main execution
const main = async () => {
    const args = process.argv.slice(2);
    const command = args[0];
    const email = args[1];

    try {
        if (command === 'make' && email) {
            await makeUserAdmin(email);
        } else if (command === 'list') {
            await listAdminUsers();
        } else {
            console.log('Usage:');
            console.log('  node scripts/make-admin.js make <email>  - Make user admin');
            console.log('  node scripts/make-admin.js list          - List all admin users');
            console.log('');
            console.log('Examples:');
            console.log('  node scripts/make-admin.js make admin@example.com');
            console.log('  node scripts/make-admin.js list');
        }
    } catch (error) {
        console.error('Script failed:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { makeUserAdmin, listAdminUsers };
