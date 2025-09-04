/**
 * Image DOM Manager
 * Extracted from images.js - handles DOM creation and manipulation for images
 */

class ImageDOMManager {
    constructor() {
        this.config = IMAGE_CONFIG;
    }

    createImageElement(_results) {
        const img = document.createElement('img');

        // Handle multiple possible image URL formats (like feed-manager does)
        img.src = _results.imageUrl || _results.image || _results.url || `uploads/${_results.imageName}`;
        img.alt = _results.prompt || '';
        img.title = _results.prompt || '';

        // Add essential styling and classes
        img.style.width = '100%';
        img.style.height = '150px';
        img.style.objectFit = 'cover';
        img.style.cursor = 'pointer';
        img.classList.add('generated-image');

        // Add load/error handlers for graceful fallback
        img.onload = () => {
            img.classList.remove('image-loading');
            img.classList.add('image-loaded');
            this.removeLoadingSpinner(img);
            console.log('✅ Image loaded successfully:', img.src);
        };

        img.onerror = () => {
            console.log('❌ Image failed to load:', img.src);
            this.removeLoadingSpinner(img);
            this.createImagePlaceholder(img, _results);
        };

        // Also handle the case where src is invalid from the start
        setTimeout(() => {
            if (img.complete && img.naturalWidth === 0) {
                console.log('❌ Image invalid from start:', img.src);
                this.removeLoadingSpinner(img);
                this.createImagePlaceholder(img, _results);
            }
        }, 100);

        // Add initial loading state with spinner
        img.classList.add('image-loading');
        this.addLoadingSpinner(img);

        // Add dataset attributes for fullscreen and other functionality
        this.addImageDataset(img, _results);

        return img;
    }

