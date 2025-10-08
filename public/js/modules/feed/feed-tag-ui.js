// Feed Tag UI - Manages tag filter UI components
// Handles tag chip creation, display, and removal

class FeedTagUI {
    constructor() {
        // No initialization needed - CSS handles the ::after element
    }

    // Setup tag overlays for visual feedback
    setupTagOverlays() {
        // No initialization needed - CSS handles the ::after element
        // Tag overlays ready (using existing CSS ::after)
    }

    // Update tag filter indicator
    updateTagFilterIndicator(activeTags) {
        // Update the tags-in-use container
        this.updateTagsInUseContainer(activeTags);
    }

    // Update the tags-in-use container with removable tag chips
    updateTagsInUseContainer(activeTags) {
        // SSR safety check
        if (typeof document === 'undefined') {
            return;
        }

        const tagsInUseContainer = document.getElementById('tags-in-use');

        if (!tagsInUseContainer) {
            console.warn('⚠️ TAG FILTER: tags-in-use container not found');

            return;
        }

        // Clear existing tags
        tagsInUseContainer.innerHTML = '';

        if (activeTags.length > 0) {
            // Show the container
            tagsInUseContainer.classList.remove('hidden');

            // Add each active tag as a removable chip
            activeTags.forEach(tag => {
                const tagChip = this.createRemovableTagChip(tag);

                tagsInUseContainer.appendChild(tagChip);
            });

            // Updated tags-in-use container
        } else {
            // Hide the container
            tagsInUseContainer.classList.add('hidden');
            // Hidden tags-in-use container (no active tags)
        }
    }

    // Create a removable tag chip with proper accessibility
    createRemovableTagChip(tag) {
        // SSR safety check
        if (typeof document === 'undefined') {
            return null;
        }

        const tagChip = document.createElement('button');

        tagChip.className = 'tag-chip-removable';
        tagChip.type = 'button';
        tagChip.setAttribute('aria-label', `Remove tag: ${tag}`);
        tagChip.setAttribute('title', `Remove tag: ${tag}`);
        tagChip.style.cssText = `
            display: inline-flex;
            align-items: center;
            background: rgba(59, 130, 246, 0.2);
            color: #60a5fa;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            border: 1px solid rgba(59, 130, 246, 0.3);
            white-space: nowrap;
            cursor: pointer;
            transition: all 0.2s ease;
            gap: 4px;
        `;

        // Add tag text
        const tagText = document.createElement('span');

        tagText.textContent = tag;
        tagChip.appendChild(tagText);

        // Add remove button
        const removeButton = document.createElement('span');

        removeButton.innerHTML = '×';
        removeButton.setAttribute('aria-hidden', 'true');
        removeButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: rgba(239, 68, 68, 0.2);
            color: #f87171;
            font-size: 12px;
            font-weight: bold;
            transition: all 0.2s ease;
            margin-left: 4px;
        `;

        tagChip.appendChild(removeButton);

        // Add hover effects
        tagChip.addEventListener('mouseenter', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.3)';
            tagChip.style.transform = 'scale(1.05)';
        });

        tagChip.addEventListener('mouseleave', () => {
            tagChip.style.background = 'rgba(59, 130, 246, 0.2)';
            tagChip.style.transform = 'scale(1)';
        });

        // Add keyboard support
        tagChip.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                this.removeTag(tag);
            }
        });

        // Add click handler to remove the tag
        tagChip.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            this.removeTag(tag);
        });

        return tagChip;
    }

    // Remove a specific tag from the active filter
    removeTag(tagToRemove) {
        // Get current active tags from tag router
        if (window.tagRouter) {
            const currentTags = window.tagRouter.getActiveTags();
            const updatedTags = currentTags.filter(tag => tag !== tagToRemove);

            // Update tag router with remaining tags
            window.tagRouter.setActiveTags(updatedTags);
        }
        // Silent no-op if tagRouter not available (production-safe)
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedTagUI = FeedTagUI;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedTagUI;
}

