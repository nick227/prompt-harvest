/**
 * Blog Post View Page Handler
 * Handles individual blog post viewing
 */

class BlogPostViewPage {
    constructor() {
        this.blogService = window.blogService;
        this.authService = window.authService;
        this.uiUtils = null;
        this.postSlug = null;
        this.postId = null;
        this.init();
    }

    async init() {
        try {
            // Wait for services to be ready
            await this.waitForServices();

            // Initialize auth
            await this.initializeAuth();

            // Get post identifier from URL
            this.getPostIdentifier();

            // Load post
            await this.loadPost();

            // Set up event listeners
            this.setupEventListeners();

        } catch (error) {
            console.error('Failed to initialize blog post view page:', error);
            this.showError();
        }
    }

    async waitForServices() {
        // Wait for services to be available
        while (!this.blogService || !this.authService) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Initialize UI utilities
        if (window.BlogUIUtils) {
            this.uiUtils = new window.BlogUIUtils();
        }
    }

    async initializeAuth() {
        // HeaderComponent handles auth display automatically
        // No manual auth initialization needed
    }

    getPostIdentifier() {
        // Extract slug from URL path (e.g., /blog/my-post-title)
        const pathParts = window.location.pathname.split('/');
        const slug = pathParts[pathParts.length - 1];

        if (slug && slug !== 'blog') {
            this.postSlug = slug;
        } else {
            // Fallback to query parameters for backward compatibility
            const urlParams = new URLSearchParams(window.location.search);

            this.postSlug = urlParams.get('slug');
            this.postId = urlParams.get('id');
        }
    }

    async loadPost() {
        try {
            if (this.uiUtils) {
                this.uiUtils.showLoading();
            } else {
                this.showLoading();
            }

            let post;

            if (this.postSlug) {
                post = await this.blogService.getPostBySlug(this.postSlug);
            } else if (this.postId) {
                post = await this.blogService.getPostById(this.postId);
            } else {
                throw new Error('No post identifier found');
            }

            this.renderPost(post);
            this.checkAdminStatus();

        } catch (error) {
            console.error('Failed to load post:', error);
            this.showError();
        }
    }

    renderPost(post) {
        // Store current post for fallback methods
        this.currentPost = post;

        const formattedPost = this.blogService.formatPostForDisplay(post);

        // Update page title
        document.title = `${post.title} - AutoImage Blog`;
        document.getElementById('page-title').textContent = post.title;

        // Show draft status if post is not published
        if (!post.isPublished) {
            this.showDraftStatus();
        }

        // Update post title
        const postTitle = document.getElementById('post-title');

        if (postTitle) { postTitle.textContent = post.title; }

        // Update post author
        const postAuthor = document.getElementById('post-author');

        if (postAuthor) { postAuthor.textContent = post.author?.name || post.author?.username || 'Unknown'; }

        // Update post date
        const postDate = document.getElementById('post-date');

        if (postDate) { postDate.textContent = formattedPost.formattedDate; }

        // Update view count
        const viewCount = document.getElementById('view-count');

        if (viewCount) { viewCount.textContent = post.viewCount || 0; }

        // Update author name in footer
        const authorName = document.getElementById('author-name');

        if (authorName) { authorName.textContent = post.author?.name || post.author?.username || 'Unknown'; }

        // Update last updated
        const lastUpdated = document.getElementById('last-updated');

        if (lastUpdated) {
            lastUpdated.textContent = `Updated ${this.blogService.formatDateTime(post.updatedAt)}`;
        }

        // Render thumbnail if exists
        this.renderThumbnail(post.thumbnail);

        // Render tags
        this.renderTags(formattedPost.formattedTags);

        // Render post content
        this.renderPostContent(post.content);

        // Show post details
        const postDetails = document.getElementById('post-details');

        if (postDetails) { postDetails.classList.remove('hidden'); }

        if (this.uiUtils) {
            this.uiUtils.hideLoading();
        } else {
            this.hideLoading();
        }
    }

