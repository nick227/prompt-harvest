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

        // Listen for table action events from shared table
        window.addEventListener('admin-table-action', e => {
            const { dataType, action, id } = e.detail;

            if (dataType === 'packages') {
                this.handlePackageAction(action, id);
            } else if (dataType === 'images') {
                this.handleImageAction(action, id);
            }
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
        // Add promo card button
        const addPromoCardBtn = document.getElementById('add-promo-card-btn');

        if (addPromoCardBtn) {
            addPromoCardBtn.addEventListener('click', () => {
                this.uiRenderer.showPromoCardModal();
            });
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

    destroy() {
        // Clean up any event listeners or resources
        console.log('🗑️ ADMIN-EVENT: Event handler destroyed');
    }
}

// Export for global access
window.AdminEventHandler = AdminEventHandler;
