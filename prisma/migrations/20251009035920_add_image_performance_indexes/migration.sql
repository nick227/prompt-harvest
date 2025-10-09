-- Add performance indexes for admin filtering
-- These indexes significantly improve query performance for common admin operations

-- Single column indexes
CREATE INDEX `provider` ON `images`(`provider`);
CREATE INDEX `createdAt` ON `images`(`createdAt`);

-- Composite indexes for complex queries
CREATE INDEX `userId_provider` ON `images`(`userId`, `provider`);
CREATE INDEX `provider_createdAt` ON `images`(`provider`, `createdAt`);

