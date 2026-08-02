CREATE TABLE `image_search_documents` (
    `imageId` VARCHAR(25) NOT NULL,
    `prompt` TEXT NOT NULL,
    `originalPrompt` TEXT NOT NULL,
    `tagsText` TEXT NOT NULL,
    `provider` VARCHAR(50) NOT NULL,
    `model` VARCHAR(100) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`imageId`),
    FULLTEXT INDEX `image_search_fulltext` (`prompt`, `originalPrompt`, `tagsText`, `provider`, `model`),
    CONSTRAINT `image_search_documents_imageId_fkey`
        FOREIGN KEY (`imageId`) REFERENCES `images` (`id`) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `image_search_documents`
    (`imageId`, `prompt`, `originalPrompt`, `tagsText`, `provider`, `model`, `updatedAt`)
SELECT
    `id`,
    LOWER(COALESCE(`prompt`, '')),
    LOWER(COALESCE(`original`, '')),
    LOWER(COALESCE(JSON_UNQUOTE(`tags`), '')),
    LOWER(COALESCE(`provider`, '')),
    LOWER(COALESCE(`model`, '')),
    `updatedAt`
FROM `images`;

CREATE TRIGGER `images_search_document_after_insert`
AFTER INSERT ON `images`
FOR EACH ROW
INSERT INTO `image_search_documents`
    (`imageId`, `prompt`, `originalPrompt`, `tagsText`, `provider`, `model`, `updatedAt`)
VALUES (
    NEW.`id`,
    LOWER(COALESCE(NEW.`prompt`, '')),
    LOWER(COALESCE(NEW.`original`, '')),
    LOWER(COALESCE(JSON_UNQUOTE(NEW.`tags`), '')),
    LOWER(COALESCE(NEW.`provider`, '')),
    LOWER(COALESCE(NEW.`model`, '')),
    NEW.`updatedAt`
);

CREATE TRIGGER `images_search_document_after_update`
AFTER UPDATE ON `images`
FOR EACH ROW
INSERT INTO `image_search_documents`
    (`imageId`, `prompt`, `originalPrompt`, `tagsText`, `provider`, `model`, `updatedAt`)
VALUES (
    NEW.`id`,
    LOWER(COALESCE(NEW.`prompt`, '')),
    LOWER(COALESCE(NEW.`original`, '')),
    LOWER(COALESCE(JSON_UNQUOTE(NEW.`tags`), '')),
    LOWER(COALESCE(NEW.`provider`, '')),
    LOWER(COALESCE(NEW.`model`, '')),
    NEW.`updatedAt`
)
ON DUPLICATE KEY UPDATE
    `prompt` = VALUES(`prompt`),
    `originalPrompt` = VALUES(`originalPrompt`),
    `tagsText` = VALUES(`tagsText`),
    `provider` = VALUES(`provider`),
    `model` = VALUES(`model`),
    `updatedAt` = VALUES(`updatedAt`);
