-- Create violations table for tracking bad word usage
-- Run this in phpMyAdmin or MySQL command line

USE autoimage;

-- Create violations table
CREATE TABLE IF NOT EXISTS violations (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NULL, -- NULL for anonymous users
    userEmail VARCHAR(255) NULL, -- NULL for anonymous users
    username VARCHAR(100) NULL, -- NULL for anonymous users
    violationType ENUM('bad_word', 'inappropriate_content', 'spam', 'other') NOT NULL DEFAULT 'bad_word',
    detectedWords TEXT NOT NULL, -- JSON array of detected words
    originalContent TEXT NOT NULL, -- The original prompt/content that triggered the violation
    sanitizedContent TEXT NULL, -- The content after removing bad words (if applicable)
    severity ENUM('low', 'medium', 'high', 'critical') NOT NULL DEFAULT 'medium',
    ipAddress VARCHAR(45) NULL, -- IPv4 or IPv6
    userAgent TEXT NULL,
    endpoint VARCHAR(255) NOT NULL, -- The API endpoint that was called
    requestId VARCHAR(100) NULL, -- For tracking specific requests
    isBlocked BOOLEAN NOT NULL DEFAULT true, -- Whether the request was blocked
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),
    INDEX idx_userId (userId),
    INDEX idx_violationType (violationType),
    INDEX idx_severity (severity),
    INDEX idx_createdAt (createdAt),
    INDEX idx_isBlocked (isBlocked),
    INDEX idx_endpoint (endpoint)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
