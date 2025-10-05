-- CreateTable
CREATE TABLE `blog_posts` (
    `id` VARCHAR(25) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(100) NOT NULL,
    `content` TEXT NOT NULL,
    `excerpt` VARCHAR(500) NULL,
    `thumbnail` VARCHAR(500) NULL,
    `authorId` VARCHAR(25) NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `viewCount` INTEGER NOT NULL DEFAULT 0,
    `tags` JSON NULL,
    `metadata` JSON NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `blog_posts_slug_key`(`slug`),
    INDEX `blog_posts_authorId_idx`(`authorId`),
    INDEX `blog_posts_isPublished_idx`(`isPublished`),
    INDEX `blog_posts_isFeatured_idx`(`isFeatured`),
    INDEX `blog_posts_publishedAt_idx`(`publishedAt`),
    INDEX `blog_posts_createdAt_idx`(`createdAt`),
    INDEX `blog_posts_slug_idx`(`slug`(50)),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_requests` (
    `id` VARCHAR(25) NOT NULL,
    `userId` VARCHAR(25) NOT NULL,
    `endpoint` VARCHAR(100) NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `requestData` JSON NULL,
    `responseData` JSON NULL,
    `statusCode` INTEGER NOT NULL,
    `duration` INTEGER NULL,
    `ipAddress` VARCHAR(45) NULL,
    `userAgent` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `api_requests_userId_idx`(`userId`),
    INDEX `api_requests_endpoint_idx`(`endpoint`),
    INDEX `api_requests_method_idx`(`method`),
    INDEX `api_requests_statusCode_idx`(`statusCode`),
    INDEX `api_requests_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blog_posts` ADD CONSTRAINT `blog_posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_requests` ADD CONSTRAINT `api_requests_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
