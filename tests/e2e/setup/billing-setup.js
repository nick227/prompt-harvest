/**
 * Global setup for billing flow E2E tests
 * Prepares test data and ensures database is in a known state
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function globalSetup() {
  console.log('🧪 Setting up billing E2E test environment...');

  try {
    // Ensure database is connected
    await prisma.$connect();
    console.log('✅ Database connected');

    // Clean up any existing test data
    await cleanupTestData();
    console.log('✅ Test data cleaned up');

    console.log('🎉 Billing E2E test environment ready!');

  } catch (error) {
    console.error('❌ Error setting up billing E2E test environment:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupTestData() {
  // Clean up test users (created during tests)
  await prisma.user.deleteMany({
    where: {
      email: {
        startsWith: 'billing-test-'
      }
    }
  });

  // Clean up test payments
  await prisma.stripePayment.deleteMany({
    where: {
      stripeSessionId: {
        startsWith: 'cs_test_'
      }
    }
  });

  // Clean up test credit ledger entries
  await prisma.creditLedger.deleteMany({
    where: {
      description: {
        contains: 'Test'
      }
    }
  });
}

export default globalSetup;
