/**
 * Admin User Manager
 * Handles all user management functionality for the admin dashboard
 * Extracted from admin.js for better modularity and maintainability
 */

class AdminUserManager {
    /**
     * View payment details
     * @param {string} paymentId - Payment ID to view
     */
    static viewPayment(paymentId) {
        console.log('👁️ ADMIN: Viewing payment:', paymentId);
        // Implementation would load payment details in modal
        window.showNotification(`Payment details for ${paymentId}`, 'info');
    }

    /**
     * Refund payment
     * @param {string} paymentId - Payment ID to refund
     */
    static async refundPayment(paymentId) {
        console.log('💸 ADMIN: Refunding payment:', paymentId);

        // Create a modal for refund reason input
        const reason = window.AdminModalFunctions.showRefundReasonModal();

        if (!reason) {
            return;
        }

        // Implementation would call refund API
        window.showNotification(`Refund initiated for payment ${paymentId}`, 'success');
    }

    /**
     * Export payments
     */
    static exportPayments() {
        console.log('📊 ADMIN: Exporting payments...');
        window.showNotification('Payment export started. Download will begin shortly.', 'info');
    }

    /**
     * Refresh payments
     */
    static refreshPayments() {
        console.log('🔄 ADMIN: Refreshing payments...');
        if (window.adminApp.sectionManager) {
            window.adminApp.sectionManager.showSection('payments');
        }
    }

    /**
     * View user details
     * @param {string} userId - User ID to view
     */
    static viewUser(userId) {
        console.log('👁️ ADMIN: Viewing user:', userId);
        // Implementation would load user details in modal
        window.showNotification(`User details for ${userId}`, 'info');
    }

    /**
     * Make API request to add credits
     * @param {string} userId - User ID
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} API response
     */
    static async addCreditsApiRequest(userId, requestData) {
        // Check authentication before making request
        if (!window.AdminAuthUtils?.hasValidToken()) {
            console.warn('🔐 ADMIN: No valid token for credits request, skipping');
            throw new Error('Authentication required');
        }

        const currentToken = window.AdminAuthUtils.getAuthToken();

        console.log('🔍 ADMIN: Making API request with:', {
            url: `/api/admin/users/${userId}/credits`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`
            },
            body: requestData,
            token: currentToken ? `${currentToken.substring(0, 20)}...` : 'NO TOKEN'
        });

        const response = await fetch(`/api/admin/users/${userId}/credits`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentToken}`
            },
            body: JSON.stringify(requestData)
        });

        console.log('🔍 ADMIN: Response status:', response.status);
        console.log('🔍 ADMIN: Response headers:', Object.fromEntries(response.headers.entries()));

