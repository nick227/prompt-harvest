/**
 * Shared Image DOM Utilities
 * Common DOM manipulation functionality for image management
 */

class ImageDOMUtils {
    /**
     * Create a basic image element with common attributes
     * @param {Object} imageData - Image data object
     * @returns {HTMLImageElement} Created image element
     */
    static createImageElement(imageData) {
        const img = document.createElement('img');

        // Set src normally - the container will be hidden during loading
        img.src = imageData.imageUrl || imageData.image || imageData.url || `uploads/${imageData.imageName}`;
        img.alt = imageData.prompt || '';
        img.title = imageData.prompt || '';

        // Add essential styling and classes
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.cursor = 'pointer';
        img.classList.add('generated-image');

        // Add dataset attributes
        this.addImageDataset(img, imageData);

        return img;
    }

    /**
     * Add dataset attributes to an image element
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    static addImageDataset(img, imageData) {
        if (imageData.id || imageData.imageId) {
            img.dataset.id = imageData.id || imageData.imageId;
        }
        if (imageData.prompt) {
            img.dataset.prompt = imageData.prompt;
        }
        if (imageData.original) {
            img.dataset.original = imageData.original;
        }
        if (imageData.provider || imageData.providerName) {
            img.dataset.provider = imageData.provider || imageData.providerName;
        }
        if (imageData.model) {
            img.dataset.model = imageData.model;
        }
        if (imageData.guidance) {
            img.dataset.guidance = imageData.guidance;
        }
        if (imageData.rating) {
            img.dataset.rating = imageData.rating;
        }
        if (imageData.userId) {
            img.dataset.userId = imageData.userId;
        }
        if (imageData.username) {
            img.dataset.username = imageData.username;
        }
        if (imageData.createdAt) {
            img.dataset.createdAt = imageData.createdAt;
        }
        if (imageData.tags) {
            img.dataset.tags = JSON.stringify(imageData.tags);
        }
        if (imageData.isPublic !== undefined) {
            img.dataset.isPublic = imageData.isPublic;
        }
    }

    /**
     * Create a wrapper element for images
     * @param {string} className - CSS class name for wrapper
     * @returns {HTMLElement} Created wrapper element
     */
    static createWrapperElement(className = 'image-wrapper') {
        const wrapper = document.createElement('div');

        wrapper.className = className;

        return wrapper;
    }

    /**
     * Create a list item element for images
     * @param {Object} imageData - Image data object
     * @returns {HTMLElement} Created list item element
     */
    static createImageListItem(imageData) {
        const li = document.createElement('li');

        li.className = 'image-item';

        li.style.width = '100%';
        li.style.height = '150px';
        li.style.minHeight = '150px';
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.justifyContent = 'center';
        li.style.margin = '0';
        li.style.padding = '0';

        // Add data attributes for filtering
        if (imageData) {
            const currentUser = this.getCurrentUser();
            const userId = imageData.userId || (currentUser ? currentUser.id : 'unknown');
            const filterType = currentUser ? 'user' : 'site';

            li.setAttribute('data-filter', filterType);
            li.setAttribute('data-user-id', userId);
            li.setAttribute('data-image-id', imageData.id || imageData.imageId || 'unknown');
        }

        return li;
    }

    /**
     * Add loading spinner to an image
     * @param {HTMLImageElement} img - Image element
     */
    static addLoadingSpinner(img) {
        // Skip spinner if image doesn't have a parent yet
        if (!img.parentElement) {
            console.log('🔄 DOM UTILS: Skipping spinner - image not in DOM yet');

            return;
        }

        const wrapper = img.parentElement;

        // If parent isn't positioned, make it positioned
        if (wrapper && wrapper.style.position !== 'relative' && wrapper.style.position !== 'absolute') {
            wrapper.style.position = 'relative';
        }

        // Create spinner
        const spinner = document.createElement('div');

        spinner.className = 'image-loading-spinner';
        spinner.setAttribute('data-image-spinner', 'true');

        // Add spinner to wrapper
        if (wrapper) {
            wrapper.appendChild(spinner);
            console.log('🔄 DOM UTILS: Spinner added for image:', img.src);
        }
    }

    /**
     * Remove loading spinner from an image
     * @param {HTMLImageElement} img - Image element
     */
    static removeLoadingSpinner(img) {
        const wrapper = img.parentElement || document;
        const spinner = wrapper.querySelector('[data-image-spinner="true"]');

        if (spinner) {
            spinner.remove();
        }
    }

