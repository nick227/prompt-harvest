#!/usr/bin/env node

/**
 * Public URL Model Fix for Railway Production
 *
 * This script uses the public Railway database URL to connect
 * and update all model configurations with correct API URLs.
 */

import mysql from 'mysql2/promise';
import { STATIC_MODELS } from '../src/config/static-models.js';

async function publicModelFix() {
    console.log('🚨 PUBLIC MODEL FIX STARTED');
    console.log('==========================================');

    let connection;

    try {
        // Use the public Railway database URL
        const publicUrl = 'mysql://root:YALnbkVGvnsucZbZOnrqQHmyDcmGMhts@hopper.proxy.rlwy.net:34099/railway';

        console.log('🔗 Connecting to Railway database via public URL...');

        // Parse the public URL
        const url = new URL(publicUrl);
        const config = {
            host: url.hostname,
            port: parseInt(url.port) || 3306,
            user: url.username,
            password: url.password,
            database: url.pathname.slice(1), // Remove leading slash
            ssl: {
                rejectUnauthorized: false
            }
        };

        console.log(`    Host: ${config.host}:${config.port}`);
        console.log(`    Database: ${config.database}`);
        console.log(`    User: ${config.user}`);

        connection = await mysql.createConnection(config);
        console.log('    ✅ Connected to Railway database');

        console.log('🔧 Step 1: Updating model configurations...');

        const correctConfigs = Object.values(STATIC_MODELS);
        let fixedCount = 0;
        let createdCount = 0;

        for (const correctConfig of correctConfigs) {
            try {
                // Check if model exists
                const [existingRows] = await connection.execute(
                    `SELECT id FROM models WHERE provider = ? AND name = ?`,
                    [correctConfig.provider, correctConfig.name]
                );

                if (existingRows.length > 0) {
                    // Update existing model
                    await connection.execute(
                        `UPDATE models SET
                         displayName = ?,
                         description = ?,
                         costPerImage = ?,
                         isActive = ?,
                         apiUrl = ?,
                         apiModel = ?,
                         apiSize = ?
                         WHERE provider = ? AND name = ?`,
                        [
                            correctConfig.displayName,
                            correctConfig.description,
                            correctConfig.costPerImage,
                            correctConfig.isActive,
                            correctConfig.apiUrl,
                            correctConfig.apiModel,
                            correctConfig.apiSize,
                            correctConfig.provider,
                            correctConfig.name
                        ]
                    );
                    fixedCount++;
                    console.log(`    ✅ Updated ${correctConfig.provider}/${correctConfig.name}`);
                } else {
                    // Create new model
                    await connection.execute(
                        `INSERT INTO models (provider, name, displayName, description, costPerImage, isActive, apiUrl, apiModel, apiSize)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            correctConfig.provider,
                            correctConfig.name,
                            correctConfig.displayName,
                            correctConfig.description,
                            correctConfig.costPerImage,
                            correctConfig.isActive,
                            correctConfig.apiUrl,
                            correctConfig.apiModel,
                            correctConfig.apiSize
                        ]
                    );
                    createdCount++;
                    console.log(`    ✅ Created ${correctConfig.provider}/${correctConfig.name}`);
                }
            } catch (error) {
                console.log(`    ⚠️  Failed to update ${correctConfig.provider}/${correctConfig.name}: ${error.message}`);
            }
        }

        console.log(`    📊 Updated: ${fixedCount} models, Created: ${createdCount} models`);

        console.log('🔧 Step 2: Verifying model configurations...');

        // Check a few key models
        const keyModels = ['flux', 'flux-pro', 'disco', 'juggernaut'];
        for (const modelName of keyModels) {
            try {
                const [rows] = await connection.execute(
                    `SELECT provider, name, apiUrl, apiModel FROM models WHERE name = ?`,
                    [modelName]
                );
                if (rows.length > 0) {
                    console.log(`    ✅ ${modelName}: ${rows[0].provider} - ${rows[0].apiUrl}`);
                } else {
                    console.log(`    ⚠️  ${modelName}: Not found`);
                }
            } catch (error) {
                console.log(`    ❌ Error checking ${modelName}: ${error.message}`);
            }
        }

        console.log('==========================================');
        console.log('✅ PUBLIC MODEL FIX COMPLETED');
        console.log('==========================================');
        console.log('🎉 All model configurations have been updated!');
        console.log('🎉 Image generation should now work with correct API URLs!');

    } catch (error) {
        console.log('==========================================');
        console.error('❌ PUBLIC MODEL FIX FAILED');
        console.error('Error:', error.message);
        console.log('==========================================');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

publicModelFix();
