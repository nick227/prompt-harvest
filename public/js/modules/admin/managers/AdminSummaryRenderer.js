/**
 * Admin Summary Renderer - Handles HTML generation for admin dashboard
 * Single Responsibility: Generate HTML structure for dashboard, summary, and history tabs
 */

class AdminSummaryRenderer {
    // No constructor needed - pure HTML generation

    /**
     * Generate dashboard HTML structure
     * @returns {string} Dashboard HTML
     */
    generateDashboardHTML() {
        return `
            <div class="admin-dashboard-header">
                <h2>Site Performance Dashboard</h2>
                <div class="dashboard-actions">
                    <button id="refresh-snapshot" class="btn btn-outline">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                </div>
            </div>

            <div class="admin-tabs-container">
                <nav class="admin-tabs" id="admin-tabs">
                    <button class="tab-btn active" data-tab="summary">
                        <i class="fas fa-chart-line"></i>
                        Summary
                    </button>
                    <button class="tab-btn" data-tab="billing">
                        <i class="fas fa-credit-card"></i>
                        Billing
                    </button>
                    <button class="tab-btn" data-tab="users">
                        <i class="fas fa-users"></i>
                        Users
                    </button>
                    <button class="tab-btn" data-tab="images">
                        <i class="fas fa-images"></i>
                        Images
                    </button>
                    <button class="tab-btn" data-tab="packages">
                        <i class="fas fa-box"></i>
                        Packages
                    </button>
                    <button class="tab-btn" data-tab="models">
                        <i class="fas fa-cogs"></i>
                        Models
                    </button>
                    <button class="tab-btn" data-tab="promo-cards">
                        <i class="fas fa-ticket-alt"></i>
                        Promo
                    </button>
                    <button class="tab-btn" data-tab="terms">
                        <i class="fas fa-book"></i>
                        Terms
                    </button>
                    <button class="tab-btn" data-tab="messages">
                        <i class="fas fa-comments"></i>
                        Messages
                        <span class="unread-badge" id="messages-unread-badge" style="display: none;">0</span>
                    </button>
                    <button class="tab-btn" data-tab="queue-monitor">
                        <i class="fas fa-tasks"></i>
                        Queue Monitor
                    </button>
                </nav>

                <div class="tab-content" id="admin-tab-content">
                    <div id="summary-tab" class="tab-panel active"></div>
                    <div id="billing-tab" class="tab-panel"></div>
                    <div id="users-tab" class="tab-panel"></div>
                    <div id="images-tab" class="tab-panel"></div>
                    <div id="packages-tab" class="tab-panel"></div>
                    <div id="models-tab" class="tab-panel"></div>
                    <div id="promo-cards-tab" class="tab-panel"></div>
                    <div id="terms-tab" class="tab-panel"></div>
                    <div id="messages-tab" class="tab-panel"></div>
                    <div id="queue-monitor-tab" class="tab-panel"></div>
                </div>
            </div>
        `;
    }

