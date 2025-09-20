#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

class DatabaseSetup {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async setupDatabase() {
        console.log('🗄️  MySQL Database Setup\n');

        try {
            // Test connection
            console.log('🔍 Testing database connection...');
            await this.prisma.$connect();
            console.log('✅ Database connection successful!\n');

            // Check if database exists
            const databases = await this.prisma.$queryRaw`SHOW DATABASES`;
            const dbNames = databases.map(db => Object.values(db)[0]);

            if (dbNames.includes('image_harvest')) {
                console.log('✅ Database "image_harvest" already exists');
            } else {
                console.log('❌ Database "image_harvest" not found');
                console.log('\n📋 Please create the database manually:');
                console.log('1. Open phpMyAdmin: http://localhost/phpmyadmin');
                console.log('2. Click "New" to create a new database');
                console.log('3. Enter "image_harvest" as the database name');
                console.log('4. Click "Create"\n');

                const answer = await this.askQuestion('Have you created the database? (y/n): ');
                if (answer.toLowerCase() !== 'y') {
                    console.log('❌ Please create the database first');
                    process.exit(1);
                }
            }

            // Test with the specific database
            console.log('🔍 Testing connection to image_harvest database...');
            await this.prisma.$queryRaw`USE image_harvest`;
            console.log('✅ Successfully connected to image_harvest database!\n');

            // Show current tables
            const tables = await this.prisma.$queryRaw`SHOW TABLES`;
            if (tables.length === 0) {
                console.log('📋 Database is empty - ready for migration');
            } else {
                console.log('📋 Existing tables:');
                tables.forEach(table => {
                    const tableName = Object.values(table)[0];
                    console.log(`  - ${tableName}`);
                });
            }

            console.log('\n✅ Database setup complete!');
            console.log('🚀 Ready to run migrations');

        } catch (error) {
            console.error('❌ Database setup failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Make sure MySQL is running in WAMP64');
            console.log('2. Check your MYSQL_URL in .env file');
            console.log('3. Verify MySQL credentials');
            console.log('4. Ensure the database "image_harvest" exists');

            if (error.message.includes('Access denied')) {
                console.log('\n🔑 Common solutions:');
                console.log('- Default WAMP64 MySQL credentials: root (no password)');
                console.log('- Try: MYSQL_URL="mysql://root:@localhost:3306/image_harvest"');
            }
        } finally {
            await this.prisma.$disconnect();
            rl.close();
        }
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            rl.question(question, (answer) => {
                resolve(answer);
            });
        });
    }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const setup = new DatabaseSetup();
    setup.setupDatabase();
}

export default DatabaseSetup;
