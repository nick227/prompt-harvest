// Admin Section Manager - Main orchestrator for modular admin system
/* global ADMIN_CONSTANTS, AdminDOMManager, AdminAPIManager, AdminModularUIManager */

class AdminSectionManagerRefactored {
    constructor(apiManager, domManager, uiManager) {
        this.apiManager = apiManager || new AdminAPIManager();
        this.domManager = domManager || new AdminDOMManager();
        this.uiManager = uiManager || new AdminModularUIManager();

        this.currentSection = null;
        this.sectionData = new Map();
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) {
            console.warn('AdminSectionManagerRefactored already initialized');

            return;
        }

        try {
            // Verify admin access
            const accessResult = await this.apiManager.verifyAdminAccess();

            if (!accessResult.success) {
                throw new Error('Admin access denied');
            }

            // Initialize sub-managers
            this.domManager.init();
            this.uiManager.init();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Load initial section (dashboard)
            await this.loadSection('dashboard');

            this.isInitialized = true;
            console.log('AdminSectionManagerRefactored initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AdminSectionManagerRefactored:', error);
            this.uiManager.showNotification('Failed to initialize admin panel', 'error');
        }
    }

    setupGlobalEventListeners() {
        // API request events
        document.addEventListener('admin-api-request', e => {
            this.handleAPIRequest(e.detail);
        });

        // Refresh events
        document.addEventListener('admin-refresh-dashboard', () => {
            this.refreshDashboard();
        });

        document.addEventListener('admin-refresh-section', e => {
            this.refreshSection(e.detail.section);
        });

        // Table events
        document.addEventListener('admin-table-sort', e => {
            this.handleTableSort(e.detail);
        });

        document.addEventListener('admin-table-action', e => {
            this.handleTableAction(e.detail);
        });
    }

    async loadSection(sectionName) {
        try {
            this.uiManager.setGlobalState(ADMIN_CONSTANTS.UI_STATES.LOADING);
            this.domManager.switchSection(sectionName);
            this.currentSection = sectionName;

            // Load section data
            await this.loadSectionData(sectionName);

            this.uiManager.setGlobalState(ADMIN_CONSTANTS.UI_STATES.LOADED);
        } catch (error) {
            console.error(`Failed to load section ${sectionName}:`, error);
            this.uiManager.setGlobalState(ADMIN_CONSTANTS.UI_STATES.ERROR);
            this.uiManager.showNotification(`Failed to load ${sectionName}`, 'error');
        }
    }

    async loadSectionData(sectionName) {
        const dataKey = `${sectionName}Data`;

        try {
            let data;

            switch (sectionName) {
                case 'dashboard':
                    data = await this.loadDashboardData();
                    break;
                case 'users':
                    data = await this.loadUsersData();
                    break;
                case 'images':
                    data = await this.loadImagesData();
                    break;
                case 'providers':
                    data = await this.loadProvidersData();
                    break;
                case 'settings':
                    data = await this.loadSettingsData();
                    break;
                case 'analytics':
                    data = await this.loadAnalyticsData();
                    break;
                case 'logs':
                    data = await this.loadLogsData();
                    break;
                case 'system':
                    data = await this.loadSystemData();
                    break;
                default:
                    throw new Error(`Unknown section: ${sectionName}`);
            }

            this.sectionData.set(dataKey, data);

            // Trigger data loaded event
            document.dispatchEvent(new CustomEvent(ADMIN_CONSTANTS.EVENTS.DATA_LOADED, {
                detail: { section: sectionName, data }
            }));

        } catch (error) {
            console.error(`Failed to load data for section ${sectionName}:`, error);
            throw error;
        }
    }

    async loadDashboardData() {
        const [statsResult, metricsResult] = await Promise.all([
            this.apiManager.getDashboardStats(),
            this.apiManager.getAnalytics({ period: '24h' })
        ]);

        if (!statsResult.success || !metricsResult.success) {
            throw new Error('Failed to load dashboard data');
        }

        return {
            stats: statsResult.data,
            metrics: metricsResult.data
        };
    }

    async loadUsersData() {
        const result = await this.apiManager.getUsers({
            page: 1,
            limit: 20,
            sort: 'created_at',
            order: 'desc'
        });

        if (!result.success) {
            throw new Error('Failed to load users data');
        }

        return result.data;
    }

    async loadImagesData() {
        const result = await this.apiManager.getImages({
            page: 1,
            limit: 15,
            sort: 'created_at',
            order: 'desc'
        });

        if (!result.success) {
            throw new Error('Failed to load images data');
        }

        return result.data;
    }

    async loadProvidersData() {
        const result = await this.apiManager.getProviders({
            page: 1,
            limit: 10,
            sort: 'name',
            order: 'asc'
        });

        if (!result.success) {
            throw new Error('Failed to load providers data');
        }

        return result.data;
    }

    async loadSettingsData() {
        const result = await this.apiManager.getSettings();

        if (!result.success) {
            throw new Error('Failed to load settings data');
        }

        return result.data;
    }

    async loadAnalyticsData() {
        const result = await this.apiManager.getAnalytics({
            period: '7d',
            groupBy: 'day'
        });

        if (!result.success) {
            throw new Error('Failed to load analytics data');
        }

        return result.data;
    }

    async loadLogsData() {
        const result = await this.apiManager.getLogs({
            page: 1,
            limit: 50,
            sort: 'timestamp',
            order: 'desc'
        });

        if (!result.success) {
            throw new Error('Failed to load logs data');
        }

        return result.data;
    }

    async loadSystemData() {
        const [statusResult, healthResult] = await Promise.all([
            this.apiManager.getSystemStatus(),
            this.apiManager.getSystemHealth()
        ]);

        if (!statusResult.success || !healthResult.success) {
            throw new Error('Failed to load system data');
        }

        return {
            status: statusResult.data,
            health: healthResult.data
        };
    }

    async refreshDashboard() {
        try {
            const data = await this.loadDashboardData();

            // Update UI
            this.domManager.updateStats(data.stats);
            this.domManager.updateMetrics(data.metrics);

            this.uiManager.showNotification('Dashboard refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh dashboard:', error);
            this.uiManager.showNotification('Failed to refresh dashboard', 'error');
        }
    }

    async refreshSection(sectionName) {
        try {
            await this.loadSectionData(sectionName);
            this.uiManager.showNotification(`${sectionName} refreshed`, 'success');
        } catch (error) {
            console.error(`Failed to refresh section ${sectionName}:`, error);
            this.uiManager.showNotification(`Failed to refresh ${sectionName}`, 'error');
        }
    }

    async handleAPIRequest(detail) {
        try {
            let result;

            switch (detail.type) {
                case 'table-sort':
                    result = await this.handleTableSort(detail);
                    break;
                case 'table-action':
                    result = await this.handleTableAction(detail);
                    break;
                default:
                    console.warn(`Unknown API request type: ${detail.type}`);

                    return;
            }

            if (result && result.success) {
                this.uiManager.showNotification('Action completed successfully', 'success');
            } else {
                this.uiManager.showNotification('Action failed', 'error');
            }
        } catch (error) {
            console.error('API request failed:', error);
            this.uiManager.showNotification('Request failed', 'error');
        }
    }

    async handleTableSort(detail) {
        const { tableType, field } = detail;

        try {
            let result;

            switch (tableType) {
                case 'users':
                    result = await this.apiManager.getUsers({ sort: field, order: 'asc' });
                    break;
                case 'images':
                    result = await this.apiManager.getImages({ sort: field, order: 'asc' });
                    break;
                case 'providers':
                    result = await this.apiManager.getProviders({ sort: field, order: 'asc' });
                    break;
                default:
                    throw new Error(`Unknown table type: ${tableType}`);
            }

            if (result.success) {
                // Re-render table with sorted data
                this.domManager.createTable(tableType, result.data);

                return { success: true };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error(`Failed to sort table ${tableType}:`, error);

            return { success: false, error: error.message };
        }
    }

    async handleTableAction(detail) {
        const { action, id, tableType } = detail;

        try {
            let result;

            switch (tableType) {
                case 'users':
                    result = await this.handleUserAction(action, id);
                    break;
                case 'images':
                    result = await this.handleImageAction(action, id);
                    break;
                case 'providers':
                    result = await this.handleProviderAction(action, id);
                    break;
                default:
                    throw new Error(`Unknown table type: ${tableType}`);
            }

            if (result && result.success) {
                // Refresh the current section data
                await this.refreshSection(this.currentSection);

                return { success: true };
            } else {
                return { success: false, error: result?.error || 'Action failed' };
            }
        } catch (error) {
            console.error(`Failed to handle table action ${action}:`, error);

            return { success: false, error: error.message };
        }
    }

    async handleUserAction(action, userId) {
        switch (action) {
            case 'edit-users':
                // Show edit modal
                this.showUserEditModal(userId);

                return { success: true };
            case 'delete-users':
                return await this.apiManager.deleteUser(userId);
            case 'suspend-user':
                return await this.apiManager.updateUser(userId, { status: 'suspended' });
            case 'activate-user':
                return await this.apiManager.updateUser(userId, { status: 'active' });
            default:
                throw new Error(`Unknown user action: ${action}`);
        }
    }

    async handleImageAction(action, imageId) {
        switch (action) {
            case 'edit-images':
                // Show edit modal
                this.showImageEditModal(imageId);

                return { success: true };
            case 'delete-images':
                return await this.apiManager.deleteImage(imageId);
            default:
                throw new Error(`Unknown image action: ${action}`);
        }
    }

    async handleProviderAction(action, providerId) {
        switch (action) {
            case 'edit-providers':
                // Show edit modal
                this.showProviderEditModal(providerId);

                return { success: true };
            case 'delete-providers':
                return await this.apiManager.deleteProvider(providerId);
            default:
                throw new Error(`Unknown provider action: ${action}`);
        }
    }

    showUserEditModal(userId) {
        // Implementation for user edit modal
        console.log('Show user edit modal for:', userId);
    }

    showImageEditModal(imageId) {
        // Implementation for image edit modal
        console.log('Show image edit modal for:', imageId);
    }

    showProviderEditModal(providerId) {
        // Implementation for provider edit modal
        console.log('Show provider edit modal for:', providerId);
    }

    // Utility methods
    getCurrentSection() {
        return this.currentSection;
    }

    getSectionData(sectionName) {
        const dataKey = `${sectionName}Data`;

        return this.sectionData.get(dataKey);
    }

    clearSectionData(sectionName) {
        const dataKey = `${sectionName}Data`;

        this.sectionData.delete(dataKey);
    }

    destroy() {
        // Clear refresh intervals
        this.refreshIntervals.forEach(interval => {
            clearInterval(interval);
        });
        this.refreshIntervals.clear();

        // Clear section data
        this.sectionData.clear();

        // Close all modals
        this.uiManager.closeAllModals();

        this.isInitialized = false;
        console.log('AdminSectionManagerRefactored destroyed');
    }
}

// Export for module system
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSectionManagerRefactored;
}

// Global reference for browser
window.AdminSectionManagerRefactored = AdminSectionManagerRefactored;
