#!/usr/bin/env node

/**
 * Railway Deployment Migration Script
 * This script runs during Railway deployment to ensure tables exist
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ensureTablesExist() {
    console.log('🔍 Checking if blog_posts and api_requests tables exist...');

    try {
        // Check if tables exist
        const existingTables = await prisma.$queryRaw`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME IN ('blog_posts', 'api_requests')
        `;

        console.log('📊 Existing tables:', existingTables);

        if (existingTables.length >= 2) {
            console.log('✅ Tables already exist, no migration needed');
            return;
        }

        console.log('🚀 Creating missing tables...');

        // Create blog_posts table
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS blog_posts (
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

        // Create api_requests table
        await prisma.$executeRaw`
            CREATE TABLE IF NOT EXISTS api_requests (
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

        // Add indexes
        await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts(slug)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_authorId_idx ON blog_posts(authorId)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_isPublished_idx ON blog_posts(isPublished)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_isFeatured_idx ON blog_posts(isFeatured)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_publishedAt_idx ON blog_posts(publishedAt)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_createdAt_idx ON blog_posts(createdAt)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug(50))`;

        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_userId_idx ON api_requests(userId)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_endpoint_idx ON api_requests(endpoint)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_method_idx ON api_requests(method)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_statusCode_idx ON api_requests(statusCode)`;
        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_createdAt_idx ON api_requests(createdAt)`;

        // Add foreign key constraints
        try {
            await prisma.$executeRaw`ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_authorId_fkey FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
        } catch (error) {
            console.log('⚠️ blog_posts foreign key may already exist');
        }

        try {
            await prisma.$executeRaw`ALTER TABLE api_requests ADD CONSTRAINT api_requests_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
        } catch (error) {
            console.log('⚠️ api_requests foreign key may already exist');
        }

        console.log('✅ Tables created successfully!');

    } catch (error) {
        console.error('❌ Error ensuring tables exist:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
ensureTablesExist().catch(console.error);
