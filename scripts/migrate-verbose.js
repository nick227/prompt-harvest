#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Starting verbose data migration...\n');

class VerboseDataMigrator {
    constructor() {
        this.prisma = null;
        this.dataPath = path.join(__dirname, '../data');
        this.migrationLog = [];
    }

    // Initialize NeDB connections
    initializeNeDB() {
        console.log('📁 Initializing NeDB connections...');

        this.usersDB = new DB('users.db');
        this.imagesDB = new DB('images.db');
        this.likesDB = new DB('likes.db');
        this.tagsDB = new DB('tags.db');
        this.promptsDB = new DB('prompts.db');
        this.wordTypesDB = new DB('word-types.db');
        this.categoriesDB = new DB('categories.db');
        this.multipliersDB = new DB('multipliers.db');
        this.promptClausesDB = new DB('prompt-clauses.db');

        console.log('✅ NeDB connections initialized');
    }

    // Connect to MySQL
    async connectToMySQL() {
        try {
            await databaseClient.connect();
            this.prisma = databaseClient.getClient();
            console.log('✅ MySQL connection established');
        } catch (error) {
            console.error('❌ Failed to connect to MySQL:', error);
            process.exit(1);
        }
    }

    // Migrate users
    async migrateUsers() {
        console.log('\n👥 Migrating users...');

        try {
            const users = await this.usersDB.find({});
            console.log(`📊 Found ${users.length} users in NeDB`);
            let migratedCount = 0;

            for (const user of users) {
                try {
                    // Generate username from email if missing
                    const username = user.username || user.email.split('@')[0];
                    
                    await this.prisma.user.create({
                        data: {
                            id: user._id || user.id,
                            email: user.email,
                            username: username,
                            password: user.password,
                            isAdmin: user.isAdmin || false,
                            createdAt: new Date(user.createdAt || user.timestamp || Date.now()),
                            updatedAt: new Date(user.updatedAt || user.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                    console.log(`✅ Migrated user: ${user.email} (${username})`);
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  User ${user.email} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate user ${user.email}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Users: ${migratedCount}/${users.length} migrated`);
            console.log(`✅ Users migration completed: ${migratedCount}/${users.length}`);
        } catch (error) {
            console.error('❌ Users migration failed:', error);
        }
    }

    // Migrate images
    async migrateImages() {
        console.log('\n🖼️  Migrating images...');

        try {
            const images = await this.imagesDB.find({});
            console.log(`📊 Found ${images.length} images in NeDB`);
            let migratedCount = 0;

            for (const image of images) {
                try {
                    await this.prisma.image.create({
                        data: {
                            id: image._id || image.id,
                            userId: image.userId,
                            prompt: image.prompt || '',
                            original: image.original || '',
                            imageUrl: image.imageUrl || '',
                            provider: image.provider || 'unknown',
                            guidance: image.guidance || 10,
                            model: image.model || null,
                            rating: image.rating || null,
                            createdAt: new Date(image.createdAt || image.timestamp || Date.now()),
                            updatedAt: new Date(image.updatedAt || image.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                    console.log(`✅ Migrated image: ${image._id} (${image.provider})`);
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  Image ${image._id} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate image ${image._id}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Images: ${migratedCount}/${images.length} migrated`);
            console.log(`✅ Images migration completed: ${migratedCount}/${images.length}`);
        } catch (error) {
            console.error('❌ Images migration failed:', error);
        }
    }

    // Run complete migration
    async runMigration() {
        console.log('🚀 Starting data migration from NeDB to MySQL...\n');

        try {
            // Initialize connections
            this.initializeNeDB();
            await this.connectToMySQL();

            // Run migrations in order (respecting foreign key constraints)
            await this.migrateUsers();
            await this.migrateImages();

            // Generate migration report
            this.generateMigrationReport();

            console.log('\n🎉 Migration completed successfully!');

        } catch (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        } finally {
            await databaseClient.disconnect();
        }
    }

    // Generate migration report
    generateMigrationReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: this.migrationLog,
            status: 'completed'
        };

        const reportPath = path.join(__dirname, '../migration-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

        console.log('\n📊 Migration Report:');
        console.log('==================');
        this.migrationLog.forEach(log => console.log(`- ${log}`));
        console.log(`\n📄 Full report saved to: ${reportPath}`);
    }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const migrator = new VerboseDataMigrator();
    migrator.runMigration();
}

export default VerboseDataMigrator;
