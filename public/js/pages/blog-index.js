/**
 * Blog Index Page Handler
 * Handles the main blog listing page
 */

class BlogIndexPage {
    constructor() {
        this.blogService = window.blogService;
        this.authService = window.authService;
        this.adminUtils = null;
        this.currentPage = 1;
        this.postsPerPage = 10;
        this.init();
    }

    async init() {
        try {
            // Wait for services to be ready
            await this.waitForServices();

            // Initialize auth
            await this.initializeAuth();

            // Load blog posts
            await this.loadPosts();

            // Set up event listeners
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize blog index page:', error);
            this.showError();
        }
    }

    async waitForServices() {
        // Wait for services to be available
        while (!this.blogService || !this.authService) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Initialize admin utilities
        if (window.BlogAdminUtils) {
            this.adminUtils = new window.BlogAdminUtils(this.blogService);
        }
    }

    async initializeAuth() {
        // HeaderComponent handles auth display automatically
        // No manual auth initialization needed
    }

    async loadPosts() {
        try {
            this.showLoading();

            // Load published posts for everyone
            await this.loadAllPosts();

            // Debug admin status
            const isAdmin = this.blogService.isAdmin();
            console.log('🔍 BLOG-INDEX: Admin check result:', isAdmin);
            console.log('🔍 BLOG-INDEX: Auth service:', this.authService);
            console.log('🔍 BLOG-INDEX: Current user:', this.authService?.currentUser);

            // Load unpublished posts for admins only
            if (isAdmin) {
                console.log('🔍 BLOG-INDEX: Loading draft posts for admin...');
                await this.loadDraftPosts();
            } else {
                console.log('🔍 BLOG-INDEX: Not admin, skipping draft posts');

                // Try again after a delay in case auth wasn't fully loaded
                setTimeout(async () => {
                    const delayedAdminCheck = this.blogService.isAdmin();
                    console.log('🔍 BLOG-INDEX: Delayed admin check result:', delayedAdminCheck);
                    if (delayedAdminCheck) {
                        console.log('🔍 BLOG-INDEX: Loading draft posts after delay...');
                        await this.loadDraftPosts();
                    }
                }, 1000);
            }

            // Show admin actions if user is admin (with delay to ensure auth is loaded)
            setTimeout(() => {
                this.updateAdminStatus();
            }, 500);

            // Force re-render of posts with admin controls after a delay
            setTimeout(() => {
                const finalAdminCheck = this.blogService.isAdmin();
                console.log('🔍 BLOG-INDEX: Final admin check for re-render:', finalAdminCheck);
                if (finalAdminCheck) {
                    console.log('🔍 BLOG-INDEX: Re-rendering posts with admin controls...');
                    this.renderPosts(this.currentPosts || []);
                }
            }, 1500);

        } catch (error) {
            console.error('Failed to load posts:', error);
            this.showError();
        }
    }


    async loadAllPosts() {
        try {
            const postsData = await this.blogService.getPublishedPosts(this.currentPage, this.postsPerPage);

            // Store posts for potential re-rendering
            this.currentPosts = postsData.posts;

            this.renderPosts(postsData.posts);
            this.renderPagination(postsData.pagination);
            this.hideLoading();
        } catch (error) {
            console.error('Failed to load posts:', error);
            this.showError();
        }
    }

    async loadDraftPosts() {
        try {
            console.log('🔍 BLOG-INDEX: Loading draft posts...');
            const draftData = await this.blogService.getDraftPosts(1, 10);
            console.log('🔍 BLOG-INDEX: Draft data received:', draftData);

            if (draftData.posts.length > 0) {
                console.log('🔍 BLOG-INDEX: Rendering', draftData.posts.length, 'draft posts');
                this.renderDraftPosts(draftData.posts);
                this.showDraftSection();
            } else {
                console.log('🔍 BLOG-INDEX: No draft posts found');
            }
        } catch (error) {
            console.error('Failed to load draft posts:', error);
            // Don't show error for draft posts, just log it
        }
    }



