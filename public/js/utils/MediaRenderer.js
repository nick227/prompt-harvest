/**
 * MediaRenderer - Renders media content in blog posts
 * Single Responsibility: Convert text content with URLs to rendered media
 */

class MediaRenderer {
    constructor() {
        this.mediaElements = new Map();
    }

    /**
     * Render content with embedded media
     * @param {string} content - Text content with URLs
     * @param {string} containerId - Container element ID
     */
    renderContent(content, containerId) {
        const container = document.getElementById(containerId);

        if (!container) {
            console.error('MediaRenderer: Container not found');

            return;
        }

        // Clear existing content
        container.innerHTML = '';

        // Split content by URLs and process
        const parts = this.splitContentByUrls(content);

        parts.forEach(part => {
            if (this.isImageUrl(part) || this.isYouTubeUrl(part)) {
                this.renderMedia(part, container);
            } else {
                this.renderText(part, container);
            }
        });
    }

    /**
     * Split content by URLs
     * @param {string} content - Text content
     * @returns {Array} Array of text and URL parts
     */
    splitContentByUrls(content) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = urlRegex.exec(content)) !== null) {
            // Add text before URL
            if (match.index > lastIndex) {
                const textPart = content.substring(lastIndex, match.index);

                if (textPart.trim()) {
                    parts.push(textPart);
                }
            }

            // Add URL
            parts.push(match[0]);
            lastIndex = match.index + match[0].length;
        }

        // Add remaining text
        if (lastIndex < content.length) {
            const remainingText = content.substring(lastIndex);

            if (remainingText.trim()) {
                parts.push(remainingText);
            }
        }

        return parts;
    }

    /**
     * Render text content
     * @param {string} text - Text content
     * @param {HTMLElement} container - Container element
     */
    renderText(text, container) {
        if (!text.trim()) { return; }

        // Convert line breaks to paragraphs
        const paragraphs = text.split('\n\n');

        paragraphs.forEach(paragraph => {
            if (paragraph.trim()) {
                const p = document.createElement('p');

                p.textContent = paragraph.trim();
                p.className = 'mb-4 text-gray-300 leading-relaxed';
                container.appendChild(p);
            }
        });
    }

    /**
     * Render media element
     * @param {string} url - Media URL
     * @param {HTMLElement} container - Container element
     */
    renderMedia(url, container) {
        const mediaContainer = document.createElement('div');

        mediaContainer.className = 'blog-media my-6';

        if (this.isImageUrl(url)) {
            this.renderImage(url, mediaContainer);
        } else if (this.isYouTubeUrl(url)) {
            this.renderYouTube(url, mediaContainer);
        }

        container.appendChild(mediaContainer);
    }

    /**
     * Render image
     * @param {string} url - Image URL
     * @param {HTMLElement} container - Container element
     */
    renderImage(url, container) {
        const img = document.createElement('img');

        img.src = url;
        img.alt = 'Blog image';
        img.className = 'w-full h-auto rounded-lg shadow-lg';
        img.loading = 'lazy';

        img.onload = () => {
            container.innerHTML = '';
            container.appendChild(img);
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
    }

    /**
     * Render YouTube video
     * @param {string} url - YouTube URL
     * @param {HTMLElement} container - Container element
     */
    renderYouTube(url, container) {
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

        const iframe = document.createElement('iframe');

        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.className = 'w-full aspect-video rounded-lg shadow-lg';
        iframe.frameBorder = '0';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;

        container.appendChild(iframe);
    }

    /**
     * Check if URL is an image
     * @param {string} url - URL to check
     * @returns {boolean} True if image URL
     */
    isImageUrl(url) {
        const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;

        return imageExtensions.test(url);
    }

    /**
     * Check if URL is a YouTube video
     * @param {string} url - URL to check
     * @returns {boolean} True if YouTube URL
     */
    isYouTubeUrl(url) {
        // Match YouTube URLs with video IDs (typically 11 chars, but flexible for testing)
        const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]+)/i;

        return youtubeRegex.test(url);
    }

    /**
     * Extract YouTube video ID from URL
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID or null
     */
    extractYouTubeId(url) {
        // Extract YouTube video ID (typically 11 chars, but flexible for testing)
        const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]+)/i;
        const match = url.match(regex);

        return match ? match[1] : null;
    }

    /**
     * Clear all rendered media
     */
    clear() {
        this.mediaElements.clear();
    }

    /**
     * Destroy renderer
     */
    destroy() {
        this.clear();
    }
}

// Export for use in other modules
window.MediaRenderer = MediaRenderer;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MediaRenderer };
}
