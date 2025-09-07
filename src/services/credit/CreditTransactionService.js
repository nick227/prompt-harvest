/**
 * Credit Transaction Service
 * Handles credit additions, debits, and refunds
 */

import databaseClient from '../../database/PrismaClient.js';

const prisma = databaseClient.getClient();

export class CreditTransactionService {

    /**
     * Add credits to user account with ledger entry
     */
    // eslint-disable-next-line max-params
    async addCredits(userId, amount, type = 'purchase', description, metadata = {}) {
        // Input validation
        this.validateAddCreditsInput(userId, amount, description);

        try {
            const result = await prisma.$transaction(async tx => {
                // Update user balance
                const user = await tx.user.update({
                    where: { id: userId },
                    data: { creditBalance: { increment: amount } }
                });

                // Create ledger entry
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type,
                        amount,
                        description,
                        stripePaymentId: metadata.stripePaymentId || null,
                        promoCodeId: metadata.promoCodeId || null,
                        metadata: metadata.additional ? JSON.stringify(metadata.additional) : null
                    }
                });

                return { newBalance: user.creditBalance, ledgerEntry };
            }, { timeout: 10000 });

            console.log(
                `💳 TRANSACTION-SERVICE: Added ${amount} credits to user ${userId}. ` +
                `New balance: ${result.newBalance}`
            );

            return result;

        } catch (error) {
            console.error('💳 TRANSACTION-SERVICE: Error adding credits:', error);
            throw error;
        }
    }

    /**
     * Debit credits from user account
     */
    async debitCredits(userId, amount, description, metadata = {}) {
        // Input validation
        this.validateDebitCreditsInput(userId, amount, description);

        try {
            const result = await prisma.$transaction(async tx => {
                // Check current balance
                const user = await tx.user.findUnique({
                    where: { id: userId },
                    select: { creditBalance: true }
                });

                if (!user) {
                    throw new Error(`User not found: ${userId}`);
                }

                if (user.creditBalance < amount) {
                    throw new Error(`Insufficient credits. Required: ${amount}, Available: ${user.creditBalance}`);
                }

                // Update user balance
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { creditBalance: { decrement: amount } }
                });

                // Create ledger entry (negative amount for debit)
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type: 'debit',
                        amount: -amount,
                        description,
                        metadata: metadata ? JSON.stringify(metadata) : null
                    }
                });

                return { newBalance: updatedUser.creditBalance, ledgerEntry };
            }, { timeout: 10000 });

            console.log(
                `💳 TRANSACTION-SERVICE: Debited ${amount} credits from user ${userId}. ` +
                `New balance: ${result.newBalance}`
            );

            return result;

        } catch (error) {
            console.error('💳 TRANSACTION-SERVICE: Error debiting credits:', error);
            throw error;
        }
    }

    /**
     * Refund credits (reverse a previous debit)
     */
    async refundCredits(userId, amount, description, metadata = {}) {
        // Input validation
        this.validateRefundCreditsInput(userId, amount, description);

        try {
            const result = await prisma.$transaction(async tx => {
                // Update user balance (add back the credits)
                const user = await tx.user.update({
                    where: { id: userId },
                    data: { creditBalance: { increment: amount } }
                });

                // Create ledger entry (positive amount for refund)
                const ledgerEntry = await tx.creditLedger.create({
                    data: {
                        userId,
                        type: 'refund',
                        amount,
                        description,
                        stripePaymentId: metadata.stripePaymentId || null,
                        metadata: metadata ? JSON.stringify(metadata) : null
                    }
                });

                return { newBalance: user.creditBalance, ledgerEntry };
            }, { timeout: 10000 });

            console.log(
                `💳 TRANSACTION-SERVICE: Refunded ${amount} credits to user ${userId}. ` +
                `New balance: ${result.newBalance}`
            );

            return result;

        } catch (error) {
            console.error('💳 TRANSACTION-SERVICE: Error refunding credits:', error);
            throw error;
        }
    }

    /**
     * Validate add credits input
     */
    validateAddCreditsInput(userId, amount, description) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (amount <= 0) {
            throw new Error(`Invalid credit amount: ${amount}. Amount must be positive.`);
        }
        if (!description || typeof description !== 'string') {
            throw new Error('Description is required and must be a string');
        }
        if (description.length > 255) {
            throw new Error('Description must be 255 characters or less');
        }
    }

    /**
     * Validate debit credits input
     */
    validateDebitCreditsInput(userId, amount, description) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (amount <= 0) {
            throw new Error(`Invalid debit amount: ${amount}. Amount must be positive.`);
        }
        if (!description || typeof description !== 'string') {
            throw new Error('Description is required and must be a string');
        }
        if (description.length > 255) {
            throw new Error('Description must be 255 characters or less');
        }
    }

    /**
     * Validate refund credits input
     */
    validateRefundCreditsInput(userId, amount, description) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        if (amount <= 0) {
            throw new Error(`Invalid refund amount: ${amount}. Amount must be positive.`);
        }
        if (!description || typeof description !== 'string') {
            throw new Error('Description is required and must be a string');
        }
        if (description.length > 255) {
            throw new Error('Description must be 255 characters or less');
        }
    }
}

export default new CreditTransactionService();
