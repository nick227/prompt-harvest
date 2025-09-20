-- Add admin-level visibility control field to images table
-- This allows admins to hide images from everyone except other admins

USE autoimage;

-- Add the isHidden field for admin moderation
ALTER TABLE images ADD COLUMN isHidden BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for efficient querying of hidden images
CREATE INDEX idx_images_isHidden ON images(isHidden);

-- Add composite index for admin queries
CREATE INDEX idx_images_userId_isHidden ON images(userId, isHidden);

-- Update existing images to be visible by default
UPDATE images SET isHidden = FALSE WHERE isHidden IS NULL;