    renderThumbnail(thumbnail) {
        const thumbnailContainer = document.getElementById('post-thumbnail');

        if (!thumbnailContainer) { return; }

        if (thumbnail) {
            // Show actual thumbnail with fallback
            thumbnailContainer.innerHTML = `
                <div class="mb-8 relative">
                    <img src="${thumbnail}"
                         alt="Post thumbnail"
                         class="w-full h-64 md:h-80 object-cover rounded-lg shadow-lg"
                         loading="lazy"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="w-full h-64 md:h-80 rounded-lg flex items-center justify-center absolute inset-0 shadow-lg"
                         style="display: none; background: ${this.getFallbackGradient(this.currentPost)}">
                        <div class="text-center text-white">
                            <div class="text-5xl mb-3 opacity-90">${this.getFallbackIcon(this.currentPost)}</div>
                            <div class="text-lg font-medium opacity-80">${this.currentPost?.author?.name || this.currentPost?.author?.username || 'Unknown'}</div>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-10 rounded-lg"></div>
                    </div>
                </div>
            `;
            thumbnailContainer.classList.remove('hidden');
        } else {
            // Show fallback thumbnail
            thumbnailContainer.innerHTML = `
                <div class="mb-8">
                    <div class="w-full h-64 md:h-80 rounded-lg flex items-center justify-center relative overflow-hidden shadow-lg"
                         style="background: ${this.getFallbackGradient(this.currentPost)}">
                        <div class="text-center text-white">
                            <div class="text-5xl mb-3 opacity-90">${this.getFallbackIcon(this.currentPost)}</div>
                            <div class="text-lg font-medium opacity-80">${this.currentPost?.author?.name || this.currentPost?.author?.username || 'Unknown'}</div>
                        </div>
                        <div class="absolute inset-0 bg-black bg-opacity-10"></div>
                    </div>
                </div>
            `;
            thumbnailContainer.classList.remove('hidden');
        }
    }

