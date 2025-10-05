#!/usr/bin/env node

/**
 * Create Tables on Railway
 * Simple script to create blog_posts and api_requests tables
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTables() {
    console.log('🚀 Creating tables on Railway...');
    
    try {
        // Create blog_posts table
        console.log('Creating blog_posts table...');
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
        console.log('✅ blog_posts table created');

        // Create api_requests table
        console.log('Creating api_requests table...');
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
        console.log('✅ api_requests table created');

        // Add foreign keys
        console.log('Adding foreign key constraints...');
        try {
            await prisma.$executeRaw`ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_authorId_fkey FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            console.log('✅ blog_posts foreign key added');
        } catch (error) {
            console.log('⚠️ blog_posts foreign key may already exist');
        }

        try {
            await prisma.$executeRaw`ALTER TABLE api_requests ADD CONSTRAINT api_requests_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            console.log('✅ api_requests foreign key added');
        } catch (error) {
            console.log('⚠️ api_requests foreign key may already exist');
        }

        // Verify tables
        console.log('Verifying tables...');
        const tables = await prisma.$queryRaw`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME IN ('blog_posts', 'api_requests')
        `;
        
        console.log('📊 Tables found:', tables);
        console.log('✨ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Error creating tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createTables();
