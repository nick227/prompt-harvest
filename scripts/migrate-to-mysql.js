#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataMigrator {
    constructor() {
        this.prisma = databaseClient.getClient();
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
            console.log('✅ MySQL connection established');
        } catch (error) {
            console.error('❌ Failed to connect to MySQL:', error);
            process.exit(1);
        }
    }

    // Migrate users
    async migrateUsers() {
        console.log('👥 Migrating users...');

        try {
            const users = await this.usersDB.find({});
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
                    console.log(`✅ Migrated user: ${user.email}`);
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
        console.log('🖼️  Migrating images...');

        try {
            const images = await this.imagesDB.find({});
            let migratedCount = 0;

            for (const image of images) {
                try {
                    await this.prisma.image.create({
                        data: {
                            id: image._id || image.id,
                            userId: image.userId,
                            prompt: image.prompt || '',
                            original: image.original || '',
                            imageUrl: image.imageUrl || image.url || '',
                            provider: image.provider || 'unknown',
                            guidance: image.guidance || 10,
                            model: image.model || null,
                            rating: image.rating || null,
                            createdAt: new Date(image.createdAt || image.timestamp || Date.now()),
                            updatedAt: new Date(image.updatedAt || image.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
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

    // Migrate likes
    async migrateLikes() {
        console.log('❤️  Migrating likes...');

        try {
            const likes = await this.likesDB.find({});
            let migratedCount = 0;

            for (const like of likes) {
                try {
                    await this.prisma.likes.create({
                        data: {
                            id: like._id || like.id,
                            userId: like.userId,
                            imageId: like.imageId,
                            createdAt: new Date(like.createdAt || like.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  Like ${like._id} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate like ${like._id}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Likes: ${migratedCount}/${likes.length} migrated`);
            console.log(`✅ Likes migration completed: ${migratedCount}/${likes.length}`);
        } catch (error) {
            console.error('❌ Likes migration failed:', error);
        }
    }

    // Migrate tags
    async migrateTags() {
        console.log('🏷️  Migrating tags...');

        try {
            const tags = await this.tagsDB.find({});
            let migratedCount = 0;

            for (const tag of tags) {
                try {
                    await this.prisma.tags.create({
                        data: {
                            id: tag._id || tag.id,
                            userId: tag.userId,
                            imageId: tag.imageId,
                            tag: tag.tag,
                            createdAt: new Date(tag.createdAt || tag.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  Tag ${tag._id} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate tag ${tag._id}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Tags: ${migratedCount}/${tags.length} migrated`);
            console.log(`✅ Tags migration completed: ${migratedCount}/${tags.length}`);
        } catch (error) {
            console.error('❌ Tags migration failed:', error);
        }
    }

    // Migrate prompts
    async migratePrompts() {
        console.log('💬 Migrating prompts...');

        try {
            const prompts = await this.promptsDB.find({});
            let migratedCount = 0;

            for (const prompt of prompts) {
                try {
                    await this.prisma.prompts.create({
                        data: {
                            id: prompt._id || prompt.id,
                            userId: prompt.userId,
                            prompt: prompt.prompt || '',
                            original: prompt.original || '',
                            provider: prompt.provider || 'unknown',
                            guidance: prompt.guidance || 10,
                            createdAt: new Date(prompt.createdAt || prompt.timestamp || Date.now()),
                            updatedAt: new Date(prompt.updatedAt || prompt.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  Prompt ${prompt._id} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate prompt ${prompt._id}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Prompts: ${migratedCount}/${prompts.length} migrated`);
            console.log(`✅ Prompts migration completed: ${migratedCount}/${prompts.length}`);
        } catch (error) {
            console.error('❌ Prompts migration failed:', error);
        }
    }

    // Migrate word types
    async migrateWordTypes() {
        console.log('📚 Migrating word types...');

        try {
            const wordTypes = await this.wordTypesDB.find({});
            let migratedCount = 0;

            for (const wordType of wordTypes) {
                try {
                    await this.prisma.word_types.create({
                        data: {
                            id: wordType._id || wordType.id,
                            word: wordType.word,
                            types: wordType.types || [],
                            examples: wordType.examples || null,
                            createdAt: new Date(wordType.createdAt || wordType.timestamp || Date.now()),
                            updatedAt: new Date(wordType.updatedAt || wordType.timestamp || Date.now())
                        }
                    });
                    migratedCount++;
                } catch (error) {
                    if (error.code === 'P2002') {
                        console.log(`⚠️  Word type ${wordType.word} already exists, skipping...`);
                    } else {
                        console.error(`❌ Failed to migrate word type ${wordType.word}:`, error.message);
                    }
                }
            }

            this.migrationLog.push(`Word Types: ${migratedCount}/${wordTypes.length} migrated`);
            console.log(`✅ Word types migration completed: ${migratedCount}/${wordTypes.length}`);
        } catch (error) {
            console.error('❌ Word types migration failed:', error);
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
            await this.migrateLikes();
            await this.migrateTags();
            await this.migratePrompts();
            await this.migrateWordTypes();

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
    const migrator = new DataMigrator();
    migrator.runMigration();
}

export default DataMigrator;