    getFallbackGradient(post) {
        if (!post) { return 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 50%, #1E40AF 100%)'; }

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
        if (!post) { return '📝'; }

        const seed = this.generateSeed(post.title + (post.author?.name || post.author?.username || ''));
        const icons = ['📝', '✍️', '📰', '📄', '📋', '📑', '📊', '📈', '📉', '📌', '💡', '🔍', '📚', '📖', '📗', '📘', '📙', '📕', '📓', '📔', '🎯', '🚀', '⭐', '💫', '✨', '🌟', '🔥', '💎', '🎨', '🎭'];

        return icons[seed % icons.length];
    }

    generateSeed(str) {
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash << 5) - hash) + char;
            hash &= hash;
        }

        return Math.abs(hash);
    }

    renderTags(tags) {
        const tagsContainer = document.getElementById('post-tags');

        if (!tagsContainer || !tags.length) { return; }

        tagsContainer.innerHTML = tags.map(tag => `<span class="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">${tag}</span>`
        ).join('');
    }

    renderPostContent(content) {
        const postBody = document.getElementById('post-body');

        if (!postBody) { return; }

        // Use MediaRenderer for rich content with embedded media
        if (window.MediaRenderer) {
            const mediaRenderer = new MediaRenderer();

            mediaRenderer.renderContent(content, 'post-body');
        } else {
            // Fallback to basic text rendering
            const htmlContent = this.convertContentToHtml(content);

            postBody.innerHTML = htmlContent;
        }
    }

    convertContentToHtml(content) {
        if (!content) { return ''; }

        // Basic markdown-like conversion
        return content
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            .replace(/^(.+)$/, '<p>$1</p>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code class="bg-gray-700 px-2 py-1 rounded">$1</code>');
    }

    checkAdminStatus() {
        const isAdmin = this.blogService.isAdmin();

        if (this.uiUtils) {
            this.uiUtils.updateAdminActions(isAdmin);
            this.uiUtils.debug('Admin status check', { isAdmin });
        } else {
            // Fallback to direct DOM manipulation
            const adminActions = document.getElementById('admin-actions');

            if (adminActions) {
                if (isAdmin) {
                    adminActions.classList.remove('hidden');
                } else {
                    adminActions.classList.add('hidden');
                }
            }
        }
    }

    setupEventListeners() {
        // Edit post button
        const editBtn = document.getElementById('edit-post-btn');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this.editPost();
            });
        }

        // Delete post button
        const deleteBtn = document.getElementById('delete-post-btn');

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.showDeleteModal();
            });
        }

        // Delete modal handlers
        const cancelDelete = document.getElementById('cancel-delete');
        const confirmDelete = document.getElementById('confirm-delete');
        const deleteModal = document.getElementById('delete-modal');

        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => {
                if (deleteModal) { deleteModal.classList.add('hidden'); }
            });
        }

        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => {
                this.deletePost();
            });
        }
    }

    editPost() {
        if (!this.postSlug && !this.postId) { return; }

        const editUrl = this.postSlug
            ? `/blog/${this.postSlug}/edit`
            : `/blog/${this.postId}/edit`;

        window.location.href = editUrl;
    }

    showDeleteModal() {
        const deleteModal = document.getElementById('delete-modal');

        if (deleteModal) {
            deleteModal.classList.remove('hidden');
        }
    }

    async deletePost() {
        try {
            // Check admin status
            if (!this.blogService.isAdmin()) {
                if (this.uiUtils) {
                    this.uiUtils.showError('Only administrators can delete blog posts.');
                } else {
                    this.showError('Only administrators can delete blog posts.');
                }

                return;
            }

            // Get post ID (we need to have it from the loaded post)
            if (!this.postId) {
                if (this.uiUtils) {
                    this.uiUtils.showError('Cannot delete post: Post ID not found.');
                } else {
                    this.showError('Cannot delete post: Post ID not found.');
                }

                return;
            }

            // Delete post
            await this.blogService.deletePost(this.postId);

            // Show success and redirect
            if (this.uiUtils) {
                this.uiUtils.showSuccess('Post deleted successfully!');
            } else {
                this.showSuccess('Post deleted successfully!');
            }
            setTimeout(() => {
                window.location.href = '/blog';
            }, 2000);

        } catch (error) {
            console.error('Failed to delete post:', error);
            if (this.uiUtils) {
                this.uiUtils.showError(error.message || 'Failed to delete post. Please try again.');
            } else {
                this.showError(error.message || 'Failed to delete post. Please try again.');
            }
        }
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const postDetails = document.getElementById('post-details');
        const error = document.getElementById('error');

        if (loading) { loading.classList.remove('hidden'); }
        if (postDetails) { postDetails.classList.add('hidden'); }
        if (error) { error.classList.add('hidden'); }
    }

    hideLoading() {
        const loading = document.getElementById('loading');

        if (loading) { loading.classList.add('hidden'); }
    }

    showDraftStatus() {
        // Add draft status banner
        const postDetails = document.getElementById('post-details');

        if (postDetails) {
            const draftBanner = document.createElement('div');

            draftBanner.className = 'bg-yellow-600 text-white px-4 py-2 rounded-lg mb-6 flex items-center';
            draftBanner.innerHTML = `
                <i class="fas fa-edit mr-2"></i>
                <span class="font-medium">This is a draft post and is only visible to administrators.</span>
            `;
            postDetails.insertBefore(draftBanner, postDetails.firstChild);
        }
    }

    showError(message = 'Post not found') {
        const loading = document.getElementById('loading');
        const postDetails = document.getElementById('post-details');
        const error = document.getElementById('error');

        if (loading) { loading.classList.add('hidden'); }
        if (postDetails) { postDetails.classList.add('hidden'); }
        if (error) {
            error.classList.remove('hidden');
            const errorText = error.querySelector('p');

            if (errorText) { errorText.textContent = message; }
        }
    }

    showSuccess(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');

        successDiv.className = 'fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        successDiv.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-check-circle mr-2"></i>
                ${message}
            </div>
        `;

        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blogPostViewPage = new BlogPostViewPage();
});