    renderPosts(posts) {
        const container = document.getElementById('posts-container');

        if (!container) {
            return;
        }

        if (!posts.length) {
            container.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-newspaper text-4xl text-gray-600 mb-4"></i>
                    <h3 class="text-xl font-medium text-white mb-2">No Posts Yet</h3>
                    <p class="text-gray-400">Check back later for new blog posts!</p>
                </div>
            `;

            return;
        }

        container.innerHTML = posts.map(post => this.createPostCard(post, true)).join('');
    }

    createPostCard(post, isFeatured = false) {
        const formattedPost = this.blogService?.formatPostForDisplay?.(post) || {
            formattedDate: post.publishedAt || post.createdAt || '',
            formattedTags: post.tags || [],
            excerpt: post.excerpt || ''
        };
        const featuredClass = isFeatured ? 'border-blue-500 bg-gray-800' : 'border-gray-700';

        // Create thumbnail HTML with fallback
        const thumbnailHtml = this.createThumbnailHTML(post, isFeatured);

        // Create tags HTML
        const tagsHtml = (formattedPost.formattedTags || []).map(tag => `<span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">${tag}</span>`
        ).join('');

        // Admin controls for all posts
        const isAdmin = this.blogService.isAdmin();
        console.log('🔍 BLOG-INDEX: createPostCard - Admin check:', isAdmin);
        console.log('🔍 BLOG-INDEX: createPostCard - Post:', post.title, 'isPublished:', post.isPublished);

        const adminControls = isAdmin ? `
            <div class="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-700">
                <a href="/blog/${post.slug}/edit"
                   class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                    <i class="fas fa-edit mr-1"></i>Edit
                </a>
                <button onclick="blogIndexPage.togglePublishStatus('${post.id}', ${post.isPublished})"
                        class="px-3 py-1 ${post.isPublished ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} text-white text-xs rounded transition-colors">
                    <i class="fas fa-${post.isPublished ? 'eye-slash' : 'paper-plane'} mr-1"></i>
                    ${post.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button onclick="blogIndexPage.deletePost('${post.id}')"
                        class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors">
                    <i class="fas fa-trash mr-1"></i>Delete
                </button>
            </div>
        ` : '';

        console.log('🔍 BLOG-INDEX: createPostCard - Admin controls HTML length:', adminControls.length);

        return `
            <article class="bg-gray-900 rounded-lg border ${featuredClass} p-6 hover:bg-gray-800 transition-colors">
                ${thumbnailHtml}
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-white mb-2">
                            <a href="/blog/${post.slug}" class="hover:text-blue-400 transition-colors">
                                ${post.title}
                            </a>
                        </h3>
                        <p class="text-gray-400 text-sm mb-3">${formattedPost.excerpt}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center">
                            <i class="fas fa-user mr-1"></i>
                            ${post.author?.name || post.author?.username || 'Unknown'}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-calendar mr-1"></i>
                            ${formattedPost.formattedDate}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-eye mr-1"></i>
                            ${post.viewCount || 0} views
                        </span>
                    </div>
                    <div class="flex items-center space-x-2">
                        ${tagsHtml}
                    </div>
                </div>
                ${adminControls}
            </article>
        `;
    }

    createThumbnailHTML(post, isFeatured = false) {
        const heightClass = isFeatured ? 'h-56' : 'h-48';

        if (post.thumbnail) {
            // Show actual thumbnail with fallback
            return `
                <div class="mb-4 relative">
                    <img src="${post.thumbnail}"
                         alt="${post.title}"
                         class="w-full ${heightClass} object-cover rounded-lg"
                         loading="lazy"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="w-full ${heightClass} rounded-lg flex items-center justify-center absolute inset-0"
                         style="display: none; background: ${this.getFallbackGradient(post)}">
                        <div class="text-center text-white">
                            <div class="text-3xl mb-2 opacity-90">${this.getFallbackIcon(post)}</div>
                            <div class="text-sm font-medium opacity-80">${post.author?.name || post.author?.username || 'Unknown'}</div>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-10 rounded-lg"></div>
                    </div>
                </div>
            `;
        } else {
            // Show fallback thumbnail
            return `
                <div class="mb-4">
                    <div class="w-full ${heightClass} rounded-lg flex items-center justify-center
                         relative overflow-hidden" style="background: ${this.getFallbackGradient(post)}">
                        <div class="text-center text-white">
                            <div class="text-3xl mb-2 opacity-90">${this.getFallbackIcon(post)}</div>
                            <div class="text-sm font-medium opacity-80">${post.author?.name || post.author?.username || 'Unknown'}</div>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-10"></div>
                    </div>
                </div>
            `;
        }
    }

