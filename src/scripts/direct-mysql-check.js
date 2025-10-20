#!/usr/bin/env node

/**
 * Direct MySQL check using mysql2 package
 */

import mysql from 'mysql2/promise';

async function checkRailwayDatabase() {
    console.log('🔍 Direct MySQL check of Railway database...');

    // Parse MYSQL_URL
    const mysqlUrl = process.env.MYSQL_URL;

    console.log('MYSQL_URL:', mysqlUrl ? 'Set' : 'Not set');

    if (!mysqlUrl) {
        console.error('❌ MYSQL_URL not found');

        return;
    }

    // Parse the URL
    const url = new URL(mysqlUrl);
    const config = {
        host: url.hostname,
        port: parseInt(url.port),
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1) // Remove leading slash
    };

    console.log('Connection config:', {
        host: config.host,
        port: config.port,
        user: config.user,
        database: config.database,
        password: '***'
    });

    let connection;

    try {
        console.log('\n📊 Connecting to Railway MySQL...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected to Railway MySQL');

        // Test connection
        const [rows] = await connection.execute('SELECT 1 as test');

        console.log('✅ Connection test successful:', rows[0]);

        // Check word_types table
        console.log('\n📊 Checking word_types table...');
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM word_types');
        const { count } = countResult[0];

        console.log(`📊 Total word_types records: ${count}`);

        if (count === 0) {
            console.log('❌ No word_types records found!');
            console.log('🔍 The Railway database word_types table is empty!');
        } else {
            console.log('\n📋 Sample records:');
            const [samples] = await connection.execute('SELECT word, types FROM word_types LIMIT 5');

            samples.forEach((record, index) => {
                let typesPreview;

                try {
                    const types = JSON.parse(record.types);

                    typesPreview = JSON.stringify(types).substring(0, 100);
                } catch (error) {
                    typesPreview = record.types.substring(0, 100);
                }
                console.log(`${index + 1}. "${record.word}" -> ${typesPreview}...`);
            });

            // Check for specific words
            console.log('\n🔍 Checking specific words:');
            const testWords = ['movie lights', 'event space'];

            for (const word of testWords) {
                const [result] = await connection.execute(
                    'SELECT COUNT(*) as count FROM word_types WHERE word = ?',
                    [word]
                );
                const found = result[0].count > 0;

                console.log(`${found ? '✅' : '❌'} "${word}": ${found ? 'Found' : 'Not found'}`);
            }
        }

    } catch (error) {
        console.error('❌ Database check failed:', error);
    } finally {
        if (connection) {
            await connection.end();
            console.log('✅ Connection closed');
        }
    }
}

checkRailwayDatabase()
    .then(() => {
        console.log('\n✨ Direct MySQL check completed!');
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Check failed:', error);
        process.exit(1);
    });
