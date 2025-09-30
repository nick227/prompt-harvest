#!/usr/bin/env node

/**
 * Check Railway Word Types with correct environment variables
 */

import { PrismaClient } from '@prisma/client';

// Use Railway's MYSQL_URL environment variable
const databaseUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

console.log('🔍 Checking Railway word_types with correct connection...');
console.log('Database URL source:', process.env.MYSQL_URL ? 'MYSQL_URL' : 'DATABASE_URL');
console.log('URL preview:', databaseUrl ? databaseUrl.substring(0, 50) + '...' : 'None');

if (!databaseUrl) {
    console.error('❌ No database URL found in environment variables');
    process.exit(1);
}

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: databaseUrl
        }
    }
});

async function checkWordTypes() {
    try {
        console.log('\n📊 Testing database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');

        console.log('\n📊 Checking word_types table...');
        const count = await prisma.word_types.count();
        console.log(`📊 Total word_types records: ${count}`);

        if (count === 0) {
            console.log('❌ No word_types records found!');
            console.log('🔍 Checking if table exists...');

            try {
                const tableExists = await prisma.$queryRaw`
                    SELECT COUNT(*) as count FROM information_schema.tables
                    WHERE table_schema = DATABASE() AND table_name = 'word_types'
                `;
                console.log('Table exists check:', tableExists);
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
        }

    } catch (error) {
        console.error('❌ Database check failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

checkWordTypes()
    .then(() => {
        console.log('\n✨ Check completed!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Check failed:', error);
        process.exit(1);
    });
