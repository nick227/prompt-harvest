-- CreateTable
CREATE TABLE `ai_prompts` (
    `id` VARCHAR(25) NOT NULL,
    `type` ENUM('user', 'application') NOT NULL,
    `prompt` TEXT NOT NULL,
    `response` TEXT NOT NULL,
    `buttons` JSON,
    `newPrompt` TEXT,
    `context` JSON,
    `userId` VARCHAR(25),
    `conversationId` VARCHAR(25),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ai_prompts_userId_idx` ON `ai_prompts`(`userId`);

-- CreateIndex
CREATE INDEX `ai_prompts_conversationId_idx` ON `ai_prompts`(`conversationId`);

-- CreateIndex
CREATE INDEX `ai_prompts_type_idx` ON `ai_prompts`(`type`);

-- CreateIndex
CREATE INDEX `ai_prompts_createdAt_idx` ON `ai_prompts`(`createdAt`);
