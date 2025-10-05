-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
    id VARCHAR(25) NOT NULL,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(500) NULL,
    thumbnail VARCHAR(500) NULL,
    authorId VARCHAR(25) NOT NULL,
    isPublished BOOLEAN NOT NULL DEFAULT false,
    isFeatured BOOLEAN NOT NULL DEFAULT false,
    viewCount INTEGER NOT NULL DEFAULT 0,
    tags JSON NULL,
    metadata JSON NULL,
    publishedAt DATETIME(3) NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updatedAt DATETIME(3) NOT NULL,
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create indexes for blog_posts
CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_key ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_authorId_idx ON blog_posts(authorId);
CREATE INDEX IF NOT EXISTS blog_posts_isPublished_idx ON blog_posts(isPublished);
CREATE INDEX IF NOT EXISTS blog_posts_isFeatured_idx ON blog_posts(isFeatured);
CREATE INDEX IF NOT EXISTS blog_posts_publishedAt_idx ON blog_posts(publishedAt);
CREATE INDEX IF NOT EXISTS blog_posts_createdAt_idx ON blog_posts(createdAt);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug(50)));

-- Create api_requests table
CREATE TABLE IF NOT EXISTS api_requests (
    id VARCHAR(25) NOT NULL,
    userId VARCHAR(25) NOT NULL,
    endpoint VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    requestData JSON NULL,
    responseData JSON NULL,
    statusCode INTEGER NOT NULL,
    duration INTEGER NULL,
    ipAddress VARCHAR(45) NULL,
    userAgent TEXT NULL,
    createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create indexes for api_requests
CREATE INDEX IF NOT EXISTS api_requests_userId_idx ON api_requests(userId);
CREATE INDEX IF NOT EXISTS api_requests_endpoint_idx ON api_requests(endpoint);
CREATE INDEX IF NOT EXISTS api_requests_method_idx ON api_requests(method);
CREATE INDEX IF NOT EXISTS api_requests_statusCode_idx ON api_requests(statusCode);
CREATE INDEX IF NOT EXISTS api_requests_createdAt_idx ON api_requests(createdAt);

-- Add foreign key constraints
ALTER TABLE blog_posts ADD CONSTRAINT blog_posts_authorId_fkey FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE api_requests ADD CONSTRAINT api_requests_userId_fkey FOREIGN KEY (userId) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verify tables were created
SELECT 'Migration completed successfully!' as status;
SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME IN ('blog_posts', 'api_requests')
ORDER BY TABLE_NAME;
