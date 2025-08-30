#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

console.log('🚀 Final migration status check...');

async function checkMigrationStatus() {
    try {
        // Connect to databases
        await databaseClient.connect();
        const prisma = databaseClient.getClient();
        const usersDB = new DB('users.db');
        const imagesDB = new DB('images.db');

        console.log('✅ Connected to databases');

        // Check NeDB data
        const neDBUsers = await usersDB.find({});
        const neDBImages = await imagesDB.find({});
        console.log(`📁 NeDB: ${neDBUsers.length} users, ${neDBImages.length} images`);

        // Check MySQL data
        const mysqlUsers = await prisma.user.findMany();
        const mysqlImages = await prisma.image.findMany();
        console.log(`🗄️  MySQL: ${mysqlUsers.length} users, ${mysqlImages.length} images`);

        // Show migration status
        console.log('\n📊 Migration Status:');
        console.log('==================');
        console.log(`Users: ${mysqlUsers.length}/${neDBUsers.length} migrated`);
        console.log(`Images: ${mysqlImages.length}/${neDBImages.length} migrated`);

        if (mysqlUsers.length > 0) {
            console.log('\n👥 MySQL Users:');
            mysqlUsers.forEach(user => {
                console.log(`- ${user.email} (${user.username})`);
            });
        }

        if (mysqlImages.length > 0) {
            console.log('\n🖼️  MySQL Images:');
            mysqlImages.slice(0, 5).forEach(image => {
                console.log(`- ${image.id} (${image.provider})`);
            });
            if (mysqlImages.length > 5) {
                console.log(`... and ${mysqlImages.length - 5} more`);
            }
        }

        await databaseClient.disconnect();
        console.log('\n✅ Status check completed');

    } catch (error) {
        console.error('❌ Status check failed:', error);
    }
}

checkMigrationStatus();
