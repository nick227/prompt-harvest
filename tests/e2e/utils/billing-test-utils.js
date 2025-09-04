/**
 * Billing-specific test utilities for E2E tests
 * Provides helper functions for common billing test operations
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BillingTestUtils {
  /**
   * Create a test user with specified credit balance
   */
  static async createTestUser(email, password, initialCredits = 0) {
    const user = await prisma.user.create({
      data: {
        email,
        username: email.split('@')[0],
        password: password, // In real app, this would be hashed
        creditBalance: initialCredits
      }
    });

    return user;
  }

  /**
   * Create a test payment record
   */
  static async createTestPayment(userId, sessionId, amount, credits, status = 'pending') {
    const payment = await prisma.stripePayment.create({
      data: {
        stripeSessionId: sessionId,
        userId,
        amount,
        credits,
        status
      }
    });

    return payment;
  }

  /**
   * Add credits to a user's account
   */
  static async addCreditsToUser(userId, amount, description = 'Test credit addition') {
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
          type: 'addition',
          amount,
          description
        }
      });

      return { user, ledgerEntry };
    });

    return result;
  }

  /**
   * Get user's current credit balance
   */
  static async getUserCreditBalance(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true }
    });

    return user?.creditBalance || 0;
  }

  /**
   * Get user's credit history
   */
  static async getUserCreditHistory(userId, limit = 10) {
    const history = await prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return history;
  }

  /**
   * Create a test promo code
   */
  static async createTestPromoCode(code, credits, maxRedemptions = 100) {
    // Since we don't have a promo code table, we'll simulate it
    console.log(`Creating test promo code: ${code} with ${credits} credits`);
    return { code, credits, maxRedemptions };
  }

  /**
   * Redeem a promo code for a user
   */
  static async redeemPromoCode(userId, promoCode) {
    // Simulate promo code redemption by adding credits directly
    const result = await prisma.$transaction(async tx => {
      // Add credits to user
      const user = await tx.user.update({
        where: { id: userId },
        data: { creditBalance: { increment: 10 } } // Default 10 credits for test
      });

      // Create ledger entry
      const ledgerEntry = await tx.creditLedger.create({
        data: {
          userId,
          type: 'promo',
          amount: 10,
          description: `Promo code redemption: ${promoCode}`
        }
      });

      return { user, ledgerEntry };
    });

    return result;
  }

  /**
   * Simulate a Stripe webhook event
   */
  static async simulateStripeWebhook(eventType, sessionId, userId, amount, credits) {
    const webhookPayload = {
      id: `evt_${Date.now()}`,
      type: eventType,
      data: {
        object: {
          id: sessionId,
          payment_status: 'paid',
          amount_total: amount,
          metadata: {
            userId,
            credits: credits.toString()
          }
        }
      }
    };

    return webhookPayload;
  }

  /**
   * Clean up test data for a specific user
   */
  static async cleanupUserTestData(userId) {
    await prisma.$transaction(async tx => {
      // Delete credit ledger entries
      await tx.creditLedger.deleteMany({
        where: { userId }
      });

      // Delete promo code redemptions
      await tx.promoCodeRedemption.deleteMany({
        where: { userId }
      });

      // Delete stripe payments
      await tx.stripePayment.deleteMany({
        where: { userId }
      });

      // Delete user
      await tx.user.delete({
        where: { id: userId }
      });
    });
  }

  /**
   * Get test credit packages
   */
  static async getTestCreditPackages() {
    // Since we don't have a payment_packages table, return mock data
    return [
      {
        id: 'test_pkg_1',
        name: 'Test Starter Pack',
        credits: 50,
        price: 500,
        description: 'Test package with 50 credits'
      },
      {
        id: 'test_pkg_2',
        name: 'Test Pro Pack',
        credits: 200,
        price: 1500,
        description: 'Test package with 200 credits'
      },
      {
        id: 'test_pkg_3',
        name: 'Test Enterprise Pack',
        credits: 500,
        price: 3000,
        description: 'Test package with 500 credits'
      }
    ];
  }

  /**
   * Verify payment was processed correctly
   */
  static async verifyPaymentProcessing(sessionId, expectedAmount, expectedCredits) {
    const payment = await prisma.stripePayment.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        user: {
          select: { creditBalance: true }
        }
      }
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    const verification = {
      paymentExists: true,
      amountMatches: payment.amount === expectedAmount,
      creditsMatch: payment.credits === expectedCredits,
      status: payment.status,
      userBalance: payment.user.creditBalance
    };

    return verification;
  }
}

export default BillingTestUtils;
