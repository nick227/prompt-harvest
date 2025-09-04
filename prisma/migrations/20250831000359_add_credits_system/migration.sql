-- AlterTable
ALTER TABLE `images` ADD COLUMN `creditsUsed` INTEGER NULL DEFAULT 1;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `creditBalance` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `credit_ledger` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `type` VARCHAR(20) NOT NULL,
    `amount` INTEGER NOT NULL,
    `description` VARCHAR(255) NOT NULL,
    `stripePaymentId` VARCHAR(100) NULL,
    `promoCodeId` VARCHAR(25) NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `credit_ledger_userId_idx`(`userId`),
    INDEX `credit_ledger_type_idx`(`type`),
    INDEX `credit_ledger_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stripe_payments` (
    `stripeSessionId` VARCHAR(100) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `amount` INTEGER NOT NULL,
    `currency` VARCHAR(3) NOT NULL DEFAULT 'usd',
    `credits` INTEGER NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `stripePaymentIntentId` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `stripe_payments_userId_idx`(`userId`),
    INDEX `stripe_payments_status_idx`(`status`),
    PRIMARY KEY (`stripeSessionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promo_codes` (
    `id` VARCHAR(25) NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `credits` INTEGER NOT NULL,
    `maxRedemptions` INTEGER NULL,
    `currentRedemptions` INTEGER NOT NULL DEFAULT 0,
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `promo_codes_code_key`(`code`),
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
    UNIQUE INDEX `promo_redemptions_userId_promoCodeId_key`(`userId`, `promoCodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_stripePaymentId_fkey` FOREIGN KEY (`stripePaymentId`) REFERENCES `stripe_payments`(`stripeSessionId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stripe_payments` ADD CONSTRAINT `stripe_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promo_redemptions` ADD CONSTRAINT `promo_redemptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `promo_redemptions` ADD CONSTRAINT `promo_redemptions_promoCodeId_fkey` FOREIGN KEY (`promoCodeId`) REFERENCES `promo_codes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
