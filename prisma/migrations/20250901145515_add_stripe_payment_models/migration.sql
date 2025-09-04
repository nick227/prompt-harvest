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
-- DropIndex
DROP INDEX `credit_ledger_promoCodeId_fkey` ON `credit_ledger`;

-- DropIndex
DROP INDEX `credit_ledger_stripePaymentId_fkey` ON `credit_ledger`;

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

-- AlterTable
ALTER TABLE `stripe_payments` DROP PRIMARY KEY,
    DROP COLUMN `currency`,
    ADD COLUMN `id` VARCHAR(25) NOT NULL,
    ADD COLUMN `metadata` JSON NULL,
    MODIFY `amount` DOUBLE NOT NULL,
    MODIFY `status` VARCHAR(50) NOT NULL DEFAULT 'pending',
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP COLUMN `creditBalance`;

-- DropTable
DROP TABLE `promo_codes`;

-- DropTable
DROP TABLE `promo_redemptions`;

-- CreateIndex
CREATE UNIQUE INDEX `stripe_payments_stripeSessionId_key` ON `stripe_payments`(`stripeSessionId`);

-- CreateIndex
CREATE INDEX `stripe_payments_createdAt_idx` ON `stripe_payments`(`createdAt`);

-- AddForeignKey
ALTER TABLE `images` ADD CONSTRAINT `images_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stripe_payments` ADD CONSTRAINT `stripe_payments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credit_ledger` ADD CONSTRAINT `credit_ledger_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
