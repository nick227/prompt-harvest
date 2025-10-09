/**
 * Image View Tags Utilities
 * Handles tags rendering and tag chip creation
 */

(function() {
    'use strict';

    /**
     * Create tags container with interactive tag chips
     * @param {Array} tags - Array of tag strings
     * @returns {HTMLElement} Tags container element
     */
    const createTagsContainer = tags => {
    const tagsContainer = document.createElement('div');

    tagsContainer.className = 'list-tags-container';

    tags.forEach(tag => {
        const tagElement = document.createElement('span');

        tagElement.textContent = tag;
        tagElement.style.cssText = `
            display: inline-block;
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 11px;
            border: 1px solid rgba(59, 130, 246, 0.3);
            white-space: nowrap;
            flex-shrink: 0;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Add active class if tag is currently active
        if (window.tagRouter && window.tagRouter.isTagActive(tag)) {
            tagElement.classList.add('tag-chip-active');
            tagElement.style.background = 'rgba(34, 197, 94, 0.3)';
            tagElement.style.borderColor = 'rgba(34, 197, 94, 0.5)';
            tagElement.style.color = '#22c55e';
        }

        // Add hover effects
        tagElement.addEventListener('mouseenter', () => {
            if (!tagElement.classList.contains('tag-chip-active')) {
                tagElement.style.background = 'rgba(59, 130, 246, 0.3)';
                tagElement.style.transform = 'scale(1.05)';
            }
        });

        tagElement.addEventListener('mouseleave', () => {
            if (!tagElement.classList.contains('tag-chip-active')) {
                tagElement.style.background = 'rgba(59, 130, 246, 0.2)';
                tagElement.style.transform = 'scale(1)';
            }
        });

        // Add click handler to filter by tag
        tagElement.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();


            // Use tag router if available
            if (window.TagRouter && window.tagRouter) {
                window.tagRouter.addTag(tag);
            } else {
                // Fallback: update URL directly
                const url = new URL(window.location);

                url.searchParams.set('tag', tag);
                window.location.href = url.toString();
            }
        });

        tagsContainer.appendChild(tagElement);
    });

    return tagsContainer;
};

// Export to window
if (typeof window !== 'undefined') {
    window.ImageViewTags = {
        createTagsContainer
    };
}
})();