    /**
     * Generate summary tab HTML
     * @param {Object} data - Summary data
     * @returns {string} Summary tab HTML
     */
    generateSummaryTabHTML(data) {
        const { stats, metrics, health, recentImage } = data;

        console.log('🔍 ADMIN-SUMMARY: generateSummaryTabHTML received data:', {
            stats: !!stats,
            metrics: !!metrics,
            health: !!health,
            recentImage: !!recentImage,
            recentImageData: recentImage
        });

        return `
            <div class="summary-grid">
                <div class="summary-section">
                    <h3>Site Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${stats?.totalUsers || 0}</div>
                                <div class="stat-label">Total Users</div>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-images"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${stats?.totalImages || 0}</div>
                                <div class="stat-label">Images Generated</div>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">$${(stats?.totalRevenue || 0).toLocaleString()}</div>
                                <div class="stat-label">Total Revenue</div>
                            </div>
                        </div>

                        <div class="stat-card">
                            <div class="stat-icon">
                                <i class="fas fa-server"></i>
                            </div>
                            <div class="stat-content">
                                <div class="stat-value">${stats?.activeSessions || 0}</div>
                                <div class="stat-label">Active Sessions</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="summary-section">
                    <h3>Performance Metrics</h3>
                    <div class="metrics-grid">
                        <div class="metric-card">
                            <div class="metric-label">Response Time</div>
                            <div class="metric-value">${metrics?.avgResponseTime || 0}ms</div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-label">Success Rate</div>
                            <div class="metric-value">${metrics?.successRate || 0}%</div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-label">CPU Usage</div>
                            <div class="metric-value">${health?.cpuUsage || 0}%</div>
                        </div>

                        <div class="metric-card">
                            <div class="metric-label">Memory Usage</div>
                            <div class="metric-value">${health?.memoryUsage || 0}%</div>
                        </div>
                    </div>
                </div>


                <div class="summary-section">
                    <h3>Queue Status</h3>
                    <div class="queue-status-summary">
                        <div class="queue-status-item">
                            <span class="queue-status-label">Queue Size:</span>
                            <span class="queue-status-value" id="summary-queue-size">-</span>
                        </div>
                        <div class="queue-status-item">
                            <span class="queue-status-label">Active Jobs:</span>
                            <span class="queue-status-value" id="summary-active-jobs">-</span>
                        </div>
                        <div class="queue-status-item">
                            <span class="queue-status-label">Health:</span>
                            <span class="queue-status-value" id="summary-queue-health">-</span>
                        </div>
                        <div class="queue-status-actions">
                            <a href="?v=queue-monitor" class="btn btn-sm btn-primary">
                                <i class="fas fa-tasks"></i> View Queue Monitor
                            </a>
                        </div>
                    </div>
                </div>

                <div class="summary-section">
                    <h3>Recent Activity</h3>
                    <div class="activity-list">
                        ${this.generateActivityList(metrics?.recentActivity || [])}
                    </div>
                </div>


                <div class="summary-section">
                    <h3>System Settings</h3>
                    <div class="system-settings-container">
                        <div class="settings-header">
                            <p>Manage system-wide configuration settings</p>
                            <button id="refresh-settings" class="btn btn-sm btn-outline">
                                <i class="fas fa-sync-alt"></i> Refresh
                            </button>
                        </div>
                        <div id="system-settings-list" class="settings-list">
                            <div class="loading-placeholder">Loading system settings...</div>
                        </div>
                        <div class="settings-actions">
                            <button id="add-setting-btn" class="btn btn-primary">
                                <i class="fas fa-plus"></i> Add Setting
                            </button>
                            <button id="initialize-defaults-btn" class="btn btn-outline">
                                <i class="fas fa-magic"></i> Initialize Defaults
                            </button>
                        </div>
                    </div>
                </div>

                ${data.recentImage
        ? `
                <div class="w-full mt-8">
                    <h3 class="mb-4">Most Recent Image</h3>
                    <div class="recent-image-card">
                        <div class="recent-image-container">
                            <img src="${data.recentImage.imageUrl}"
                                 alt="Recent generated image"
                                 class="recent-image-preview"
                                 onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="image-placeholder" style="display: none;">
                                <i class="fas fa-image"></i>
                                <span>Image unavailable</span>
                            </div>
                        </div>
                        <div class="recent-image-details">
                            <div class="recent-image-meta">
                                <span class="recent-image-user">${data.recentImage.user.username || data.recentImage.user.email}</span>
                                <span class="recent-image-time">${new Date(data.recentImage.createdAt).toLocaleString()}</span>
                            </div>
                            <div class="recent-image-provider">${data.recentImage.provider} ${data.recentImage.model ? `(${data.recentImage.model})` : ''}</div>
                            <div class="recent-image-prompt" title="${this.escapeHtml(data.recentImage.prompt)}">
                                ${this.truncateText(this.escapeHtml(data.recentImage.prompt), 120)}
                            </div>
                        </div>
                    </div>
                </div>
                `
        : ''}
            </div>
        `;
    }

    /**
     * Generate history tab HTML
     * @param {string} historyType - Type of history tab
     * @param {Object} data - History data
     * @returns {string} History tab HTML
     */
    generateHistoryTabHTML(historyType, data) {
        const title = this.getHistoryTabTitle(historyType);
        const icon = this.getHistoryTabIcon(historyType);

        return `
            <div class="history-header">
                <h3>
                    <i class="${icon}"></i>
                    ${title}
                </h3>
                <div class="history-actions">
                    <button id="refresh-${historyType}" class="btn btn-outline btn-sm">
                        <i class="fas fa-sync-alt"></i>
                        Refresh
                    </button>
                    <button id="export-${historyType}" class="btn btn-primary btn-sm">
                        <i class="fas fa-download"></i>
                        Export
                    </button>
                </div>
            </div>

            <div class="history-filters">
                ${this.generateHistoryFilters(historyType)}
            </div>

            <div class="history-content">
                <div id="${historyType}-table-container" class="table-container">
                    <!-- Table will be generated here -->
                </div>
            </div>
        `;
    }

