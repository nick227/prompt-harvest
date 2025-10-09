-- Add missing columns to users table
ALTER TABLE `users` ADD COLUMN `googleId` VARCHAR(50) NULL;
ALTER TABLE `users` ADD COLUMN `isEmailVerified` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `name` VARCHAR(100) NULL;
ALTER TABLE `users` ADD COLUMN `picture` VARCHAR(500) NULL;
ALTER TABLE `users` MODIFY `password` VARCHAR(255) NULL;
CREATE UNIQUE INDEX `users_googleId_key` ON `users`(`googleId`);

-- Add missing columns to images table
ALTER TABLE `images` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `images` ADD COLUMN `deletedAt` DATETIME(3) NULL;
ALTER TABLE `images` ADD COLUMN `deletedBy` VARCHAR(25) NULL;
CREATE INDEX `isDeleted` ON `images`(`isDeleted`);
CREATE INDEX `deletedAt` ON `images`(`deletedAt`);
CREATE INDEX `userId_isDeleted` ON `images`(`userId`, `isDeleted`);

-- Fix prompts table userId column
ALTER TABLE `prompts` MODIFY `userId` VARCHAR(50);

-- Note: Skipping DROP INDEX IF EXISTS (not supported in all MySQL versions)
-- If the index exists, it will be handled by Prisma schema sync

-- CreateTable UserMedia
CREATE TABLE `user_media` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `filename` VARCHAR(100) NOT NULL,
    `originalName` VARCHAR(100) NOT NULL,
    `url` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(50) NOT NULL,
    `size` INTEGER NOT NULL,
    `mediaType` VARCHAR(20) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Conversation
CREATE TABLE `conversations` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `title` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `conversations_userId_idx`(`userId`),
    INDEX `conversations_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable ChatMessage
CREATE TABLE `chat_messages` (
    `id` VARCHAR(25) NOT NULL,
    `conversationId` VARCHAR(25) NOT NULL,
    `role` ENUM('user', 'assistant', 'system') NOT NULL,
    `content` TEXT NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_messages_conversationId_idx`(`conversationId`),
    INDEX `chat_messages_role_idx`(`role`),
    INDEX `chat_messages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable Session
CREATE TABLE `sessions` (
    `sid` VARCHAR(128) NOT NULL,
    `data` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`sid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable QueueLog
CREATE TABLE `queue_logs` (
    `id` VARCHAR(25) NOT NULL,
    `level` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `context` TEXT NULL,
    `error` TEXT NULL,
    `requestId` VARCHAR(50) NULL,
    `userId` VARCHAR(25) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `queue_logs_level_idx`(`level`),
    INDEX `queue_logs_createdAt_idx`(`createdAt`),
    INDEX `queue_logs_requestId_idx`(`requestId`),
    INDEX `queue_logs_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
