/**
 * Admin Promo Cards Manager
 * Handles promo card management operations in the admin dashboard
 * Single Responsibility: Manage promo card operations (CRUD, delete, etc.)
 */

class AdminPromoCardsManager {
    constructor(uiRenderer = null, eventBus = null) {
        this.uiRenderer = uiRenderer;
        this.eventBus = eventBus;
        this.apiBaseUrl = '/api/admin';
        this.currentPromoCards = [];
        this.isLoading = false;
        this.sharedTable = new AdminSharedTable();
        this.eventBusListenerSet = false; // Track if AdminEventBus listeners are set up
    }

    /**
     * Initialize promo cards handler
     */
    async init() {
        // Check authentication before initializing
        if (!window.AdminAuthUtils?.hasValidToken()) {
            return;
        }

        // Initialize shared table
        this.sharedTable.init();

        // Setup event listeners
        this.setupEventListeners();

        // Load initial promo cards data
        await this.loadPromoCardsData();

    }

    /**
     * Setup event listeners for promo card management
     */
    setupEventListeners() {
        // Listen for admin table actions using AdminEventBus
        if (this.eventBus && !this.eventBusListenerSet) {
            this.eventBusListenerSet = true; // Prevent duplicate registrations

            // Listen for delete actions
            this.eventBus.on('table-action', 'delete', eventData => {
                if (eventData.dataType === 'promo-cards') {

                    // Safety check: ensure currentPromoCards is an array
                    if (!Array.isArray(this.currentPromoCards)) {
                        console.error('🎫 ADMIN-PROMO-CARDS: currentPromoCards is not an array:', typeof this.currentPromoCards);
                        this.loadPromoCardsData().then(() => {
                            const promoCardData = this.currentPromoCards.find(promo => promo.id === eventData.id);

                            if (promoCardData) {
                                this.showDeletePromoCardConfirmation(promoCardData);
                            } else {
                                console.error('🎫 ADMIN-PROMO-CARDS: Promo card not found for delete action:', eventData.id);
                            }
                        });

                        return;
                    }

                    const promoCardData = this.currentPromoCards.find(promo => promo.id === eventData.id);

                    if (promoCardData) {
                        this.showDeletePromoCardConfirmation(promoCardData);
                    } else {
                        console.error('🎫 ADMIN-PROMO-CARDS: Promo card not found for delete action:', eventData.id);
                    }
                }
                // Unhandled action - ignore
            });

            // Debug: Check what listeners are registered
        } else if (this.eventBusListenerSet) {
            console.log('🎫 ADMIN-PROMO-CARDS: Event bus listeners already set');
        }

        // Fallback: Listen for old DOM events
        document.addEventListener('admin-table-action', event => {
            const detail = event?.detail || {};
            const { action, dataType, id } = detail;

            // Only handle promo-cards-related actions
            if (dataType !== 'promo-cards') {
                return;
            }

            switch (action) {
                case 'delete': {

                    // Safety check: ensure currentPromoCards is an array
                    if (!Array.isArray(this.currentPromoCards)) {
                        console.error('🎫 ADMIN-PROMO-CARDS: currentPromoCards is not an array in fallback:', typeof this.currentPromoCards);
                        this.loadPromoCardsData().then(() => {
                            const promoCardData = this.currentPromoCards.find(promo => promo.id === id);

                            if (promoCardData) {
                                this.showDeletePromoCardConfirmation(promoCardData);
                            } else {
                                console.error('🎫 ADMIN-PROMO-CARDS: Promo card not found for delete action:', id);
                            }
                        });

                        return;
                    }

                    // Find the promo card data by ID
                    const promoCardData = this.currentPromoCards.find(promo => promo.id === id);

                    if (promoCardData) {
                        this.showDeletePromoCardConfirmation(promoCardData);
                    } else {
                        console.error('🎫 ADMIN-PROMO-CARDS: Promo card not found for delete action:', id);
                    }
                    break;
                }
            }
        });
    }

