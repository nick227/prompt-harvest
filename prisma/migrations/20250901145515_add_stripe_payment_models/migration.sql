/*
  Warnings:

  - You are about to drop the column `promoCodeId` on the `credit_ledger` table. All the data in the column will be lost.
  - You are about to alter the column `stripePaymentId` on the `credit_ledger` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(25)`.
  - You are about to drop the column `creditsUsed` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `mashup` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `mixup` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `multiplier` on the `images` table. All the data in the column will be lost.
  - You are about to drop the column `mashup` on the `prompts` table. All the data in the column will be lost.
  - You are about to drop the column `mixup` on the `prompts` table. All the data in the column will be lost.
  - You are about to drop the column `multiplier` on the `prompts` table. All the data in the column will be lost.
  - The primary key for the `stripe_payments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `currency` on the `stripe_payments` table. All the data in the column will be lost.
  - You are about to alter the column `amount` on the `stripe_payments` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Double`.
  - You are about to drop the column `creditBalance` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `promo_codes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `promo_redemptions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[stripeSessionId]` on the table `stripe_payments` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `stripe_payments` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE `credit_ledger` DROP FOREIGN KEY `credit_ledger_promoCodeId_fkey`;

-- DropForeignKey
ALTER TABLE `credit_ledger` DROP FOREIGN KEY `credit_ledger_stripePaymentId_fkey`;

-- AlterTable
ALTER TABLE `credit_ledger` DROP COLUMN `promoCodeId`,
    MODIFY `type` VARCHAR(50) NOT NULL,
    MODIFY `stripePaymentId` VARCHAR(25) NULL;

-- AlterTable
ALTER TABLE `images` DROP COLUMN `creditsUsed`,
    DROP COLUMN `mashup`,
    DROP COLUMN `mixup`,
    DROP COLUMN `multiplier`;

-- AlterTable
ALTER TABLE `prompts` DROP COLUMN `mashup`,
    DROP COLUMN `mixup`,
    DROP COLUMN `multiplier`;

-- AlterTable (safe approach for primary key change)
-- First, add the new id column as nullable
ALTER TABLE `stripe_payments` ADD COLUMN `id` VARCHAR(25) NULL;

-- Populate the id column with unique values (MySQL compatible)
SET @row_number = 0;
UPDATE `stripe_payments` SET `id` = CONCAT('sp_', LPAD((@row_number := @row_number + 1), 10, '0')) WHERE `id` IS NULL ORDER BY `createdAt`;

-- Make the id column NOT NULL
ALTER TABLE `stripe_payments` MODIFY `id` VARCHAR(25) NOT NULL;

-- Drop the old primary key and add new one
ALTER TABLE `stripe_payments` DROP PRIMARY KEY;
ALTER TABLE `stripe_payments` ADD PRIMARY KEY (`id`);

-- Drop currency column and modify other columns
ALTER TABLE `stripe_payments` DROP COLUMN `currency`;
ALTER TABLE `stripe_payments` ADD COLUMN `metadata` JSON NULL;
ALTER TABLE `stripe_payments` MODIFY `amount` DOUBLE NOT NULL;
ALTER TABLE `stripe_payments` MODIFY `status` VARCHAR(50) NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `users` DROP COLUMN `creditBalance`;

-- DropTable
DROP TABLE `promo_redemptions`;

-- DropTable
DROP TABLE `promo_codes`;

-- CreateIndex (only if no duplicates exist)
-- First, remove any duplicate stripeSessionId values
UPDATE `stripe_payments` s1
SET `stripeSessionId` = CONCAT(`stripeSessionId`, '_', s1.id)
WHERE EXISTS (
    SELECT 1 FROM `stripe_payments` s2
    WHERE s2.`stripeSessionId` = s1.`stripeSessionId`
    AND s2.id != s1.id
);

-- Now create the unique index
CREATE UNIQUE INDEX `stripe_payments_stripeSessionId_key` ON `stripe_payments`(`stripeSessionId`);

-- CreateIndex (only if it doesn't exist)
SET @index_exists = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE INDEX_NAME = 'stripe_payments_createdAt_idx' AND TABLE_NAME = 'stripe_payments' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@index_exists = 0, 'CREATE INDEX `stripe_payments_createdAt_idx` ON `stripe_payments`(`createdAt`)', 'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddForeignKey (only if it doesn't exist)
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'images_userId_fkey' AND TABLE_NAME = 'images' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `images` ADD CONSTRAINT `images_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddForeignKey (only if it doesn't exist)
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'transactions_userId_fkey' AND TABLE_NAME = 'transactions' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddForeignKey (only if it doesn't exist)
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'stripe_payments_userId_fkey' AND TABLE_NAME = 'stripe_payments' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `stripe_payments` ADD CONSTRAINT `stripe_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- AddForeignKey (only if it doesn't exist)
SET @constraint_exists = (SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE WHERE CONSTRAINT_NAME = 'credit_ledger_userId_fkey' AND TABLE_NAME = 'credit_ledger' AND TABLE_SCHEMA = DATABASE());
SET @sql = IF(@constraint_exists = 0, 'ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE', 'SELECT "Constraint already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
