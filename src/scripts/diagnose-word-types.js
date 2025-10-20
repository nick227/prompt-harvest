#!/usr/bin/env node

/**
 * Diagnose Word Types Data Source
 * This script helps identify where the word_types data is actually coming from
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseWordTypes() {
    console.log('🔍 Diagnosing word_types data source...');
    console.log('Environment:', process.env.NODE_ENV || 'undefined');
    console.log('Database URL source:', process.env.DATABASE_URL ? 'DATABASE_URL' : 'MYSQL_URL');

    // Show database URL preview
    const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

    if (dbUrl) {
        console.log('Database URL preview:', `${dbUrl.substring(0, 50)}...`);
        console.log('Is Railway internal URL:', dbUrl.includes('railway.internal') ? 'YES' : 'NO');
    } else {
        console.log('❌ No database URL found!');
    }

    try {
        console.log('\n📊 Testing database connection...');
        await prisma.$queryRaw`SELECT 1`;
        console.log('✅ Database connection successful');

        // Get database info
        console.log('\n📊 Database information:');
        const [dbInfo] = await prisma.$queryRaw`SELECT DATABASE() as current_db, USER() as current_user, @@hostname as hostname`;

        console.log('Current database:', dbInfo.current_db);
        console.log('Current user:', dbInfo.current_user);
        console.log('Hostname:', dbInfo.hostname);

        // Check word_types table
        console.log('\n📊 Word_types table analysis:');
        const count = await prisma.word_types.count();

        console.log(`Total records: ${count}`);

        if (count > 0) {
            console.log('\n📋 Sample records:');
            const samples = await prisma.word_types.findMany({
                take: 3,
                select: {
                    word: true,
                    types: true
                }
            });

            samples.forEach((record, index) => {
                const typesCount = Array.isArray(record.types) ? record.types.length : 'unknown';

                console.log(`${index + 1}. "${record.word}" (${typesCount} types)`);
            });

            // Check for specific words that should be in local data
            console.log('\n🔍 Checking for local-specific words:');
            const localWords = ['movie lights', 'detailed examples of cinestill 800tungsten'];

            for (const word of localWords) {
                const record = await prisma.word_types.findUnique({
                    where: { word }
                });

                console.log(`${record ? '✅' : '❌'} "${word}": ${record ? 'Found' : 'Not found'}`);
            }

            // Check table creation/modification times if possible
            try {
                const [tableInfo] = await prisma.$queryRaw`
                    SELECT CREATE_TIME, UPDATE_TIME, TABLE_ROWS
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'word_types'
                `;

                console.log('\n📊 Table metadata:');
                console.log('Create time:', tableInfo.CREATE_TIME);
                console.log('Update time:', tableInfo.UPDATE_TIME);
                console.log('Estimated rows:', tableInfo.TABLE_ROWS);
            } catch (error) {
                console.log('Could not get table metadata:', error.message);
            }
        } else {
            console.log('❌ No word_types records found');
        }

    } catch (error) {
        console.error('❌ Diagnosis failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

diagnoseWordTypes()
    .then(() => {
        console.log('\n✨ Diagnosis completed!');
        console.log('\n🎯 Summary:');
        console.log('- If hostname contains "railway.internal" and has 1000+ records: Railway DB is populated');
        console.log('- If hostname is localhost/127.0.0.1 and has 1000+ records: Local DB is being used');
        console.log('- If hostname contains "railway.internal" but has 0-5 records: Railway DB is empty');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Diagnosis failed:', error);
        process.exit(1);
    });
