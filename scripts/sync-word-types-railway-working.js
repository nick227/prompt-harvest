#!/usr/bin/env node

/**
 * Working Railway CLI Sync for Word Types
 *
 * This script uses Railway CLI to sync word_types data to Railway MySQL.
 * Railway CLI provides access to the internal database network.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import databaseClient from '../src/database/PrismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WorkingRailwaySyncer {
    constructor() {
        this.localPrisma = databaseClient.getClient();
        this.tempDir = path.join(__dirname, '../temp');

        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async exportLocalData() {
        console.log('📤 Exporting local word_types data...');

        try {
            const wordTypes = await this.localPrisma.word_types.findMany({
                orderBy: { word: 'asc' }
            });

            console.log(`📊 Found ${wordTypes.length} records locally`);

            // Create SQL dump
            const sqlDump = this.createSqlDump(wordTypes);

            // Write to temporary file
            const sqlFile = path.join(this.tempDir, 'word_types_sync.sql');
            fs.writeFileSync(sqlFile, sqlDump);

            console.log(`✅ SQL dump created: ${sqlFile}`);
            return { sqlFile, recordCount: wordTypes.length };

        } catch (error) {
            console.error('❌ Error exporting local data:', error);
            throw error;
        }
    }

    createSqlDump(wordTypes) {
        const sql = [
            '-- Word Types Sync for Railway MySQL',
            '-- Generated automatically',
            '',
            'USE railway;',
            '',
            '-- Create table if not exists',
            `CREATE TABLE IF NOT EXISTS word_types (
                word VARCHAR(255) NOT NULL PRIMARY KEY,
                types JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );`,
            '',
            '-- Clear existing data',
            'DELETE FROM word_types;',
            '',
            '-- Insert word types data'
        ];

        // Add INSERT statements
        wordTypes.forEach(record => {
            const typesJson = JSON.stringify(record.types).replace(/'/g, "''");
            sql.push(`INSERT INTO word_types (word, types) VALUES ('${record.word}', '${typesJson}');`);
        });

        sql.push('');
        sql.push('-- Verify import');
        sql.push('SELECT COUNT(*) as total_records FROM word_types;');
        sql.push('SELECT "Sync completed successfully!" as status;');

        return sql.join('\n');
    }

    async executeViaRailwayCLI(sqlFile) {
        console.log('🚀 Executing SQL via Railway CLI...');

        try {
            // Use Railway CLI to connect to MySQL and execute the SQL file
            const command = `railway connect mysql < "${sqlFile}"`;

            console.log('Running Railway CLI command...');
            console.log('Command:', command);

            execSync(command, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..'),
                shell: true
            });

            console.log('✅ SQL executed successfully via Railway CLI');

        } catch (error) {
            console.error('❌ Railway CLI execution failed:', error);
            throw error;
        }
    }

    async verifySync() {
        console.log('🔍 Verifying sync...');

        try {
            const verifySql = `
                SELECT COUNT(*) as total_records FROM word_types;
                SELECT word, types FROM word_types LIMIT 3;
            `;

            const verifyFile = path.join(this.tempDir, 'verify_sync.sql');
            fs.writeFileSync(verifyFile, verifySql);

            const command = `railway connect mysql < "${verifyFile}"`;

            console.log('Running verification...');
            execSync(command, {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..'),
                shell: true
            });

            // Cleanup verify file
            fs.unlinkSync(verifyFile);

            console.log('✅ Verification completed');

        } catch (error) {
            console.error('❌ Verification failed:', error);
        }
    }

    cleanup() {
        console.log('🧹 Cleaning up temporary files...');

        try {
            const sqlFile = path.join(this.tempDir, 'word_types_sync.sql');
            if (fs.existsSync(sqlFile)) {
                fs.unlinkSync(sqlFile);
                console.log('✅ Removed SQL file');
            }
        } catch (error) {
            console.warn('⚠️ Warning during cleanup:', error.message);
        }
    }

    async sync() {
        console.log('🔄 Starting Railway CLI sync...\n');

        try {
            // Step 1: Export local data
            const { sqlFile, recordCount } = await this.exportLocalData();
            console.log('');

            // Step 2: Execute via Railway CLI
            await this.executeViaRailwayCLI(sqlFile);
            console.log('');

            // Step 3: Verify sync
            await this.verifySync();
            console.log('');

            console.log(`✨ Sync completed successfully! ${recordCount} records synced to Railway MySQL.`);

        } catch (error) {
            console.error('💥 Sync failed:', error);
            throw error;
        } finally {
            this.cleanup();
        }
    }
}

// Main execution
async function main() {
    const syncer = new WorkingRailwaySyncer();

    try {
        await syncer.sync();
        process.exit(0);
    } catch (error) {
        console.error('💥 Railway CLI sync failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { WorkingRailwaySyncer };
