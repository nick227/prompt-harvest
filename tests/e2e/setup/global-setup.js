import { chromium } from '@playwright/test';
import databaseClient from '../../../src/database/PrismaClient.js';

async function globalSetup() {
  console.log('🚀 Starting E2E test setup...');
  
  try {
    // Connect to database
    await databaseClient.connect();
    console.log('✅ Database connected for E2E tests');
    
    // Create test data if needed
    await createTestData();
    
    // Start browser for setup
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Test basic connectivity
    await page.goto('http://localhost:3200/');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ E2E test setup completed');
    
    await browser.close();
    await databaseClient.disconnect();
    
  } catch (error) {
    console.error('❌ E2E test setup failed:', error);
    throw error;
  }
}

async function createTestData() {
  const prisma = databaseClient.getClient();
  
  // Check if test user exists
  const testUser = await prisma.user.findFirst({
    where: { email: 'test@example.com' }
  });
  
  if (!testUser) {
    console.log('📝 Creating test user...');
    await prisma.user.create({
      data: {
        id: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        password: '$2b$10$test.hash.for.testing',
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
  
  // Check if test image exists
  const testImage = await prisma.image.findFirst({
    where: { id: 'test-image-123' }
  });
  
  if (!testImage) {
    console.log('📝 Creating test image...');
    await prisma.image.create({
      data: {
        id: 'test-image-123',
        userId: 'test-user-123',
        prompt: 'Test prompt for E2E testing',
        original: 'Original test prompt',
        imageUrl: 'https://via.placeholder.com/512x512/FF0000/FFFFFF?text=Test+Image',
        provider: 'test-provider',
        guidance: 10,
        model: 'test-model',
        rating: 5,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }
}

export default globalSetup;
