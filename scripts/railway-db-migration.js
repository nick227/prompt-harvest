#!/usr/bin/env node

/**
 * Railway Database Migration
 * This script runs inside Railway and creates the missing tables
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function createTables() {
    console.log('🚀 Creating missing tables on Railway...');

    try {
        // Check if tables exist first
        console.log('🔍 Checking existing tables...');
        const existingTables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('blog_posts', 'api_requests')
        `;

        console.log('📊 Existing tables:', existingTables);

        if (existingTables.length >= 2) {
            console.log('✅ Tables already exist, skipping creation');
            return;
        }

        // Create blog_posts table
        console.log('Creating blog_posts table...');
        await prisma.$executeRaw`
            CREATE TABLE blog_posts (
                id VARCHAR(25) NOT NULL,
                title VARCHAR(255) NOT NULL,
                slug VARCHAR(100) NOT NULL,
                content TEXT NOT NULL,
                excerpt VARCHAR(500) NULL,
                thumbnail VARCHAR(500) NULL,
                authorId VARCHAR(25) NOT NULL,
                isPublished BOOLEAN NOT NULL DEFAULT false,
                isFeatured BOOLEAN NOT NULL DEFAULT false,
                viewCount INTEGER NOT NULL DEFAULT 0,
                tags JSON NULL,
                metadata JSON NULL,
                publishedAt DATETIME(3) NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                updatedAt DATETIME(3) NOT NULL,
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;

        // Create indexes for blog_posts
        await prisma.$executeRaw`CREATE UNIQUE INDEX blog_posts_slug_key ON blog_posts(slug)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_authorId_idx ON blog_posts(authorId)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_isPublished_idx ON blog_posts(isPublished)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_isFeatured_idx ON blog_posts(isFeatured)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_publishedAt_idx ON blog_posts(publishedAt)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_createdAt_idx ON blog_posts(createdAt)`;
        await prisma.$executeRaw`CREATE INDEX blog_posts_slug_idx ON blog_posts(slug(50))`;

        console.log('✅ blog_posts table created');

        // Create api_requests table
        console.log('Creating api_requests table...');
        await prisma.$executeRaw`
            CREATE TABLE api_requests (
                id VARCHAR(25) NOT NULL,
                userId VARCHAR(25) NOT NULL,
                endpoint VARCHAR(100) NOT NULL,
                method VARCHAR(10) NOT NULL,
                requestData JSON NULL,
                responseData JSON NULL,
                statusCode INTEGER NOT NULL,
                duration INTEGER NULL,
                ipAddress VARCHAR(45) NULL,
                userAgent TEXT NULL,
                createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (id)
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `;

        // Create indexes for api_requests
        await prisma.$executeRaw`CREATE INDEX api_requests_userId_idx ON api_requests(userId)`;
        await prisma.$executeRaw`CREATE INDEX api_requests_endpoint_idx ON api_requests(endpoint)`;
        await prisma.$executeRaw`CREATE INDEX api_requests_method_idx ON api_requests(method)`;
        await prisma.$executeRaw`CREATE INDEX api_requests_statusCode_idx ON api_requests(statusCode)`;
        await prisma.$executeRaw`CREATE INDEX api_requests_createdAt_idx ON api_requests(createdAt)`;

        console.log('✅ api_requests table created');

        // Add foreign key constraints
        console.log('Adding foreign key constraints...');
        try {
            await prisma.$executeRaw`ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_authorId_fkey FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            console.log('✅ blog_posts foreign key added');
        } catch (error) {
            console.log('⚠️ blog_posts foreign key may already exist:', error.message);
        }

        try {
            await prisma.$executeRaw`ALTER TABLE api_requests ADD CONSTRAINT api_requests_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            console.log('✅ api_requests foreign key added');
        } catch (error) {
            console.log('⚠️ api_requests foreign key may already exist:', error.message);
        }

        // Verify tables
        console.log('🔍 Verifying tables...');
        const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('blog_posts', 'api_requests')
            ORDER BY TABLE_NAME
        `;

        console.log('📊 Tables created:', tables);
        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
createTables().catch(console.error);
