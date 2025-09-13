-- Add missing fields to images table
ALTER TABLE `images` ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `images` ADD COLUMN `modelId` VARCHAR(25) NULL;
ALTER TABLE `images` ADD COLUMN `taggedAt` DATETIME(3) NULL;
ALTER TABLE `images` ADD COLUMN `taggingMetadata` JSON NULL;
ALTER TABLE `images` ADD COLUMN `tags` JSON NULL;

-- Add indexes for the new fields
CREATE INDEX `isPublic` ON `images`(`isPublic`);
CREATE INDEX `userId_isPublic` ON `images`(`userId`, `isPublic`);
CREATE INDEX `images_modelId_idx` ON `images`(`modelId`);
CREATE INDEX `taggedAt` ON `images`(`taggedAt`);

-- Add missing fields to users table
ALTER TABLE `users` ADD COLUMN `creditBalance` INTEGER NOT NULL DEFAULT 0;

-- Add missing fields to credit_ledger table
ALTER TABLE `credit_ledger` ADD COLUMN `promoCodeId` VARCHAR(25) NULL;

-- Create missing tables if they don't exist
CREATE TABLE IF NOT EXISTS `providers` (
    `id` VARCHAR(25) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `apiEndpoint` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `providers_name_key`(`name`),
    INDEX `providers_name_idx`(`name`),
    INDEX `providers_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `models` (
    `id` VARCHAR(25) NOT NULL,
    `providerId` VARCHAR(25) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `costPerImage` INTEGER NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `models_providerId_idx`(`providerId`),
    INDEX `models_name_idx`(`name`),
    INDEX `models_isActive_idx`(`isActive`),
    INDEX `models_costPerImage_idx`(`costPerImage`),
    UNIQUE INDEX `providerId_name`(`providerId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `packages` (
    `id` VARCHAR(25) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `credits` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isPopular` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `packages_name_key`(`name`),
    INDEX `packages_name_idx`(`name`),
    INDEX `packages_isActive_idx`(`isActive`),
    INDEX `packages_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `violations` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NULL,
    `userEmail` VARCHAR(255) NULL,
    `username` VARCHAR(100) NULL,
    `violationType` VARCHAR(50) NOT NULL DEFAULT 'bad_word',
    `detectedWords` TEXT NOT NULL,
    `originalContent` TEXT NOT NULL,
    `sanitizedContent` TEXT NULL,
    `severity` VARCHAR(20) NOT NULL DEFAULT 'medium',
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `endpoint` VARCHAR(255) NOT NULL,
    `requestId` VARCHAR(100) NULL,
    `isBlocked` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `violations_userId_idx`(`userId`),
    INDEX `violations_violationType_idx`(`violationType`),
    INDEX `violations_severity_idx`(`severity`),
    INDEX `violations_createdAt_idx`(`createdAt`),
    INDEX `violations_isBlocked_idx`(`isBlocked`),
    INDEX `violations_endpoint_idx`(`endpoint`(250)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key constraints if they don't exist
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'images_modelId_fkey' AND TABLE_NAME = 'images' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `images` ADD CONSTRAINT `images_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `models`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'models_providerId_fkey' AND TABLE_NAME = 'models' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `models` ADD CONSTRAINT `models_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'credit_ledger_promoCodeId_fkey' AND TABLE_NAME = 'credit_ledger' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
