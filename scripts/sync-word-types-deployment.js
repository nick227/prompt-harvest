#!/usr/bin/env node

/**
 * Deployment-based sync for word_types
 *
 * This script creates a deployment that syncs word_types data.
 * It can be run locally to prepare the sync, then deployed to Railway.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import databaseClient from '../src/database/PrismaClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DeploymentSyncer {
    constructor() {
        this.localPrisma = databaseClient.getClient();
    }

    async createSyncScript() {
        console.log('📝 Creating sync script for Railway deployment...');

        try {
            // Get local data
            const wordTypes = await this.localPrisma.word_types.findMany({
                orderBy: { word: 'asc' }
            });

            console.log(`📊 Found ${wordTypes.length} records locally`);

            // Create sync script that will run on Railway
            const syncScript = this.generateSyncScript(wordTypes);

            // Write to a file that can be deployed
            const syncFile = path.join(__dirname, '../src/scripts/sync-word-types-railway.js');
            fs.writeFileSync(syncFile, syncScript);

            console.log(`✅ Sync script created: ${syncFile}`);
            console.log('📋 Next steps:');
            console.log('1. Commit and push this script to your repository');
            console.log('2. Deploy to Railway');
            console.log('3. Run: node src/scripts/sync-word-types-railway.js');

            return wordTypes.length;

        } catch (error) {
            console.error('❌ Error creating sync script:', error);
            throw error;
        }
    }

    generateSyncScript(wordTypes) {
        const dataJson = JSON.stringify(wordTypes, null, 2);

        return `#!/usr/bin/env node

/**
 * Railway Word Types Sync Script
 *
 * This script syncs word_types data to Railway MySQL.
 * Run this script on Railway after deployment.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Word types data to sync
const wordTypesData = ${dataJson};

async function syncWordTypes() {
    console.log('🔄 Starting word_types sync on Railway...');

    try {
        console.log(\`📊 Syncing \${wordTypesData.length} word_types records...\`);

        // Clear existing data
        console.log('🗑️ Clearing existing data...');
        await prisma.word_types.deleteMany({});

        // Insert new data in batches
        const batchSize = 100;
        let processed = 0;

        for (let i = 0; i < wordTypesData.length; i += batchSize) {
            const batch = wordTypesData.slice(i, i + batchSize);

            await prisma.word_types.createMany({
                data: batch.map(record => ({
                    word: record.word,
                    types: record.types
                })),
                skipDuplicates: true
            });

            processed += batch.length;
            console.log(\`📦 Processed \${processed}/\${wordTypesData.length} records\`);
        }

        // Verify sync
        const count = await prisma.word_types.count();
        console.log(\`✅ Sync completed! \${count} records in Railway database.\`);

        // Show sample records
        const samples = await prisma.word_types.findMany({
            take: 3,
            select: {
                word: true,
                types: true
            }
        });

        console.log('📋 Sample records:');
        samples.forEach((record, index) => {
            console.log(\`  \${index + 1}. "\${record.word}" -> \${JSON.stringify(record.types).substring(0, 100)}...\`);
        });

    } catch (error) {
        console.error('❌ Sync failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run sync
syncWordTypes()
    .then(() => {
        console.log('✨ Word types sync completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Sync failed:', error);
        process.exit(1);
    });

export { syncWordTypes };
`;
    }

    async createPackageJsonScript() {
        console.log('📝 Adding sync script to package.json...');

        try {
            const packageJsonPath = path.join(__dirname, '../package.json');
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

            // Add sync script
            if (!packageJson.scripts) {
                packageJson.scripts = {};
            }

            packageJson.scripts['sync:word-types'] = 'node src/scripts/sync-word-types-railway.js';

            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

            console.log('✅ Added sync script to package.json');
            console.log('📋 You can now run: npm run sync:word-types (on Railway)');

        } catch (error) {
            console.error('❌ Error updating package.json:', error);
        }
    }

    async prepareDeployment() {
        console.log('🚀 Preparing Railway deployment sync...\n');

        try {
            const recordCount = await this.createSyncScript();
            console.log('');
            await this.createPackageJsonScript();
            console.log('');

            console.log(`✨ Deployment preparation completed!`);
            console.log(`📊 ${recordCount} word_types records ready for sync`);
            console.log('');
            console.log('📋 Next steps:');
            console.log('1. git add .');
            console.log('2. git commit -m "Add word_types sync script"');
            console.log('3. git push');
            console.log('4. Railway will auto-deploy');
            console.log('5. SSH into Railway and run: npm run sync:word-types');

        } catch (error) {
            console.error('💥 Deployment preparation failed:', error);
            throw error;
        }
    }
}

// Main execution
async function main() {
    const syncer = new DeploymentSyncer();

    try {
        await syncer.prepareDeployment();
        process.exit(0);
    } catch (error) {
        console.error('💥 Preparation failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { DeploymentSyncer };
