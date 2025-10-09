/**
 * Admin Dashboard Manager - Main orchestrator for the new modular admin dashboard
 * Implements SOLID principles with clear separation of concerns
 */

/* global AdminEventBus, AdminSnapshotService, AdminHistoryManager, AdminUIRenderer */

class AdminDashboardManager {
    constructor() {
        // Initialize services after dependencies are available
        this.snapshotService = null;
        this.historyManager = null;
        this.uiRenderer = null;
        this.eventBus = null;
        this.queueService = null;

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
            messages: { loaded: false, data: null },
            'queue-monitor': { loaded: false, data: null }
        };
    }

    async init() {
        if (this.isInitialized) {
            console.warn('AdminDashboardManager already initialized');

            return;
        }

        try {

            // Check authentication before initializing
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-DASHBOARD: No valid token, skipping dashboard manager initialization');

                return;
            }

            // Initialize services with proper dependency injection
            this.eventBus = new AdminEventBus();
            this.snapshotService = new AdminSnapshotService();
            this.historyManager = new AdminHistoryManager();
            this.uiRenderer = new AdminUIRenderer();
            this.packageHandler = new AdminPackageManager(null, this.eventBus);
            this.promoCardsHandler = new AdminPromoCardsManager(this.uiRenderer, this.eventBus);
            this.queueService = new AdminQueueService();
            this.apiService = new AdminAPIService();

            // Initialize sub-managers
            await this.snapshotService.init();
            await this.historyManager.init();
            this.uiRenderer.init();
            await this.packageHandler.init();
            await this.promoCardsHandler.init();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial snapshot data
            await this.loadSiteSnapshot();

            // Load queue status
            await this.loadQueueStatus();

            // Render initial UI (after data is loaded)
            this.renderDashboard();

            // Ensure packages tab is rendered for package handler
            this.uiRenderer.renderPackagesTab();

            // Set up global admin app object for other components
            window.adminApp = {
                dashboardManager: this,
                uiRenderer: this.uiRenderer,
                packageHandler: this.packageHandler,
                eventBus: this.eventBus,
                apiService: this.apiService,
                showNotification: window.showNotification,
                showModal: window.showModal,
                hideModal: window.hideModal
            };

            // Also set up global API service for backward compatibility
            window.adminApiService = this.apiService;

            this.isInitialized = true;

        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Initialization failed:', error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Failed to initialize admin dashboard', error });
            }
        }
    }

    setupEventListeners() {
        // Tab switching events
        this.eventBus.on('tab-switch', 'switch', this.handleTabSwitch.bind(this));

        // History loading events
        this.eventBus.on('load-history', this.handleHistoryLoad.bind(this));

        // Table action events
        this.eventBus.on('table-action', this.handleTableAction.bind(this));

        // Refresh events
        this.eventBus.on('refresh-snapshot', this.loadSiteSnapshot.bind(this));
        this.eventBus.on('refresh-history', this.handleHistoryRefresh.bind(this));
        this.eventBus.on('refresh-queue', this.loadQueueStatus.bind(this));

        // Router-initiated tab switches
        window.addEventListener('admin-tab-switch', e => {
            this.handleRouterTabSwitch(e.detail.tab);
        });
    }

    async loadSiteSnapshot() {
        try {

            if (!this.snapshotService) {
                throw new Error('Snapshot service not initialized');
            }

            const snapshotData = await this.snapshotService.getSiteSnapshot();

            if (snapshotData) {
                this.tabs.summary.data = snapshotData;
                this.tabs.summary.loaded = true;

                if (this.eventBus) {
                    this.eventBus.emit('snapshot-loaded', snapshotData);
                }
            }

        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Failed to load site snapshot:', error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Failed to load site snapshot', error });
            }
        }
    }

    async handleTabSwitch(eventData) {
        const tabName = eventData.tab;

        if (this.currentTab === tabName) {
            return;
        }


        this.currentTab = tabName;

        // Update URL through router if available
        if (window.adminRouter) {
            window.adminRouter.updateURL(tabName);
        }

        // Load tab data if not already loaded (only for history tabs)
        if (!this.tabs[tabName].loaded && tabName !== 'summary' && tabName !== 'packages' && tabName !== 'models' && tabName !== 'promo-cards' && tabName !== 'terms' && tabName !== 'messages' && tabName !== 'queue-monitor') {
            await this.loadHistoryData(tabName);
        }

        // Render the tab content
        this.renderTabContent(tabName);
    }

    /**
     * Handle tab switch initiated by router (URL changes)
     */
    async handleRouterTabSwitch(tabName) {

        if (this.currentTab === tabName) {
            return;
        }

        // Update current tab
        this.currentTab = tabName;

        // Load tab data if not already loaded (only for history tabs)
        if (!this.tabs[tabName].loaded && tabName !== 'summary' && tabName !== 'packages' && tabName !== 'models' && tabName !== 'promo-cards' && tabName !== 'terms' && tabName !== 'messages' && tabName !== 'queue-monitor') {
            await this.loadHistoryData(tabName);
        }

        // Render the tab content
        this.renderTabContent(tabName);

        // Update UI to reflect the tab switch
        this.updateTabUI(tabName);
    }

    /**
     * Update tab UI elements to reflect current tab
     */
    updateTabUI(tabName) {
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
    }

    async loadHistoryData(historyType) {
        try {

            if (!this.historyManager) {
                throw new Error('History manager not initialized');
            }

            const historyData = await this.historyManager.getHistory(historyType);

            if (historyData) {
                this.tabs[historyType].data = historyData;
                this.tabs[historyType].loaded = true;

                if (this.eventBus) {
                    this.eventBus.emit('history-loaded', { type: historyType, data: historyData });
                }
            }

        } catch (error) {
            console.error(`❌ ADMIN-DASHBOARD: Failed to load ${historyType} history:`, error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: `Failed to load ${historyType} history`, error });
            }
        }
    }

    async handleHistoryLoad(historyType) {
        await this.loadHistoryData(historyType);
    }

    async handleHistoryRefresh(historyType) {
        // Clear cached data and reload
        this.tabs[historyType].loaded = false;
        this.tabs[historyType].data = null;

        await this.loadHistoryData(historyType);
    }

    renderDashboard() {
        if (!this.uiRenderer) {
            console.error('❌ ADMIN-DASHBOARD: UI renderer not initialized');

            return;
        }
        this.uiRenderer.renderDashboard(this.tabs.summary.data);
    }

    renderTabContent(tabName) {
        if (!this.uiRenderer) {
            console.error('❌ ADMIN-DASHBOARD: UI renderer not initialized');

            return;
        }

        const tabData = this.tabs[tabName];

        if (tabName === 'summary') {
            this.uiRenderer.renderSummaryTab(tabData.data);
        } else if (tabName === 'packages') {
            this.uiRenderer.renderPackagesTab();
        } else if (tabName === 'models') {
            this.uiRenderer.renderProvidersTab();
        } else if (tabName === 'promo-cards') {
            this.uiRenderer.renderPromoCardsTab();
        } else if (tabName === 'terms') {
            this.uiRenderer.renderTermsTab();
        } else if (tabName === 'messages') {
            this.uiRenderer.renderMessagesTab();
        } else if (tabName === 'queue-monitor') {
            this.renderQueueMonitorTab();
        } else {
            this.uiRenderer.renderHistoryTab(tabName, tabData.data);
        }
    }

    /**
     * Render the queue monitoring tab
     */
    renderQueueMonitorTab() {

        // Initialize the queue monitor if not already done
        if (!this.queueMonitor) {
            this.queueMonitor = new AdminQueueMonitor();
        }

        // Initialize the queue monitor for the active tab
        this.queueMonitor.initWhenActive();
    }

    async handleTableAction(actionData) {
        try {

            // Don't handle create-package actions - let AdminPackageManager handle them
            if (actionData.action === 'create-package') {
                return;
            }

            if (!this.historyManager) {
                throw new Error('History manager not initialized');
            }

            const result = await this.historyManager.executeAction(actionData);

            if (result.success) {
                // Refresh the relevant tab data
                await this.handleHistoryRefresh(actionData.historyType);
                if (this.eventBus) {
                    this.eventBus.emit('action-success', result);
                }
            } else if (this.eventBus) {
                this.eventBus.emit('action-error', result);
            }

        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Table action failed:', error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Table action failed', error });
            }
        }
    }

    // Public API methods
    getCurrentTab() {
        return this.currentTab;
    }

    getTabData(tabName) {
        return this.tabs[tabName];
    }

    async loadQueueStatus() {
        try {

            if (!this.queueService) {
                throw new Error('Queue service not initialized');
            }

            const queueData = await this.queueService.getQueueStatus();

            // Add queue data to summary tab data
            if (this.tabs.summary.data) {
                this.tabs.summary.data.queue = queueData;
            }

            // Update UI if summary tab is currently active
            if (this.currentTab === 'summary' && window.AdminSummaryRenderer) {
                const summaryRenderer = new window.AdminSummaryRenderer();

                summaryRenderer.updateSummaryQueueStatus(queueData);
            }

            if (this.eventBus) {
                this.eventBus.emit('queue-loaded', queueData);
            }


        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Failed to load queue status:', error);

            // Show error in UI if summary tab is active
            if (this.currentTab === 'summary' && this.uiRenderer) {
                this.uiRenderer.updateQueueDisplay(null);
            }

            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Failed to load queue status', error });
            }
        }
    }


    async refreshAll() {

        // Refresh snapshot
        await this.loadSiteSnapshot();

        // Refresh queue status
        await this.loadQueueStatus();

        // Refresh current tab if it's a history tab
        if (this.currentTab !== 'summary' && this.tabs[this.currentTab].loaded) {
            await this.handleHistoryRefresh(this.currentTab);
        }
    }

    destroy() {
        if (this.snapshotService) {
            this.snapshotService.destroy();
        }
        if (this.historyManager) {
            this.historyManager.destroy();
        }
        if (this.uiRenderer) {
            this.uiRenderer.destroy();
        }
        if (this.eventBus) {
            this.eventBus.destroy();
        }

        this.isInitialized = false;
    }
}

// Export for global access
window.AdminDashboardManager = AdminDashboardManager;
