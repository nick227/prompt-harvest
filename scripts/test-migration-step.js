#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

console.log('🚀 Testing migration step by step...');

async function testMigrationStep() {
    try {
        console.log('Step 1: Connecting to databases...');
        
        // Connect to MySQL
        await databaseClient.connect();
        const prisma = databaseClient.getClient();
        console.log('✅ MySQL connected');
        
        // Connect to NeDB
        const usersDB = new DB('users.db');
        console.log('✅ NeDB connected');
        
        console.log('Step 2: Checking data...');
        
        // Check NeDB users
        const users = await usersDB.find({});
        console.log(`📁 NeDB users: ${users.length}`);
        
        // Check MySQL users
        const mysqlUsers = await prisma.user.findMany();
        console.log(`🗄️  MySQL users: ${mysqlUsers.length}`);
        
        console.log('Step 3: Testing migration...');
        
        if (users.length > 0) {
            const user = users[0];
            console.log(`👤 Testing user: ${user.email}`);
            
            // Check if user already exists
            const existingUser = await prisma.user.findFirst({
                where: { email: user.email }
            });
            
            if (existingUser) {
                console.log('⚠️  User already exists in MySQL');
            } else {
                console.log('🆕 User not found in MySQL, would migrate');
            }
        }
        
        console.log('Step 4: Disconnecting...');
        await databaseClient.disconnect();
        console.log('✅ Test completed');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.error('Stack:', error.stack);
    }
}

testMigrationStep();