        return await response.json();
    }

    /**
     * Send credits to user
     * @param {string} userId - User ID
     */
    static async sendCredits(userId) {
        console.log('💰 ADMIN: Sending credits to user:', userId);

        const input = await window.AdminModalFunctions.showAddCreditsModal();

        console.log('🔍 ADMIN: Modal input result:', input);

        if (!input || !input.amount || !input.reason) {
            return;
        }

        try {
            const requestData = {
                amount: parseInt(input.amount),
                reason: input.reason
            };

            // Check if we have a valid token
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN: No valid token for user action, skipping');
                return;
            }

            const result = await this.addCreditsApiRequest(userId, requestData);

            console.log('🔍 ADMIN: API response:', result);

            if (result.success) {
                console.log('🔍 ADMIN: Credits added successfully, updating table...');
                window.showNotification(`Successfully added ${input.amount} credits to user`, 'success');

                const newBalance = result.data?.user?.creditBalance;

                if (newBalance !== undefined) {
                    console.log('🔍 ADMIN: Updating user row with new balance:', newBalance);
                    this.updateUserRowCreditBalance(userId, newBalance);
                }

                if (window.adminApp.dashboardManager?.eventBus) {
                    console.log('🔍 ADMIN: Emitting refresh-history event');
                    window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
                }
            } else {
                console.error('❌ ADMIN: API returned error:', result);

                if (result.error === 'Authentication required' || result.error === 'User not found') {
                    window.showNotification('Your session has expired. Please refresh the page and log in again.', 'error');
                    setTimeout(() => window.location.reload(), 3000);
                } else {
                    window.showNotification(`Failed to add credits: ${result.message}`, 'error');
                }
            }
        } catch (error) {
            console.error('❌ ADMIN: Error adding credits:', error);
            window.showNotification('Failed to add credits. Please try again.', 'error');
        }
    }

    /**
     * Suspend user
     * @param {string} userId - User ID to suspend
     */
    static async suspendUser(userId) {
        console.log('🚫 ADMIN: Suspending user:', userId);

        const reason = await window.AdminModalFunctions.showSuspensionReasonModal();

        if (!reason) {
            return;
        }

        if (await window.AdminModalFunctions.showConfirmModal('Are you sure you want to suspend this user?')) {
            try {
                const response = await fetch(`/api/admin/users/${userId}/suspend`, {
                    method: 'POST',
                    headers: {
                        ...window.AdminAuthUtils.getAuthHeaders()
                    },
                    body: JSON.stringify({
                        reason
                    })
                });

                const result = await response.json();

                if (result.success) {
                    window.showNotification('User suspended successfully', 'warning');

                    // Update the user row status immediately
                    this.updateUserRowStatus(userId, true);

                    // Also refresh the entire table as backup
                    if (window.adminApp.dashboardManager?.eventBus) {
                        window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
                    }
                } else {
                    window.showNotification(`Failed to suspend user: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('❌ ADMIN: Error suspending user:', error);
                window.showNotification('Failed to suspend user. Please try again.', 'error');
            }
        }
    }

    /**
     * Unsuspend user
     * @param {string} userId - User ID to unsuspend
     */
    static async unsuspendUser(userId) {
        console.log('✅ ADMIN: Unsuspending user:', userId);

        const reason = await window.AdminModalFunctions.showUnsuspensionReasonModal();

        if (!reason) {
            return;
        }

        if (await window.AdminModalFunctions.showConfirmModal('Are you sure you want to unsuspend this user?')) {
            try {
                const response = await fetch(`/api/admin/users/${userId}/unsuspend`, {
                    method: 'POST',
                    headers: {
                        ...window.AdminAuthUtils.getAuthHeaders()
                    },
                    body: JSON.stringify({
                        reason
                    })
                });

                const result = await response.json();

                if (result.success) {
                    window.showNotification('User unsuspended successfully', 'success');

                    // Update the user row status immediately
                    this.updateUserRowStatus(userId, false);

                    // Also refresh the entire table as backup
                    if (window.adminApp.dashboardManager?.eventBus) {
                        window.adminApp.dashboardManager.eventBus.emit('refresh-history', 'users');
                    }
                } else {
                    window.showNotification(`Failed to unsuspend user: ${result.message}`, 'error');
                }
            } catch (error) {
                console.error('❌ ADMIN: Error unsuspending user:', error);
                window.showNotification('Failed to unsuspend user. Please try again.', 'error');
            }
        }
    }

    /**
     * Export users
     */
    static exportUsers() {
        console.log('📊 ADMIN: Exporting users...');
        window.showNotification('User export started. Download will begin shortly.', 'info');
    }

    /**
     * Refresh users
     */
    static refreshUsers() {
        console.log('🔄 ADMIN: Refreshing users...');
        if (window.adminApp.sectionManager) {
            window.adminApp.sectionManager.showSection('users');
        }
    }

    /**
     * Update user row status in the table
     * @param {string} userId - User ID
     * @param {boolean} isSuspended - Whether user is suspended
     */
    static updateUserRowStatus(userId, isSuspended) {
        try {
            const userRow = document.querySelector(`tr[data-id="${userId}"]`);

            if (userRow) {
                const statusCell = userRow.querySelector('td.isSuspended');

                if (statusCell) {
                    // Update the status display
                    statusCell.innerHTML = isSuspended
                        ? '<span class="badge badge-warning">Suspended</span>'
                        : '<span class="badge badge-success">Active</span>';

                    statusCell.style.backgroundColor = isSuspended ? '#f59e0b' : '#10b981';
                    statusCell.style.transition = 'background-color 0.3s ease';

                    setTimeout(() => {
                        statusCell.style.backgroundColor = '';
                    }, 2000);

                    console.log('✅ ADMIN: Updated user row status to:', isSuspended ? 'suspended' : 'active');
                }
            }
        } catch (error) {
            console.error('❌ ADMIN: Error updating user row status:', error);
        }
    }

    /**
     * Update user row credit balance in the table
     * @param {string} userId - User ID
     * @param {number} newBalance - New credit balance
     */
    static updateUserRowCreditBalance(userId, newBalance) {
        try {
            // Find the table row for this user (using data-id attribute)
            const userRow = document.querySelector(`tr[data-id="${userId}"]`);

            if (userRow) {
                // Find the credit balance cell using the field class
                const creditCell = userRow.querySelector('td.creditBalance');

                if (creditCell) {
                    // Update the cell content with new balance
                    creditCell.textContent = newBalance;
                    creditCell.style.backgroundColor = '#10b981'; // Green highlight
                    creditCell.style.transition = 'background-color 0.3s ease';

                    // Remove highlight after 2 seconds
                    setTimeout(() => {
                        creditCell.style.backgroundColor = '';
                    }, 2000);

                    console.log('✅ ADMIN: Updated user row credit balance to:', newBalance);
                } else {
                    console.log('⚠️ ADMIN: Could not find credit balance cell for user:', userId);
                    // Fallback: try to find by column position (creditBalance is usually 4th column)
                    const fallbackCell = userRow.querySelector('td:nth-child(4)');

                    if (fallbackCell) {
                        fallbackCell.textContent = newBalance;
                        fallbackCell.style.backgroundColor = '#10b981';
                        setTimeout(() => { fallbackCell.style.backgroundColor = ''; }, 2000);
                        console.log('✅ ADMIN: Updated user row credit balance (fallback) to:', newBalance);
                    }
                }
            } else {
                console.log('⚠️ ADMIN: Could not find user row for:', userId);
            }
        } catch (error) {
            console.error('❌ ADMIN: Error updating user row:', error);
        }
    }
}

// Export for use in other modules
window.AdminUserManager = AdminUserManager;
