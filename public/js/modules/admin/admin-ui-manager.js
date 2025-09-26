// Admin UI Manager - Handles UI state, interactions, and events
/* global ADMIN_CONSTANTS */

class AdminModularUIManager {
    constructor(domManager, apiManager) {
        this.domManager = domManager;
        this.apiManager = apiManager;
        this.currentSection = null;
        this.loadedSections = new Set();
        this.refreshIntervals = new Map();
        this.eventListeners = new Map();
        this.filters = new Map();
        this.sortState = new Map();
        this.init();
    }

    /**
     * Initialize UI manager
     */
    init() {
        console.log('🎛️ ADMIN-UI: Initializing UI manager...');
        this.setupEventListeners();
        this.bindGlobalEvents();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Check if navigation elements exist before setting up navigation events
        const navLinks = document.querySelectorAll(ADMIN_CONSTANTS.SELECTORS.NAVIGATION.NAV_LINKS);
        if (navLinks.length > 0) {
            // Navigation events
            this.addEventListener('click', this.handleNavigationClick.bind(this), {
                selector: ADMIN_CONSTANTS.SELECTORS.NAVIGATION.NAV_LINKS,
                container: document
            });
        } else {
            console.log('AdminModularUIManager: No navigation links found, skipping navigation event setup');
        }

        // Global keyboard shortcuts
        this.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this), {
            container: document
        });

        // Window events
        this.addEventListener('hashchange', this.handleHashChange.bind(this), {
            container: window
        });

        this.addEventListener('beforeunload', this.handleBeforeUnload.bind(this), {
            container: window
        });
    }

    /**
     * Add event listener with cleanup tracking
     */
    addEventListener(event, handler, options = {}) {
        const { selector, container = document } = options;
        const key = `${event}-${selector || 'global'}-${Date.now()}`;

        if (selector) {
            // Delegated event listener
            const delegatedHandler = e => {
                const target = e.target.closest(selector);

                if (target) {
                    handler(e, target);
                }
            };

            container.addEventListener(event, delegatedHandler);
            this.eventListeners.set(key, { container, event, handler: delegatedHandler });
        } else {
            // Direct event listener
            container.addEventListener(event, handler);
            this.eventListeners.set(key, { container, event, handler });
        }

        return key;
    }

    /**
     * Remove event listener
     */
    removeEventListener(key) {
        const listener = this.eventListeners.get(key);

        if (listener) {
            listener.container.removeEventListener(listener.event, listener.handler);
            this.eventListeners.delete(key);
        }
    }

    /**
     * Handle navigation clicks
     */
    handleNavigationClick(event, target) {
        if (!target || !target.dataset) {
            console.warn('AdminModularUIManager: Invalid target in handleNavigationClick');
            return;
        }
        
        event.preventDefault();
        const sectionId = target.dataset.section;

        if (sectionId) {
            this.switchToSection(sectionId);
            this.updateUrl(sectionId);
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        // Ctrl/Cmd + R: Refresh current section
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            if (this.currentSection) {
                this.refreshSection(this.currentSection);
            }
        }

        // Escape: Clear filters
        if (event.key === 'Escape') {
            this.clearFilters();
        }
    }

    /**
     * Handle browser hash changes
     */
    handleHashChange() {
        const section = this.getUrlSection();

        if (section && section !== this.currentSection) {
            this.switchToSection(section);
        }
    }

    /**
     * Handle before unload
     */
    handleBeforeUnload() {
        this.clearAllIntervals();
    }

    /**
     * Switch to a different section
     */
    async switchToSection(sectionId) {
        try {
            this.dispatchEvent(ADMIN_CONSTANTS.EVENTS.SECTION_CHANGED, { sectionId });

            // Hide current section
            if (this.currentSection) {
                this.domManager.hideSection(this.currentSection);
                this.clearSectionIntervals(this.currentSection);
            }

            // Update navigation
            this.domManager.updateNavigation(sectionId);

            // Show loading state
            this.domManager.showLoadingState(sectionId);

            // Load section
            await this.loadSection(sectionId);

            // Update current section
            this.currentSection = sectionId;

            this.dispatchEvent(ADMIN_CONSTANTS.EVENTS.SECTION_LOADED, { sectionId });

        } catch (error) {
            this.domManager.showErrorState(sectionId, error.message);
            this.dispatchEvent(ADMIN_CONSTANTS.EVENTS.SECTION_ERROR, { sectionId, error });
        }
    }

    /**
     * Load section content
     */
    async loadSection(sectionId) {
        // Validate section exists
        if (!AdminModels[sectionId]) {
            throw new Error(`Section ${sectionId} not found`);
        }

        // Clear intervals for this section
        this.clearSectionIntervals(sectionId);

        // Load based on section type
        switch (sectionId) {
            case ADMIN_CONSTANTS.SECTION_TYPES.PAYMENTS:
                await this.loadPaymentsSection(sectionId);
                break;
            case ADMIN_CONSTANTS.SECTION_TYPES.PRICING:
                await this.loadPricingSection(sectionId);
                break;
            case ADMIN_CONSTANTS.SECTION_TYPES.ACTIVITY:
                await this.loadActivitySection(sectionId);
                break;
            case ADMIN_CONSTANTS.SECTION_TYPES.USERS:
                await this.loadUsersSection(sectionId);
                break;
            default:
                throw new Error(`Unknown section type: ${sectionId}`);
        }

        // Mark as loaded
        this.loadedSections.add(sectionId);
        this.domManager.showSection(sectionId);
    }

    /**
     * Load payments section
     */
    async loadPaymentsSection(sectionId) {
        const model = AdminModels[sectionId];

        // Load data
        const [statsData, paymentsData] = await Promise.all([
            this.apiManager.getPaymentAnalytics(),
            this.apiManager.getPayments()
        ]);

        // Render content
        const content = this.generatePaymentsSectionHTML(model, statsData, paymentsData);

        this.domManager.renderSectionContent(sectionId, content);

        // Setup section-specific events
        this.setupTableEvents(sectionId, model.table);
    }

    /**
     * Load pricing section
     */
    async loadPricingSection(sectionId) {
        const model = AdminModels[sectionId];

        // Load data
        const [pricingData, historyData] = await Promise.all([
            this.apiManager.getPricing(),
            this.apiManager.getPricingHistory()
        ]);

        // Render content
        const content = this.generatePricingSectionHTML(model, pricingData, historyData);

        this.domManager.renderSectionContent(sectionId, content);

        // Setup form handling if form generator is available
        if (window.formGenerator) {
            const formContainer = this.domManager.getSectionContainer(sectionId).querySelector('#pricing-form-container');

            window.formGenerator.generateForm(model.form, formContainer, pricingData);
        }
    }

    /**
     * Load activity section
     */
    async loadActivitySection(sectionId) {
        const model = AdminModels[sectionId];

        // Load data
        const [activityData, healthData] = await Promise.all([
            this.apiManager.getActivity(),
            this.apiManager.getSystemHealth()
        ]);

        // Render content
        const content = this.generateActivitySectionHTML(model, activityData, healthData);

        this.domManager.renderSectionContent(sectionId, content);

        // Setup auto-refresh
        this.setupActivityRefresh(model);

        // Load charts
        this.loadActivityCharts(model.charts);
    }

    /**
     * Load users section
     */
    async loadUsersSection(sectionId) {
        const model = AdminModels[sectionId];

        // Load data
        const usersData = await this.apiManager.getUsers();

        // Render content
        const content = this.generateUsersSectionHTML(model, usersData);

        this.domManager.renderSectionContent(sectionId, content);

        // Setup section-specific events
        this.setupTableEvents(sectionId, model.table);
        this.setupBulkActions(sectionId, model.bulkActions);
    }

    /**
     * Generate payments section HTML
     */
    generatePaymentsSectionHTML(model, statsData, paymentsData) {
        return `
            <div class="section-header">
                <h1><i class="${model.icon}"></i> ${model.title}</h1>
                <p>${model.description}</p>
            </div>
            <div class="stats-grid" id="payments-stats">
                ${this.domManager.renderStatsCards(model.stats, statsData)}
            </div>
            <div class="section-content">
                <div class="data-table-container">
                    <div class="table-header">
                        <h3>Payment Transactions</h3>
                        <div class="table-actions">
                            <button class="btn btn-outline" onclick="exportPayments()">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-outline" onclick="refreshPayments()">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                        </div>
                    </div>
                    <div class="filters-container" id="payments-filters">
                        ${this.domManager.renderFilters(model.filters)}
                    </div>
                    <div class="table-container" id="payments-table">
                        ${this.domManager.renderDataTable(model.table, paymentsData)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate pricing section HTML
     */
    generatePricingSectionHTML(model, pricingData, historyData) {
        return `
            <div class="section-header">
                <h1><i class="${model.icon}"></i> ${model.title}</h1>
                <p>${model.description}</p>
            </div>
            <div class="section-content">
                <div class="pricing-form-container">
                    <div id="pricing-form-container"></div>
                </div>
                <div class="pricing-history-container">
                    <h3>Pricing History</h3>
                    <div class="table-container" id="pricing-history-table">
                        ${this.domManager.renderDataTable(model.historyTable, historyData)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate activity section HTML
     */
    generateActivitySectionHTML(model, activityData, healthData) {
        const chartsHTML = model.charts.map(chart => `
            <div class="chart-container" id="${chart.id}-container">
                <div class="chart-header">
                    <h3>${chart.title}</h3>
                    <div class="chart-controls">
                        ${chart.timeRanges.map(range => `
                            <button class="btn btn-sm ${range === chart.defaultRange ? 'active' : ''}"
                                    data-range="${range}" data-chart="${chart.id}">
                                ${range}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="chart-content" id="${chart.id}">
                    <canvas id="${chart.id}-canvas"></canvas>
                </div>
            </div>
        `).join('');

        return `
            <div class="section-header">
                <h1><i class="${model.icon}"></i> ${model.title}</h1>
                <p>${model.description}</p>
            </div>
            <div class="metrics-grid" id="activity-metrics">
                ${this.domManager.renderMetricsCards(model.metrics, activityData)}
            </div>
            <div class="health-status" id="system-health">
                ${this.domManager.renderHealthStatus(model.health, healthData)}
            </div>
            <div class="charts-container">
                ${chartsHTML}
            </div>
        `;
    }

    /**
     * Generate users section HTML
     */
    generateUsersSectionHTML(model, usersData) {
        return `
            <div class="section-header">
                <h1><i class="${model.icon}"></i> ${model.title}</h1>
                <p>${model.description}</p>
            </div>
            <div class="section-content">
                <div class="data-table-container">
                    <div class="table-header">
                        <h3>User Accounts</h3>
                        <div class="table-actions">
                            <div class="bulk-actions" id="users-bulk-actions" style="display: none;">
                                ${model.bulkActions.map(action => `
                                    <button class="btn btn-${action.variant}" data-action="${action.id}">
                                        <i class="${action.icon}"></i> ${action.label}
                                    </button>
                                `).join('')}
                            </div>
                            <button class="btn btn-outline" onclick="exportUsers()">
                                <i class="fas fa-download"></i> Export
                            </button>
                            <button class="btn btn-outline" onclick="refreshUsers()">
                                <i class="fas fa-sync"></i> Refresh
                            </button>
                        </div>
                    </div>
                    <div class="filters-container" id="users-filters">
                        ${this.domManager.renderFilters(model.filters)}
                    </div>
                    <div class="table-container" id="users-table">
                        ${this.domManager.renderDataTable(model.table, usersData)}
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Setup table events
     */
    setupTableEvents(sectionId, tableConfig) {
        const tableContainer = this.domManager.getSectionContainer(sectionId).querySelector(`#${sectionId}-table`);

        if (!tableContainer) {
            return;
        }

        // Sorting
        this.addEventListener('click', (event, target) => {
            this.handleTableSort(sectionId, target.dataset.key);
        }, {
            selector: 'th.sortable',
            container: tableContainer
        });

        // Row selection for bulk actions
        if (tableConfig.features && tableConfig.features.includes('bulk-actions')) {
            this.setupRowSelection(sectionId);
        }
    }

    /**
     * Setup bulk actions
     */
    setupBulkActions(sectionId, _bulkActions) {
        const bulkContainer = this.domManager.getSectionContainer(sectionId).querySelector(`#${sectionId}-bulk-actions`);

        if (!bulkContainer) {
            return;
        }

        this.addEventListener('click', (event, target) => {
            const { action } = target.dataset;
            const selectedRows = this.getSelectedRows(sectionId);

            this.handleBulkAction(sectionId, action, selectedRows);
        }, {
            selector: '[data-action]',
            container: bulkContainer
        });
    }

    /**
     * Setup activity refresh intervals
     */
    setupActivityRefresh(model) {
        // Setup metrics refresh
        model.metrics.forEach(metric => {
            if (metric.refreshInterval) {
                const intervalId = setInterval(async () => {
                    try {
                        const data = await this.apiManager.getActivity();

                        this.domManager.updateMetricCard(metric.key, data[metric.key], metric.formatter);
                    } catch (error) {
                        console.error(`Failed to refresh metric ${metric.key}:`, error);
                    }
                }, metric.refreshInterval);

                this.refreshIntervals.set(`activity-metric-${metric.key}`, intervalId);
            }
        });

        // Setup health refresh
        const healthIntervalId = setInterval(async () => {
            try {
                const healthData = await this.apiManager.getSystemHealth();

                this.domManager.updateHealthStatus(healthData);
            } catch (error) {
                console.error('Failed to refresh health status:', error);
            }
        }, model.health.refreshInterval);

        this.refreshIntervals.set('activity-health', healthIntervalId);
    }

    /**
     * Load activity charts
     */
    async loadActivityCharts(charts) {
        // This would integrate with a charting library like Chart.js
        // For now, just log that charts would be loaded
        console.log('📊 ADMIN-UI: Loading charts:', charts.map(c => c.id));

        // Could load chart data and render charts here
        // for (const chart of charts) {
        //     const chartData = await this.apiManager.getChartData(chart.id, chart.defaultRange);
        //     this.renderChart(chart, chartData);
        // }
    }

    /**
     * Handle table sorting
     */
    handleTableSort(sectionId, column) {
        const currentSort = this.sortState.get(sectionId) || {};
        const direction = currentSort.column === column && currentSort.direction === 'asc' ? 'desc' : 'asc';

        this.sortState.set(sectionId, { column, direction });

        this.dispatchEvent(ADMIN_CONSTANTS.EVENTS.TABLE_SORT, {
            sectionId,
            column,
            direction
        });

        // Reload section data with new sort
        this.refreshSection(sectionId);
    }

    /**
     * Handle bulk actions
     */
    handleBulkAction(sectionId, action, selectedRows) {
        this.dispatchEvent(ADMIN_CONSTANTS.EVENTS.BULK_ACTION, {
            sectionId,
            action,
            selectedRows
        });

        // Handle specific bulk actions
        switch (action) {
            case ADMIN_CONSTANTS.BULK_ACTIONS.DELETE:
                this.confirmBulkDelete(sectionId, selectedRows);
                break;
            case ADMIN_CONSTANTS.BULK_ACTIONS.EXPORT:
                this.bulkExport(sectionId, selectedRows);
                break;
            // Add more bulk actions as needed
        }
    }

    /**
     * Get selected rows for bulk actions
     */
    getSelectedRows(sectionId) {
        const tableContainer = this.domManager.getSectionContainer(sectionId).querySelector(`#${sectionId}-table`);
        const checkboxes = tableContainer.querySelectorAll('input[type="checkbox"]:checked');

        return Array.from(checkboxes).map(cb => ({
            id: cb.closest('tr').dataset.id,
            element: cb.closest('tr')
        }));
    }

    /**
     * Setup row selection
     */
    setupRowSelection(sectionId) {
        // Add row selection checkboxes and handle selection
        // This would modify the table to include checkboxes
        console.log(`📋 ADMIN-UI: Setting up row selection for ${sectionId}`);
    }

    /**
     * Clear filters
     */
    clearFilters() {
        this.filters.clear();
        // Reset filter UI elements
        document.querySelectorAll('.filter-input').forEach(input => {
            input.value = '';
        });
    }

    /**
     * Refresh section
     */
    async refreshSection(sectionId) {
        if (this.loadedSections.has(sectionId)) {
            this.loadedSections.delete(sectionId);
            await this.loadSection(sectionId);
        }
    }

    /**
     * Clear intervals for section
     */
    clearSectionIntervals(sectionId) {
        const keysToDelete = [];

        for (const [key, intervalId] of this.refreshIntervals.entries()) {
            if (key.startsWith(sectionId)) {
                clearInterval(intervalId);
                keysToDelete.push(key);
            }
        }

        keysToDelete.forEach(key => this.refreshIntervals.delete(key));
    }

    /**
     * Clear all intervals
     */
    clearAllIntervals() {
        for (const intervalId of this.refreshIntervals.values()) {
            clearInterval(intervalId);
        }
        this.refreshIntervals.clear();
    }

    /**
     * Get current section from URL
     */
    getUrlSection() {
        return window.location.hash.slice(1) || null;
    }

    /**
     * Update URL with current section
     */
    updateUrl(section) {
        window.location.hash = section;
    }

    /**
     * Dispatch custom event
     */
    dispatchEvent(eventName, detail = {}) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(eventName, { detail }));
        }
    }

    /**
     * Bind global events
     */
    bindGlobalEvents() {
        // Listen for data updates
        this.addEventListener(ADMIN_CONSTANTS.EVENTS.DATA_UPDATED, event => {
            this.handleDataUpdated(event.detail);
        }, { container: window });
    }

    /**
     * Handle data updates
     */
    handleDataUpdated(detail) {
        const { sectionId } = detail;

        if (sectionId === this.currentSection) {
            // Refresh current section if its data was updated
            this.refreshSection(sectionId);
        }
    }

    /**
     * Cleanup and destroy
     */
    destroy() {
        // Remove all event listeners
        for (const key of this.eventListeners.keys()) {
            this.removeEventListener(key);
        }

        // Clear all intervals
        this.clearAllIntervals();

        // Clear state
        this.loadedSections.clear();
        this.filters.clear();
        this.sortState.clear();

        console.log('🗑️ ADMIN-UI: UI manager destroyed');
    }
}

// Export for global access
window.AdminModularUIManager = AdminModularUIManager;

// Also export as module for ES6 imports (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminModularUIManager;
}
