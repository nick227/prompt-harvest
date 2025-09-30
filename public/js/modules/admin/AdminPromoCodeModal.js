/**
 * Admin Promo Code Modal - Handles promo code modal functionality
 * Single Responsibility: Manage promo code creation, editing, and actions
 */

class AdminPromoCodeModal {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
        this.selectors = {
            modal: '#admin-promo-modal',
            form: '#promo-code-form',
            cancelBtn: '#cancel-promo-code',
            saveBtn: '#save-promo-code',
            codeInput: '#promo-code',
            closeBtn: '#close-promo-modal'
        };
    }

    /**
     * Show promo code modal for create or edit
     * @param {string|null} promoCardId - ID for editing, null for creating
     */
    show(promoCardId = null) {
        console.log('🎭 ADMIN-PROMO-MODAL: show() called with promoCardId:', promoCardId);

        const isEdit = promoCardId !== null;
        const title = isEdit ? 'Edit Promo Code' : 'Add New Promo Code';

        const modalContent = this.generateForm(isEdit, promoCardId);

        console.log('🎭 ADMIN-PROMO-MODAL: Generated modal content, checking modal availability...');
        console.log('🎭 ADMIN-PROMO-MODAL: window.showModal available:', !!window.showModal);
        console.log('🎭 ADMIN-PROMO-MODAL: window.adminModal available:', !!window.adminModal);

        // Create modal using the admin modal system
        if (window.showModal) {
            console.log('🎭 ADMIN-PROMO-MODAL: Using window.showModal');
            window.showModal(title, modalContent, { size: 'lg' });
        } else if (window.adminModal) {
            console.log('🎭 ADMIN-PROMO-MODAL: Using window.adminModal directly');
            window.adminModal.show(title, modalContent, { size: 'lg' });
        } else {
            console.log('🎭 ADMIN-PROMO-MODAL: Using fallback modal creation');
            // Fallback: create modal manually
            this.createModal(title, modalContent);
        }

        // Setup form event listeners
        this.setupFormListeners(promoCardId);
    }

    /**
     * Generate promo code form HTML
     * @param {boolean} isEdit - Whether this is an edit form
     * @param {string|null} promoCardId - ID for editing
     * @returns {string} Form HTML
     */
    generateForm(isEdit, promoCardId) {
        return `
            <form id="promo-code-form" class="promo-code-form">
                <div class="form-group">
                    <label for="promo-code">Promo Code *</label>
                    <input
                        type="text"
                        id="promo-code"
                        name="code"
                        required
                        maxlength="50"
                        placeholder="e.g., WELCOME2024"
                        class="form-control"
                    >
                    <small class="form-text">Enter a unique promo code (uppercase letters and numbers recommended)</small>
                </div>

                <div class="form-group">
                    <label for="promo-credits">Credits *</label>
                    <input
                        type="number"
                        id="promo-credits"
                        name="credits"
                        required
                        min="1"
                        max="10000"
                        placeholder="100"
                        class="form-control"
                    >
                    <small class="form-text">Number of credits to grant when redeemed</small>
                </div>

                <div class="form-group">
                    <label for="promo-description">Description</label>
                    <textarea
                        id="promo-description"
                        name="description"
                        maxlength="255"
                        placeholder="Optional description for this promo code"
                        class="form-control"
                        rows="3"
                    ></textarea>
                    <small class="form-text">Optional description to help identify this promo code</small>
                </div>

                <div class="form-group">
                    <label for="promo-max-redemptions">Usage Limit</label>
                    <input
                        type="number"
                        id="promo-max-redemptions"
                        name="maxRedemptions"
                        min="1"
                        placeholder="Leave empty for unlimited"
                        class="form-control"
                    >
                    <small class="form-text">Maximum number of times this code can be redeemed (leave empty for unlimited)</small>
                </div>

                <div class="form-group">
                    <label for="promo-expires">Expiration Date</label>
                    <input
                        type="datetime-local"
                        id="promo-expires"
                        name="expiresAt"
                        class="form-control"
                    >
                    <small class="form-text">Optional expiration date and time</small>
                </div>

                <div class="form-group">
                    <div class="form-check">
                        <input
                            type="checkbox"
                            id="promo-active"
                            name="isActive"
                            class="form-check-input"
                            checked
                        >
                        <label for="promo-active" class="form-check-label">
                            Active
                        </label>
                    </div>
                    <small class="form-text">Inactive promo codes cannot be redeemed</small>
                </div>

                <div class="form-actions">
                    <button type="button" id="cancel-promo-code" class="btn btn-secondary">
                        Cancel
                    </button>
                    <button type="submit" id="save-promo-code" class="btn btn-primary">
                        ${isEdit ? 'Update Promo Code' : 'Create Promo Code'}
                    </button>
                </div>
            </form>
        `;
    }

    /**
     * Create modal manually (fallback)
     * @param {string} title - Modal title
     * @param {string} content - Modal content
     * @returns {HTMLElement} Modal element
     */
    createModal(title, content) {
        // Remove existing modal
        const existingModal = document.getElementById('admin-promo-modal');

        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');

        modal.id = 'admin-promo-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-button" id="close-promo-modal">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            </div>
        `;

        // Add event listeners
        const closeButton = modal.querySelector('.close-button');

        closeButton.addEventListener('click', () => {
            this.hide();
        });

        // Close on backdrop click
        modal.addEventListener('click', e => {
            if (e.target === modal) {
                this.hide();
            }
        });

        document.body.appendChild(modal);

        return modal;
    }

    /**
     * Hide promo code modal
     */
    hide() {
        const modal = document.getElementById('admin-promo-modal');

        if (modal) {
            modal.remove();
        }
    }

    /**
     * Setup form event listeners
     * @param {string|null} promoCardId - ID for editing
     */
    setupFormListeners(promoCardId) {
        const form = document.getElementById('promo-code-form');
        const cancelBtn = document.getElementById('cancel-promo-code');
        const saveBtn = document.getElementById('save-promo-code');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        if (form) {
            form.addEventListener('submit', async e => {
                e.preventDefault();
                await this.handleSubmit(promoCardId);
            });
        }

        // Auto-uppercase promo code input
        const codeInput = document.getElementById('promo-code');

        if (codeInput) {
            codeInput.addEventListener('input', e => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });

            // Add debugging for focus events
            codeInput.addEventListener('focus', e => {
                console.log('🎭 ADMIN-PROMO-MODAL: Input focused:', e.target.id);
                console.log('🎭 ADMIN-PROMO-MODAL: Modal still open:', window.adminModal?.isModalOpen());
            });

            codeInput.addEventListener('blur', e => {
                console.log('🎭 ADMIN-PROMO-MODAL: Input blurred:', e.target.id);
            });
        }

        // Load existing data if editing
        if (promoCardId) {
            this.loadForEdit(promoCardId);
        }
    }

    /**
     * Load promo code data for editing
     * @param {string} promoCardId - Promo code ID
     */
    async loadForEdit(promoCardId) {
        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PROMO: No valid token for promo code request, skipping');
                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/admin/promo-codes/${promoCardId}`, {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load promo code: ${response.statusText}`);
            }

            const promoCode = await response.json();

            // Populate form fields
            document.getElementById('promo-code').value = promoCode.code || '';
            document.getElementById('promo-credits').value = promoCode.credits || '';
            document.getElementById('promo-description').value = promoCode.description || '';
            document.getElementById('promo-max-redemptions').value = promoCode.maxRedemptions || '';
            document.getElementById('promo-active').checked = promoCode.isActive !== false;

            // Format expiration date for datetime-local input
            if (promoCode.expiresAt) {
                const expiresDate = new Date(promoCode.expiresAt);
                const localDateTime = new Date(expiresDate.getTime() - expiresDate.getTimezoneOffset() * 60000);

                document.getElementById('promo-expires').value = localDateTime.toISOString().slice(0, 16);
            }

        } catch (error) {
            console.error('❌ ADMIN-PROMO-MODAL: Error loading promo code for edit:', error);
            this.showNotification('Failed to load promo code data', 'error');
        }
    }

    /**
     * Handle form submission
     * @param {string|null} promoCardId - ID for editing
     */
    async handleSubmit(promoCardId) {
        const form = document.getElementById('promo-code-form');
        const formData = new FormData(form);

        // Validate form
        if (!this.validateForm(formData)) {
            return;
        }

        const saveBtn = document.getElementById('save-promo-code');
        const originalText = saveBtn.textContent;

        try {
            // Show loading state
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const promoData = {
                code: formData.get('code').trim().toUpperCase(),
                credits: parseInt(formData.get('credits')),
                description: formData.get('description').trim() || null,
                maxRedemptions: formData.get('maxRedemptions') ? parseInt(formData.get('maxRedemptions')) : null,
                expiresAt: formData.get('expiresAt') ? new Date(formData.get('expiresAt')).toISOString() : null,
                isActive: formData.get('isActive') === 'on'
            };

            const authToken = window.AdminAuthUtils.getAuthToken();
            const url = promoCardId ? `/api/admin/promo-codes/${promoCardId}` : '/api/admin/promo-codes';
            const method = promoCardId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(promoData)
            });

            if (!response.ok) {
                const errorData = await response.json();

                throw new Error(errorData.message || `Failed to ${promoCardId ? 'update' : 'create'} promo code`);
            }

            const result = await response.json();

            this.showNotification(
                `Promo code ${promoCardId ? 'updated' : 'created'} successfully!`,
                'success'
            );

            this.hide();

            // Refresh the promo cards table
            if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                await this.uiRenderer.loadPromoCardsData();
            }

        } catch (error) {
            console.error('❌ ADMIN-PROMO-MODAL: Error saving promo code:', error);
            this.showNotification(error.message || 'Failed to save promo code', 'error');
        } finally {
            // Restore button state
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    /**
     * Validate promo code form
     * @param {FormData} formData - Form data to validate
     * @returns {boolean} Whether form is valid
     */
    validateForm(formData) {
        const code = formData.get('code').trim();
        const credits = parseInt(formData.get('credits'));
        const maxRedemptions = formData.get('maxRedemptions') ? parseInt(formData.get('maxRedemptions')) : null;

        // Validate promo code
        if (!code) {
            this.showNotification('Promo code is required', 'error');

            return false;
        }

        if (code.length < 3) {
            this.showNotification('Promo code must be at least 3 characters long', 'error');

            return false;
        }

        if (!(/^[A-Z0-9]+$/).test(code)) {
            this.showNotification('Promo code can only contain uppercase letters and numbers', 'error');

            return false;
        }

        // Validate credits
        if (!credits || credits < 1) {
            this.showNotification('Credits must be at least 1', 'error');

            return false;
        }

        if (credits > 10000) {
            this.showNotification('Credits cannot exceed 10,000', 'error');

            return false;
        }

        // Validate max redemptions
        if (maxRedemptions && maxRedemptions < 1) {
            this.showNotification('Usage limit must be at least 1', 'error');

            return false;
        }

        return true;
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type
     */
    showNotification(message, type = 'info') {
        // Use existing notification system if available
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            // Fallback: use alert
            alert(message);
        }
    }

    /**
     * Activate promo card
     * @param {string} promoCardId - Promo card ID
     */
    async activate(promoCardId) {
        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PROMO: No valid token for promo code request, skipping');
                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/admin/promo-codes/${promoCardId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: true })
            });

            if (response.ok) {
                if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                    await this.uiRenderer.loadPromoCardsData();
                }
                console.log('Promo card activated successfully');
            } else {
                const error = await response.json();

                alert(`Failed to activate promo card: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PROMO-MODAL: Error activating promo card:', error);
            alert(`Failed to activate promo card: ${error.message}`);
        }
    }

    /**
     * Deactivate promo card
     * @param {string} promoCardId - Promo card ID
     */
    async deactivate(promoCardId) {
        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PROMO: No valid token for promo code request, skipping');
                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/admin/promo-codes/${promoCardId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ isActive: false })
            });

            if (response.ok) {
                if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                    await this.uiRenderer.loadPromoCardsData();
                }
                console.log('Promo card deactivated successfully');
            } else {
                const error = await response.json();

                alert(`Failed to deactivate promo card: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PROMO-MODAL: Error deactivating promo card:', error);
            alert(`Failed to deactivate promo card: ${error.message}`);
        }
    }

    /**
     * Delete promo card
     * @param {string} promoCardId - Promo card ID
     */
    async delete(promoCardId) {
        if (!confirm('Are you sure you want to delete this promo card? This action cannot be undone.')) {
            return;
        }

        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PROMO: No valid token for promo code request, skipping');
                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/admin/promo-codes/${promoCardId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                if (this.uiRenderer && this.uiRenderer.loadPromoCardsData) {
                    await this.uiRenderer.loadPromoCardsData();
                }
                console.log('Promo card deleted successfully');
            } else {
                const error = await response.json();

                alert(`Failed to delete promo card: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PROMO-MODAL: Error deleting promo card:', error);
            alert(`Failed to delete promo card: ${error.message}`);
        }
    }

    /**
     * Destroy modal and cleanup
     */
    destroy() {
        this.hide();
        console.log('🗑️ ADMIN-PROMO-MODAL: Modal destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPromoCodeModal;
} else {
    window.AdminPromoCodeModal = AdminPromoCodeModal;
}
