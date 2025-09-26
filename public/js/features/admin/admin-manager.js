/**
 * Consolidated Admin Manager
 * Orchestrates the entire admin system
 * Consolidates: admin-dashboard-manager.js + admin-section-manager-refactored.js + admin-router.js
 */

import { AdminService } from './admin-service.js';
import { AdminUIManager } from './admin-ui-manager.js';
import { AdminComponents } from './admin-components.js';

export class AdminManager {
    constructor() {
        // Core services
        this.adminService = null;
        this.uiManager = null;
        this.components = null;
        
        // State management
        this.isInitialized = false;
        this.currentTab = 'summary';
        this.tabs = {
            summary: { loaded: false, data: null },
            billing: { loaded: false, data: null },
            users: { loaded: false, data: null },
            images: { loaded: false, data: null },
            packages: { loaded: false, data: null },
            models: { loaded: false, data: null },
            'promo-cards': { loaded: false, data: null },
            terms: { loaded: false, data: null },
            messages: { loaded: false, data: null }
        };

        // Event system
        this.eventListeners = new Map();
        
        // Initialize when dependencies are available
        this.init();
    }

    /**
     * Initialize admin manager
     */
    async init() {
        if (this.isInitialized) {
            console.warn('AdminManager already initialized');
            return;
        }

        try {
            console.log('🎛️ ADMIN-MANAGER: Initializing admin manager...');

            // Initialize services
            this.adminService = new AdminService();
            this.uiManager = new AdminUIManager();
            this.components = new AdminComponents();

            // Initialize sub-services
            await this.adminService.init();
            await this.uiManager.init();
            await this.components.init();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial tab
            await this.loadTab(this.currentTab);

            this.isInitialized = true;
            console.log('✅ ADMIN-MANAGER: Admin manager initialized successfully');
        } catch (error) {
            console.error('❌ ADMIN-MANAGER: Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-admin-tab]')) {
                const tabName = e.target.dataset.adminTab;
                this.switchTab(tabName);
            }
        });

        // Admin actions
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-admin-action]')) {
                const action = e.target.dataset.adminAction;
                this.handleAdminAction(action, e.target);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.matches('[data-admin-form]')) {
                e.preventDefault();
                this.handleFormSubmission(e.target);
            }
        });
    }

    /**
     * Switch to a different tab
     * @param {string} tabName - Name of the tab to switch to
     */
    async switchTab(tabName) {
        if (this.currentTab === tabName) {
            return;
        }

        console.log(`🔄 ADMIN-MANAGER: Switching to tab: ${tabName}`);

        // Update current tab
        this.currentTab = tabName;

        // Load tab data if not already loaded
        if (!this.tabs[tabName].loaded) {
            await this.loadTab(tabName);
        }

        // Update UI
        this.uiManager.switchTab(tabName);
    }

    /**
     * Load tab data
     * @param {string} tabName - Name of the tab to load
     */
    async loadTab(tabName) {
        if (this.tabs[tabName].loaded) {
            return this.tabs[tabName].data;
        }

        console.log(`📊 ADMIN-MANAGER: Loading tab data: ${tabName}`);

        try {
            const data = await this.adminService.loadTabData(tabName);
            this.tabs[tabName].data = data;
            this.tabs[tabName].loaded = true;

            // Render tab content
            this.uiManager.renderTab(tabName, data);

            return data;
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Failed to load tab ${tabName}:`, error);
            throw error;
        }
    }

    /**
     * Handle admin actions
     * @param {string} action - Action to perform
     * @param {HTMLElement} element - Element that triggered the action
     */
    async handleAdminAction(action, element) {
        console.log(`⚡ ADMIN-MANAGER: Handling admin action: ${action}`);

        try {
            switch (action) {
                case 'refresh':
                    await this.refreshCurrentTab();
                    break;
                case 'export':
                    await this.exportData(element.dataset.exportType);
                    break;
                case 'delete':
                    await this.deleteItem(element.dataset.itemId, element.dataset.itemType);
                    break;
                case 'edit':
                    await this.editItem(element.dataset.itemId, element.dataset.itemType);
                    break;
                case 'create':
                    await this.createItem(element.dataset.itemType);
                    break;
                default:
                    console.warn(`⚠️ ADMIN-MANAGER: Unknown action: ${action}`);
            }
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Failed to handle action ${action}:`, error);
            this.uiManager.showError(`Failed to ${action}: ${error.message}`);
        }
    }

    /**
     * Handle form submissions
     * @param {HTMLFormElement} form - Form element
     */
    async handleFormSubmission(form) {
        const formType = form.dataset.adminForm;
        const formData = new FormData(form);

        console.log(`📝 ADMIN-MANAGER: Handling form submission: ${formType}`);

        try {
            const result = await this.adminService.submitForm(formType, formData);
            this.uiManager.showSuccess(`Form submitted successfully`);
            
            // Refresh current tab if needed
            if (form.dataset.refreshAfterSubmit === 'true') {
                await this.refreshCurrentTab();
            }
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Form submission failed:`, error);
            this.uiManager.showError(`Form submission failed: ${error.message}`);
        }
    }

    /**
     * Refresh current tab
     */
    async refreshCurrentTab() {
        console.log(`🔄 ADMIN-MANAGER: Refreshing current tab: ${this.currentTab}`);
        
        // Clear cached data
        this.tabs[this.currentTab].loaded = false;
        this.tabs[this.currentTab].data = null;

        // Reload tab
        await this.loadTab(this.currentTab);
    }

    /**
     * Export data
     * @param {string} type - Type of data to export
     */
    async exportData(type) {
        console.log(`📤 ADMIN-MANAGER: Exporting data: ${type}`);
        
        try {
            const data = await this.adminService.exportData(type);
            this.uiManager.downloadData(data, type);
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Export failed:`, error);
            this.uiManager.showError(`Export failed: ${error.message}`);
        }
    }

    /**
     * Delete an item
     * @param {string} itemId - ID of the item to delete
     * @param {string} itemType - Type of the item to delete
     */
    async deleteItem(itemId, itemType) {
        console.log(`🗑️ ADMIN-MANAGER: Deleting item: ${itemType} (${itemId})`);
        
        if (!confirm(`Are you sure you want to delete this ${itemType}?`)) {
            return;
        }

        try {
            await this.adminService.deleteItem(itemId, itemType);
            this.uiManager.showSuccess(`${itemType} deleted successfully`);
            
            // Refresh current tab
            await this.refreshCurrentTab();
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Delete failed:`, error);
            this.uiManager.showError(`Delete failed: ${error.message}`);
        }
    }

    /**
     * Edit an item
     * @param {string} itemId - ID of the item to edit
     * @param {string} itemType - Type of the item to edit
     */
    async editItem(itemId, itemType) {
        console.log(`✏️ ADMIN-MANAGER: Editing item: ${itemType} (${itemId})`);
        
        try {
            const itemData = await this.adminService.getItem(itemId, itemType);
            this.uiManager.showEditModal(itemType, itemData);
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Edit failed:`, error);
            this.uiManager.showError(`Edit failed: ${error.message}`);
        }
    }

    /**
     * Create a new item
     * @param {string} itemType - Type of the item to create
     */
    async createItem(itemType) {
        console.log(`➕ ADMIN-MANAGER: Creating item: ${itemType}`);
        
        try {
            this.uiManager.showCreateModal(itemType);
        } catch (error) {
            console.error(`❌ ADMIN-MANAGER: Create failed:`, error);
            this.uiManager.showError(`Create failed: ${error.message}`);
        }
    }

    /**
     * Get current tab data
     * @returns {Object|null} Current tab data
     */
    getCurrentTabData() {
        return this.tabs[this.currentTab].data;
    }

    /**
     * Check if admin manager is ready
     * @returns {boolean} Whether admin manager is ready
     */
    isReady() {
        return this.isInitialized && this.adminService && this.uiManager && this.components;
    }
}

// Export for ES6 modules
export { AdminManager };

// Global access for backward compatibility
if (typeof window !== 'undefined') {
    window.AdminManager = AdminManager;
}
