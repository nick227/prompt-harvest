#!/usr/bin/env node

/**
 * Add initial credits to existing users
 * Run: node scripts/add-initial-credits.js [amount]
 */

import { PrismaClient } from '@prisma/client';
import CreditService from '../src/services/CreditService.js';

const prisma = new PrismaClient();

const INITIAL_CREDITS = parseInt(process.argv[2]) || 25; // Default 25 credits

async function addInitialCredits() {
    try {
        console.log(`💳 Adding ${INITIAL_CREDITS} initial credits to all users...`);

        // Get all users who don't have credits yet
        const users = await prisma.user.findMany({
            where: {
                creditBalance: 0
            },
            select: {
                id: true,
                email: true,
                creditBalance: true
            }
        });

        if (users.length === 0) {
            console.log('✅ No users need initial credits');
            return;
        }

        console.log(`📝 Found ${users.length} users to credit`);

        let successCount = 0;
        let errorCount = 0;

        for (const user of users) {
            try {
                await CreditService.addCredits(
                    user.id,
                    INITIAL_CREDITS,
                    'adjustment',
                    `Initial credit grant - ${INITIAL_CREDITS} credits`,
                    { reason: 'migration', grantType: 'initial' }
                );

                console.log(`✅ Added ${INITIAL_CREDITS} credits to ${user.email}`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to add credits to ${user.email}:`, error.message);
                errorCount++;
            }
        }

        console.log(`💳 Initial credit grant completed!`);
        console.log(`   ✅ Success: ${successCount} users`);
        console.log(`   ❌ Errors: ${errorCount} users`);

        if (errorCount > 0) {
            console.log('⚠️  Some users failed to receive credits. Check logs above.');
        }

    } catch (error) {
        console.error('❌ Error adding initial credits:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

addInitialCredits();
