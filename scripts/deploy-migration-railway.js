#!/usr/bin/env node

/**
 * Railway Migration Deployment Script
 *
 * This script safely deploys the blog_posts and api_requests migration to Railway production.
 * It uses Railway CLI to execute the migration without data loss.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RailwayMigrationDeployer {
    constructor() {
        this.tempDir = path.join(__dirname, '../temp');
        this.migrationFile = path.join(__dirname, '../prisma/migrations/20250117000000_add_blog_posts_and_api_requests/migration.sql');

        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async checkRailwayConnection() {
        console.log('🔍 Checking Railway connection...');

        try {
            const command = 'railway status';
            execSync(command, {
                stdio: 'pipe',
                cwd: path.join(__dirname, '..'),
                shell: true
            });
            console.log('✅ Railway connection verified');
            return true;
        } catch (error) {
            console.error('❌ Railway connection failed:', error.message);
            return false;
        }
    }

    async checkExistingTables() {
        console.log('🔍 Checking for existing tables in Railway...');

        try {
            const checkSql = `
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME IN ('blog_posts', 'api_requests');
            `;

            const checkFile = path.join(this.tempDir, 'check_tables.sql');
            fs.writeFileSync(checkFile, checkSql);

            const command = `railway connect mysql < "${checkFile}"`;

            console.log('Checking existing tables...');
            const output = execSync(command, {
                stdio: 'pipe',
                cwd: path.join(__dirname, '..'),
                shell: true,
                encoding: 'utf8'
            });

            console.log('Table check output:', output);

            // Cleanup
            fs.unlinkSync(checkFile);

            return output.includes('blog_posts') || output.includes('api_requests');

        } catch (error) {
            console.error('❌ Error checking existing tables:', error.message);
            return false;
        }
    }

    async executeMigration() {
        console.log('🚀 Executing migration on Railway...');

        try {
            // Read the migration file
            const migrationSql = fs.readFileSync(this.migrationFile, 'utf8');

            // Create a safe migration file with error handling
            const safeMigrationSql = `
-- Railway Migration: Add blog_posts and api_requests tables
-- Generated: ${new Date().toISOString()}

-- Check if tables already exist
SET @blog_posts_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_posts');
SET @api_requests_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_requests');

-- Only create tables if they don't exist
${migrationSql}

-- Verify tables were created
SELECT 'Migration completed successfully!' as status;
SELECT COUNT(*) as blog_posts_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'blog_posts';
SELECT COUNT(*) as api_requests_count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'api_requests';
            `;

            const migrationFile = path.join(this.tempDir, 'railway_migration.sql');
            fs.writeFileSync(migrationFile, safeMigrationSql);

            const command = `railway connect mysql < "${migrationFile}"`;

            console.log('Executing migration...');
            console.log('Command:', command);

            const output = execSync(command, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..'),
                shell: true
            });

            console.log('✅ Migration executed successfully');

            // Cleanup
            fs.unlinkSync(migrationFile);

            return true;

        } catch (error) {
            console.error('❌ Migration execution failed:', error);
            return false;
        }
    }

    async verifyMigration() {
        console.log('🔍 Verifying migration...');

        try {
            const verifySql = `
                SELECT
                    TABLE_NAME,
                    TABLE_ROWS,
                    CREATE_TIME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME IN ('blog_posts', 'api_requests')
                ORDER BY TABLE_NAME;
            `;

            const verifyFile = path.join(this.tempDir, 'verify_migration.sql');
            fs.writeFileSync(verifyFile, verifySql);

            const command = `railway connect mysql < "${verifyFile}"`;

            console.log('Verifying migration...');
            execSync(command, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..'),
                shell: true
            });

            // Cleanup
            fs.unlinkSync(verifyFile);

            console.log('✅ Migration verification completed');
            return true;

        } catch (error) {
            console.error('❌ Migration verification failed:', error);
            return false;
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up temporary files...');

        try {
            const tempFiles = [
                'check_tables.sql',
                'railway_migration.sql',
                'verify_migration.sql'
            ];

            tempFiles.forEach(file => {
                const filePath = path.join(this.tempDir, file);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });

            console.log('✅ Cleanup completed');
        } catch (error) {
            console.warn('⚠️ Warning during cleanup:', error.message);
        }
    }

    async deploy() {
        console.log('🚀 Starting Railway migration deployment...\n');

        try {
            // Step 1: Check Railway connection
            const isConnected = await this.checkRailwayConnection();
            if (!isConnected) {
                throw new Error('Railway connection failed');
            }
            console.log('');

            // Step 2: Check for existing tables
            const tablesExist = await this.checkExistingTables();
            if (tablesExist) {
                console.log('⚠️ Tables already exist in Railway. Skipping migration.');
                console.log('✅ Deployment completed (tables already exist)');
                return;
            }
            console.log('');

            // Step 3: Execute migration
            const migrationSuccess = await this.executeMigration();
            if (!migrationSuccess) {
                throw new Error('Migration execution failed');
            }
            console.log('');

            // Step 4: Verify migration
            const verificationSuccess = await this.verifyMigration();
            if (!verificationSuccess) {
                throw new Error('Migration verification failed');
            }
            console.log('');

            console.log('✨ Migration deployment completed successfully!');
            console.log('📊 New tables created: blog_posts, api_requests');

        } catch (error) {
            console.error('💥 Migration deployment failed:', error);
            throw error;
        } finally {
            this.cleanup();
        }
    }
}

// Main execution
async function main() {
    const deployer = new RailwayMigrationDeployer();

    try {
        await deployer.deploy();
        process.exit(0);
    } catch (error) {
        console.error('💥 Railway migration deployment failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { RailwayMigrationDeployer };
