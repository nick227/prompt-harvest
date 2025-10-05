#!/usr/bin/env node

/**
 * Execute Railway Migration Script
 * 
 * This script executes the blog_posts and api_requests migration on Railway production.
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RailwayMigrationExecutor {
    constructor() {
        this.prisma = new PrismaClient();
    }

    async checkExistingTables() {
        console.log('🔍 Checking for existing tables...');
        
        try {
            const result = await this.prisma.$queryRaw`
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME IN ('blog_posts', 'api_requests')
            `;
            
            console.log('📊 Existing tables:', result);
            return result.length > 0;
        } catch (error) {
            console.error('❌ Error checking existing tables:', error);
            return false;
        }
    }

    async executeMigration() {
        console.log('🚀 Executing migration on Railway...');
        
        try {
            // Create blog_posts table
            await this.prisma.$executeRaw`
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

            // Create indexes for blog_posts
            await this.prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts(slug)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_authorId_idx ON blog_posts(authorId)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_isPublished_idx ON blog_posts(isPublished)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_isFeatured_idx ON blog_posts(isFeatured)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_publishedAt_idx ON blog_posts(publishedAt)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_createdAt_idx ON blog_posts(createdAt)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug(50))`;

            // Create api_requests table
            await this.prisma.$executeRaw`
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

            // Create indexes for api_requests
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_userId_idx ON api_requests(userId)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_endpoint_idx ON api_requests(endpoint)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_method_idx ON api_requests(method)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_statusCode_idx ON api_requests(statusCode)`;
            await this.prisma.$executeRaw`CREATE INDEX IF NOT EXISTS api_requests_createdAt_idx ON api_requests(createdAt)`;

            // Add foreign key constraints
            try {
                await this.prisma.$executeRaw`ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_authorId_fkey FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            } catch (error) {
                console.log('⚠️ Foreign key constraint for blog_posts may already exist');
            }

            try {
                await this.prisma.$executeRaw`ALTER TABLE api_requests ADD CONSTRAINT api_requests_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE`;
            } catch (error) {
                console.log('⚠️ Foreign key constraint for api_requests may already exist');
            }

            console.log('✅ Migration executed successfully');
            return true;

        } catch (error) {
            console.error('❌ Migration execution failed:', error);
            return false;
        }
    }

    async verifyMigration() {
        console.log('🔍 Verifying migration...');
        
        try {
            const result = await this.prisma.$queryRaw`
                SELECT 
                    TABLE_NAME,
                    TABLE_ROWS,
                    CREATE_TIME
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME IN ('blog_posts', 'api_requests')
                ORDER BY TABLE_NAME
            `;
            
            console.log('📊 Migration verification:', result);
            return result.length === 2;
        } catch (error) {
            console.error('❌ Migration verification failed:', error);
            return false;
        }
    }

    async execute() {
        console.log('🚀 Starting Railway migration execution...\n');
        
        try {
            // Step 1: Check existing tables
            const tablesExist = await this.checkExistingTables();
            if (tablesExist) {
                console.log('⚠️ Tables already exist in Railway. Migration may not be needed.');
            }
            console.log('');
            
            // Step 2: Execute migration
            const migrationSuccess = await this.executeMigration();
            if (!migrationSuccess) {
                throw new Error('Migration execution failed');
            }
            console.log('');
            
            // Step 3: Verify migration
            const verificationSuccess = await this.verifyMigration();
            if (!verificationSuccess) {
                throw new Error('Migration verification failed');
            }
            console.log('');
            
            console.log('✨ Migration execution completed successfully!');
            console.log('📊 New tables created: blog_posts, api_requests');
            
        } catch (error) {
            console.error('💥 Migration execution failed:', error);
            throw error;
        } finally {
            await this.prisma.$disconnect();
        }
    }
}

// Main execution
async function main() {
    const executor = new RailwayMigrationExecutor();
    
    try {
        await executor.execute();
        process.exit(0);
    } catch (error) {
        console.error('💥 Railway migration execution failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { RailwayMigrationExecutor };
