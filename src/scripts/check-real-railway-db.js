#!/usr/bin/env node

/**
 * Check the REAL Railway database word_types
 */

// Set DATABASE_URL from MYSQL_URL for Prisma
process.env.DATABASE_URL = process.env.MYSQL_URL;

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRealRailwayDB() {
    console.log('🔍 Checking REAL Railway word_types database...');
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('URL preview:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 50) + '...' : 'None');

    try {
        console.log('\n📊 Testing database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');

        console.log('\n📊 Checking word_types table...');
        const count = await prisma.word_types.count();
        console.log(`📊 Total word_types records: ${count}`);

        if (count === 0) {
            console.log('❌ No word_types records found!');
            console.log('🔍 The Railway database is empty - we need to sync the data!');

            // Check if table exists at all
            try {
                const tables = await prisma.$queryRaw`
                    SHOW TABLES LIKE 'word_types'
                `;
                console.log('Table exists check:', tables);
            } catch (error) {
                console.log('Error checking table:', error.message);
            }

        } else {
            console.log('\n📋 Sample records:');
            const samples = await prisma.word_types.findMany({
                take: 5,
                select: {
                    word: true,
                    types: true
                }
            });

            samples.forEach((record, index) => {
                const typesPreview = JSON.stringify(record.types).substring(0, 100);
                console.log(`${index + 1}. "${record.word}" -> ${typesPreview}...`);
            });

            // Check for specific test words
            console.log('\n🔍 Checking specific words:');
            const testWords = ['movie lights', 'event space'];
            for (const word of testWords) {
                const record = await prisma.word_types.findUnique({
                    where: { word }
                });
                console.log(`${record ? '✅' : '❌'} "${word}": ${record ? 'Found' : 'Not found'}`);
            }
        }

    } catch (error) {
        console.error('❌ Database check failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkRealRailwayDB()
    .then(() => {
        console.log('\n✨ Check completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Check failed:', error);
        process.exit(1);
    });
