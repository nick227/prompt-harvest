/**
 * Admin Router - Simple client-side routing for admin dashboard
 * Handles URL parameters like ?v=users to track and reload correct tabs
 */
class AdminRouter {
    constructor() {
        this.validTabs = ['summary', 'billing', 'users', 'images', 'packages', 'models', 'promo-cards', 'terms', 'messages'];
        this.defaultTab = 'summary';
        this.currentTab = null;

        this.init();
    }

    init() {
        // Listen for tab switch events to update URL
        window.addEventListener('admin-tab-switch', (e) => {
            this.updateURL(e.detail.tab);
        });

        // Listen for browser back/forward navigation
        window.addEventListener('popstate', (e) => {
            this.handlePopState(e);
        });

        // Handle initial page load
        this.handleInitialLoad();

        // Handle page refresh scenarios
        window.addEventListener('beforeunload', () => {
            // Save current tab state
            if (this.currentTab) {
                sessionStorage.setItem('admin-last-tab', this.currentTab);
            }
        });
    }

    /**
     * Handle initial page load - check URL for tab parameter
     */
    handleInitialLoad() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromURL = urlParams.get('v');

        if (tabFromURL && this.validTabs.includes(tabFromURL)) {
            this.currentTab = tabFromURL;
            // Wait for admin dashboard to be ready, then switch to the correct tab
            this.waitForAdminDashboard(() => {
                this.switchToTab(tabFromURL);
            });
        } else {
            // Check session storage for last visited tab
            const lastTab = sessionStorage.getItem('admin-last-tab');
            if (lastTab && this.validTabs.includes(lastTab)) {
                this.currentTab = lastTab;
                this.updateURL(lastTab);
                this.waitForAdminDashboard(() => {
                    this.switchToTab(lastTab);
                });
            } else {
                // No valid tab in URL or session, use default
                this.currentTab = this.defaultTab;
                this.updateURL(this.defaultTab);
                // Wait for admin dashboard to be ready, then switch to default tab
                this.waitForAdminDashboard(() => {
                    this.switchToTab(this.defaultTab);
                });
            }
        }
    }

    /**
     * Handle browser back/forward navigation
     */
    handlePopState(e) {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromURL = urlParams.get('v');

        if (tabFromURL && this.validTabs.includes(tabFromURL)) {
            this.currentTab = tabFromURL;
            this.switchToTab(tabFromURL);
        } else {
            this.currentTab = this.defaultTab;
            this.switchToTab(this.defaultTab);
        }
    }

    /**
     * Update URL with current tab parameter
     */
    updateURL(tabName) {
        if (this.currentTab === tabName) {
            return; // No change needed
        }

        this.currentTab = tabName;

        const url = new URL(window.location);
        url.searchParams.set('v', tabName);

        // Update URL without triggering page reload
        window.history.pushState({ tab: tabName }, '', url);

        // Show URL parameter indicator
        this.showURLIndicator(tabName);
    }

    /**
     * Switch to a specific tab programmatically
     */
    switchToTab(tabName) {
        if (!this.validTabs.includes(tabName)) {
            console.warn(`Invalid tab name: ${tabName}`);
            return;
        }

        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const tabButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (tabButton) {
            tabButton.classList.add('active');
        }

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        const tabPanel = document.getElementById(`${tabName}-tab`);
        if (tabPanel) {
            tabPanel.classList.add('active');
        }

        // Update visual state
        this.updateTabButtonState(tabName);

        // Emit tab switch event to notify other components
        window.dispatchEvent(new CustomEvent('admin-tab-switch', {
            detail: { tab: tabName }
        }));
    }

    /**
     * Wait for admin dashboard to be ready
     */
    waitForAdminDashboard(callback, maxAttempts = 50) {
        let attempts = 0;

        const checkReady = () => {
            attempts++;

            // Check if admin dashboard is visible and tab buttons exist
            const adminDashboard = document.getElementById('admin-dashboard');
            const tabButtons = document.querySelectorAll('.tab-btn');

            if (adminDashboard && adminDashboard.style.display !== 'none' && tabButtons.length > 0) {
                callback();
            } else if (attempts < maxAttempts) {
                setTimeout(checkReady, 100); // Check again in 100ms
            } else {
                console.warn('Admin dashboard not ready after maximum attempts');
                // Fallback: try to switch anyway
                callback();
            }
        };

        checkReady();
    }

    /**
     * Get current tab from URL
     */
    getCurrentTab() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromURL = urlParams.get('v');

        if (tabFromURL && this.validTabs.includes(tabFromURL)) {
            return tabFromURL;
        }

        return this.defaultTab;
    }

    /**
     * Navigate to a specific tab
     */
    navigateTo(tabName) {
        if (!this.validTabs.includes(tabName)) {
            console.warn(`Invalid tab name: ${tabName}`);
            return;
        }

        this.updateURL(tabName);
        this.switchToTab(tabName);
    }

    /**
     * Get all valid tab names
     */
    getValidTabs() {
        return [...this.validTabs];
    }

    /**
     * Check if a tab name is valid
     */
    isValidTab(tabName) {
        return this.validTabs.includes(tabName);
    }

    /**
     * Get the current URL with tab parameter
     */
    getCurrentURL() {
        return window.location.href;
    }

    /**
     * Get a shareable URL for a specific tab
     */
    getShareableURL(tabName) {
        if (!this.validTabs.includes(tabName)) {
            return null;
        }

        const url = new URL(window.location);
        url.searchParams.set('v', tabName);
        return url.toString();
    }

    /**
     * Clear the tab parameter from URL (go to default tab)
     */
    clearTabParameter() {
        const url = new URL(window.location);
        url.searchParams.delete('v');
        window.history.pushState({}, '', url);
        this.currentTab = this.defaultTab;
        this.switchToTab(this.defaultTab);
    }

    /**
     * Handle external navigation (e.g., from bookmarks, direct links)
     */
    handleExternalNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromURL = urlParams.get('v');

        if (tabFromURL && this.validTabs.includes(tabFromURL)) {
            this.navigateTo(tabFromURL);
        }
    }

    /**
     * Show URL parameter indicator
     */
    showURLIndicator(tabName) {
        // Create indicator if it doesn't exist
        let indicator = document.getElementById('url-param-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'url-param-indicator';
            indicator.className = 'url-param-indicator';
            document.body.appendChild(indicator);
        }

        // Update indicator content
        indicator.textContent = `v=${tabName}`;
        indicator.classList.add('show');

        // Hide after 3 seconds
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 3000);
    }

    /**
     * Update tab button visual state
     */
    updateTabButtonState(tabName) {
        // Remove URL param class from all tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('has-url-param');
        });

        // Add URL param class to current tab
        const currentTabBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentTabBtn) {
            currentTabBtn.classList.add('has-url-param');
        }
    }
}

// Initialize router when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.adminRouter = new AdminRouter();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminRouter;
}