    getFallbackGradient(post) {
        // Create a consistent gradient based on post title and author
        const seed = this.generateSeed(post.title + (post.author?.name || post.author?.username || ''));
        const palettes = [
            ['#3B82F6', '#1D4ED8', '#1E40AF'],
            ['#10B981', '#059669', '#047857'],
            ['#8B5CF6', '#7C3AED', '#6D28D9'],
            ['#F59E0B', '#D97706', '#B45309'],
            ['#EF4444', '#DC2626', '#B91C1C'],
            ['#06B6D4', '#0891B2', '#0E7490'],
            ['#84CC16', '#65A30D', '#4D7C0F'],
            ['#EC4899', '#DB2777', '#BE185D']
        ];

        const palette = palettes[seed % palettes.length];

        return `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 50%, ${palette[2]} 100%)`;
    }

    getFallbackIcon(post) {
        const seed = this.generateSeed(post.title + (post.author?.name || post.author?.username || ''));
        const icons = ['📝', '✍️', '📰', '📄', '📋', '📑', '📊', '📈', '📉', '📌', '💡', '🔍', '📚', '📖', '📗', '📘', '📙', '📕', '📓', '📔', '🎯', '🚀', '⭐', '💫', '✨', '🌟', '🔥', '💎', '🎨', '🎭'];

        return icons[seed % icons.length];
    }

