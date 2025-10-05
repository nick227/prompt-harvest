/**
 * ContentEditor - Handles contenteditable blog post editor with media rendering
 * Single Responsibility: Media detection, rendering, and content management
 */

class ContentEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.hiddenInput = document.getElementById('content-text');
        this.mediaElements = new Map();
        this.isProcessing = false;

        if (!this.container) {
            console.error('ContentEditor: Container not found');
            return;
        }

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPlaceholder();
        this.syncContent();
    }

    setupEventListeners() {
        // Handle paste events
        this.container.addEventListener('paste', (e) => {
            e.preventDefault();
            this.handlePaste(e);
        });

        // Handle input events
        this.container.addEventListener('input', (e) => {
            this.handleInput(e);
        });

        // Handle keydown for special keys
        this.container.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Handle focus/blur
        this.container.addEventListener('focus', () => {
            this.container.classList.add('blog-content-editor');
        });

        this.container.addEventListener('blur', () => {
            this.syncContent();
        });
    }

    setupPlaceholder() {
        if (this.container.textContent.trim() === '') {
            this.container.classList.add('blog-content-editor');
        }
    }

    handlePaste(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        const pastedText = clipboardData.getData('text/plain');

        if (pastedText) {
            this.insertText(pastedText);
        }
    }

    handleInput(e) {
        if (this.isProcessing) return;

        this.syncContent();
        this.processContent();
    }

    handleKeydown(e) {
        // Handle Enter key for new lines
        if (e.key === 'Enter') {
            e.preventDefault();
            this.insertLineBreak();
        }

        // Handle Tab key
        if (e.key === 'Tab') {
            e.preventDefault();
            this.insertText('    '); // 4 spaces
        }
    }

    insertText(text) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(document.createTextNode(text));
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            this.container.textContent += text;
        }

        this.syncContent();
        this.processContent();
    }

    insertContent(content) {
        // Insert content at cursor position or at end
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();

            // Create a temporary div to parse HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;

            // Insert each child node
            while (tempDiv.firstChild) {
                range.insertNode(tempDiv.firstChild);
            }

            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // Insert at end of container
            this.container.innerHTML += content;
        }

        this.syncContent();
        this.processContent();
    }

    insertLineBreak() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const br = document.createElement('br');
            range.deleteContents();
            range.insertNode(br);
            range.setStartAfter(br);
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        this.syncContent();
    }

    processContent() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        // Find URLs in the content
        const textContent = this.container.textContent;
        const urls = this.extractUrls(textContent);

        // Process each URL
        urls.forEach(url => {
            if (!this.mediaElements.has(url)) {
                this.renderMedia(url);
            }
        });

        this.isProcessing = false;
    }

    extractUrls(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const urls = text.match(urlRegex) || [];

        // Filter for image and YouTube URLs
        return urls.filter(url => {
            return this.isImageUrl(url) || this.isYouTubeUrl(url);
        });
    }

    isImageUrl(url) {
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
        return imageExtensions.test(url);
    }

    isYouTubeUrl(url) {
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        return youtubeRegex.test(url);
    }

    renderMedia(url) {
        const mediaId = this.generateMediaId(url);
        const mediaContainer = document.createElement('div');
        mediaContainer.id = mediaId;
        mediaContainer.className = 'blog-media';

        // Add loading state
        mediaContainer.innerHTML = `
            <div class="blog-media-loading">
                <i class="fas fa-spinner fa-spin mr-2"></i>
                Loading media...
            </div>
        `;

        // Insert media container
        this.insertMediaContainer(url, mediaContainer);

        // Store reference
        this.mediaElements.set(url, mediaContainer);

        // Load media
        this.loadMedia(url, mediaContainer);
    }

    insertMediaContainer(url, container) {
        // Find the URL in the current content
        const walker = document.createTreeWalker(
            this.container,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let textNode;
        let urlIndex = -1;
        let targetNode = null;

        // Find the text node containing the URL
        while (textNode = walker.nextNode()) {
            const textContent = textNode.textContent;
            const index = textContent.indexOf(url);
            if (index !== -1) {
                urlIndex = index;
                targetNode = textNode;
                break;
            }
        }

        if (targetNode && urlIndex !== -1) {
            const textContent = targetNode.textContent;
            const beforeText = textContent.substring(0, urlIndex);
            const afterText = textContent.substring(urlIndex + url.length);

            // Create a document fragment to hold the replacement content
            const fragment = document.createDocumentFragment();

            // Add text before URL
            if (beforeText.trim()) {
                fragment.appendChild(document.createTextNode(beforeText));
            }

            // Add media container
            fragment.appendChild(container);

            // Add text after URL
            if (afterText.trim()) {
                fragment.appendChild(document.createTextNode(afterText));
            }

            // Replace the target node with the fragment
            targetNode.parentNode.replaceChild(fragment, targetNode);
        }
    }

    addTextNode(text) {
        if (text.trim()) {
            const textNode = document.createTextNode(text);
            this.container.appendChild(textNode);
        }
    }

    loadMedia(url, container) {
        if (this.isImageUrl(url)) {
            this.loadImage(url, container);
        } else if (this.isYouTubeUrl(url)) {
            this.loadYouTube(url, container);
        }
    }

    loadImage(url, container) {
        const img = new Image();

        img.onload = () => {
            container.innerHTML = `
                <div class="relative">
                    <img src="${url}" alt="Blog image" />
                    <div class="blog-media-controls">
                        <button onclick="contentEditor.removeMedia('${url}')" title="Remove">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        img.onerror = () => {
            container.innerHTML = `
                <div class="blog-media-error">
                    <div class="error-icon">🖼️</div>
                    <div class="error-message">Failed to load image</div>
                    <div class="error-url">${url}</div>
                </div>
            `;
        };

        img.src = url;
    }

    loadYouTube(url, container) {
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            container.innerHTML = `
                <div class="blog-media-error">
                    <div class="error-icon">📺</div>
                    <div class="error-message">Invalid YouTube URL</div>
                    <div class="error-url">${url}</div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="relative">
                <iframe
                    src="https://www.youtube.com/embed/${videoId}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen>
                </iframe>
                <div class="blog-media-controls">
                    <button onclick="contentEditor.removeMedia('${url}')" title="Remove">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    extractYouTubeId(url) {
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    removeMedia(url) {
        const mediaElement = this.mediaElements.get(url);
        if (mediaElement) {
            mediaElement.remove();
            this.mediaElements.delete(url);
            this.syncContent();
        }
    }

    generateMediaId(url) {
        return 'media-' + btoa(url).replace(/[^a-zA-Z0-9]/g, '');
    }

    syncContent() {
        if (this.hiddenInput) {
            // Get text content without media elements
            const textContent = this.container.textContent;
            this.hiddenInput.value = textContent;
        }
    }

    getContent() {
        return this.hiddenInput ? this.hiddenInput.value : this.container.textContent;
    }

    setContent(content) {
        this.container.textContent = content;
        this.syncContent();
        this.processContent();
    }

    clear() {
        this.container.innerHTML = '';
        this.mediaElements.clear();
        this.syncContent();
    }

    destroy() {
        this.mediaElements.clear();
        this.container = null;
        this.hiddenInput = null;
    }
}

// Export for use in other modules
window.ContentEditor = ContentEditor;
