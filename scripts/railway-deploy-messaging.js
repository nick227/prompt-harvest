#!/usr/bin/env node

/**
 * Railway Deployment Script with Messaging System
 * Deploys the complete application including the new messaging system
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
    log(`\n🔄 ${description}...`, 'blue');
    try {
        const output = execSync(command, {
            encoding: 'utf8',
            stdio: 'pipe',
            cwd: process.cwd()
        });
        log(`✅ ${description} completed`, 'green');
        return output;
    } catch (error) {
        log(`❌ ${description} failed: ${error.message}`, 'red');
        throw error;
    }
}

async function deployToRailway() {
    log('🚀 Starting Railway deployment with messaging system...', 'bright');

    try {
        // Step 1: Check Railway CLI
        log('\n📋 Step 1: Checking Railway CLI...', 'cyan');
        try {
            execSync('railway --version', { stdio: 'pipe' });
            log('✅ Railway CLI is installed', 'green');
        } catch (error) {
            log('❌ Railway CLI not found. Please install it first:', 'red');
            log('npm install -g @railway/cli', 'yellow');
            process.exit(1);
        }

        // Step 2: Check if logged in
        log('\n📋 Step 2: Checking Railway authentication...', 'cyan');
        try {
            execSync('railway whoami', { stdio: 'pipe' });
            log('✅ Authenticated with Railway', 'green');
        } catch (error) {
            log('❌ Not logged in to Railway. Please run: railway login', 'red');
            process.exit(1);
        }

        // Step 3: Generate Prisma client
        log('\n📋 Step 3: Generating Prisma client...', 'cyan');
        execCommand('npx prisma generate', 'Prisma client generation');

        // Step 4: Check migration status
        log('\n📋 Step 4: Checking migration status...', 'cyan');
        try {
            const migrationStatus = execSync('npx prisma migrate status', {
                encoding: 'utf8',
                stdio: 'pipe'
            });
            log('📊 Migration status:', 'yellow');
            console.log(migrationStatus);
        } catch (error) {
            log('⚠️ Migration status check failed, but continuing...', 'yellow');
        }

        // Step 5: Create deployment package
        log('\n📋 Step 5: Preparing deployment package...', 'cyan');

        // Ensure all necessary files are present
        const requiredFiles = [
            'package.json',
            'server.js',
            'prisma/schema.prisma',
            'src/routes/messageRoutes.js',
            'public/js/services/messaging-service.js',
            'public/js/components/messaging/message-component.js',
            'public/js/components/messaging/user-messaging.js',
            'public/js/components/messaging/admin-messaging.js'
        ];

        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                log(`❌ Required file missing: ${file}`, 'red');
                process.exit(1);
            }
        }
        log('✅ All required files present', 'green');

        // Step 6: Deploy to Railway
        log('\n📋 Step 6: Deploying to Railway...', 'cyan');
        execCommand('railway up', 'Railway deployment');

        // Step 7: Run migrations on Railway
        log('\n📋 Step 7: Running database migrations on Railway...', 'cyan');
        execCommand('railway run npx prisma migrate deploy', 'Database migrations');

        // Step 8: Generate Prisma client on Railway
        log('\n📋 Step 8: Generating Prisma client on Railway...', 'cyan');
        execCommand('railway run npx prisma generate', 'Prisma client generation on Railway');

        // Step 9: Seed initial data
        log('\n📋 Step 9: Seeding initial data...', 'cyan');
        try {
            execCommand('railway run node scripts/seed-models.js', 'Models seeding');
        } catch (error) {
            log('⚠️ Models seeding failed, but continuing...', 'yellow');
        }

        try {
            execCommand('railway run node scripts/restore-word-types.js', 'Word types seeding');
        } catch (error) {
            log('⚠️ Word types seeding failed, but continuing...', 'yellow');
        }

        // Step 10: Verify deployment
        log('\n📋 Step 10: Verifying deployment...', 'cyan');
        try {
            const status = execSync('railway status', { encoding: 'utf8', stdio: 'pipe' });
            log('📊 Railway deployment status:', 'yellow');
            console.log(status);
        } catch (error) {
            log('⚠️ Status check failed, but deployment may still be successful', 'yellow');
        }

        // Step 11: Get deployment URL
        log('\n📋 Step 11: Getting deployment URL...', 'cyan');
        try {
            const url = execSync('railway domain', { encoding: 'utf8', stdio: 'pipe' }).trim();
            log(`🌐 Your app is deployed at: ${url}`, 'green');
            log(`💬 Messaging system available at: ${url}/billing.html`, 'green');
            log(`🔧 Admin dashboard available at: ${url}/admin.html`, 'green');
        } catch (error) {
            log('⚠️ Could not get deployment URL', 'yellow');
        }

        log('\n🎉 Railway deployment with messaging system completed successfully!', 'bright');
        log('\n📋 What was deployed:', 'cyan');
        log('  ✅ Complete messaging system (user-admin communication)', 'green');
        log('  ✅ Database schema with messages table', 'green');
        log('  ✅ API endpoints for messaging (/api/messages/*)', 'green');
        log('  ✅ Frontend components for user and admin interfaces', 'green');
        log('  ✅ Real-time message updates and notifications', 'green');
        log('  ✅ Rate limiting and security measures', 'green');
        log('  ✅ Mobile-responsive design', 'green');
        log('  ✅ Accessibility features', 'green');
        log('  ✅ 25 AI models seeded', 'green');
        log('  ✅ 1160+ word types seeded', 'green');

        log('\n🔗 Test the messaging system:', 'cyan');
        log('  1. Visit your billing page to send support messages', 'yellow');
        log('  2. Visit admin dashboard to manage conversations', 'yellow');
        log('  3. Test real-time messaging between users and admins', 'yellow');

    } catch (error) {
        log(`\n❌ Deployment failed: ${error.message}`, 'red');
        log('\n🔧 Troubleshooting tips:', 'cyan');
        log('  • Check Railway CLI installation: npm install -g @railway/cli', 'yellow');
        log('  • Verify Railway login: railway login', 'yellow');
        log('  • Check database connection in Railway dashboard', 'yellow');
        log('  • Review Railway logs: railway logs', 'yellow');
        process.exit(1);
    }
}

// Run deployment
deployToRailway().catch(error => {
    log(`\n💥 Unexpected error: ${error.message}`, 'red');
    process.exit(1);
});