    generateSeed(str) {
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash * 32) - hash) + char;
            hash = Math.abs(hash);
        }

        return Math.abs(hash);
    }

    renderPagination(pagination) {
        const container = document.getElementById('pagination');

        if (!container || pagination.pages <= 1) {
            container.innerHTML = '';

            return;
        }

        const pages = [];
        const currentPage = pagination.page;
        const totalPages = pagination.pages;

        // Previous button
        if (currentPage > 1) {
            pages.push(`
                <button onclick="blogIndexPage.loadPage(${currentPage - 1})"
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    <i class="fas fa-chevron-left mr-1"></i>
                    Previous
                </button>
            `);
        }

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === currentPage) {
                pages.push(`
                    <button class="px-3 py-2 bg-blue-600 text-white rounded-lg">
                        ${i}
                    </button>
                `);
            } else {
                pages.push(`
                    <button onclick="blogIndexPage.loadPage(${i})"
                            class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                        ${i}
                    </button>
                `);
            }
        }

        // Next button
        if (currentPage < totalPages) {
            pages.push(`
                <button onclick="blogIndexPage.loadPage(${currentPage + 1})"
                        class="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
                    Next
                    <i class="fas fa-chevron-right ml-1"></i>
                </button>
            `);
        }

        container.innerHTML = `
            <div class="flex items-center space-x-2">
                ${pages.join('')}
            </div>
        `;
    }

    async loadPage(page) {
        this.currentPage = page;
        await this.loadAllPosts();
    }

    updateAdminStatus() {
        if (this.adminUtils) {
            this.adminUtils.updateAdminActions();
        } else {
            // Fallback to direct admin check
            const adminActions = document.getElementById('admin-actions');
            const isAdmin = this.blogService.isAdmin();

            if (adminActions && isAdmin) {
                adminActions.classList.remove('hidden');
            } else if (adminActions) {
                adminActions.classList.add('hidden');
            }
        }
    }

    setupEventListeners() {
        // Retry button
        const retryBtn = document.getElementById('retry-btn');

        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.loadPosts();
            });
        }

        // Setup admin monitoring
        if (this.adminUtils) {
            this.adminUtils.setupAdminMonitoring(isAdmin => {
                if (isAdmin) {
                    this.loadDraftPosts();
                }
            });
        } else {
            // Fallback monitoring
            window.addEventListener('authStateChanged', () => {
                setTimeout(() => {
                    this.updateAdminStatus();
                }, 100);
            });
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');
        const postsContainer = document.getElementById('posts-container');

        if (loading) {
            loading.classList.remove('hidden');
        }
        if (error) {
            error.classList.add('hidden');
        }
        if (postsContainer) {
            postsContainer.innerHTML = '';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');

        if (loading) {
            loading.classList.add('hidden');
        }
    }


    async deletePost(postId) {
        const confirmed = window.confirm(
            'Are you sure you want to delete this post? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        try {
            await this.blogService.deletePost(postId);
            this.showSuccess('Post deleted successfully');
            // Reload posts
            await this.loadPosts();
        } catch (error) {
            console.error('Failed to delete post:', error);
            this.showError('Failed to delete post. Please try again.');
        }
    }

    async togglePublishStatus(postId, currentStatus) {
        try {
            const newStatus = !currentStatus;
            const updateData = { isPublished: newStatus };

            await this.blogService.updatePost(postId, updateData);

            const action = newStatus ? 'published' : 'unpublished';
            this.showSuccess(`Post ${action} successfully`);

            // Reload posts to reflect changes
            await this.loadPosts();
        } catch (error) {
            console.error('Failed to toggle publish status:', error);
            this.showError('Failed to update post status. Please try again.');
        }
    }

    renderDraftPosts(posts) {
        const container = document.getElementById('draft-posts-list');

        if (!container) {
            return;
        }

        container.innerHTML = posts.map(post => this.createDraftPostCard(post)).join('');
    }

    createDraftPostCard(post) {
        const formattedPost = this.blogService.formatPostForDisplay(post);
        const thumbnailHtml = this.createThumbnailHTML(post, false);

        return `
            <article class="bg-gray-900 rounded-lg border border-yellow-600 p-6 hover:bg-gray-800 transition-colors">
                ${thumbnailHtml}
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <div class="flex items-center mb-2">
                            <span class="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full mr-3">DRAFT</span>
                            <h3 class="text-xl font-bold text-white">
                                <a href="/blog/${post.slug}" class="hover:text-blue-400 transition-colors">
                                    ${post.title}
                                </a>
                            </h3>
                        </div>
                        <p class="text-gray-400 text-sm mb-3">${formattedPost.excerpt}</p>
                    </div>
                </div>

                <div class="flex items-center justify-between text-sm text-gray-500">
                    <div class="flex items-center space-x-4">
                        <span class="flex items-center">
                            <i class="fas fa-user mr-1"></i>
                            ${post.author?.name || post.author?.username || 'Unknown'}
                        </span>
                        <span class="flex items-center">
                            <i class="fas fa-calendar mr-1"></i>
                            ${formattedPost.formattedDate}
                        </span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="blogIndexPage.togglePublishStatus('${post.id}', false)"
                                class="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors">
                            <i class="fas fa-paper-plane mr-1"></i>Publish
                        </button>
                        <a href="/blog/${post.slug}/edit"
                           class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </a>
                        <button onclick="blogIndexPage.deletePost('${post.id}')"
                                class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors">
                            <i class="fas fa-trash mr-1"></i>Delete
                        </button>
                    </div>
                </div>
            </article>
        `;
    }

    showDraftSection() {
        const draftSection = document.getElementById('draft-posts');
        console.log('🔍 BLOG-INDEX: Showing draft section, element found:', !!draftSection);

        if (draftSection) {
            draftSection.classList.remove('hidden');
            console.log('🔍 BLOG-INDEX: Draft section should now be visible');
        } else {
            console.error('🔍 BLOG-INDEX: Draft section element not found!');
        }
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');

        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-3"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(successDiv);

        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }

    showError() {
        const loading = document.getElementById('loading');
        const error = document.getElementById('error');

        if (loading) {
            loading.classList.add('hidden');
        }
        if (error) {
            error.classList.remove('hidden');
        }
    }

    /**
     * Render featured posts (test compatibility method)
     */
    renderFeaturedPosts(posts) {
        const container = document.getElementById('featured-posts');

        if (!container) {
            return;
        }

        if (!posts || posts.length === 0) {
            container.innerHTML = '';

            return;
        }

        container.innerHTML = posts.map(post => this.createPostCard(post, true)).join('');
    }

    /**
     * Check admin status and update UI (test compatibility method)
     */
    checkAdminStatus() {
        this.updateAdminStatus();
    }

    /**
     * Generate seed for fallback (test compatibility method)
     */
    generateSeed(input) {
        let hash = 0;
        const str = String(input || '');

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }

        return Math.abs(hash);
    }

    /**
     * Get fallback gradient (test compatibility method)
     */
    getFallbackGradient(post) {
        if (window.ThumbnailFallback) {
            const fallback = new window.ThumbnailFallback();

            return fallback.getFallbackGradient(post);
        }

        return 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)';
    }

    /**
     * Get fallback icon (test compatibility method)
     */
    getFallbackIcon(post) {
        if (window.ThumbnailFallback) {
            const fallback = new window.ThumbnailFallback();

            return fallback.getFallbackIcon(post);
        }

        return '📝';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blogIndexPage = new BlogIndexPage();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BlogIndexPage };
}
