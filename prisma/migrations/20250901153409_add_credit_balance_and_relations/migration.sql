-- AlterTable
ALTER TABLE `users` ADD COLUMN `creditBalance` INTEGER NOT NULL DEFAULT 0;

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
