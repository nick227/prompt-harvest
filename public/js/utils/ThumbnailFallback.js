/**
 * ThumbnailFallback - Generates consistent fallback colors for blog posts
 * Single Responsibility: Create beautiful fallback thumbnails when no image is available
 */

class ThumbnailFallback {
    constructor() {
        this.colorPalettes = [
            // Blue gradients
            ['#3B82F6', '#1D4ED8', '#1E40AF'],
            ['#06B6D4', '#0891B2', '#0E7490'],
            ['#8B5CF6', '#7C3AED', '#6D28D9'],

            // Green gradients
            ['#10B981', '#059669', '#047857'],
            ['#84CC16', '#65A30D', '#4D7C0F'],
            ['#22C55E', '#16A34A', '#15803D'],

            // Red/Pink gradients
            ['#EF4444', '#DC2626', '#B91C1C'],
            ['#F97316', '#EA580C', '#C2410C'],
            ['#EC4899', '#DB2777', '#BE185D'],

            // Purple gradients
            ['#A855F7', '#9333EA', '#7C2D12'],
            ['#6366F1', '#4F46E5', '#4338CA'],
            ['#8B5CF6', '#7C3AED', '#6D28D9'],

            // Orange gradients
            ['#F59E0B', '#D97706', '#B45309'],
            ['#F97316', '#EA580C', '#C2410C'],
            ['#EF4444', '#DC2626', '#B91C1C']
        ];

        this.iconSets = [
            '📝', '✍️', '📰', '📄', '📋', '📑', '📊', '📈', '📉', '📌',
            '💡', '🔍', '📚', '📖', '📗', '📘', '📙', '📕', '📓', '📔',
            '🎯', '🚀', '⭐', '💫', '✨', '🌟', '🔥', '💎', '🎨', '🎭'
        ];

        // Aliases for backwards compatibility with tests
        this.palettes = this.colorPalettes;
        this.icons = this.iconSets;
    }

    /**
     * Generate a consistent fallback thumbnail for a blog post
     * @param {Object} post - Blog post object
     * @returns {Object} Fallback thumbnail data
     */
    generateFallback(post) {
        const seed = this.generateSeed(post);
        const palette = this.getPalette(seed);
        const icon = this.getIcon(seed);
        const gradient = this.createGradient(palette);

        return {
            background: gradient,
            icon,
            title: post.title,
            author: post.author?.name || post.author?.username || 'Unknown',
            color: palette[0] // Primary color for text
        };
    }

    /**
     * Generate a consistent seed from post data
     * @param {Object} post - Blog post object
     * @returns {number} Seed value
     */
    generateSeed(post) {
        const title = post.title || '';
        const author = post.author?.name || post.author?.username || '';
        const content = post.content || '';

        // Create a hash from the title and author for consistency
        const str = title + author + content.substring(0, 100);
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);

            hash = ((hash << 5) - hash) + char;
            hash &= hash; // Convert to 32-bit integer
        }

        return Math.abs(hash);
    }

    /**
     * Get a color palette based on seed
     * @param {number} seed - Seed value
     * @returns {Array} Color palette
     */
    getPalette(seed) {
        const index = seed % this.colorPalettes.length;

        return this.colorPalettes[index];
    }

    /**
     * Get an icon based on seed
     * @param {number} seed - Seed value
     * @returns {string} Icon emoji
     */
    getIcon(seed) {
        const index = seed % this.iconSets.length;

        return this.iconSets[index];
    }

    /**
     * Create a CSS gradient from palette
     * @param {Array} palette - Color palette
     * @returns {string} CSS gradient
     */
    createGradient(palette) {
        return `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 50%, ${palette[2]} 100%)`;
    }

    /**
     * Generate HTML for fallback thumbnail
     * @param {Object} post - Blog post object
     * @param {string} size - Size class (sm, md, lg)
     * @returns {string} HTML string
     */
    generateFallbackHTML(post, size = 'md') {
        const fallback = this.generateFallback(post);
        const sizeClasses = {
            sm: 'h-32',
            md: 'h-48',
            lg: 'h-64 md:h-80'
        };

        const heightClass = sizeClasses[size] || sizeClasses.md;

        return `
            <div class="w-full ${heightClass} rounded-lg flex items-center justify-center relative overflow-hidden"
                 style="background: ${fallback.background}">
                <div class="text-center text-white">
                    <div class="text-4xl mb-2 opacity-90">${fallback.icon}</div>
                    <div class="text-sm font-medium opacity-80">${fallback.author}</div>
                </div>
                <div class="absolute inset-0 bg-black bg-opacity-10"></div>
            </div>
        `;
    }

    /**
     * Generate SVG fallback thumbnail
     * @param {Object} post - Blog post object
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     * @returns {string} SVG string
     */
    generateFallbackSVG(post, width = 400, height = 300) {
        const fallback = this.generateFallback(post);
        const title = post.title || 'Blog Post';
        const author = post.author?.name || post.author?.username || 'Unknown';

        return `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${fallback.palette[0]};stop-opacity:1" />
                        <stop offset="50%" style="stop-color:${fallback.palette[1]};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${fallback.palette[2]};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#gradient)" />
                <text x="50%" y="45%" text-anchor="middle" font-size="48" fill="white" opacity="0.9">${fallback.icon}</text>
                <text x="50%" y="65%" text-anchor="middle" font-size="16" fill="white" opacity="0.8" font-family="Arial, sans-serif">${author}</text>
            </svg>
        `;
    }

    /**
     * Get fallback gradient for a post (test compatibility method)
     * @param {Object} post - Blog post object
     * @returns {string} CSS gradient string
     */
    getFallbackGradient(post) {
        const seed = this.generateSeed(post);
        const palette = this.getPalette(seed);

        return this.createGradient(palette);
    }

    /**
     * Get fallback icon for a post (test compatibility method)
     * @param {Object} post - Blog post object
     * @returns {string} Icon emoji
     */
    getFallbackIcon(post) {
        const seed = this.generateSeed(post);

        return this.getIcon(seed);
    }
}

// Export for use in other modules
window.ThumbnailFallback = ThumbnailFallback;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThumbnailFallback };
}
