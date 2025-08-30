#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

console.log('🚀 Testing simple migration...');

async function testSimpleMigration() {
    try {
        // Connect to databases
        await databaseClient.connect();
        const prisma = databaseClient.getClient();
        const usersDB = new DB('users.db');
        
        console.log('✅ Connected to databases');
        
        // Get users from NeDB
        const users = await usersDB.find({});
        console.log(`📁 Found ${users.length} users in NeDB`);
        
        if (users.length > 0) {
            const user = users[0];
            console.log(`👤 Testing migration of user: ${user.email}`);
            
            // Generate username from email if missing
            const username = user.username || user.email.split('@')[0];
            console.log(`📝 Using username: ${username}`);
            
            // Try to migrate the first user
            try {
                const result = await prisma.user.create({
                    data: {
                        id: user._id || user.id,
                        email: user.email,
                        username: username,
                        password: user.password,
                        isAdmin: user.isAdmin || false,
                        createdAt: new Date(user.createdAt || user.timestamp || Date.now()),
                        updatedAt: new Date(user.updatedAt || user.timestamp || Date.now())
                    }
                });
                console.log(`✅ Successfully migrated user: ${result.email}`);
            } catch (error) {
                console.error(`❌ Failed to migrate user: ${error.message}`);
                if (error.code === 'P2002') {
                    console.log('⚠️  User already exists in MySQL');
                }
            }
        }
        
        // Check MySQL users
        const mysqlUsers = await prisma.user.findMany();
        console.log(`🗄️  Found ${mysqlUsers.length} users in MySQL`);
        
        await databaseClient.disconnect();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testSimpleMigration();
