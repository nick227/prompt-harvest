/**
 * Admin Promo Manager
 * Handles all promo code functionality for the admin dashboard
 * Extracted from admin.js for better modularity and maintainability
 */

class AdminPromoManager {
    /**
     * Generate a random promo code
     * @returns {string} Generated promo code
     */
    static generatePromoCode() {
        const prefixes = ['WELCOME', 'SAVE', 'BONUS', 'NEW', 'SPECIAL', 'VIP', 'EARLY', 'HOLIDAY'];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const year = new Date().getFullYear();
        const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

        const generatedCode = `${prefix}${year}${randomNum}`;

        // Find the code input field and set the value
        const codeInput = document.querySelector('input[name="code"]');

        if (codeInput) {
            codeInput.value = generatedCode;
            codeInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        return generatedCode;
    }

    /**
     * View promo code statistics
     * @param {string} promoId - Promo code ID
     */
    static viewPromoStats(promoId) {
        if (!promoId) {
            console.error('Promo ID required for stats view');
            return;
        }

        // Fetch and display promo stats in a modal
        fetch(`/api/admin/promo-codes/${promoId}/stats`, {
            headers: {
                Authorization: `Bearer ${window.AdminAuthUtils?.getAuthToken() || window.UnifiedAuthUtils?.getAuthToken() || localStorage.getItem('authToken')}`
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.displayPromoStatsModal(data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch stats');
                }
            })
            .catch(error => {
                console.error('Error fetching promo stats:', error);
                window.adminApp.showNotification('Failed to load promo code statistics', 'error');
            });
    }

    /**
     * Display promo stats in a modal
     * @param {Object} stats - Promo code statistics
     */
    static displayPromoStatsModal(stats) {
        const modalContent = `
            <div class="promo-stats-modal">
                <div class="stats-header">
                    <h3><i class="fas fa-chart-bar"></i> Promo Code Statistics</h3>
                    <div class="promo-info">
                        <code class="promo-code-large">${stats.promoCode.code}</code>
                        <span class="promo-status badge badge-${
            stats.promoCode.status === 'active'
                ? 'success'
                : 'warning'
        }">
                            ${stats.promoCode.status}
                        </span>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.statistics.totalRedemptions}</div>
                        <div class="stat-label">Total Redemptions</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.statistics.totalCreditsIssued}</div>
                        <div class="stat-label">Credits Issued</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.statistics.uniqueUsers}</div>
                        <div class="stat-label">Unique Users</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.statistics.averageCreditsPerUser}</div>
                        <div class="stat-label">Avg Credits/User</div>
                    </div>
                </div>

                ${stats.recentRedemptions.length > 0
            ? `
                        <div class="recent-redemptions">
                            <h4>Recent Redemptions</h4>
                            <div class="redemptions-list">
                                ${stats.recentRedemptions.map(redemption => `
                                    <div class="redemption-item">
                                        <div class="user-info">
                                            <strong>${redemption.user.email}</strong>
                                            <span class="credits">+${redemption.credits} credits</span>
                                        </div>
                                        <div class="redemption-date">
                                            ${new Date(redemption.createdAt).toLocaleString()}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `
            : ''
        }
            </div>
        `;

        window.adminApp.showModal('Promo Code Statistics', modalContent);
    }

    /**
     * Edit promo code
     * @param {string} promoId - Promo code ID
     */
    static editPromoCode(promoId) {
        if (!promoId) {
            console.error('Promo ID required for edit');
            return;
        }

        // Fetch promo code data and open edit modal
        fetch(`/api/admin/promo-codes/${promoId}`, {
            headers: {
                Authorization: `Bearer ${window.AdminAuthUtils?.getAuthToken() || window.UnifiedAuthUtils?.getAuthToken() || localStorage.getItem('authToken')}`
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Open edit form with existing data
                    window.adminApp.openEditModal('promoCodes', data.data);
                } else {
                    throw new Error(data.message || 'Failed to fetch promo code');
                }
            })
            .catch(error => {
                console.error('Error fetching promo code:', error);
                window.adminApp.showNotification('Failed to load promo code for editing', 'error');
            });
    }

    /**
     * Delete promo code with confirmation
     * @param {string} promoId - Promo code ID
     * @param {string} promoCode - Promo code string
     */
    static deletePromoCode(promoId, promoCode) {
        if (!promoId) {
            console.error('Promo ID required for deletion');
            return;
        }

        const confirmed = confirm(
            `Are you sure you want to delete promo code "${promoCode}"? This action cannot be undone.`
        );

        if (confirmed) {
            fetch(`/api/admin/promo-codes/${promoId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${window.AdminAuthUtils?.getAuthToken() || window.UnifiedAuthUtils?.getAuthToken() || localStorage.getItem('authToken')}`,
                    'Content-Type': 'application/json'
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        window.adminApp.showNotification(
                            `Promo code "${promoCode}" deleted successfully`,
                            'success'
                        );
                        // Refresh the table
                        window.adminApp.refreshCurrentSection();
                    } else {
                        throw new Error(data.message || 'Failed to delete promo code');
                    }
                })
                .catch(error => {
                    console.error('Error deleting promo code:', error);
                    window.adminApp.showNotification('Failed to delete promo code', 'error');
                });
        }
    }
}

// Export for use in other modules
window.AdminPromoManager = AdminPromoManager;
