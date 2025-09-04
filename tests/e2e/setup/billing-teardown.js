/**
 * Global teardown for billing flow E2E tests
 * Cleans up test data and ensures database is left in a clean state
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function globalTeardown() {
  console.log('🧹 Cleaning up billing E2E test environment...');

  try {
    // Ensure database is connected
    await prisma.$connect();
    console.log('✅ Database connected for cleanup');

    // Clean up all test data
    await cleanupAllTestData();
    console.log('✅ All test data cleaned up');

    console.log('🎉 Billing E2E test environment cleaned up!');

  } catch (error) {
    console.error('❌ Error cleaning up billing E2E test environment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupAllTestData() {
  // Clean up test users
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'billing-test-'
      }
    }
  });
  console.log(`🗑️ Deleted ${deletedUsers.count} test users`);

  // Clean up test payments
  const deletedPayments = await prisma.stripePayment.deleteMany({
    where: {
      stripeSessionId: {
        startsWith: 'cs_test_'
      }
    }
  });
  console.log(`🗑️ Deleted ${deletedPayments.count} test payments`);

  // Clean up test credit ledger entries
  const deletedLedgerEntries = await prisma.creditLedger.deleteMany({
    where: {
      description: {
        contains: 'Test'
      }
    }
  });
  console.log(`🗑️ Deleted ${deletedLedgerEntries.count} test ledger entries`);

  // Clean up test transactions
  const deletedTransactions = await prisma.transaction.deleteMany({
    where: {
      provider: {
        contains: 'test'
      }
    }
  });
  console.log(`🗑️ Deleted ${deletedTransactions.count} test transactions`);
}

export default globalTeardown;
