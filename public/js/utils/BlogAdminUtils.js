/**
 * Blog Admin Utilities
 * Centralized admin functionality for blog pages
 */

class BlogAdminUtils {
    constructor(blogService) {
        this.blogService = blogService;
        this.debugMode = window.location.search.includes('debug');
    }

    /**
     * Check admin status and update UI accordingly
     */
    checkAdminStatus() {
        const isAdmin = this.blogService?.isAdmin() || false;

        if (this.debugMode) {
            console.log('🔍 BLOG-ADMIN: Admin status check', {
                isAdmin,
                authService: !!this.blogService?.authService,
                currentUser: this.blogService?.authService?.currentUser,
                userSystem: !!window.userSystem
            });
        }

        return isAdmin;
    }

    /**
     * Show/hide admin actions based on admin status
     */
    updateAdminActions(adminActionsId = 'admin-actions') {
        const adminActions = document.getElementById(adminActionsId);
        const isAdmin = this.checkAdminStatus();

        if (adminActions && isAdmin) {
            adminActions.classList.remove('hidden');
            if (this.debugMode) {
                console.log('[BlogAdminUtils] Showing admin actions');
            }
        } else if (adminActions) {
            adminActions.classList.add('hidden');
            if (this.debugMode) {
                console.log('[BlogAdminUtils] Hiding admin actions');
            }
        }

        return isAdmin;
    }

    /**
     * Show/hide admin-only notice
     */
    updateAdminNotice(noticeId = 'admin-only-notice') {
        const adminNotice = document.getElementById(noticeId);
        const isAdmin = this.checkAdminStatus();

        if (adminNotice) {
            if (isAdmin) {
                adminNotice.classList.add('hidden');
            } else {
                adminNotice.classList.remove('hidden');
            }
        }

        return isAdmin;
    }

    /**
     * Validate admin access for operations
     */
    validateAdminAccess(operation = 'perform this action') {
        const isAdmin = this.checkAdminStatus();

        if (!isAdmin) {
            this.showError(`Only administrators can ${operation}.`);

            return false;
        }

        return true;
    }

    /**
     * Show error message
     */
    showError(message) {
        console.error('BLOG-ADMIN:', message);
        // Could be enhanced to show user-friendly error messages
    }

    /**
     * Setup admin status monitoring
     */
    setupAdminMonitoring(callback = null) {
        // Listen for auth state changes
        window.addEventListener('authStateChanged', () => {
            setTimeout(() => {
                const isAdmin = this.updateAdminActions();

                if (callback) { callback(isAdmin); }
            }, 100);
        });

        // Periodic admin status check (fallback)
        setInterval(() => {
            this.updateAdminActions();
        }, 5000);
    }
}

// Export for global access
window.BlogAdminUtils = BlogAdminUtils;
