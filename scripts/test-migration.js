#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Testing migration process...');

async function testMigration() {
    try {
        // Test NeDB connection
        console.log('📁 Testing NeDB connections...');
        const usersDB = new DB('users.db');
        const users = await usersDB.find({});
        console.log(`✅ Found ${users.length} users in NeDB`);

        // Test MySQL connection
        console.log('🗄️  Testing MySQL connection...');
        await databaseClient.connect();
        console.log('✅ MySQL connection successful');

        // Test Prisma client
        console.log('🔧 Testing Prisma client...');
        const prisma = databaseClient.getClient();
        const mysqlUsers = await prisma.user.findMany();
        console.log(`✅ Found ${mysqlUsers.length} users in MySQL`);

        // Test database stats
        console.log('📊 Database statistics:');
        const stats = await databaseClient.getStats();
        console.log(stats);

        await databaseClient.disconnect();
        console.log('✅ All tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testMigration();
