#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';

console.log('🔧 Testing Prisma models...');

async function testModels() {
    try {
        await databaseClient.connect();
        const prisma = databaseClient.getClient();
        
        console.log('Available models:');
        console.log(Object.keys(prisma));
        
        // Test each model
        const models = ['user', 'image', 'categories', 'likes', 'multipliers', 'prompt_clauses', 'prompts', 'tags', 'word_types'];
        
        for (const model of models) {
            try {
                const count = await prisma[model].count();
                console.log(`${model}: ${count} records`);
            } catch (error) {
                console.log(`${model}: Error - ${error.message}`);
            }
        }
        
        await databaseClient.disconnect();
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

testModels();
