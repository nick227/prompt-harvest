-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(25) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `username` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `resetToken` VARCHAR(500) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `isSuspended` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `creditBalance` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `images` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `prompt` TEXT NOT NULL,
    `original` TEXT NOT NULL,
    `imageUrl` VARCHAR(500) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `guidance` INTEGER NOT NULL DEFAULT 10,
    `model` VARCHAR(100) NULL,
    `rating` INTEGER NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `modelId` VARCHAR(25) NULL,
    `taggedAt` DATETIME(3) NULL,
    `taggingMetadata` JSON NULL,
    `tags` JSON NULL,

    INDEX `userId`(`userId`),
    INDEX `isPublic`(`isPublic`),
    INDEX `isHidden`(`isHidden`),
    INDEX `userId_isPublic`(`userId`, `isPublic`),
    INDEX `userId_isHidden`(`userId`, `isHidden`),
    INDEX `images_modelId_idx`(`modelId`),
    INDEX `taggedAt`(`taggedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `cost` DOUBLE NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `userId`(`userId`),
    INDEX `provider`(`provider`),
    INDEX `createdAt`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(25) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `likes` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `imageId` VARCHAR(25) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `imageId`(`imageId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `multipliers` (
    `id` VARCHAR(25) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `value` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompt_clauses` (
    `id` VARCHAR(25) NOT NULL,
    `clause` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prompts` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `prompt` TEXT NOT NULL,
    `original` TEXT NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `guidance` INTEGER NOT NULL DEFAULT 10,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `imageId` VARCHAR(25) NOT NULL,
    `tag` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `imageId`(`imageId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `word_types` (
    `id` VARCHAR(25) NOT NULL,
    `word` VARCHAR(100) NOT NULL,
    `types` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `word_types_word_key`(`word`),
    INDEX `word`(`word`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stripe_payments` (
    `stripeSessionId` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `credits` INTEGER NOT NULL,
    `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    `stripePaymentIntentId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `id` VARCHAR(25) NOT NULL,
    `metadata` JSON NULL,

    UNIQUE INDEX `stripe_payments_stripeSessionId_key`(`stripeSessionId`),
    INDEX `stripe_payments_userId_idx`(`userId`),
    INDEX `stripe_payments_status_idx`(`status`),
    INDEX `stripe_payments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credit_ledger` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `stripePaymentId` VARCHAR(25) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `promoCodeId` VARCHAR(25) NULL,

    INDEX `credit_ledger_userId_idx`(`userId`),
    INDEX `credit_ledger_type_idx`(`type`),
    INDEX `credit_ledger_createdAt_idx`(`createdAt`),
    INDEX `credit_ledger_promoCodeId_fkey`(`promoCodeId`),
    INDEX `credit_ledger_stripePaymentId_fkey`(`stripePaymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `violations` (
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

-- CreateTable
CREATE TABLE `promo_codes` (
    `id` VARCHAR(25) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `credits` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `maxRedemptions` INTEGER NULL,
    `currentRedemptions` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `promo_codes_code_key`(`code`),
    INDEX `promo_codes_code_idx`(`code`),
    INDEX `promo_codes_isActive_idx`(`isActive`),
    INDEX `promo_codes_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promo_redemptions` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `promoCodeId` VARCHAR(25) NOT NULL,
    `credits` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `promo_redemptions_userId_idx`(`userId`),
    INDEX `promo_redemptions_promoCodeId_idx`(`promoCodeId`),
    INDEX `promo_redemptions_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `userId_promoCodeId`(`userId`, `promoCodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `models` (
    `id` VARCHAR(25) NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `providerId` VARCHAR(50) NULL,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `costPerImage` DOUBLE NOT NULL DEFAULT 1,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `apiUrl` VARCHAR(500) NULL,
    `apiModel` VARCHAR(100) NULL,
    `apiSize` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `models_provider_idx`(`provider`),
    INDEX `models_name_idx`(`name`),
    INDEX `models_isActive_idx`(`isActive`),
    INDEX `models_costPerImage_idx`(`costPerImage`),
    UNIQUE INDEX `provider_name`(`provider`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `providers` (
    `id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `displayName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `providers_name_idx`(`name`),
    INDEX `providers_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
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

-- CreateTable
CREATE TABLE `system_settings` (
    `id` VARCHAR(25) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `description` VARCHAR(255) NULL,
    `dataType` VARCHAR(20) NOT NULL DEFAULT 'string',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_settings_key_key`(`key`),
    INDEX `system_settings_key_idx`(`key`),
    INDEX `system_settings_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `adminId` VARCHAR(25) NULL,
    `message` TEXT NOT NULL,
    `isFromUser` BOOLEAN NOT NULL DEFAULT true,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `parentId` VARCHAR(25) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `messages_userId_idx`(`userId`),
    INDEX `messages_adminId_idx`(`adminId`),
    INDEX `messages_isRead_idx`(`isRead`),
    INDEX `messages_createdAt_idx`(`createdAt`),
    INDEX `messages_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stripe_payments` ADD CONSTRAINT `stripe_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promo_redemptions` ADD CONSTRAINT `promo_redemptions_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `models` ADD CONSTRAINT `models_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `providers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `messages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
