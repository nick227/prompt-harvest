/**
 * Admin Modal Manager - Reusable modal system for admin dashboard
 * Single Responsibility: Manage modal display, content, and state
 */

class AdminModalManager {
    constructor() {
        this.modalContainer = document.getElementById('modal-container');
        this.modalTitle = document.getElementById('modal-title');
        this.modalBody = document.getElementById('modal-body');
        this.modalClose = document.getElementById('modal-close');
        this.isOpen = false;
        this.currentModal = null;
        this.modalOpenedTime = null; // Track when modal was opened
    }

    init() {

        // Setup close button
        if (this.modalClose) {
            this.modalClose.addEventListener('click', e => {
                e.preventDefault();
                e.stopPropagation();
                this.close();
            });
        }

        // Close on backdrop click
        if (this.modalContainer) {
            this.modalContainer.addEventListener('click', e => {
                console.log('🎭 ADMIN-MODAL: Backdrop clicked', {
                    target: e.target,
                    modalContainer: this.modalContainer,
                    isTarget: e.target === this.modalContainer,
                    targetTagName: e.target.tagName,
                    targetClassName: e.target.className,
                    targetId: e.target.id
                });

                // Only close if clicking directly on the backdrop, not on modal content
                if (e.target === this.modalContainer) {
                    // Prevent accidental closes by requiring modal to be open for at least 300ms
                    const timeSinceOpened = Date.now() - this.modalOpenedTime;

                    if (timeSinceOpened < 300) {
                        return;
                    }

                    e.preventDefault();
                    e.stopPropagation();
                    this.close();
                }
                // Click inside modal - do nothing
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

    }

    show(title, content, options = {}) {
        console.log('🎭 ADMIN-MODAL: Modal elements check:', {
            modalContainer: !!this.modalContainer,
            modalTitle: !!this.modalTitle,
            modalBody: !!this.modalBody
        });

        if (!this.modalContainer || !this.modalTitle || !this.modalBody) {
            console.error('❌ ADMIN-MODAL: Modal elements not found', {
                modalContainer: !!this.modalContainer,
                modalTitle: !!this.modalTitle,
                modalBody: !!this.modalBody
            });

            return;
        }

        // Close any existing modal
        this.close();

        // Set title
        this.modalTitle.textContent = title;

        // Set content
        if (typeof content === 'string') {
            this.modalBody.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.modalBody.innerHTML = '';
            this.modalBody.appendChild(content);
        } else {
            this.modalBody.innerHTML = '<div class="error-message">Invalid modal content</div>';
        }

        // Apply size class if specified
        const modal = this.modalContainer.querySelector('.modal');

        if (modal) {
            // Remove existing size classes
            modal.classList.remove('modal-sm', 'modal-md', 'modal-lg', 'modal-xl');

            // Add new size class
            if (options.size) {
                modal.classList.add(`modal-${options.size}`);
            }
        }

        // Show modal
        this.modalContainer.style.display = 'flex';
        this.isOpen = true;
        this.modalOpenedTime = Date.now(); // Track when modal was opened
        this.currentModal = { title, content, options };

        // Use requestAnimationFrame to ensure the display change takes effect
        requestAnimationFrame(() => {
            this.modalContainer.classList.add('show');
        });

        // Focus management
        this.trapFocus();

        console.log('🎭 ADMIN-MODAL: Modal container state:', {
            display: this.modalContainer.style.display,
            classList: this.modalContainer.classList.toString(),
            isOpen: this.isOpen
        });
    }

    close() {
        if (!this.isOpen || !this.modalContainer) {
            return;
        }

        console.trace('🎭 ADMIN-MODAL: Close call stack');

        // Hide modal
        this.modalContainer.classList.remove('show');
        this.isOpen = false;
        this.currentModal = null;

        // Hide after transition
        setTimeout(() => {
            this.modalContainer.style.display = 'none';
        }, 300);

        // Clear content
        if (this.modalTitle) {
            this.modalTitle.textContent = 'Modal Title';
        }
        if (this.modalBody) {
            this.modalBody.innerHTML = '';
        }

        // Remove size classes
        const modal = this.modalContainer.querySelector('.modal');

        if (modal) {
            modal.classList.remove('modal-sm', 'modal-md', 'modal-lg', 'modal-xl');
        }

    }

    updateContent(content) {
        if (!this.isOpen || !this.modalBody) {
            return;
        }

        if (typeof content === 'string') {
            this.modalBody.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.modalBody.innerHTML = '';
            this.modalBody.appendChild(content);
        }
    }

    updateTitle(title) {
        if (!this.isOpen || !this.modalTitle) {
            return;
        }
        this.modalTitle.textContent = title;
    }

    trapFocus() {
        if (!this.isOpen) {
            return;
        }

        // Wait a bit for the modal to be fully rendered before focusing
        setTimeout(() => {
            const focusableElements = this.modalContainer.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            if (focusableElements.length === 0) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];


            // Focus first element only if modal is still open
            if (this.isOpen && firstElement) {
                firstElement.focus();
            }

            // Handle tab cycling
            const handleTabKey = e => {
                if (e.key !== 'Tab') {
                    return;
                }

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            };

            // Add event listener
            this.modalContainer.addEventListener('keydown', handleTabKey);

            // Store cleanup function
            this._focusCleanup = () => {
                this.modalContainer.removeEventListener('keydown', handleTabKey);
            };
        }, 100); // Small delay to ensure modal is fully rendered
    }

    isModalOpen() {
        return this.isOpen;
    }

    getCurrentModal() {
        return this.currentModal;
    }

    destroy() {
        if (this._focusCleanup) {
            this._focusCleanup();
        }
        this.close();
    }
}

// Export for global access
window.AdminModalManager = AdminModalManager;

// Global instance
window.adminModal = null;
