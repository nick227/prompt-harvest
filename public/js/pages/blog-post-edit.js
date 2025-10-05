/**
 * Blog Post Edit Page Handler - Enhanced Version
 * Handles blog post editing with advanced UI components
 */

class BlogPostEditPage {
    constructor() {
        this.blogService = window.blogService;
        this.authService = window.authService;
        this.postSlug = null;
        this.postId = null;
        this.post = null;

        // Advanced UI components
        this.contentEditor = null;
        this.thumbnailSelector = null;
        this.formValidator = null;
        this.uiController = null;
        this.uiUtils = null;

        this.init();
    }

    async init() {
        try {
            // Wait for services to be ready
            await this.waitForServices();

            // Check admin status
            this.checkAdminStatus();

            // Get post identifier from URL
            this.getPostIdentifier();

            // Load post for editing
            await this.loadPost();

        // Initialize advanced UI components
        this.initializeAdvancedComponents();

        // Initialize UI utilities
        if (window.BlogUIUtils) {
            this.uiUtils = new window.BlogUIUtils();
        }

            // Set up form handling
            this.setupFormHandling();

        } catch (error) {
            console.error('Failed to initialize blog post edit page:', error);
            this.showError();
        }
    }

    async waitForServices() {
        // Wait for services to be available
        while (!this.blogService || !this.authService) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    checkAdminStatus() {
        const isAdmin = this.blogService.isAdmin();

        if (this.uiUtils) {
            this.uiUtils.updateFormVisibility(isAdmin);
            this.uiUtils.debug('Admin status check', { isAdmin });
        } else {
            // Fallback to direct DOM manipulation
            const adminNotice = document.getElementById('admin-only-notice');
            const form = document.getElementById('post-form');

            if (adminNotice && form) {
                if (isAdmin) {
                    form.classList.remove('hidden');
                    adminNotice.classList.add('hidden');
                } else {
                    form.classList.add('hidden');
                    adminNotice.classList.remove('hidden');
                }
            }
        }
    }

    getPostIdentifier() {
        const path = window.location.pathname;
        const editMatch = path.match(/\/blog\/([^\/]+)\/edit$/);

        if (editMatch) {
            this.postSlug = editMatch[1];
            // Post slug extracted for editing
        } else {
            throw new Error('Invalid edit URL format');
        }
    }

    async loadPost() {
        try {
            this.showLoading();

            const post = await this.blogService.getPostBySlug(this.postSlug);
            this.post = post;
            this.postId = post.id;

            this.populateForm(post);
            this.showForm();

        } catch (error) {
            console.error('Failed to load post:', error);
            this.showError();
        }
    }

    populateForm(post) {
        // Basic information
        document.getElementById('title').value = post.title || '';
        document.getElementById('excerpt').value = post.excerpt || '';

        // Content editor
        if (this.contentEditor) {
            this.contentEditor.setContent(post.content || '');
        } else {
            document.getElementById('content').textContent = post.content || '';
        }

        // Tags
        const tags = post.tags ? (Array.isArray(post.tags) ? post.tags.join(', ') : post.tags) : '';
        document.getElementById('tags').value = tags;

        // Settings
        document.getElementById('isPublished').checked = post.isPublished || false;
        document.getElementById('isFeatured').checked = post.isFeatured || false;

        // Thumbnail
        if (post.thumbnail) {
            document.getElementById('thumbnail').value = post.thumbnail;
            // Initialize thumbnail widget with existing image
            this.initializeThumbnailWidget(post.thumbnail);
        }

        // Post information
        document.getElementById('created-date').textContent = this.blogService.formatDateTime(post.createdAt);
        document.getElementById('updated-date').textContent = this.blogService.formatDateTime(post.updatedAt);
        document.getElementById('view-count').textContent = post.viewCount || 0;
        document.getElementById('author-name').textContent = post.author?.name || post.author?.username || 'Unknown';

        // Update page title
        document.title = `Edit ${post.title} - AutoImage Blog`;
    }

    initializeAdvancedComponents() {
        try {
            // Initialize Content Editor
            if (window.ContentEditor) {
                this.contentEditor = new window.ContentEditor('content');
                // Content Editor initialized
            }

            // Initialize Thumbnail Selector
            if (window.ThumbnailSelector) {
                this.thumbnailSelector = new window.ThumbnailSelector('thumbnail-selector-container', {
                    onThumbnailSelected: (imageData) => {
                        console.log('🔍 BLOG-EDIT: Thumbnail selected:', imageData);
                        // Update the hidden input
                        const thumbnailInput = document.getElementById('thumbnail');
                        if (thumbnailInput) {
                            thumbnailInput.value = imageData.url;
                        }
                    }
                });
                console.log('🔍 BLOG-EDIT: ThumbnailSelector initialized');
            }

            // Initialize Form Validator
            if (window.FormValidator) {
                this.formValidator = new window.FormValidator('post-form');
                // Form Validator initialized
            }

            // Initialize UI Controller
            if (window.UIController) {
                this.uiController = new window.UIController();
                // UI Controller initialized
            }

        } catch (error) {
            console.error('Failed to initialize advanced components:', error);
        }
    }

    initializeThumbnailWidget(thumbnailUrl) {
        // Initialize thumbnail widget with existing image
        if (this.thumbnailSelector && thumbnailUrl) {
            // Set the thumbnail in the widget
            const thumbnailInput = document.getElementById('thumbnail');
            if (thumbnailInput) {
                thumbnailInput.value = thumbnailUrl;
            }
            // Show the thumbnail in the selector
            this.thumbnailSelector.showPreview(thumbnailUrl, 'existing');
        }
    }

    setupFormHandling() {
        const form = document.getElementById('post-form');
        const saveDraftBtn = document.getElementById('save-draft-btn');
        const publishBtn = document.getElementById('publish-btn');

        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit(e);
            });
        }

        if (saveDraftBtn) {
            saveDraftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitPost(false); // Save as draft
            });
        }

        if (publishBtn) {
            publishBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.submitPost(true); // Publish
            });
        }
    }

    async handleFormSubmit(event) {
        const isPublish = event.submitter?.id === 'publish-btn';
        await this.submitPost(isPublish);
    }

    async submitPost(isPublish = false) {
        try {
            // Sync content from content editor
            if (this.contentEditor) {
                this.contentEditor.syncContent();
            }

            // Get form data
            const formData = this.getFormData();

            // Add publish status
            formData.isPublished = isPublish;

            // Validate form
            if (this.formValidator && !this.formValidator.validate()) {
                return;
            }

            // Show loading
            this.showSaving();

            // Update post
            const result = await this.blogService.updatePost(this.postId, formData);

            // Show success
            this.showSuccess(`Post ${isPublish ? 'published' : 'saved as draft'} successfully!`);

            // Redirect after delay
            setTimeout(() => {
                window.location.href = `/blog/${this.postSlug}`;
            }, 2000);

        } catch (error) {
            console.error('Failed to update post:', error);
            this.showError('Failed to update post. Please try again.');
        }
    }

    getFormData() {
        const form = document.getElementById('post-form');
        const formData = new FormData(form);

        return {
            title: formData.get('title'),
            excerpt: formData.get('excerpt'),
            content: this.contentEditor ? this.contentEditor.getContent() : formData.get('content'),
            thumbnail: formData.get('thumbnail'),
            tags: formData.get('tags') ? formData.get('tags').split(',').map(tag => tag.trim()).filter(tag => tag) : [],
            isPublished: formData.get('isPublished') === 'on',
            isFeatured: formData.get('isFeatured') === 'on'
        };
    }

    showLoading() {
        const loading = document.getElementById('loading');
        const form = document.getElementById('post-form');
        const error = document.getElementById('error');

        if (loading) loading.classList.remove('hidden');
        if (form) form.classList.add('hidden');
        if (error) error.classList.add('hidden');
    }

    showForm() {
        const loading = document.getElementById('loading');
        const form = document.getElementById('post-form');

        if (loading) loading.classList.add('hidden');
        if (form) form.classList.remove('hidden');
    }

    showSaving() {
        const saving = document.getElementById('saving');
        const form = document.getElementById('post-form');

        if (saving) saving.classList.remove('hidden');
        if (form) form.classList.add('hidden');
    }

    hideSaving() {
        const saving = document.getElementById('saving');
        if (saving) saving.classList.add('hidden');
    }

    showSuccess(message) {
        this.hideSaving();

        // Create success message
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

    showError(message = 'Failed to load post') {
        const loading = document.getElementById('loading');
        const form = document.getElementById('post-form');
        const error = document.getElementById('error');

        if (loading) loading.classList.add('hidden');
        if (form) form.classList.add('hidden');
        if (error) {
            error.classList.remove('hidden');
            const errorText = error.querySelector('p');
            if (errorText) errorText.textContent = message;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.blogPostEditPage = new BlogPostEditPage();
});
