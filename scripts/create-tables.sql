-- Create tables manually to avoid Prisma migration issues
-- Run this in phpMyAdmin or MySQL command line

USE autoimage;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS images;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id VARCHAR(25) NOT NULL,
    email VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    isAdmin BOOLEAN NOT NULL DEFAULT false,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create images table
CREATE TABLE images (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NOT NULL,
    prompt TEXT NOT NULL,
    original TEXT NOT NULL,
    imageUrl VARCHAR(500) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    guidance INT NOT NULL DEFAULT 10,
    model VARCHAR(100) NULL,
    rating INT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create likes table
CREATE TABLE likes (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NOT NULL,
    imageId VARCHAR(25) NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (imageId) REFERENCES images(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create tags table
CREATE TABLE tags (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NOT NULL,
    imageId VARCHAR(25) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (imageId) REFERENCES images(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create prompts table
CREATE TABLE prompts (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NOT NULL,
    prompt TEXT NOT NULL,
    original TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    guidance INT NOT NULL DEFAULT 10,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create word_types table
CREATE TABLE word_types (
    id VARCHAR(25) NOT NULL,
    word VARCHAR(100) NOT NULL,
    types JSON NOT NULL,
    examples JSON NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create categories table
CREATE TABLE categories (
    id VARCHAR(25) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create multipliers table
CREATE TABLE multipliers (
    id VARCHAR(25) NOT NULL,
    name VARCHAR(100) NOT NULL,
    value DOUBLE NOT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create prompt_clauses table
CREATE TABLE prompt_clauses (
    id VARCHAR(25) NOT NULL,
    clause VARCHAR(255) NOT NULL,
    category VARCHAR(100) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Show created tables
SHOW TABLES;
