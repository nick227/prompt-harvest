/**
 * Blog Service - Handles all blog-related API calls
 * Integrates with existing ApiService and AuthService
 */

class BlogService {
    constructor() {
        this.apiService = window.apiService;
        this.authService = window.authService;
        this.baseUrl = '/api/blog';
    }

    /**
     * Get published blog posts with pagination
     */
    async getPublishedPosts(page = 1, limit = 10) {
        try {
            const response = await this.apiService.get(`${this.baseUrl}/posts`, {
                page,
                limit
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch published posts:', error);
            throw error;
        }
    }

    /**
     * Get featured blog posts
     */
    async getFeaturedPosts(page = 1, limit = 10) {
        try {
            const response = await this.apiService.get(`${this.baseUrl}/posts/featured`, {
                page,
                limit
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch featured posts:', error);
            throw error;
        }
    }

    /**
     * Get a single blog post by slug
     */
    async getPostBySlug(slug) {
        try {
            const response = await this.apiService.get(`${this.baseUrl}/posts/${slug}`);

            return response.data;
        } catch (error) {
            console.error('Failed to fetch post by slug:', error);
            throw error;
        }
    }

    /**
     * Get a single blog post by ID
     */
    async getPostById(id) {
        try {
            const response = await this.apiService.get(`${this.baseUrl}/posts/id/${id}`);

            return response.data;
        } catch (error) {
            console.error('Failed to fetch post by ID:', error);
            throw error;
        }
    }

    /**
     * Create a new blog post (admin only)
     */
    async createPost(postData, isPublish = false) {
        console.log('🔍 BLOG-SERVICE: Creating post with data:', postData);
        console.log('🔍 BLOG-SERVICE: Is publish:', isPublish);

        // Add publish status to post data
        postData.isPublished = isPublish;

        const response = await this.apiService.post(`${this.baseUrl}/posts`, postData);

        console.log('🔍 BLOG-SERVICE: API response:', response);

        return response.data;
    }

    /**
     * Update an existing blog post (admin only)
     */
    async updatePost(postId, postData) {
        try {
            const response = await this.apiService.put(`${this.baseUrl}/posts/${postId}`, postData);

            return response.data;
        } catch (error) {
            console.error('Failed to update post:', error);
            throw error;
        }
    }

    /**
     * Delete a blog post (admin only)
     */
    async deletePost(postId) {
        try {
            const response = await this.apiService.delete(`${this.baseUrl}/posts/${postId}`);

            return response.data;
        } catch (error) {
            console.error('Failed to delete post:', error);
            throw error;
        }
    }

    /**
     * Get admin posts with optional filtering
     */
    async getAdminPosts(page = 1, limit = 10, options = {}) {
        try {
            const { draftsOnly = false, publishedOnly = false } = options;
            let endpoint = `${this.baseUrl}/admin/posts`;

            if (draftsOnly) {
                endpoint = `${this.baseUrl}/admin/posts/drafts`;
            }

            const response = await this.apiService.get(endpoint, {
                page,
                limit,
                ...(publishedOnly && { published: true })
            });

            return response.data;
        } catch (error) {
            console.error('Failed to fetch admin posts:', error);
            throw error;
        }
    }

    /**
     * Get draft posts (admin only) - convenience method
     */
    async getDraftPosts(page = 1, limit = 10) {
        return this.getAdminPosts(page, limit, { draftsOnly: true });
    }

    /**
     * Check if current user is admin
     */
    isAdmin() {
        // Check multiple sources for admin status
        if (this.authService?.currentUser?.isAdmin) {
            return true;
        }

        // Fallback to userSystem if available
        if (window.userSystem?.getUser?.()?.isAdmin) {
            return true;
        }

        // Check if user is authenticated and has admin flag in storage
        const token = localStorage.getItem('authToken');

        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));

                return payload.isAdmin === true;
            } catch (e) {
                // Token parsing failed, continue with other checks
            }
        }

        return false;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return this.authService?.isAuthenticated() || false;
    }

    /**
     * Format post data for form submission
     */
    formatPostData(formData, isPublish = false) {
        const data = {
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt || null,
            thumbnail: formData.thumbnail || null,
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag) : null,
            isPublished: isPublish,
            isFeatured: formData.isFeatured || false
        };

        return data;
    }

    /**
     * Format post for display
     */
    formatPostForDisplay(post) {
        return {
            ...post,
            formattedDate: this.formatDate(post.publishedAt || post.createdAt),
            formattedTags: post.tags || [],
            excerpt: post.excerpt || this.generateExcerpt(post.content)
        };
    }

    /**
     * Generate excerpt from content
     */
    generateExcerpt(content, maxLength = 150) {
        if (!content) {
            return '';
        }
        const plainText = content.replace(/<[^>]*>/g, '');

        return plainText.length > maxLength
            ? `${plainText.substring(0, maxLength)}...`
            : plainText;
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) {
            return '';
        }
        const date = new Date(dateString);

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Format date and time for display
     */
    formatDateTime(dateString) {
        if (!dateString) {
            return '';
        }
        const date = new Date(dateString);

        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize blog service when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blogService = new BlogService();
});
