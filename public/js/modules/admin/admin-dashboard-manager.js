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
    }

    async init() {
        if (this.isInitialized) {
            console.warn('AdminDashboardManager already initialized');

            return;
        }

        try {
            console.log('🎛️ ADMIN-DASHBOARD: Initializing dashboard manager...');

            // Initialize services with proper dependency injection
            this.eventBus = new AdminEventBus();
            this.snapshotService = new AdminSnapshotService();
            this.historyManager = new AdminHistoryManager();
            this.uiRenderer = new AdminUIRenderer();

            // Initialize sub-managers
            await this.snapshotService.init();
            await this.historyManager.init();
            this.uiRenderer.init();

            // Setup event listeners
            this.setupEventListeners();

            // Load initial snapshot data
            await this.loadSiteSnapshot();

            // Render initial UI
            this.renderDashboard();

            // Ensure packages tab is rendered for package handler
            console.log('🎛️ ADMIN-DASHBOARD: Rendering packages tab for package handler...');
            this.uiRenderer.renderPackagesTab();

            this.isInitialized = true;
            console.log('✅ ADMIN-DASHBOARD: Dashboard manager initialized successfully');

        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Initialization failed:', error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Failed to initialize admin dashboard', error });
            }
        }
    }

    setupEventListeners() {
        // Tab switching events
        this.eventBus.on('tab-switch', this.handleTabSwitch.bind(this));

        // History loading events
        this.eventBus.on('load-history', this.handleHistoryLoad.bind(this));

        // Table action events
        this.eventBus.on('table-action', this.handleTableAction.bind(this));

        // Refresh events
        this.eventBus.on('refresh-snapshot', this.loadSiteSnapshot.bind(this));
        this.eventBus.on('refresh-history', this.handleHistoryRefresh.bind(this));
    }

    async loadSiteSnapshot() {
        try {
            console.log('📊 ADMIN-DASHBOARD: Loading site snapshot...');

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
                console.log('✅ ADMIN-DASHBOARD: Site snapshot loaded successfully');
            }

        } catch (error) {
            console.error('❌ ADMIN-DASHBOARD: Failed to load site snapshot:', error);
            if (this.eventBus) {
                this.eventBus.emit('error', { message: 'Failed to load site snapshot', error });
            }
        }
    }

    async handleTabSwitch(tabName) {
        if (this.currentTab === tabName) {
            return;
        }

        console.log(`🔄 ADMIN-DASHBOARD: Switching to tab: ${tabName}`);

        this.currentTab = tabName;

        // Load tab data if not already loaded (only for history tabs)
        if (!this.tabs[tabName].loaded && tabName !== 'summary' && tabName !== 'packages' && tabName !== 'models' && tabName !== 'promo-cards' && tabName !== 'terms' && tabName !== 'messages') {
            await this.loadHistoryData(tabName);
        }

        // Render the tab content
        this.renderTabContent(tabName);
    }

    async loadHistoryData(historyType) {
        try {
            console.log(`📋 ADMIN-DASHBOARD: Loading ${historyType} history...`);

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
                console.log(`✅ ADMIN-DASHBOARD: ${historyType} history loaded successfully`);
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
        } else {
            this.uiRenderer.renderHistoryTab(tabName, tabData.data);
        }
    }

    async handleTableAction(actionData) {
        try {
            console.log('🔧 ADMIN-DASHBOARD: Handling table action:', actionData);

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

    async refreshAll() {
        console.log('🔄 ADMIN-DASHBOARD: Refreshing all data...');

        // Refresh snapshot
        await this.loadSiteSnapshot();

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
        console.log('🗑️ ADMIN-DASHBOARD: Dashboard manager destroyed');
    }
}

// Export for global access
window.AdminDashboardManager = AdminDashboardManager;