    /**
     * Load promo cards data from API (without rendering table)
     */
    async loadPromoCardsData() {
        try {
            this.isLoading = true;


            // Check authentication first
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PROMO-CARDS: No valid token available, skipping promo cards load');
                this.isLoading = false;

                return;
            }

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                const result = await window.adminApiService.request('GET', '/promo-codes');


                if (result.success) {
                    // Extract the actual array from result.data.items
                    this.currentPromoCards = result.data.items || [];
                } else {
                    throw new Error(result.message || 'Failed to load promo cards');
                }
            } else {
                // Fallback to direct fetch with auth headers

                const headers = window.AdminAuthUtils.getAuthHeaders();

                const response = await fetch('/api/admin/promo-codes', {
                    method: 'GET',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    // Extract the actual array from result.data.items
                    this.currentPromoCards = result.data.items || [];
                } else {
                    throw new Error(result.message || 'Failed to load promo cards');
                }
            }
        } catch (error) {
            console.error('❌ ADMIN-PROMO-CARDS: Error loading promo cards data:', error);
            this.currentPromoCards = [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show delete promo card confirmation
     */
    showDeletePromoCardConfirmation(promoCardData) {
        const confirmMessage = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Promo Card</h3>
                <p class="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete the promo card "${promoCardData.code}"? This action cannot be undone.
                </p>
                <div class="flex justify-center space-x-3">
                    <button type="button" id="cancel-delete-promo-card"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                        Cancel
                    </button>
                    <button type="button" id="confirm-delete-promo-card" data-promo-card-id="${promoCardData.id}"
                            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
                        Delete Promo Card
                    </button>
                </div>
            </div>
        `;

        if (window.showModal) {
            window.showModal('Confirm Delete', confirmMessage);
        } else {
            this.createModal('Confirm Delete', confirmMessage);
        }

        // Setup delete confirmation event listeners
        document.getElementById('cancel-delete-promo-card').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('confirm-delete-promo-card').addEventListener('click', async e => {
            const { promoCardId } = e.target.dataset;

            await this.deletePromoCard(promoCardId);
        });
    }

    /**
     * Delete promo card
     */
    async deletePromoCard(promoCardId) {
        try {
            this.isLoading = true;

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                const result = await window.adminApiService.delete(`/promo-codes/${promoCardId}`);

                if (result.success) {
                    this.showSuccess('Promo card deleted successfully!');
                    this.hideModal();
                    // Use uiRenderer to reload and refresh the table display
                    if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                        await this.uiRenderer.loadPromoCardsData();
                    } else {
                        await this.loadPromoCardsData(); // Fallback to own method
                    }
                } else {
                    throw new Error(result.message || 'Failed to delete promo card');
                }
            } else {
                // Fallback to direct fetch with auth headers
                const headers = window.AdminAuthUtils.getAuthHeaders();

                const response = await fetch(`${this.apiBaseUrl}/promo-codes/${promoCardId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    this.showSuccess('Promo card deleted successfully!');
                    this.hideModal();
                    // Use uiRenderer to reload and refresh the table display
                    if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                        await this.uiRenderer.loadPromoCardsData();
                    } else {
                        await this.loadPromoCardsData(); // Fallback to own method
                    }
                } else {
                    throw new Error(result.message || 'Failed to delete promo card');
                }
            }

        } catch (error) {
            console.error('❌ ADMIN-PROMO-CARDS: Delete promo card failed:', error);
            this.showError(`Failed to delete promo card: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Create modal (fallback if window.showModal is not available)
     */
    createModal(title, content) {
        // Remove existing modal
        const existingModal = document.getElementById('admin-promo-card-modal');

        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');

        modal.id = 'admin-promo-card-modal';
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
                <div class="mt-3">
                    <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                        <button id="close-admin-promo-card-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-content">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add close handlers
        document.getElementById('close-admin-promo-card-modal').addEventListener('click', () => {
            this.hideModal();
        });

        modal.addEventListener('click', e => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    /**
     * Hide modal
     */
    hideModal() {
        const modal = document.getElementById('admin-promo-card-modal');

        if (modal) {
            modal.remove();
        }

        // Also try to hide the main admin modal
        if (window.hideModal) {
            window.hideModal();
        }
    }

    /**
     * Show success message
     */
    showSuccess(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            console.log('✅ SUCCESS:', message);
            window.alert(message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            console.error('❌ ERROR:', message);
            window.alert(message);
        }
    }

    destroy() {
        if (this.sharedTable) {
            this.sharedTable.destroy();
        }
    }
}

// Export for global access
window.AdminPromoCardsManager = AdminPromoCardsManager;

// Export for module access (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPromoCardsManager;
}
