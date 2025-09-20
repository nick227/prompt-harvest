#!/usr/bin/env node

/**
 * Initialize System Settings
 * Run: node scripts/init-system-settings.js
 *
 * This script creates the system_settings table and initializes default values.
 */

import { PrismaClient } from '@prisma/client';
import systemSettingsService from '../src/services/SystemSettingsService.js';

const prisma = new PrismaClient();

async function initializeSystemSettings() {
    try {
        console.log('🔧 Initializing system settings...');

        // Initialize default system settings
        await systemSettingsService.initializeDefaults();

        console.log('✅ System settings initialized successfully!');
        console.log('📋 Default settings created:');
        console.log('   - new_user_welcome_credits: 100');
        console.log('   - max_image_generations_per_hour: 10');
        console.log('   - maintenance_mode: false');
        console.log('   - default_image_provider: flux');

        // Display current settings
        const settings = await systemSettingsService.getAll();
        console.log('\n📊 Current system settings:');
        settings.forEach(setting => {
            console.log(`   - ${setting.key}: ${setting.convertedValue} (${setting.dataType})`);
        });

    } catch (error) {
        console.error('❌ Failed to initialize system settings:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the initialization
initializeSystemSettings();