    /**
     * Generate history filters HTML
     * @param {string} historyType - Type of history tab
     * @returns {string} Filters HTML
     */
    generateHistoryFilters(historyType) {
        const commonFilters = `
            <div class="filter-group">
                <label>Date Range:</label>
                <select id="${historyType}-date-range">
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                </select>
            </div>
        `;

        const specificFilters = {
            billing: `
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="${historyType}-status">
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="pending">Pending</option>
                        <option value="failed">Failed</option>
                        <option value="refunded">Refunded</option>
                    </select>
                </div>
            `,
            users: `
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="${historyType}-status">
                        <option value="">All Users</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            `,
            images: `
                <div class="filter-group">
                    <label>Provider:</label>
                    <select id="${historyType}-provider">
                        <option value="">All Providers</option>
                        <option value="openai">OpenAI</option>
                        <option value="stability">Stability AI</option>
                        <option value="midjourney">Midjourney</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label>Status:</label>
                    <select id="${historyType}-status">
                        <option value="">All Status</option>
                        <option value="completed">Completed</option>
                        <option value="failed">Failed</option>
                        <option value="processing">Processing</option>
                    </select>
                </div>
            `
        };

        return commonFilters + (specificFilters[historyType] || '');
    }

    /**
     * Generate activity list HTML
     * @param {Array} activities - Array of activity objects
     * @returns {string} Activity list HTML
     */
    generateActivityList(activities) {
        if (!activities || activities.length === 0) {
            return '<div class="no-activity">No recent activity</div>';
        }

        return activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-content">
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${new Date(activity.timestamp).toLocaleTimeString()}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get history tab title
     * @param {string} historyType - Type of history tab
     * @returns {string} Tab title
     */
    getHistoryTabTitle(historyType) {
        const titles = {
            billing: 'Billing History',
            users: 'User Management',
            images: 'Image Generation History'
        };

        return titles[historyType] || historyType.charAt(0).toUpperCase() + historyType.slice(1);
    }

    /**
     * Get history tab icon
     * @param {string} historyType - Type of history tab
     * @returns {string} Icon class
     */
    getHistoryTabIcon(historyType) {
        const icons = {
            billing: 'fas fa-credit-card',
            users: 'fas fa-users',
            images: 'fas fa-images'
        };

        return icons[historyType] || 'fas fa-history';
    }

    /**
     * Truncate text to specified length
     * @param {string} text - Text to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated text
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
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        if (!text) {
            return '';
        }

        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }


    /**
     * Update summary queue status
     * @param {Object} queueData - Queue status data
     */
    updateSummaryQueueStatus(queueData) {
        if (!queueData) { return; }

        const { current, health } = queueData;

        // Update queue size
        const queueSizeEl = document.getElementById('summary-queue-size');

        if (queueSizeEl) {
            queueSizeEl.textContent = current?.queueSize || 0;
        }

        // Update active jobs
        const activeJobsEl = document.getElementById('summary-active-jobs');

        if (activeJobsEl) {
            activeJobsEl.textContent = current?.activeJobs || 0;
        }

        // Update health
        const healthEl = document.getElementById('summary-queue-health');

        if (healthEl) {
            healthEl.textContent = health?.status || 'Unknown';
            healthEl.className = `queue-status-value queue-health-${health?.status || 'unknown'}`;
        }
    }

    /**
     * Get authentication token
     * @returns {string} Auth token
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() || '';
    }

    /**
     * Show notification
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info)
     */
    showNotification(message, type = 'info') {
        // Use the global notification system if available
        if (window.adminApp && window.adminApp.showNotification) {
            window.adminApp.showNotification(message, type);
        } else {
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSummaryRenderer;
} else {
    window.AdminSummaryRenderer = AdminSummaryRenderer;
}