    addLoadingSpinner(img) {
        // Skip spinner if image doesn't have a parent yet (will be added later)
        if (!img.parentElement) {
            console.log('🔄 Skipping spinner - image not in DOM yet');

            return;
        }

        // Create a wrapper if the image doesn't have a positioned parent
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
            console.log('🔄 Spinner added for image:', img.src);
        }
    }

    removeLoadingSpinner(img) {
        // Find and remove the spinner
        const wrapper = img.parentElement || document;
        const spinner = wrapper.querySelector('[data-image-spinner="true"]');

        if (spinner) {
            spinner.remove();
        }
    }

    createImagePlaceholder(img, _results) {
        console.log('🖼️ Creating placeholder for:', _results);

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

        // Add placeholder content using CSS pseudo-elements approach
        img.setAttribute('data-placeholder', '🖼️');
        const promptText = _results && _results.prompt ? _results.prompt : 'Image unavailable';
        const displayText = promptText.length > 30 ? `${promptText.substring(0, 30)}...` : promptText;

        img.setAttribute('data-text', displayText);

        // Add CSS for the placeholder if not already added
        this.addPlaceholderStyles();

        // Fallback: Add actual DOM elements if CSS pseudo-elements don't work
        setTimeout(() => {
            const wrapper = img.parentElement;

            if (wrapper && !wrapper.querySelector('.placeholder-content')) {
                // Ensure wrapper has relative positioning
                if (wrapper.style.position !== 'relative' && wrapper.style.position !== 'absolute') {
                    wrapper.style.position = 'relative';
                }

                const placeholderDiv = document.createElement('div');

                placeholderDiv.className = 'placeholder-content';
                placeholderDiv.innerHTML = `
                    <div style="font-size: 2rem; color: #6c757d; margin-bottom: 0.5rem;">🖼️</div>
                    <div style="font-size: 0.75rem; color: #6c757d; text-align: center; padding: 4px;">
                        ${img.getAttribute('data-text')}
                    </div>
                `;
                placeholderDiv.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    text-align: center;
                    pointer-events: none;
                    z-index: 5;
                `;
                wrapper.appendChild(placeholderDiv);
            }
        }, 50);

        console.log('✅ Placeholder created successfully');
    }

    addPlaceholderStyles() {
        if (document.getElementById('image-placeholder-styles')) {
            return;
        }

        console.log('📝 Adding placeholder styles...');
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
        `;
        document.head.appendChild(style);
    }

    addImageDataset(img, _results) {
        // Add dataset attributes needed by fullscreen and other components
        if (_results.id || _results.imageId) {
            img.dataset.id = _results.id || _results.imageId;
        }
        if (_results.prompt) {
            img.dataset.prompt = _results.prompt;
        }
        if (_results.original) {
            img.dataset.original = _results.original;
        }
        if (_results.provider || _results.providerName) {
            img.dataset.provider = _results.provider || _results.providerName;
        }
        if (_results.guidance) {
            img.dataset.guidance = _results.guidance;
        }
        if (_results.rating) {
            img.dataset.rating = _results.rating;
        }
    }

    downloadImage(img, _results) {
        const a = document.createElement('a');
        const fileName = decodeURIComponent(img.src.split('/').pop());

        a.href = img.src;
        a.download = fileName;
        a.click();
    }

    addImageToOutput(_results, download = false) {
        console.log('🖼️ DOM INSERT: addImageToOutput called', { _results, download });

        try {
            // Create the image element
            const img = this.createImageElement(_results);

            console.log('🖼️ DOM INSERT: Image element created', !!img);

            this.handleAutoDownload(img, _results, download);

            // Find the container and loading placeholder
            const container = document.querySelector('.prompt-output');
            const loadingPlaceholder = document.querySelector('.loading-placeholder');

            if (container) {
                // Create simple wrapper
                const listItem = document.createElement('li');

                listItem.className = 'image-item';
                listItem.style.cssText = `
                    width: 100%;
                    height: 150px;
                    min-height: 150px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0;
                    padding: 0;
                `;

                // Add data attributes for filtering
                if (_results) {
                    const currentUser = this.getCurrentUser();
                    const userId = _results.userId || (currentUser ? currentUser.id : 'unknown');
                    const filterType = currentUser ? 'user' : 'site';

                    listItem.setAttribute('data-filter', filterType);
                    listItem.setAttribute('data-user-id', userId);
                    listItem.setAttribute('data-image-id', _results.id || _results.imageId || 'unknown');
                }

                // Create wrapper for intersection observer
                const wrapper = document.createElement('div');

                wrapper.className = 'image-wrapper';
                wrapper.appendChild(img);

                // Add intersection observer
                const observer = new IntersectionObserver(entries => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('loaded');
                            observer.unobserve(entry.target);
                        }
                    });
                });

                observer.observe(img);

                listItem.appendChild(wrapper);

                // Replace loading placeholder if it exists, otherwise append to end
                if (loadingPlaceholder) {
                    console.log('🔄 Replacing loading placeholder with generated image');
                    container.replaceChild(listItem, loadingPlaceholder);
                } else {
                    console.log('📝 No loading placeholder found, appending to end');
                    container.appendChild(listItem);
                }

                console.log('✅ Image successfully inserted using replacement approach');
            } else {
                console.error('❌ Container .prompt-output not found');
                // Fallback: add to body
                document.body.appendChild(img);
            }

            return img;
        } catch (error) {
            console.error('❌ addImageToOutput failed:', error);

            return null;
        }
    }

    handleAutoDownload(img, _results, download) {
        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (download && autoDownload) {
            this.downloadImage(img, _results);
        }
    }

    createWrapperWithObserver(img) {
        const wrapper = this.createWrapperElement();
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('loaded');
                    observer.unobserve(entry.target);
                }
            });
        });

        wrapper.appendChild(img);
        observer.observe(img);

        return wrapper;
    }

    insertImageIntoDOM(listItem) {
        // Use direct querySelector to avoid Utils.dom issues
        const imagesSection = document.querySelector('.prompt-output');

        if (imagesSection) {
            console.log('📍 Inserting image into DOM...');
            this.replaceOrInsertImage(listItem, imagesSection);
        } else {
            console.error('❌ Images section (.prompt-output) not found!');
            // Fallback: try to find any suitable container
            const fallbackContainer = document.querySelector('main, body');

            if (fallbackContainer) {
                console.log('📍 Using fallback container...');
                fallbackContainer.appendChild(listItem);
            }
        }
    }

    replaceOrInsertImage(listItem, imagesSection) {
        console.log('🔍 replaceOrInsertImage called', { listItem: !!listItem, imagesSection: !!imagesSection });

        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder && listItem) {
            console.log('📍 Replacing loading placeholder...');
            loadingPlaceholder.innerHTML = '';
            loadingPlaceholder.appendChild(listItem);
            loadingPlaceholder.classList.remove('loading-placeholder');
        } else {
            console.log('📍 Inserting at beginning...');
            this.insertAtBeginning(listItem, imagesSection);
        }
    }

    insertAtBeginning(listItem, imagesSection) {
        try {
            if (imagesSection && listItem) {
                // Simplified approach: just append to avoid insertBefore issues
                imagesSection.appendChild(listItem);
                console.log('✅ Image successfully inserted into DOM');
            } else {
                console.error('❌ Missing elements for DOM insertion:', {
                    imagesSection: !!imagesSection,
                    listItem: !!listItem
                });
                // Debug: log what we actually have
                console.log('Debug - imagesSection:', imagesSection);
                console.log('Debug - listItem:', listItem);
            }
        } catch (error) {
            console.error('❌ DOM insertion failed:', error);
            // Fallback: just append to body if all else fails
            if (listItem) {
                console.log('📍 Using fallback: appending to body');
                document.body.appendChild(listItem);
            }
        }
    }

    createImageListItem(_results) {
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

        // Add data attributes for filtering (like feed-manager does)
        if (_results) {
            // For newly generated images, they belong to the current user
            const currentUser = this.getCurrentUser();
            const userId = _results.userId || (currentUser ? currentUser.id : 'unknown');
            const filterType = currentUser ? 'user' : 'site';

            li.setAttribute('data-filter', filterType);
            li.setAttribute('data-user-id', userId);
            li.setAttribute('data-image-id', _results.id || _results.imageId || 'unknown');
        }

        return li;
    }

    createWrapperElement() {
        const wrapper = document.createElement('div');

        wrapper.className = this.config.classes.imageWrapper;

        return wrapper;
    }

    createLoadingPlaceholder(promptObj) {
        const li = Utils.dom.createElement('li', 'image-item loading-placeholder');
        const wrapper = Utils.dom.createElement('div', 'image-wrapper loading');

        wrapper.style.width = '100%';
        wrapper.style.height = '150px';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.alignItems = 'center';
        wrapper.style.backgroundColor = '#f5f5f5';
        wrapper.style.borderRadius = '3px';
        wrapper.style.position = 'relative';
        wrapper.style.border = '2px dashed #ccc';

        const loadingContent = Utils.dom.createElement('div', 'loading-content');

        loadingContent.style.textAlign = 'center';
        loadingContent.style.color = '#666';

        const spinner = Utils.dom.createElement('div', 'spinner');

        spinner.innerHTML = '⏳';
        spinner.style.fontSize = '24px';
        spinner.style.marginBottom = '8px';
        spinner.style.animation = 'spin 1s linear infinite';

        const text = Utils.dom.createElement('div', 'loading-text');

        text.textContent = 'Generating...';
        text.style.fontSize = '12px';
        text.style.fontWeight = 'bold';

        const promptPreview = Utils.dom.createElement('div', 'prompt-preview');

        promptPreview.textContent = promptObj.prompt.length > 30 ?
            `${promptObj.prompt.substring(0, 30)}...` :
            promptObj.prompt;
        promptPreview.style.fontSize = '10px';
        promptPreview.style.marginTop = '4px';
        promptPreview.style.color = '#999';

        loadingContent.appendChild(spinner);
        loadingContent.appendChild(text);
        loadingContent.appendChild(promptPreview);
        wrapper.appendChild(loadingContent);
        li.appendChild(wrapper);

        return li;
    }

    showLoadingPlaceholder(promptObj) {
        const container = document.querySelector('.prompt-output');

        if (container) {
            const loadingPlaceholder = this.createLoadingPlaceholder(promptObj);

            container.insertBefore(loadingPlaceholder, container.firstChild);

            return loadingPlaceholder;
        }

        return null;
    }

    removeLoadingPlaceholder() {
        const loadingPlaceholder = document.querySelector('.loading-placeholder');

        if (loadingPlaceholder) {
            loadingPlaceholder.remove();
        }
    }

    toggleProcessingStyle(element = null) {
        const currentPrompt = element || document.querySelector('.prompt-output li:first-child');

        if (currentPrompt) {
            currentPrompt.classList.toggle('processing');
        }
    }

    getCurrentUser() {
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
}

// Export for global access
window.ImageDOMManager = ImageDOMManager;

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ImageDOMManager;
}
