/**
 * Admin UI Renderer - Handles rendering of admin dashboard UI components
 * Single Responsibility: Render UI components and handle DOM updates
 */

// Globals: AdminSharedTable, AdminPromoCodeModal,
// AdminSummaryRenderer, AdminImageManager, AdminPackageManager,
// AdminEventHandler, SystemSettingsManager (defined in .eslintrc.json)

class AdminUIRenderer {
    constructor() {
        this.sharedTable = new AdminSharedTable();
        this.promoCodeModal = new AdminPromoCodeModal(this);
        this.summaryRenderer = new AdminSummaryRenderer();
        this.imageManager = new AdminImageManager(this);
        this.packageManager = null; // Will be set by AdminDashboardManager
        this.eventHandler = new AdminEventHandler(this);
        this.systemSettingsManager = new SystemSettingsManager();
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

    init() {

        // Initialize shared table
        this.sharedTable.init();

    }

    renderDashboard(snapshotData) {
        const dashboardElement = document.querySelector(this.selectors.dashboard);

        if (!dashboardElement) {
            console.error('❌ ADMIN-UI: Dashboard container not found');

            return;
        }

        try {
            dashboardElement.innerHTML = this.summaryRenderer.generateDashboardHTML();

            // Check if router has a specific tab to show
            const currentTab = window.adminRouter ? window.adminRouter.getCurrentTab() : 'summary';

            // Render the appropriate tab based on router state
            if (currentTab === 'summary') {
                this.renderSummaryTab(snapshotData);
            } else {
                // Render summary tab first (for data), then switch to the correct tab
                this.renderSummaryTab(snapshotData);
                // The router will handle switching to the correct tab
            }

            // Setup tab event listeners
            this.setupTabEventListeners();
        } catch (error) {
            console.error('❌ ADMIN-UI: Failed to render dashboard:', error);
            dashboardElement.innerHTML = '<div class="error-message">Failed to load dashboard. Please refresh the page.</div>';
        }
    }


    renderSummaryTab(snapshotData) {
        const summaryTab = document.getElementById('summary-tab');

        if (!summaryTab) {
            console.error('❌ ADMIN-UI: Summary tab not found');

            return;
        }

        if (!snapshotData) {
            console.warn('⚠️ ADMIN-UI: No snapshot data available, showing loading state');
            summaryTab.innerHTML = '<div class="loading-placeholder">Loading site snapshot...</div>';

            return;
        }

        try {
            summaryTab.innerHTML = this.summaryRenderer.generateSummaryTabHTML(snapshotData);

            // Initialize system settings manager after rendering
            if (this.systemSettingsManager) {
                this.systemSettingsManager.init();
            }

            // Initialize queue management UI
            if (this.summaryRenderer && this.summaryRenderer.initQueueManagement) {
                this.summaryRenderer.initQueueManagement();
            }

            // Setup queue event listeners
            if (this.eventHandler) {
                this.eventHandler.setupQueueEventListeners();
            }

            // Update queue display if data is available
            if (snapshotData?.queue) {
                this.updateQueueDisplay(snapshotData.queue);
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Failed to render summary tab:', error);
            summaryTab.innerHTML = '<div class="error-message">Failed to load summary data.</div>';
        }
    }


    renderHistoryTab(historyType, historyData) {
        const tabElement = document.getElementById(`${historyType}-tab`);

        if (!tabElement) {
            console.error(`❌ ADMIN-UI: ${historyType} tab not found`);

            return;
        }

        if (!historyData) {
            tabElement.innerHTML = '<div class="loading-placeholder">Loading history data...</div>';

            return;
        }

        try {
            // Generate table using the new shared table component
            const tableContainer = document.createElement('div');

            tabElement.innerHTML = '';
            tabElement.appendChild(tableContainer);

            this.sharedTable.render(historyType, historyData, tableContainer);
        } catch (error) {
            console.error(`❌ ADMIN-UI: Failed to render ${historyType} tab:`, error);
            tabElement.innerHTML = `<div class="error-message">Failed to load ${historyType} data.</div>`;
        }
    }


    setupTabEventListeners() {
        // Tab switching
        const tabButtons = document.querySelectorAll('.tab-btn');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.dataset.tab;

                this.switchTab(tabName);
            });
        });

        // Refresh button
        const refreshButton = document.getElementById('refresh-snapshot');

        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                window.dispatchEvent(new CustomEvent('admin-refresh-snapshot'));
            });
        }
    }

    switchTab(tabName) {
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

        // Emit tab switch event using AdminEventBus
        if (window.adminApp?.eventBus) {
            window.adminApp.eventBus.emit('tab-switch', 'switch', { tab: tabName });
        }

        // Always emit DOM event as well for router compatibility
        window.dispatchEvent(new CustomEvent('admin-tab-switch', {
            detail: { tab: tabName }
        }));
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Create standard tab section HTML with standardized header
     */
    createTabSectionHTML(title, icon, addButtonId, containerId) {
        const [addButtonText] = title.split(' ');

        return `
            <div class="admin-section">
                <div class="admin-section-header">
                    <div class="admin-header-actions">
                        <button id="${addButtonId}" class="admin-add-button"
                            title="Add new ${addButtonText.toLowerCase()}">
                            <i class="fas fa-plus"></i>
                            <span>Add ${addButtonText}</span>
                        </button>
                    </div>
                </div>
                <div id="${containerId}" class="table-container">
                    <div class="loading">Loading ${title.toLowerCase()}...</div>
                </div>
            </div>
        `;
    }

    /**
     * Handle tab rendering errors consistently
     */
    handleTabRenderError(tabElement, tabName, error) {
        console.error(`❌ ADMIN-UI: Failed to render ${tabName} tab:`, error);
        tabElement.innerHTML = `<div class="error-message">Failed to load ${tabName}. Please refresh the page.</div>`;
    }

    /**
     * Validate tab element exists
     */
    validateTabElement(tabId, tabName) {
        const tabElement = document.getElementById(tabId);

        if (!tabElement) {
            console.error(`❌ ADMIN-UI: ${tabName} tab not found`);

            return null;
        }

        return tabElement;
    }


    async renderPackagesTab() {
        const packagesTab = this.validateTabElement('packages-tab', 'Packages');

        if (!packagesTab) {
            return;
        }

        try {
            // Use simplified HTML without add button - AdminPackageManager will handle the button via shared table
            packagesTab.innerHTML = `
                <div class="admin-section">
                    <div id="packages-table-container" class="table-container">
                        <div class="loading">Loading packages...</div>
                    </div>
                </div>
            `;
            await this.initializePackagesTab();
        } catch (error) {
            this.handleTabRenderError(packagesTab, 'packages', error);
        }
    }

    /**
     * Initialize packages tab functionality
     */
    async initializePackagesTab() {
        if (window.adminApp?.packageHandler) {
            await window.adminApp.packageHandler.loadPackages();
        }
    }

    async renderProvidersTab() {
        const providersTab = this.validateTabElement('models-tab', 'Models');

        if (!providersTab) {
            return;
        }

        try {
            // Use simplified HTML - shared table will handle the button
            providersTab.innerHTML = `
                <div class="admin-section">
                    <div id="models-table-container" class="table-container">
                        <div class="loading">Loading models...</div>
                    </div>
                </div>
            `;
            await this.initializeProvidersTab();
        } catch (error) {
            this.handleTabRenderError(providersTab, 'models', error);
        }
    }

    /**
     * Initialize providers tab functionality (fallback method)
     */
    async initializeProvidersTab() {
        await this.loadModelsData();
        this.eventHandler.setupModelsEventListeners();
    }

    async renderPromoCardsTab() {
        const promoCardsTab = this.validateTabElement('promo-cards-tab', 'Promo Cards');

        if (!promoCardsTab) {
            return;
        }

        try {
            promoCardsTab.innerHTML = this.createTabSectionHTML('Promo Cards Management', 'fas fa-ticket-alt', 'add-promo-card-btn', 'promo-cards-table-container');
            await this.initializePromoCardsTab();
        } catch (error) {
            this.handleTabRenderError(promoCardsTab, 'promo cards', error);
        }
    }

    /**
     * Initialize promo cards tab functionality
     */
    async initializePromoCardsTab() {
        await this.loadPromoCardsData();
        this.eventHandler.setupPromoCardsEventListeners();
    }

    async renderTermsTab() {
        const termsTab = document.getElementById('terms-tab');

        if (!termsTab) {
            console.error('❌ ADMIN-UI: Terms tab not found');

            return;
        }

        try {
            // Initialize terms manager if not already done
            if (!this.termsManager) {
                // eslint-disable-next-line no-undef
                this.termsManager = new AdminTermsManager(this);
                this.termsManager.init();

                // Set global instance for onclick handlers
                window.adminTermsManager = this.termsManager;
            }

            // Render the terms tab
            await this.termsManager.renderTermsTab();
        } catch (error) {
            console.error('❌ ADMIN-UI: Failed to render terms tab:', error);
            termsTab.innerHTML = '<div class="error-message">Failed to load terms. Please refresh the page.</div>';
        }
    }

    async renderMessagesTab() {
        const messagesTab = this.validateTabElement('messages-tab', 'Messages');

        if (!messagesTab) {
            return;
        }

        try {
            messagesTab.innerHTML = this.createMessagesTabHTML();
            this.initializeAdminMessaging();
        } catch (error) {
            this.handleTabRenderError(messagesTab, 'messages', error);
        }
    }

    /**
     * Create messages tab HTML structure
     */
    createMessagesTabHTML() {
        return `
            <div class="admin-section">
                <div class="admin-section-header">
                    <div class="admin-header-actions">
                        <button id="refresh-messages-btn" class="btn btn-outline">
                            <i class="fas fa-refresh"></i> Refresh
                        </button>
                    </div>
                </div>
                <div class="admin-messaging-container">
                    ${this.createConversationsListHTML()}
                    ${this.createConversationDetailHTML()}
                </div>
            </div>
        `;
    }

    /**
     * Create conversations list HTML
     */
    createConversationsListHTML() {
        return `
            <div class="conversations-list">
                <div class="conversations-header">
                    <h4>Conversations</h4>
                    <span id="total-unread-count" class="unread-badge" style="display: none;">0</span>
                </div>
                <div id="conversations-container">
                    <div class="loading-placeholder">
                        <div class="loading-spinner"></div>
                        <p>Loading conversations...</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Create conversation detail HTML
     */
    createConversationDetailHTML() {
        return `
            <div class="conversation-detail">
                <div class="conversation-header-detail">
                    <div class="selected-user-info">
                        <h4 id="selected-user-name">Select a conversation</h4>
                        <p id="selected-user-email"></p>
                    </div>
                    <div class="conversation-actions-header">
                        <button id="mark-all-read-btn" class="btn btn-outline" style="display: none;">
                            <i class="fas fa-check-double"></i> Mark All Read
                        </button>
                    </div>
                </div>
                <div class="conversation-messages" id="conversation-messages">
                    <div class="no-conversation-selected">
                        <i class="fas fa-comments"></i>
                        <h3>No conversation selected</h3>
                        <p>Select a conversation from the list to view messages.</p>
                    </div>
                </div>
                <div class="conversation-actions" id="conversation-actions" style="display: none;">
                    <form id="admin-reply-form" class="reply-form">
                        <textarea
                            id="admin-reply-input"
                            placeholder="Type your reply..."
                            rows="2"
                            maxlength="5000"
                            required
                        ></textarea>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Reply
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    /**
     * Initialize admin messaging component
     */
    initializeAdminMessaging() {
        if (window.AdminMessaging) {
            try {
                window.adminMessaging = new window.AdminMessaging();
            } catch (error) {
                console.error('❌ ADMIN-UI: Failed to initialize AdminMessaging:', error);
            }
        } else {
            console.warn('⚠️ ADMIN-UI: AdminMessaging component not available');
            this.retryAdminMessagingInit();
        }
    }

    /**
     * Retry admin messaging initialization
     */
    retryAdminMessagingInit() {
        setTimeout(() => {
            if (window.AdminMessaging) {
                try {
                    window.adminMessaging = new window.AdminMessaging();
                } catch (error) {
                    console.error('❌ ADMIN-UI: Failed to initialize AdminMessaging on retry:', error);
                }
            }
        }, 100);
    }

    async loadModelsData() {
        try {
            const response = await fetch('/api/providers/models/all');
            const data = await response.json();

            if (data.success) {
                // Use shared table system for models
                const tableContainer = document.getElementById('models-table-container');

                if (tableContainer && this.sharedTable) {
                    this.sharedTable.render('models', data.data.models, tableContainer, {
                        addButton: {
                            action: 'create-model',
                            text: 'Add Model',
                            title: 'Add a new AI model'
                        }
                    });
                } else {
                    console.error('❌ ADMIN-UI: Models table container or shared table not available');
                }
            } else {
                throw new Error(data.error || 'Failed to load models');
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Error loading models:', error);
            const container = document.getElementById('models-table-container');

            if (container) {
                container.innerHTML = `<div class="error-message">Failed to load models: ${error.message}</div>`;
            }
        }
    }

    async loadPromoCardsData() {
        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-UI: No valid token for promo codes request, skipping');

                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch('/api/admin/promo-codes', {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await response.json();

            if (data.success) {
                // Use shared table system for promo cards
                const tableContainer = document.getElementById('promo-cards-table-container');

                if (tableContainer && this.sharedTable) {
                    this.sharedTable.render('promo-cards', data.data.items || [], tableContainer);
                } else {
                    console.error('❌ ADMIN-UI: Promo cards table container or shared table not available');
                }
            } else {
                throw new Error(data.error || 'Failed to load promo cards');
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Error loading promo cards:', error);
            const container = document.getElementById('promo-cards-table-container');

            if (container) {
                container.innerHTML = `<div class="error-message">Failed to load promo cards: ${error.message}</div>`;
            }
        }
    }

    async loadProvidersData() {
        try {
            const response = await fetch('/api/providers?includeModels=true');
            const data = await response.json();

            if (data.success) {
                // Use shared table system for providers
                const tableContainer = document.getElementById('providers-table-container');

                if (tableContainer && this.sharedTable) {
                    this.sharedTable.render('providers', data.data.providers, tableContainer, {
                        addButton: {
                            action: 'create-provider',
                            text: 'Add Provider',
                            title: 'Add a new AI provider'
                        }
                    });
                } else {
                    console.error('❌ ADMIN-UI: Providers table container or shared table not available');
                }
            } else {
                throw new Error(data.error || 'Failed to load providers');
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Error loading providers:', error);
            const container = document.getElementById('providers-table-container');

            if (container) {
                container.innerHTML = `<div class="error-message">Failed to load providers: ${error.message}</div>`;
            }
        }
    }


    showPackageModal(packageId = null) {
        if (this.packageManager) {
            this.packageManager.showModal(packageId);
        } else {
            console.warn('⚠️ ADMIN-UI: Package manager not available');
            this.showNotification('Package management not available', 'warning');
        }
    }

    showProviderModal(providerId = null) {
        console.warn('⚠️ ADMIN-UI: Provider modal not implemented yet');
        this.showNotification('Provider management coming soon', 'info');
    }

    async showModelModal(modelId = null) {
        try {
            // Fetch model data if editing
            let modelData = null;

            if (modelId) {
                // Fetch all models and find the one we need (no single model endpoint)
                const response = await fetch('/api/providers/models/all', {
                    headers: window.AdminAuthUtils.getAuthHeaders()
                });
                const result = await response.json();

                if (!result.success) {
                    throw new Error(result.error || 'Failed to load model data');
                }
                modelData = result.data.models.find(m => m.id === parseInt(modelId));
                if (!modelData) {
                    throw new Error('Model not found');
                }
            }

            // Fetch providers for dropdown
            const providersResponse = await fetch('/api/providers/all', {
                headers: window.AdminAuthUtils.getAuthHeaders()
            });
            const providersData = await providersResponse.json();
            const providers = providersData.success ? providersData.data : [];

            this.showModelForm(modelId ? 'Edit Model' : 'Add Model', modelData, providers);
        } catch (error) {
            console.error('❌ ADMIN-UI: Error showing model modal:', error);
            this.showNotification(`Failed to open model form: ${error.message}`, 'danger');
        }
    }

    showModelForm(title, modelData, providers) {
        const modalHtml = `
            <div class="modal fade" id="model-modal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="model-form">
                                <input type="hidden" id="model-id" value="${modelData?.id || ''}">

                                <div class="mb-3">
                                    <label for="model-display-name" class="form-label">Display Name *</label>
                                    <input type="text" class="form-control" id="model-display-name"
                                           value="${modelData?.displayName || ''}" required>
                                    <small class="form-text text-muted">User-friendly name shown in UI</small>
                                </div>

                                <div class="mb-3">
                                    <label for="model-provider" class="form-label">Provider *</label>
                                    <select class="form-control" id="model-provider" required>
                                        <option value="">Select Provider</option>
                                        ${providers.map(p => `
                                            <option value="${p.name}" ${modelData?.provider === p.name ? 'selected' : ''}>
                                                ${p.name}
                                            </option>
                                        `).join('')}
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="model-name" class="form-label">API Model Name *</label>
                                    <input type="text" class="form-control" id="model-name"
                                           value="${modelData?.name || ''}" required>
                                    <small class="form-text text-muted">The exact model name used in API calls</small>
                                </div>

                                <div class="mb-3">
                                    <label for="model-description" class="form-label">Description</label>
                                    <textarea class="form-control" id="model-description" rows="3">${modelData?.description || ''}</textarea>
                                </div>

                                <div class="mb-3">
                                    <label for="model-cost" class="form-label">Cost Per Image</label>
                                    <input type="number" class="form-control" id="model-cost"
                                           value="${modelData?.costPerImage || 1}" min="0" step="0.1">
                                </div>

                                <div class="mb-3">
                                    <div class="form-check">
                                        <input type="checkbox" class="form-check-input" id="model-active"
                                               ${modelData?.isActive !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="model-active">Active</label>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="save-model-btn">Save Model</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('model-modal');

        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modalElement = document.getElementById('model-modal');
        const modal = new bootstrap.Modal(modalElement);

        modal.show();

        // Setup save button
        document.getElementById('save-model-btn').addEventListener('click', async () => {
            await this.saveModel();
            modal.hide();
        });

        // Cleanup on hide
        modalElement.addEventListener('hidden.bs.modal', () => {
            modalElement.remove();
        });
    }

    async saveModel() {
        try {
            const modelId = document.getElementById('model-id').value;
            const formData = {
                displayName: document.getElementById('model-display-name').value,
                provider: document.getElementById('model-provider').value,
                name: document.getElementById('model-name').value,
                description: document.getElementById('model-description').value,
                costPerImage: parseFloat(document.getElementById('model-cost').value) || 1,
                isActive: document.getElementById('model-active').checked
            };

            // Validate
            if (!formData.displayName || !formData.provider || !formData.name) {
                this.showNotification('Please fill in all required fields', 'warning');

                return;
            }

            const url = modelId ? `/api/providers/models/${modelId}` : '/api/providers/models';
            const method = modelId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    ...window.AdminAuthUtils.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || result.message || 'Failed to save model');
            }

            this.showNotification(
                modelId ? 'Model updated successfully' : 'Model created successfully',
                'success'
            );

            // Reload models table
            await this.loadModelsData();
        } catch (error) {
            console.error('❌ ADMIN-UI: Error saving model:', error);
            this.showNotification(`Failed to save model: ${error.message}`, 'danger');
        }
    }

    async deleteModel(modelId) {
        const confirmed = window.confirm(
            'Are you sure you want to delete this model? This action cannot be undone.'
        );

        if (!confirmed) {
            return;
        }

        try {
            // Check authentication
            if (!window.AdminAuthUtils?.hasValidToken()) {
                throw new Error('Authentication required');
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/providers/models/${modelId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.showNotification('Model deleted successfully', 'success');
                // Reload the models table
                await this.loadModelsData();
            } else {
                throw new Error(data.error || 'Failed to delete model');
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Error deleting model:', error);
            this.showNotification(`Failed to delete model: ${error.message}`, 'danger');
        }
    }

    showPromoCardModal(promoCardId = null) {

        if (this.promoCodeModal && this.promoCodeModal.show) {
            this.promoCodeModal.show(promoCardId);
        } else {
            console.error('🎭 ADMIN-UI: promoCodeModal or show method not available');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');

        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        notification.innerHTML = `
            ${message}
            <button type="button" class="close" data-dismiss="alert">
                <span>&times;</span>
            </button>
        `;

        // Add to DOM
        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }


    /**
     * Update queue display with new data
     * @param {Object} queueData - Queue status data
     */
    updateQueueDisplay(queueData) {
        try {
            if (this.summaryRenderer && this.summaryRenderer.updateSummaryQueueStatus) {
                this.summaryRenderer.updateSummaryQueueStatus(queueData);
            } else {
                console.warn('⚠️ ADMIN-UI: Summary renderer not available for queue update');
            }
        } catch (error) {
            console.error('❌ ADMIN-UI: Failed to update queue display:', error);
        }
    }

    destroy() {
        if (this.sharedTable?.destroy) {
            this.sharedTable.destroy();
        }
        if (this.promoCodeModal?.destroy) {
            this.promoCodeModal.destroy();
        }
        if (this.imageManager?.destroy) {
            this.imageManager.destroy();
        }
        if (this.packageManager?.destroy) {
            this.packageManager.destroy();
        }
        if (this.eventHandler?.destroy) {
            this.eventHandler.destroy();
        }
        if (this.termsManager?.destroy) {
            this.termsManager.destroy();
            window.adminTermsManager = null;
        }
    }

    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        if (!timestamp) {
            return 'Unknown';
        }

        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Just now';
        }

        if (diffMins < 60) {
            return `${diffMins}m ago`;
        }

        if (diffHours < 24) {
            return `${diffHours}h ago`;
        }

        if (diffDays < 7) {
            return `${diffDays}d ago`;
        }

        return date.toLocaleDateString();
    }

    /**
     * Truncate text to specified length
     */
    truncateText(text, maxLength) {
        if (!text) {
            return '';
        }

        if (text.length <= maxLength) {
            return text;
        }

        return `${text.substring(0, maxLength)}...`;
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (!text) {
            return '';
        }
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }
}

// Export for global access
window.AdminUIRenderer = AdminUIRenderer;
