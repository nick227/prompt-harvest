-- Increase stripePaymentId column length to accommodate full Stripe session IDs
-- This is safe as it only increases the column size, no data loss risk
ALTER TABLE `credit_ledger` MODIFY `stripePaymentId` VARCHAR(255) NULL;
