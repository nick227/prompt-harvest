/**
 * Admin Event Handler - Handles all event listeners and action dispatching
 * Single Responsibility: Manage event listeners and dispatch actions to appropriate handlers
 */

class AdminEventHandler {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
    }

    setupPackagesEventListeners() {
        // Add package button (now handled by standardized header)
        // The add button is now created by the shared table component with data-action="create-package"
        // Event handling is done in AdminPackageManager.js

        // Listen for table action events from shared table (only for images, not packages)
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'images') {
                this.handleImageAction(action, id);
            }
            // Note: Package actions are handled by AdminPackageManager.js
        });
    }

    setupProvidersEventListeners() {
        // Add provider button
        const addProviderBtn = document.getElementById('add-provider-btn');

        if (addProviderBtn) {
            addProviderBtn.addEventListener('click', () => {
                this.uiRenderer.showProviderModal();
            });
        }

        // Add model button
        const addModelBtn = document.getElementById('add-model-btn');

        if (addModelBtn) {
            addModelBtn.addEventListener('click', () => {
                this.uiRenderer.showModelModal();
            });
        }

        // Listen for table action events from shared table
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'providers') {
                this.handleProviderAction(action, id);
            }
        });
    }

    setupModelsEventListeners() {
        // Add model button
        const addModelBtn = document.getElementById('add-model-btn');

        if (addModelBtn) {
            addModelBtn.addEventListener('click', () => {
                this.uiRenderer.showModelModal();
            });
        }

        // Listen for table action events from shared table
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'models') {
                this.handleModelAction(action, id);
            }
        });
    }

    setupPromoCardsEventListeners() {
        console.log('🎭 ADMIN-EVENT: Setting up promo cards event listeners...');

        // Add promo card button
        const addPromoCardBtn = document.getElementById('add-promo-card-btn');
        console.log('🎭 ADMIN-EVENT: Add promo card button found:', !!addPromoCardBtn);

        if (addPromoCardBtn) {
            addPromoCardBtn.addEventListener('click', () => {
                console.log('🎭 ADMIN-EVENT: Add promo card button clicked');
                console.log('🎭 ADMIN-EVENT: uiRenderer available:', !!this.uiRenderer);
                console.log('🎭 ADMIN-EVENT: showPromoCardModal method available:', !!(this.uiRenderer && this.uiRenderer.showPromoCardModal));

                if (this.uiRenderer && this.uiRenderer.showPromoCardModal) {
                    this.uiRenderer.showPromoCardModal();
                } else {
                    console.error('🎭 ADMIN-EVENT: uiRenderer or showPromoCardModal method not available');
                }
            });
            console.log('🎭 ADMIN-EVENT: Event listener added to add promo card button');
        } else {
            console.warn('🎭 ADMIN-EVENT: Add promo card button not found in DOM');
        }

        // Listen for table action events from shared table
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'promo-cards') {
                this.handlePromoCardAction(action, id);
            }
        });
    }

    handlePackageAction(action, id) {
        // Use the package handler if available
        if (window.adminApp && window.adminApp.packageHandler) {
            switch (action) {
                case 'view':
                case 'edit':
                    // Find the package data and show edit form
                    const packageData = window.adminApp.packageHandler.currentPackages?.find(pkg => pkg.id === id);

                    if (packageData) {
                        window.adminApp.packageHandler.showEditPackageForm(packageData);
                    }
                    break;
                case 'delete':
                    // Find the package data and show delete confirmation
                    const deleteData = window.adminApp.packageHandler.currentPackages?.find(pkg => pkg.id === id);

                    if (deleteData) {
                        window.adminApp.packageHandler.showDeletePackageConfirmation(deleteData);
                    }
                    break;
                case 'activate':
                    this.uiRenderer.packageManager.activatePackage(id);
                    break;
                case 'deactivate':
                    this.uiRenderer.packageManager.deactivatePackage(id);
                    break;
            }
        }
    }

    handleProviderAction(action, id) {
        switch (action) {
            case 'view':
                this.uiRenderer.showProviderModal(id);
                break;
            case 'edit':
                this.uiRenderer.showProviderModal(id);
                break;
            case 'delete':
                this.uiRenderer.packageManager.deleteProvider(id);
                break;
            case 'configure':
                this.uiRenderer.packageManager.configureProvider(id);
                break;
            case 'test':
                this.uiRenderer.packageManager.testProvider(id);
                break;
            case 'disable':
                this.uiRenderer.packageManager.disableProvider(id);
                break;
        }
    }

    handleModelAction(action, id) {
        switch (action) {
            case 'view':
                this.uiRenderer.showModelModal(id);
                break;
            case 'edit':
                this.uiRenderer.showModelModal(id);
                break;
            case 'delete':
                this.uiRenderer.deleteModel(id);
                break;
            default:
                console.warn(`Unknown model action: ${action}`);
        }
    }

    handlePromoCardAction(action, id) {
        switch (action) {
            case 'view':
                this.uiRenderer.promoCodeModal.show(id);
                break;
            case 'edit':
                this.uiRenderer.promoCodeModal.show(id);
                break;
            case 'activate':
                this.uiRenderer.promoCodeModal.activate(id);
                break;
            case 'deactivate':
                this.uiRenderer.promoCodeModal.deactivate(id);
                break;
            case 'delete':
                // Dispatch to admin dashboard manager for proper handling
                if (window.adminApp && window.adminApp.eventBus) {
                    window.adminApp.eventBus.emit('table-action', {
                        historyType: 'promo-cards',
                        action: 'delete',
                        id: id
                    });
                } else {
                    // Fallback to modal handling
                    this.uiRenderer.promoCodeModal.delete(id);
                }
                break;
            default:
                console.warn(`Unknown promo card action: ${action}`);
        }
    }

    handleImageAction(action, id) {
        // For images, we only handle UI-specific actions directly
        // Data operations are handled by admin-dashboard-manager through admin-history-manager
        switch (action) {
            case 'view':
                this.uiRenderer.imageManager.viewImage(id);
                break;
            case 'edit_tags':
                this.uiRenderer.imageManager.editImageTags(id);
                break;
            case 'moderate':
                this.uiRenderer.imageManager.moderateImage(id);
                break;
            // All other actions (toggle_visibility, generate_tags, admin_hide, admin_show, delete)
            // are handled by admin-dashboard-manager through admin-history-manager
        }
    }

    setupQueueEventListeners() {
        // Refresh queue status button
        const refreshQueueBtn = document.getElementById('refresh-queue-status');
        if (refreshQueueBtn) {
            refreshQueueBtn.addEventListener('click', async () => {
                if (window.adminDashboardManager) {
                    try {
                        // Show loading state
                        const originalText = refreshQueueBtn.innerHTML;
                        refreshQueueBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing...';
                        refreshQueueBtn.disabled = true;

                        await window.adminDashboardManager.loadQueueStatus();
                        console.log('✅ Queue status refreshed successfully');

                        // Restore button state
                        refreshQueueBtn.innerHTML = originalText;
                        refreshQueueBtn.disabled = false;
                    } catch (error) {
                        console.error('❌ Failed to refresh queue status:', error);

                        // Restore button state on error
                        refreshQueueBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Queue';
                        refreshQueueBtn.disabled = false;

                        if (window.adminModal) {
                            window.adminModal.showNotification('Failed to refresh queue status', 'error');
                        }
                    }
                }
            });
        }

        // Clear queue button
        const clearQueueBtn = document.getElementById('clear-queue-btn');
        if (clearQueueBtn) {
            clearQueueBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to clear the entire queue? This action cannot be undone.')) {
                    try {
                        if (window.adminDashboardManager && window.adminDashboardManager.queueService) {
                            const result = await window.adminDashboardManager.queueService.clearQueue();
                            console.log('✅ Queue cleared:', result);

                            // Refresh queue status after clearing
                            await window.adminDashboardManager.loadQueueStatus();

                            // Show success message
                            if (window.adminModal) {
                                window.adminModal.showNotification('Queue cleared successfully', 'success');
                            }
                        }
                    } catch (error) {
                        console.error('❌ Failed to clear queue:', error);
                        if (window.adminModal) {
                            window.adminModal.showNotification('Failed to clear queue: ' + error.message, 'error');
                        }
                    }
                }
            });
        }
    }

    destroy() {
        // Clean up any event listeners or resources
        console.log('🗑️ ADMIN-EVENT: Event handler destroyed');
    }
}

// Export for global access
window.AdminEventHandler = AdminEventHandler;
