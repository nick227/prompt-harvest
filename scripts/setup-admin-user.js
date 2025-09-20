/**
 * Setup Admin User Script
 * Creates an admin user and provides login instructions
 */

import databaseClient from '../src/database/PrismaClient.js';
import { makeUserAdmin } from '../src/middleware/AdminAuthMiddleware.js';

const prisma = databaseClient.getClient();

async function setupAdminUser() {
    console.log('🔧 ADMIN SETUP: Setting up admin user...\n');

    try {
        // Check if there are any existing users
        const existingUsers = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        console.log('📋 EXISTING USERS:');
        console.log('==================');

        if (existingUsers.length === 0) {
            console.log('No users found in database.');
            console.log('\n💡 NEXT STEPS:');
            console.log('1. Go to your website and register a new user');
            console.log('2. Run this script again to make that user an admin');
            console.log('3. Or create a user manually in your database');
            return;
        }

        existingUsers.forEach((user, index) => {
            const adminStatus = user.isAdmin ? '✅ ADMIN' : '👤 Regular';
            console.log(`${index + 1}. ${user.email} (${user.username}) - ${adminStatus}`);
        });

        // Check if there are any existing admins
        const adminUsers = existingUsers.filter(user => user.isAdmin);

        if (adminUsers.length > 0) {
            console.log('\n✅ ADMIN USERS FOUND:');
            adminUsers.forEach(admin => {
                console.log(`   - ${admin.email} (${admin.username})`);
            });
            console.log('\n🎯 You can use any of these admin accounts to access the admin dashboard.');
            return;
        }

        // No admins found, let's make the first user an admin
        const firstUser = existingUsers[0];
        console.log(`\n🔧 MAKING FIRST USER ADMIN: ${firstUser.email}`);

        const adminUser = await makeUserAdmin(firstUser.email);

        console.log('\n✅ ADMIN SETUP COMPLETE!');
        console.log('========================');
        console.log(`Admin user: ${adminUser.email}`);
        console.log(`Username: ${adminUser.username}`);
        console.log(`User ID: ${adminUser.id}`);

        console.log('\n🎯 LOGIN INSTRUCTIONS:');
        console.log('======================');
        console.log('1. Go to your website login page');
        console.log('2. Login with these credentials:');
        console.log(`   Email: ${adminUser.email}`);
        console.log('   Password: [your registered password]');
        console.log('3. Go to /admin.html to access the admin dashboard');
        console.log('4. The pricing calculator will now work!');

        console.log('\n🔍 TESTING ADMIN ACCESS:');
        console.log('========================');
        console.log('1. After logging in, open browser developer tools (F12)');
        console.log('2. Go to Application/Storage tab');
        console.log('3. Check Local Storage for "authToken"');
        console.log('4. If token exists, admin API calls should work');

    } catch (error) {
        console.error('❌ ADMIN SETUP FAILED:', error);

        console.log('\n🛠️ MANUAL SETUP OPTIONS:');
        console.log('=========================');
        console.log('1. Create a user via registration on your website');
        console.log('2. Run this SQL query in your database:');
        console.log('   UPDATE "User" SET "isAdmin" = true WHERE email = \'your-email@example.com\';');
        console.log('3. Or use Prisma Studio to update the user');
    } finally {
        await prisma.$disconnect();
    }
}

// Run the setup
setupAdminUser().catch(console.error);
