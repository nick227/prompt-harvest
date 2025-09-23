#!/usr/bin/env node

/**
 * Check Production Word Types
 * 
 * This script checks if the word_types table has data in production
 */

import mysql from 'mysql2/promise';

async function checkProductionWordTypes() {
    console.log('🔍 CHECKING PRODUCTION WORD TYPES');
    console.log('==========================================');
    
    const PUBLIC_DATABASE_URL = "mysql://root:YALnbkVGvnsucZbZOnrqQHmyDcmGMhts@hopper.proxy.rlwy.net:34099/railway";
    
    if (!PUBLIC_DATABASE_URL) {
        console.error('❌ PUBLIC_DATABASE_URL is not set.');
        process.exit(1);
    }
    
    const url = new URL(PUBLIC_DATABASE_URL);
    const config = {
        host: url.hostname,
        port: url.port,
        user: url.username,
        password: url.password,
        database: url.pathname.substring(1),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };
    
    console.log('🔗 Connecting to Railway database...');
    console.log(`    Host: ${config.host}:${config.port}`);
    console.log(`    Database: ${config.database}`);
    console.log(`    User: ${config.user}`);
    
    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('    ✅ Connected to Railway database');
        
        console.log('🔍 Checking word_types table...');
        
        // Check if table exists
        const [tables] = await connection.execute(`SHOW TABLES LIKE 'word_types'`);
        if (tables.length === 0) {
            console.log('    ❌ word_types table does not exist');
            return;
        }
        
        // Check table structure
        const [columns] = await connection.execute(`DESCRIBE word_types`);
        console.log('    📋 Table structure:');
        columns.forEach(col => {
            console.log(`      - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
        });
        
        // Check row count
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM word_types`);
        const count = countResult[0].count;
        console.log(`    📊 Total rows: ${count}`);
        
        if (count === 0) {
            console.log('    ❌ word_types table is empty - this explains the 500 errors');
            console.log('    🔧 Need to restore word types data from backup');
        } else {
            console.log('    ✅ word_types table has data');
            
            // Show sample data
            const [sample] = await connection.execute(`SELECT * FROM word_types LIMIT 5`);
            console.log('    📝 Sample data:');
            sample.forEach(row => {
                console.log(`      - ${row.word}: ${row.types}`);
            });
        }
        
        console.log('==========================================');
        console.log('✅ PRODUCTION WORD TYPES CHECK COMPLETED');
        console.log('==========================================');
        
    } catch (error) {
        console.error('==========================================');
        console.error('❌ PRODUCTION WORD TYPES CHECK FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
    } finally {
        if (connection) await connection.end();
    }
}

checkProductionWordTypes();
