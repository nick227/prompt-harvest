#!/usr/bin/env node

/**
 * Direct Schema Fix for Railway Production
 * 
 * This script uses mysql2 directly to connect to the database
 * and add the missing columns, bypassing Prisma connection issues.
 */

import mysql from 'mysql2/promise';

async function directSchemaFix() {
    console.log('🚨 DIRECT SCHEMA FIX STARTED');
    console.log('==========================================');
    
    let connection;
    
    try {
        // Parse DATABASE_URL
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL not found');
        }
        
        console.log('🔗 Connecting to database...');
        
        // Parse the DATABASE_URL
        const url = new URL(databaseUrl);
        const config = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            ssl: {
                rejectUnauthorized: false
            }
        };
        
        console.log(`    Host: ${config.host}:${config.port}`);
        console.log(`    Database: ${config.database}`);
        console.log(`    User: ${config.user}`);
        
        connection = await mysql.createConnection(config);
        console.log('    ✅ Connected to database');
        
        console.log('🔧 Step 1: Adding missing columns...');
        
        // Add isDeleted column
        try {
            await connection.execute(`ALTER TABLE images ADD COLUMN isDeleted BOOLEAN DEFAULT FALSE`);
            console.log('    ✅ Added isDeleted column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  isDeleted column already exists');
            } else {
                throw error;
            }
        }
        
        // Add deletedAt column
        try {
            await connection.execute(`ALTER TABLE images ADD COLUMN deletedAt DATETIME NULL`);
            console.log('    ✅ Added deletedAt column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  deletedAt column already exists');
            } else {
                throw error;
            }
        }
        
        // Add deletedBy column
        try {
            await connection.execute(`ALTER TABLE images ADD COLUMN deletedBy VARCHAR(25) NULL`);
            console.log('    ✅ Added deletedBy column');
        } catch (error) {
            if (error.message.includes('Duplicate column name')) {
                console.log('    ⚠️  deletedBy column already exists');
            } else {
                throw error;
            }
        }
        
        console.log('🔧 Step 2: Adding indexes...');
        
        // Add indexes
        try {
            await connection.execute(`CREATE INDEX idx_images_isDeleted ON images(isDeleted)`);
            console.log('    ✅ Added isDeleted index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  isDeleted index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        try {
            await connection.execute(`CREATE INDEX idx_images_deletedAt ON images(deletedAt)`);
            console.log('    ✅ Added deletedAt index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  deletedAt index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        try {
            await connection.execute(`CREATE INDEX idx_images_userId_isDeleted ON images(userId, isDeleted)`);
            console.log('    ✅ Added userId_isDeleted index');
        } catch (error) {
            if (error.message.includes('Duplicate key name')) {
                console.log('    ⚠️  userId_isDeleted index already exists');
            } else {
                console.log('    ⚠️  Index creation failed:', error.message);
            }
        }
        
        console.log('🔧 Step 3: Verifying schema...');
        
        // Test the columns exist
        try {
            const [rows] = await connection.execute(`SELECT isDeleted, deletedAt, deletedBy FROM images LIMIT 1`);
            console.log('    ✅ Schema verification successful - all columns exist');
        } catch (error) {
            console.log('    ❌ Schema verification failed:', error.message);
            throw error;
        }
        
        console.log('==========================================');
        console.log('✅ DIRECT SCHEMA FIX COMPLETED');
        console.log('==========================================');
        console.log('🎉 The missing columns have been added to the images table!');
        console.log('🎉 Image generation should now work properly!');

    } catch (error) {
        console.log('==========================================');
        console.error('❌ DIRECT SCHEMA FIX FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

directSchemaFix();
