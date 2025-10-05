/**
 * BlogPostPage - Refactored and modular blog post creation handler
 * Single Responsibility: Coordinate components and handle high-level flow
 */

class BlogPostPage {
    constructor() {
        this.blogService = null;
        this.authService = null;
        this.formValidator = null;
        this.mediaManager = null;
        this.uiController = null;
        this.errorHandler = null;
        this.contentEditor = null;
        this.isInitialized = false;

        this.init();
    }

    async init() {
        try {
            await this.initializeServices();
            await this.initializeComponents();
            this.setupEventListeners();
            this.isInitialized = true;
            // BlogPostPage initialized successfully
        } catch (error) {
            console.error('BlogPostPage: Initialization failed', error);
            this.handleInitializationError(error);
        }
    }

    async initializeServices() {
        // Wait for services to be available
        while (!window.blogService || !window.authService) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.blogService = window.blogService;
        this.authService = window.authService;

        // Wait for header component to initialize
        await this.waitForHeaderComponent();
    }

    async waitForHeaderComponent() {
        // Wait for header component to be ready
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds max wait

        while (attempts < maxAttempts) {
            const header = document.querySelector('header');
            const authWidget = document.querySelector('#auth-widget');

            if (header && authWidget) {
                // Header is ready, wait a bit more for auth state to settle
                await new Promise(resolve => setTimeout(resolve, 200));

                // Force header update after services are ready
                if (window.headerComponent) {
                    window.headerComponent.forceUpdate();
                }
                return;
            }

            // If header component is not available, try to create it
            if (!window.headerComponent && window.HeaderComponent) {
                console.log('🔧 BLOG-POST: Creating header component manually');
                window.headerComponent = new window.HeaderComponent();
            }

            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        console.warn('Header component initialization timeout - continuing anyway');

        // Try to create header component one more time
        if (!window.headerComponent && window.HeaderComponent) {
            console.log('🔧 BLOG-POST: Final attempt to create header component');
            window.headerComponent = new window.HeaderComponent();
        }
    }

    async initializeComponents() {
        // Initialize error handler
        this.errorHandler = new ErrorHandler();
        this.setupErrorHandling();

        // Initialize form validation
        this.formValidator = new FormValidator('post-form');
        this.setupFormValidation();

        // Media selection is now handled by ThumbnailSelector

        // Initialize UI controller
        this.uiController = new UIController();

            // Initialize content editor
            this.contentEditor = new ContentEditor('content');

        // Initialize streamlined thumbnail selector
        this.thumbnailSelector = new ThumbnailSelector('thumbnail-selector-container', {
            onThumbnailSelected: (imageData) => {
                console.log('🔍 BLOG-POST: Thumbnail selected:', imageData);
            }
        });

        // Initialize content media selector
        console.log('🔍 BLOG-POST: Initializing content media selector...');
        const contentContainer = document.getElementById('content-media-selector');
        console.log('🔍 BLOG-POST: Content container found:', !!contentContainer);

        if (contentContainer) {
            // Check if already initialized
            if (contentContainer.dataset.mediaSelectorInitialized === 'true') {
                console.warn('🔍 BLOG-POST: Content media selector already initialized, skipping...');
                return;
            }

            this.contentMediaSelector = new MediaSelector('content-media-selector', {
                purpose: 'content',
                multiple: true,
                maxSize: 10 * 1024 * 1024, // 10MB for content images
                style: 'compact',
                onMediaSelected: (mediaData) => {
                    console.log('🔍 BLOG-POST: Content media selected:', mediaData);
                    // Insert image into content editor
                    if (this.contentEditor && mediaData.url) {
                        const imageMarkdown = `![${mediaData.filename || 'image'}](${mediaData.url})`;
                        this.contentEditor.insertContent(imageMarkdown);
                    }
                }
            });
            console.log('🔍 BLOG-POST: Content media selector initialized:', !!this.contentMediaSelector);
        } else {
            console.error('🔍 BLOG-POST: Content media selector container not found!');
        }

        // Check admin status with delay
        setTimeout(() => this.checkAdminStatus(), 500);

        // Force header update after everything is initialized
        setTimeout(() => {
            if (window.headerComponent) {
                window.headerComponent.forceUpdate();
            }

            // Debug authentication state
            if (window.location.search.includes('debug')) {
                console.log('🔍 BLOG-POST: Authentication debug', {
                    authService: window.authService ? 'available' : 'missing',
                    userSystem: window.userSystem ? 'available' : 'missing',
                    token: localStorage.getItem('authToken') ? 'present' : 'missing',
                    isAuthenticated: window.authService?.isAuthenticated() || window.userSystem?.isAuthenticated(),
                    user: window.authService?.getUser?.() || window.userSystem?.currentUser
                });
            }
        }, 1000);

        // Add additional header update on DOM ready
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                // Check if header exists, if not, create it
                const existingHeader = document.querySelector('header');
                if (!existingHeader && window.HeaderComponent) {
                    console.log('🔧 BLOG-POST: No header found, creating one');
                    window.headerComponent = new window.HeaderComponent();
                }

                if (window.headerComponent) {
                    window.headerComponent.forceUpdate();
                }
            }, 100);
        });
    }

    setupErrorHandling() {
        // Listen for error notifications
        window.addEventListener('errorNotification', (e) => {
            const { message, type, duration } = e.detail;
            if (type === 'error') {
                this.uiController.showError(message);
            } else {
                this.uiController.showSuccess(message);
            }
        });
    }

    setupFormValidation() {
        // Add validators for required fields
        this.formValidator.addValidator('title', (value) => value.trim().length > 0, (isValid, field) => {
            this.updateFieldValidation(field, isValid);
        });

        this.formValidator.addValidator('content', (value) => {
            // For contenteditable, check if there's actual content
            const contentDiv = document.getElementById('content');
            if (contentDiv) {
                const content = contentDiv.textContent || contentDiv.innerText || '';
                return content.trim().length > 0;
            }
            return value.trim().length > 0;
        }, (isValid, field) => {
            this.updateFieldValidation(field, isValid);
        });

        // Listen for form state changes
        this.formValidator.form.addEventListener('formStateChange', (e) => {
            this.handleFormStateChange(e.detail.isValid);
        });
    }

    updateFieldValidation(field, isValid) {
        // Add visual feedback for field validation
        field.classList.toggle('border-red-500', !isValid);
        field.classList.toggle('border-gray-600', isValid);
    }

    handleFormStateChange(isValid) {
        const title = this.formValidator.getFieldValue('title');
        const hasTitle = title.length > 0;

        this.uiController.updateButtonStates(isValid, hasTitle);
    }

    // Media callbacks are now handled by ThumbnailSelector

    setupEventListeners() {
        // Listen for auth state changes
        window.addEventListener('authStateChanged', () => {
            setTimeout(() => this.checkAdminStatus(), 100);
        });

        // Listen for form submission
        this.formValidator.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit(e);
        });
    }

    async checkAdminStatus() {
        try {
            const isAdmin = this.blogService?.isAdmin() || false;
            this.uiController.updateAdminStatus(isAdmin);

            if (isAdmin) {
                // Admin access confirmed
            } else {
                // Not admin - redirect to blog index
                this.uiController.showError('Access denied. Only administrators can create blog posts.');
                setTimeout(() => {
                    window.location.href = '/blog';
                }, 2000);
            }
        } catch (error) {
            console.error('BlogPostPage: Failed to check admin status', error);
            // If we can't check admin status, redirect to blog index for security
            this.uiController.showError('Unable to verify admin status. Redirecting...');
            setTimeout(() => {
                window.location.href = '/blog';
            }, 2000);
        }
    }

    async handleFormSubmit(e) {
        const isPublish = e.submitter?.id === 'publish-btn';

        if (!this.formValidator.validate()) {
            this.uiController.showError('Please fill in all required fields');
            return;
        }

        await this.submitPost(isPublish);
    }

    async submitPost(isPublish) {
        try {
            this.uiController.showLoading(isPublish ? 'Publishing Post...' : 'Saving Draft...');

            // Sync content editor before getting form data
            if (this.contentEditor) {
                this.contentEditor.syncContent();
            }

            const formData = this.uiController.getFormData();
            const postData = this.blogService.formatPostData(formData, isPublish);

            console.log('🔍 BLOG-POST: Form data:', formData);
            console.log('🔍 BLOG-POST: Post data:', postData);

            // Simple API call without retry mechanism
            const result = await this.blogService.createPost(postData, isPublish);

            // Debug the result object to see its structure
            console.log('🔍 BLOG-POST: Result object:', result);
            console.log('🔍 BLOG-POST: Result type:', typeof result);
            console.log('🔍 BLOG-POST: Result keys:', Object.keys(result));
            console.log('🔍 BLOG-POST: Result.success:', result.success);

            // The result is the blog post data itself (not the API response wrapper)
            // If we have a result with an ID, the post was created successfully
            if (result && result.id) {
                this.uiController.showSuccess(
                    isPublish ? 'Post published successfully!' : 'Post saved as draft!'
                );

                // Redirect after short delay
                setTimeout(() => {
                    window.location.href = '/blog';
                }, 2000);
            } else {
                throw new Error(result.error || 'Failed to save post');
            }
        } catch (error) {
            console.error('BlogPostPage: Submit failed', error);
            this.handleSubmitError(error);
        } finally {
            this.uiController.hideLoading();
        }
    }

    handleSubmitError(error) {
        // Use centralized error handling
        const errorResult = this.errorHandler.handleError(error, this.categorizeError(error));

        if (errorResult.action) {
            errorResult.action();
        }
    }

    categorizeError(error) {
        if (error.message?.includes('Authentication') || error.message?.includes('401')) {
            return 'AUTH_ERROR';
        } else if (error.message?.includes('admin') || error.message?.includes('403')) {
            return 'VALIDATION_ERROR';
        } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
            return 'NETWORK_ERROR';
        } else if (error.message?.includes('500') || error.message?.includes('Server')) {
            return 'SERVER_ERROR';
        } else {
            return 'UNKNOWN_ERROR';
        }
    }

    handleInitializationError(error) {
        this.uiController.showError('Failed to initialize page. Please refresh and try again.');
        console.error('BlogPostPage: Initialization error', error);
    }

    destroy() {
        if (this.mediaManager) {
            this.mediaManager.destroy();
        }
        if (this.uiController) {
            this.uiController.destroy();
        }
        this.isInitialized = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BlogPostPage();
});
