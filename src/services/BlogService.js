import databaseClient from '../database/PrismaClient.js';
import { ValidationError, NotFoundError } from '../errors/CustomErrors.js';

export class BlogService {
    constructor() {
        this.prisma = databaseClient.getClient();
    }

    async createPost(userId, postData, isAdmin = false) {
        console.log('🔍 BLOG-SERVICE: Create post called with:', { userId, isAdmin, postData });

        if (!userId) {
            console.log('🔍 BLOG-SERVICE: No user ID provided');
            throw new ValidationError('User ID is required');
        }

        if (!isAdmin) {
            console.log('🔍 BLOG-SERVICE: User is not admin');
            throw new ValidationError('Only administrators can create blog posts');
        }

        const { title, content, excerpt, thumbnail, tags, isPublished, isFeatured } = postData;
        console.log('🔍 BLOG-SERVICE: Extracted fields:', { title, content, excerpt, thumbnail, tags, isPublished, isFeatured });

        if (!title || !content) {
            console.log('🔍 BLOG-SERVICE: Missing required fields:', { hasTitle: !!title, hasContent: !!content });
            throw new ValidationError('Title and content are required');
        }

        // Generate slug from title
        const slug = this.generateSlug(title);

        // Check if slug already exists
        const existingPost = await this.prisma.BlogPost.findUnique({
            where: { slug }
        });

        if (existingPost) {
            throw new ValidationError('A post with this title already exists');
        }

        const post = await this.prisma.BlogPost.create({
            data: {
                title,
                slug,
                content,
                excerpt,
                thumbnail,
                authorId: userId,
                isPublished: isPublished || false,
                isFeatured: isFeatured || false,
                tags: tags ? JSON.stringify(tags) : null,
                publishedAt: isPublished ? new Date() : null
            }
        });

        return this.formatPost(post);
    }

    async getPostById(id) {
        if (!id) {
            throw new ValidationError('Post ID is required');
        }

        const post = await this.prisma.BlogPost.findUnique({
            where: { id },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        picture: true
                    }
                }
            }
        });

        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Increment view count
        await this.prisma.BlogPost.update({
            where: { id },
            data: { viewCount: { increment: 1 } }
        });

        return this.formatPost(post);
    }

    async getPostBySlug(slug, userId = null) {
        if (!slug) {
            throw new ValidationError('Post slug is required');
        }

        const post = await this.prisma.BlogPost.findUnique({
            where: { slug },
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        picture: true
                    }
                }
            }
        });

        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Check if post is published or if user is admin
        const isAdmin = userId ? await this.isAdmin(userId) : false;

        if (!post.isPublished && !isAdmin) {
            throw new NotFoundError('Post not found');
        }

        // Only increment view count for published posts
        if (post.isPublished) {
            await this.prisma.BlogPost.update({
                where: { slug },
                data: { viewCount: { increment: 1 } }
            });
        }

        return this.formatPost(post);
    }

    async getPublishedPosts(page = 1, limit = 10, featured = false) {
        const skip = (page - 1) * limit;

        const where = {
            isPublished: true
        };

        if (featured) {
            where.isFeatured = true;
        }

        const [posts, total] = await Promise.all([
            this.prisma.BlogPost.findMany({
                where,
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            picture: true
                        }
                    }
                },
                orderBy: { publishedAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.BlogPost.count({ where })
        ]);

        return {
            posts: posts.map(post => this.formatPost(post)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getUserPosts(userId, page = 1, limit = 10) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        const skip = (page - 1) * limit;

        const [posts, total] = await Promise.all([
            this.prisma.BlogPost.findMany({
                where: { authorId: userId },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            picture: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.BlogPost.count({ where: { authorId: userId } })
        ]);

        return {
            posts: posts.map(post => this.formatPost(post)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getDraftPosts(userId, page = 1, limit = 10) {
        if (!userId) {
            throw new ValidationError('User ID is required');
        }

        const skip = (page - 1) * limit;

        const [posts, total] = await Promise.all([
            this.prisma.BlogPost.findMany({
                where: {
                    authorId: userId,
                    isPublished: false
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            name: true,
                            picture: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.BlogPost.count({
                where: {
                    authorId: userId,
                    isPublished: false
                }
            })
        ]);

        return {
            posts: posts.map(post => this.formatPost(post)),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async updatePost(userId, postId, updateData, isAdmin = false) {
        if (!userId || !postId) {
            throw new ValidationError('User ID and Post ID are required');
        }

        if (!isAdmin) {
            throw new ValidationError('Only administrators can update blog posts');
        }

        // Check if post exists
        const existingPost = await this.prisma.BlogPost.findUnique({
            where: { id: postId }
        });

        if (!existingPost) {
            throw new NotFoundError('Post not found');
        }

        const { title, content, excerpt, tags, isPublished, isFeatured } = updateData;

        const updateFields = {};
        if (title !== undefined) {
            updateFields.title = title;
            updateFields.slug = this.generateSlug(title);
        }
        if (content !== undefined) updateFields.content = content;
        if (excerpt !== undefined) updateFields.excerpt = excerpt;
        if (tags !== undefined) updateFields.tags = tags ? JSON.stringify(tags) : null;
        if (isPublished !== undefined) {
            updateFields.isPublished = isPublished;
            if (isPublished && !existingPost.publishedAt) {
                updateFields.publishedAt = new Date();
            }
        }
        if (isFeatured !== undefined) updateFields.isFeatured = isFeatured;

        const post = await this.prisma.BlogPost.update({
            where: { id: postId },
            data: updateFields,
            include: {
                author: {
                    select: {
                        id: true,
                        username: true,
                        name: true,
                        picture: true
                    }
                }
            }
        });

        return this.formatPost(post);
    }

    async deletePost(userId, postId, isAdmin = false) {
        if (!userId || !postId) {
            throw new ValidationError('User ID and Post ID are required');
        }

        if (!isAdmin) {
            throw new ValidationError('Only administrators can delete blog posts');
        }

        // Check if post exists
        const existingPost = await this.prisma.BlogPost.findUnique({
            where: { id: postId }
        });

        if (!existingPost) {
            throw new NotFoundError('Post not found');
        }

        await this.prisma.BlogPost.delete({
            where: { id: postId }
        });

        return { success: true, message: 'Post deleted successfully' };
    }

    async isAdmin(userId) {
        if (!userId) return false;

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { isAdmin: true }
        });

        return user?.isAdmin || false;
    }

    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-')
            .substring(0, 100);
    }

    formatPost(post) {
        return {
            ...post,
            tags: post.tags ? JSON.parse(post.tags) : null,
            metadata: post.metadata ? JSON.parse(post.metadata) : null
        };
    }

    // Thumbnail upload is now handled directly in BlogController using ImageStorageService
}