    /**
     * Create intersection observer for lazy loading
     * @param {HTMLElement} element - Element to observe
     * @param {Function} callback - Callback function when element is visible
     * @returns {IntersectionObserver} Created observer
     */
    static createIntersectionObserver(element, callback) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    callback(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        });

        observer.observe(element);

        return observer;
    }

    /**
     * Normalize image data to consistent format
     * @param {Object} rawData - Raw image data
     * @returns {Object} Normalized image data
     */
    static normalizeImageData(rawData) {
        const currentUser = this.getCurrentUser();

        // Normalize image URL
        let imageUrl = rawData.imageUrl || rawData.image || rawData.url || '';

        // Don't modify base64 data - it should be handled by the image component
        // Only add leading slash for actual URL paths
        if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/') &&
            !imageUrl.startsWith('iVBORw0KGgo') && !imageUrl.startsWith('/9j/')) {
            imageUrl = `/${imageUrl}`;
        }

        // Generate title from first 8 characters of prompt
        const generateTitle = (prompt) => {
            if (!prompt) return 'Generated Image';
            return prompt.substring(0, 8);
        };

        return {
            id: rawData.id || rawData._id || this.generateId(),
            url: imageUrl,
            title: generateTitle(rawData.prompt),
            prompt: rawData.prompt || '',
            original: rawData.original || rawData.prompt || '',
            provider: rawData.provider || rawData.providerName || 'unknown', // This is actually the model name from database
            model: rawData.provider || rawData.providerName || rawData.model || 'unknown', // Database provider column contains model name
            guidance: rawData.guidance || '',
            rating: parseInt(rawData.rating) || 0,
            isPublic: rawData.isPublic || false,
            userId: rawData.userId || (currentUser ? currentUser.id : null),
            username: rawData.username || (currentUser ? currentUser.username : null),
            createdAt: rawData.createdAt || new Date().toISOString(),
            filter: currentUser ? 'user' : 'site'
        };
    }

    /**
     * Generate a unique ID for images
     * @returns {string} Unique ID
     */
    static generateId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get current user from various sources
     * @returns {Object|null} Current user object or null
     */
    static getCurrentUser() {
        // Try to get user info from auth component
        if (window.authComponent && window.authComponent.getUser) {
            const user = window.authComponent.getUser();

            if (user && user.id) {
                return user;
            }
        }

        // Fallback to localStorage
        const userData = localStorage.getItem('userData');

        if (userData) {
            try {
                const parsed = JSON.parse(userData);

                if (parsed.data?.user?.id) {
                    return parsed.data.user;
                } else if (parsed.user?.id) {
                    return parsed.user;
                } else if (parsed.id) {
                    return parsed;
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        return null;
    }

    /**
     * Create image placeholder for failed loads
     * @param {HTMLImageElement} img - Image element
     * @param {Object} imageData - Image data object
     */
    static createImagePlaceholder(img, imageData) {
        console.log('🖼️ DOM UTILS: Creating placeholder for:', imageData);

        // Remove the failed src and create a stylish placeholder
        img.removeAttribute('src');
        img.classList.remove('image-loading');
        img.classList.add('image-placeholder');

        // Force the image to behave like a div for placeholder content
        img.style.backgroundColor = '#f8f9fa';
        img.style.border = '2px dashed #dee2e6';
        img.style.display = 'flex';
        img.style.alignItems = 'center';
        img.style.justifyContent = 'center';
        img.style.position = 'relative';
        img.style.overflow = 'hidden';
        img.style.minHeight = '150px';
        img.style.boxSizing = 'border-box';

        // Add placeholder content
        img.setAttribute('data-placeholder', '🖼️');
        const promptText = imageData && imageData.prompt ? imageData.prompt : 'Image unavailable';
        const displayText = promptText.length > 30 ? `${promptText.substring(0, 30)}...` : promptText;

        img.setAttribute('data-text', displayText);

        // Add CSS for the placeholder if not already added
        this.addPlaceholderStyles();

        console.log('✅ DOM UTILS: Placeholder created successfully');
    }

    /**
     * Add placeholder styles to document
     */
    static addPlaceholderStyles() {
        if (document.getElementById('image-placeholder-styles')) {
            return;
        }

        console.log('📝 DOM UTILS: Adding placeholder styles...');
        const style = document.createElement('style');

        style.id = 'image-placeholder-styles';
        style.textContent = `
            .image-placeholder::before {
                content: attr(data-placeholder);
                font-size: 2rem;
                color: #6c757d;
                margin-bottom: 0.5rem;
            }
            .image-placeholder::after {
                content: attr(data-text);
                position: absolute;
                bottom: 8px;
                left: 8px;
                right: 8px;
                font-size: 0.75rem;
                color: #6c757d;
                text-align: center;
                background: rgba(255,255,255,0.9);
                padding: 4px;
                border-radius: 4px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            .image-loading {
                opacity: 0.8;
                transition: opacity 0.3s ease;
            }
            .image-loaded {
                opacity: 1;
                transition: opacity 0.3s ease;
            }
            .image-loading-spinner {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 20px;
                height: 20px;
                border: 2px solid rgba(0,0,0,0.1);
                border-left: 2px solid #007bff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                background: rgba(255,255,255,0.9);
                z-index: 10;
                pointer-events: none;
            }
            @keyframes spin {
                0% { transform: translate(-50%, -50%) rotate(0deg); }
                100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
            @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Load deferred image when it's ready to be displayed
     * @param {HTMLImageElement} img - Image element with deferred src
     */
    static loadDeferredImage(img) {
        if (!img.dataset.deferredSrc) {
            return;
        }

        const src = img.dataset.deferredSrc;

        // Create a new image to preload
        const preloadImg = new Image();

        preloadImg.onload = () => {
            // Image loaded successfully, update the actual img element
            img.src = src;
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');

            // Remove loading styles
            img.style.backgroundColor = '';
            img.style.backgroundImage = '';
            img.style.backgroundSize = '';
            img.style.animation = '';

            // Remove deferred src
            delete img.dataset.deferredSrc;

            console.log('✅ Image loaded successfully:', src);
        };

        preloadImg.onerror = () => {
            // Image failed to load, show placeholder
            img.classList.remove('image-loading');
            img.classList.add('image-error');
            img.style.backgroundColor = '#fee2e2';
            img.style.backgroundImage = '';
            img.style.backgroundSize = '';
            img.style.animation = '';

            console.error('❌ Image failed to load:', src);
        };

        // Start loading
        preloadImg.src = src;
    }

    /**
     * Load all deferred images in a container
     * @param {HTMLElement} container - Container element
     */
    static loadAllDeferredImages(container) {
        const deferredImages = container.querySelectorAll('img[data-deferred-src]');
        deferredImages.forEach(img => {
            this.loadDeferredImage(img);
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageDOMUtils = ImageDOMUtils;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDOMUtils;
}
