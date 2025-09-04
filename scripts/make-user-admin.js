/**
 * Make User Admin Script
 * Promotes a user to admin status for testing admin dashboard
 */

import { PrismaClient } from '@prisma/client';
import { makeUserAdmin, getAdminUsers } from '../src/middleware/AdminAuthMiddleware.js';

const prisma = new PrismaClient();

async function makeAdmin() {
    try {
        console.log('🔐 ADMIN-SETUP: Setting up admin user...');

        // Get user email from command line or prompt
        const userEmail = process.argv[2];

        if (!userEmail) {
            console.log('❌ Usage: node scripts/make-user-admin.js <email>');
            console.log('Example: node scripts/make-user-admin.js admin@example.com');
            process.exit(1);
        }

        // Check if user exists
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true, email: true, username: true, isAdmin: true }
        });

        if (!user) {
            console.log(`❌ User with email '${userEmail}' not found.`);
            console.log('\n📋 Available users:');

            const allUsers = await prisma.user.findMany({
                select: { email: true, username: true, isAdmin: true, createdAt: true },
                orderBy: { createdAt: 'desc' },
                take: 10
            });

            allUsers.forEach(u => {
                const status = u.isAdmin ? '👑 Admin' : '👤 User';
                console.log(`  ${status} ${u.email} (${u.username || 'No username'})`);
            });

            process.exit(1);
        }

        if (user.isAdmin) {
            console.log(`✅ User '${userEmail}' is already an admin.`);
        } else {
            // Make user admin
            const adminUser = await makeUserAdmin(userEmail);
            console.log(`✅ Successfully promoted '${adminUser.email}' to admin status.`);
        }

        // Show all admin users
        console.log('\n👑 CURRENT ADMIN USERS:');
        const adminUsers = await getAdminUsers();

        if (adminUsers.length === 0) {
            console.log('  No admin users found.');
        } else {
            adminUsers.forEach(admin => {
                console.log(`  👑 ${admin.email} (${admin.username || 'No username'}) - Joined: ${admin.createdAt.toLocaleDateString()}`);
            });
        }

        console.log('\n🎯 ADMIN DASHBOARD ACCESS:');
        console.log('  1. Start your server: npm start');
        console.log('  2. Go to: http://localhost:3200/admin.html');
        console.log(`  3. Log in as: ${userEmail}`);
        console.log('  4. You should now see the admin dashboard!');

    } catch (error) {
        console.error('❌ ADMIN-SETUP: Failed to make user admin:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

makeAdmin();
