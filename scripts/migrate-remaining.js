#!/usr/bin/env node

import databaseClient from '../src/database/PrismaClient.js';
import DB from '../db/DB.js';

console.log('🚀 Migrating remaining data...');

async function migrateRemaining() {
    try {
        // Connect to databases
        await databaseClient.connect();
        const prisma = databaseClient.getClient();
        const usersDB = new DB('users.db');
        const imagesDB = new DB('images.db');

        console.log('✅ Connected to databases');

        // Migrate remaining users
        console.log('\n👥 Migrating remaining users...');
        const neDBUsers = await usersDB.find({});
        const mysqlUsers = await prisma.user.findMany();

        console.log(`📁 NeDB users: ${neDBUsers.length}`);
        console.log(`🗄️  MySQL users: ${mysqlUsers.length}`);

        let userMigrated = 0;
        for (const user of neDBUsers) {
            const exists = await prisma.user.findFirst({
                where: { email: user.email }
            });

            if (!exists) {
                const username = user.username || user.email.split('@')[0];
                await prisma.user.create({
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
                console.log(`✅ Migrated user: ${user.email}`);
                userMigrated++;
            } else {
                console.log(`⚠️  User ${user.email} already exists`);
            }
        }

        // Migrate images
        console.log('\n🖼️  Migrating images...');
        const neDBImages = await imagesDB.find({});
        console.log(`📁 Found ${neDBImages.length} images in NeDB`);

        let imageMigrated = 0;
        let imageSkipped = 0;

        for (const image of neDBImages) {
            try {
                const exists = await prisma.image.findFirst({
                    where: { id: image._id || image.id }
                });

                if (!exists) {
                    await prisma.image.create({
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
                    imageMigrated++;

                    if (imageMigrated % 50 === 0) {
                        console.log(`✅ Migrated ${imageMigrated} images...`);
                    }
                } else {
                    imageSkipped++;
                }
            } catch (error) {
                console.error(`❌ Failed to migrate image ${image._id}:`, error.message);
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`Users: ${userMigrated} migrated`);
        console.log(`Images: ${imageMigrated} migrated, ${imageSkipped} skipped`);

        await databaseClient.disconnect();
        console.log('\n✅ Migration completed');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    }
}

migrateRemaining();
