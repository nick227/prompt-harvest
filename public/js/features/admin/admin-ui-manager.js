/**
 * Consolidated Admin UI Manager
 * Handles all admin UI coordination and rendering
 * Consolidates: admin-ui-renderer.js + admin-ui-manager.js + admin-dom-manager.js + admin-simple-renderer.js
 */

export class AdminUIManager {
    constructor() {
        this.isInitialized = false;
        this.currentTab = 'summary';
        this.selectors = {
            dashboard: '#admin-dashboard-content',
            tabs: '#admin-tabs',
            tabContent: '#admin-tab-content',
            summaryTab: '#summary-tab',
            billingTab: '#billing-tab',
            usersTab: '#users-tab',
            imagesTab: '#images-tab',
            packagesTab: '#packages-tab',
            modelsTab: '#models-tab',
            promoCardsTab: '#promo-cards-tab',
            termsTab: '#terms-tab',
            messagesTab: '#messages-tab'
        };
    }

    /**
     * Initialize admin UI manager
     */
    async init() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🎨 ADMIN-UI: Initializing UI manager...');
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize UI components
            this.initializeComponents();
            
            this.isInitialized = true;
            console.log('✅ ADMIN-UI: UI manager initialized');
        } catch (error) {
            console.error('❌ ADMIN-UI: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-admin-tab]')) {
                const tabName = e.target.dataset.adminTab;
                this.switchTab(tabName);
            }
        });

        // Modal handling
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-modal-close]')) {
                this.closeModal();
            }
        });

        // Form handling
        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-admin-form]')) {
                this.handleFormSubmission(e.target);
            }
        });
    }

    /**
     * Initialize UI components
     */
    initializeComponents() {
        // Initialize shared components
        this.initializeSharedComponents();
        
        // Initialize tab components
        this.initializeTabComponents();
        
        // Initialize modal components
        this.initializeModalComponents();
    }

    /**
     * Initialize shared components
     */
    initializeSharedComponents() {
        // Initialize shared table
        this.initializeSharedTable();
        
        // Initialize notification system
        this.initializeNotificationSystem();
        
        // Initialize error handling
        this.initializeErrorHandling();
    }

    /**
     * Initialize tab components
     */
    initializeTabComponents() {
        // Initialize tab navigation
        this.initializeTabNavigation();
        
        // Initialize tab content areas
        this.initializeTabContent();
    }

    /**
     * Initialize modal components
     */
    initializeModalComponents() {
        // Initialize modal system
        this.initializeModalSystem();
        
        // Initialize form modals
        this.initializeFormModals();
    }

    /**
     * Switch to a different tab
     * @param {string} tabName - Name of the tab to switch to
     */
    switchTab(tabName) {
        if (this.currentTab === tabName) {
            return;
        }

        console.log(`🔄 ADMIN-UI: Switching to tab: ${tabName}`);

        // Update current tab
        this.currentTab = tabName;

        // Update tab navigation
        this.updateTabNavigation(tabName);

        // Update tab content
        this.updateTabContent(tabName);
    }

    /**
     * Update tab navigation
     * @param {string} tabName - Name of the active tab
     */
    updateTabNavigation(tabName) {
        // Remove active class from all tabs
        document.querySelectorAll('[data-admin-tab]').forEach(tab => {
            tab.classList.remove('active');
        });

        // Add active class to current tab
        const activeTab = document.querySelector(`[data-admin-tab="${tabName}"]`);
        if (activeTab) {
            activeTab.classList.add('active');
        }
    }

    /**
     * Update tab content
     * @param {string} tabName - Name of the tab
     */
    updateTabContent(tabName) {
        const tabContent = document.querySelector(this.selectors.tabContent);
        if (!tabContent) {
            console.error('❌ ADMIN-UI: Tab content container not found');
            return;
        }

        // Hide all tab content
        tabContent.querySelectorAll('[data-tab-content]').forEach(content => {
            content.style.display = 'none';
        });

        // Show current tab content
        const currentContent = tabContent.querySelector(`[data-tab-content="${tabName}"]`);
        if (currentContent) {
            currentContent.style.display = 'block';
        }
    }

    /**
     * Render tab content
     * @param {string} tabName - Name of the tab
     * @param {Object} data - Tab data
     */
    renderTab(tabName, data) {
        console.log(`🎨 ADMIN-UI: Rendering tab content: ${tabName}`);

        switch (tabName) {
            case 'summary':
                this.renderSummaryTab(data);
                break;
            case 'billing':
                this.renderBillingTab(data);
                break;
            case 'users':
                this.renderUsersTab(data);
                break;
            case 'images':
                this.renderImagesTab(data);
                break;
            case 'packages':
                this.renderPackagesTab(data);
                break;
            case 'models':
                this.renderModelsTab(data);
                break;
            case 'promo-cards':
                this.renderPromoCardsTab(data);
                break;
            case 'terms':
                this.renderTermsTab(data);
                break;
            case 'messages':
                this.renderMessagesTab(data);
                break;
            default:
                console.warn(`⚠️ ADMIN-UI: Unknown tab: ${tabName}`);
        }
    }

    /**
     * Render summary tab
     * @param {Object} data - Summary data
     */
    renderSummaryTab(data) {
        const container = document.querySelector('[data-tab-content="summary"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-summary">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>Total Users</h3>
                        <p class="stat-value">${data.stats?.totalUsers || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Total Images</h3>
                        <p class="stat-value">${data.stats?.totalImages || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h3>Revenue</h3>
                        <p class="stat-value">$${data.stats?.revenue || 0}</p>
                    </div>
                    <div class="stat-card">
                        <h3>System Health</h3>
                        <p class="stat-value ${data.systemHealth?.status || 'unknown'}">${data.systemHealth?.status || 'Unknown'}</p>
                    </div>
                </div>
                <div class="recent-activity">
                    <h3>Recent Activity</h3>
                    <div class="activity-list">
                        ${this.renderActivityList(data.recentActivity || [])}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render billing tab
     * @param {Object} data - Billing data
     */
    renderBillingTab(data) {
        const container = document.querySelector('[data-tab-content="billing"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-billing">
                <div class="billing-stats">
                    <h3>Revenue Overview</h3>
                    <p>Total Revenue: $${data.revenue?.total || 0}</p>
                    <p>This Month: $${data.revenue?.thisMonth || 0}</p>
                </div>
                <div class="transactions-table">
                    <h3>Recent Transactions</h3>
                    ${this.renderTransactionsTable(data.transactions || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render users tab
     * @param {Object} data - Users data
     */
    renderUsersTab(data) {
        const container = document.querySelector('[data-tab-content="users"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-users">
                <div class="users-stats">
                    <h3>User Statistics</h3>
                    <p>Total Users: ${data.userStats?.total || 0}</p>
                    <p>Active Users: ${data.userStats?.active || 0}</p>
                </div>
                <div class="users-table">
                    <h3>Users</h3>
                    ${this.renderUsersTable(data.users || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render images tab
     * @param {Object} data - Images data
     */
    renderImagesTab(data) {
        const container = document.querySelector('[data-tab-content="images"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-images">
                <div class="images-stats">
                    <h3>Image Statistics</h3>
                    <p>Total Images: ${data.imageStats?.total || 0}</p>
                    <p>This Month: ${data.imageStats?.thisMonth || 0}</p>
                </div>
                <div class="images-table">
                    <h3>Images</h3>
                    ${this.renderImagesTable(data.images || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render packages tab
     * @param {Object} data - Packages data
     */
    renderPackagesTab(data) {
        const container = document.querySelector('[data-tab-content="packages"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-packages">
                <div class="packages-stats">
                    <h3>Package Statistics</h3>
                    <p>Total Packages: ${data.packageStats?.total || 0}</p>
                    <p>Active Packages: ${data.packageStats?.active || 0}</p>
                </div>
                <div class="packages-table">
                    <h3>Packages</h3>
                    ${this.renderPackagesTable(data.packages || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render models tab
     * @param {Object} data - Models data
     */
    renderModelsTab(data) {
        const container = document.querySelector('[data-tab-content="models"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-models">
                <div class="models-stats">
                    <h3>Model Statistics</h3>
                    <p>Total Models: ${data.modelStats?.total || 0}</p>
                    <p>Active Models: ${data.modelStats?.active || 0}</p>
                </div>
                <div class="models-table">
                    <h3>Models</h3>
                    ${this.renderModelsTable(data.models || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render promo cards tab
     * @param {Object} data - Promo cards data
     */
    renderPromoCardsTab(data) {
        const container = document.querySelector('[data-tab-content="promo-cards"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-promo-cards">
                <div class="promo-stats">
                    <h3>Promo Card Statistics</h3>
                    <p>Total Promos: ${data.promoStats?.total || 0}</p>
                    <p>Active Promos: ${data.promoStats?.active || 0}</p>
                </div>
                <div class="promo-table">
                    <h3>Promo Cards</h3>
                    ${this.renderPromoCardsTable(data.promoCards || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render terms tab
     * @param {Object} data - Terms data
     */
    renderTermsTab(data) {
        const container = document.querySelector('[data-tab-content="terms"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-terms">
                <div class="terms-stats">
                    <h3>Terms Statistics</h3>
                    <p>Total Terms: ${data.termStats?.total || 0}</p>
                    <p>Active Terms: ${data.termStats?.active || 0}</p>
                </div>
                <div class="terms-table">
                    <h3>Terms</h3>
                    ${this.renderTermsTable(data.terms || [])}
                </div>
            </div>
        `;
    }

    /**
     * Render messages tab
     * @param {Object} data - Messages data
     */
    renderMessagesTab(data) {
        const container = document.querySelector('[data-tab-content="messages"]');
        if (!container) return;

        container.innerHTML = `
            <div class="admin-messages">
                <div class="messages-stats">
                    <h3>Message Statistics</h3>
                    <p>Total Messages: ${data.messageStats?.total || 0}</p>
                    <p>Unread Messages: ${data.messageStats?.unread || 0}</p>
                </div>
                <div class="messages-table">
                    <h3>Messages</h3>
                    ${this.renderMessagesTable(data.messages || [])}
                </div>
            </div>
        `;
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showNotification(message, 'error');
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `admin-notification admin-notification-${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }

    /**
     * Show edit modal
     * @param {string} itemType - Type of item to edit
     * @param {Object} itemData - Item data
     */
    showEditModal(itemType, itemData) {
        console.log(`📝 ADMIN-UI: Showing edit modal for ${itemType}`, itemData);
        // Implementation for edit modal
    }

    /**
     * Show create modal
     * @param {string} itemType - Type of item to create
     */
    showCreateModal(itemType) {
        console.log(`➕ ADMIN-UI: Showing create modal for ${itemType}`);
        // Implementation for create modal
    }

    /**
     * Close modal
     */
    closeModal() {
        const modal = document.querySelector('.admin-modal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * Download data
     * @param {Object} data - Data to download
     * @param {string} type - Type of data
     */
    downloadData(data, type) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Initialize shared table
     */
    initializeSharedTable() {
        // Implementation for shared table initialization
    }

    /**
     * Initialize notification system
     */
    initializeNotificationSystem() {
        // Implementation for notification system initialization
    }

    /**
     * Initialize error handling
     */
    initializeErrorHandling() {
        // Implementation for error handling initialization
    }

    /**
     * Initialize tab navigation
     */
    initializeTabNavigation() {
        // Implementation for tab navigation initialization
    }

    /**
     * Initialize tab content
     */
    initializeTabContent() {
        // Implementation for tab content initialization
    }

    /**
     * Initialize modal system
     */
    initializeModalSystem() {
        // Implementation for modal system initialization
    }

    /**
     * Initialize form modals
     */
    initializeFormModals() {
        // Implementation for form modals initialization
    }

    /**
     * Handle form submission
     * @param {HTMLFormElement} form - Form element
     */
    handleFormSubmission(form) {
        console.log('📝 ADMIN-UI: Handling form submission', form);
        // Implementation for form submission handling
    }

    /**
     * Render activity list
     * @param {Array} activities - List of activities
     * @returns {string} HTML string
     */
    renderActivityList(activities) {
        return activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${activity.timestamp}</span>
                <span class="activity-description">${activity.description}</span>
            </div>
        `).join('');
    }

    /**
     * Render transactions table
     * @param {Array} transactions - List of transactions
     * @returns {string} HTML string
     */
    renderTransactionsTable(transactions) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Amount</th>
                        <th>Date</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(transaction => `
                        <tr>
                            <td>${transaction.id}</td>
                            <td>${transaction.user}</td>
                            <td>$${transaction.amount}</td>
                            <td>${transaction.date}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render users table
     * @param {Array} users - List of users
     * @returns {string} HTML string
     */
    renderUsersTable(users) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.name}</td>
                            <td>${user.email}</td>
                            <td>${user.role}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${user.id}" data-item-type="user">Edit</button>
                                <button data-admin-action="delete" data-item-id="${user.id}" data-item-type="user">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render images table
     * @param {Array} images - List of images
     * @returns {string} HTML string
     */
    renderImagesTable(images) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Prompt</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${images.map(image => `
                        <tr>
                            <td>${image.id}</td>
                            <td>${image.user}</td>
                            <td>${image.prompt}</td>
                            <td>${image.date}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${image.id}" data-item-type="image">Edit</button>
                                <button data-admin-action="delete" data-item-id="${image.id}" data-item-type="image">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render packages table
     * @param {Array} packages - List of packages
     * @returns {string} HTML string
     */
    renderPackagesTable(packages) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Credits</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${packages.map(pkg => `
                        <tr>
                            <td>${pkg.id}</td>
                            <td>${pkg.name}</td>
                            <td>$${pkg.price}</td>
                            <td>${pkg.credits}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${pkg.id}" data-item-type="package">Edit</button>
                                <button data-admin-action="delete" data-item-id="${pkg.id}" data-item-type="package">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render models table
     * @param {Array} models - List of models
     * @returns {string} HTML string
     */
    renderModelsTable(models) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Provider</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${models.map(model => `
                        <tr>
                            <td>${model.id}</td>
                            <td>${model.name}</td>
                            <td>${model.provider}</td>
                            <td>${model.status}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${model.id}" data-item-type="model">Edit</button>
                                <button data-admin-action="delete" data-item-id="${model.id}" data-item-type="package">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render promo cards table
     * @param {Array} promoCards - List of promo cards
     * @returns {string} HTML string
     */
    renderPromoCardsTable(promoCards) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Code</th>
                        <th>Discount</th>
                        <th>Expires</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${promoCards.map(promo => `
                        <tr>
                            <td>${promo.id}</td>
                            <td>${promo.code}</td>
                            <td>${promo.discount}%</td>
                            <td>${promo.expires}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${promo.id}" data-item-type="promo-card">Edit</button>
                                <button data-admin-action="delete" data-item-id="${promo.id}" data-item-type="promo-card">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render terms table
     * @param {Array} terms - List of terms
     * @returns {string} HTML string
     */
    renderTermsTable(terms) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Title</th>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${terms.map(term => `
                        <tr>
                            <td>${term.id}</td>
                            <td>${term.title}</td>
                            <td>${term.version}</td>
                            <td>${term.status}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${term.id}" data-item-type="term">Edit</button>
                                <button data-admin-action="delete" data-item-id="${term.id}" data-item-type="term">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Render messages table
     * @param {Array} messages - List of messages
     * @returns {string} HTML string
     */
    renderMessagesTable(messages) {
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>From</th>
                        <th>Subject</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${messages.map(message => `
                        <tr>
                            <td>${message.id}</td>
                            <td>${message.from}</td>
                            <td>${message.subject}</td>
                            <td>${message.date}</td>
                            <td>${message.status}</td>
                            <td>
                                <button data-admin-action="edit" data-item-id="${message.id}" data-item-type="message">Edit</button>
                                <button data-admin-action="delete" data-item-id="${message.id}" data-item-type="message">Delete</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Export for ES6 modules
export { AdminUIManager };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.AdminUIManager = AdminUIManager;
}
