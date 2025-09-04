-- Performance optimization indexes for credits system
-- Run this in MySQL after the initial migration

-- Credit Ledger performance indexes
CREATE INDEX idx_credit_ledger_user_type ON credit_ledger(userId, type);
CREATE INDEX idx_credit_ledger_created_desc ON credit_ledger(createdAt DESC);
CREATE INDEX idx_credit_ledger_stripe_payment ON credit_ledger(stripePaymentId);
CREATE INDEX idx_credit_ledger_promo_code ON credit_ledger(promoCodeId);

-- Stripe Payments performance indexes
CREATE INDEX idx_stripe_payments_user_status ON stripe_payments(userId, status);
CREATE INDEX idx_stripe_payments_created_desc ON stripe_payments(createdAt DESC);

-- Promo Codes performance indexes
CREATE INDEX idx_promo_codes_active_expires ON promo_codes(isActive, expiresAt);
CREATE INDEX idx_promo_codes_code_active ON promo_codes(code, isActive);

-- Promo Redemptions performance indexes
CREATE INDEX idx_promo_redemptions_user_promo ON promo_redemptions(userId, promoCodeId);
CREATE INDEX idx_promo_redemptions_created_desc ON promo_redemptions(createdAt DESC);

-- Users credit balance index for faster lookups
CREATE INDEX idx_users_credit_balance ON users(creditBalance);

-- Images credits tracking
CREATE INDEX idx_images_user_credits ON images(userId, creditsUsed);
CREATE INDEX idx_images_created_credits ON images(createdAt DESC, creditsUsed);
