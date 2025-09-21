/**
 * Admin Summary Renderer - Handles HTML generation for admin dashboard
 * Single Responsibility: Generate HTML structure for dashboard, summary, and history tabs
 */

class AdminSummaryRenderer {
    constructor() {
        // No dependencies needed - pure HTML generation
    }

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
                                <div class="stat-value">${AdminUtils.formatCurrency(stats?.totalRevenue || 0)}</div>
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
                    <div class="queue-status-container">
                        <div class="queue-stats-grid">
                            <div class="queue-stat-card">
                                <div class="queue-stat-icon">
                                    <i class="fas fa-list-ol"></i>
                                </div>
                                <div class="queue-stat-content">
                                    <div class="queue-stat-value" id="queue-length">-</div>
                                    <div class="queue-stat-label">Pending Requests</div>
                                </div>
                            </div>

                            <div class="queue-stat-card">
                                <div class="queue-stat-icon">
                                    <i class="fas fa-cog ${data?.queue?.status?.isProcessing ? 'fa-spin' : ''}"></i>
                                </div>
                                <div class="queue-stat-content">
                                    <div class="queue-stat-value">${data?.queue?.status?.isProcessing ? 'Processing' : 'Idle'}</div>
                                    <div class="queue-stat-label">Queue Status</div>
                                </div>
                            </div>

                            <div class="queue-stat-card">
                                <div class="queue-stat-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <div class="queue-stat-content">
                                    <div class="queue-stat-value" id="queue-oldest-age">-</div>
                                    <div class="queue-stat-label">Oldest Request</div>
                                </div>
                            </div>

                            <div class="queue-stat-card">
                                <div class="queue-stat-icon">
                                    <i class="fas fa-heartbeat ${data?.queue?.health?.status === 'healthy' ? 'text-green-500' : data?.queue?.health?.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}"></i>
                                </div>
                                <div class="queue-stat-content">
                                    <div class="queue-stat-value">${data?.queue?.health?.status || 'Loading...'}</div>
                                    <div class="queue-stat-label">Queue Health</div>
                                </div>
                            </div>
                        </div>

                        <div class="queue-actions">
                            <button id="refresh-queue-status" class="btn btn-sm btn-outline">
                                <i class="fas fa-sync-alt"></i> Refresh Queue
                            </button>
                            <button id="clear-queue-btn" class="btn btn-sm btn-danger" style="display: none;">
                                <i class="fas fa-trash"></i> Clear Queue
                            </button>
                        </div>

                        <div class="queue-details" id="queue-details" style="display: none;">
                            <h4>Queue Details</h4>
                            <div class="queue-requests-list" id="queue-requests-list">
                                <!-- Queue requests will be populated here -->
                            </div>
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
                                <span class="recent-image-time">${AdminUtils.formatTimestamp(data.recentImage.createdAt)}</span>
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
                    <i class="${AdminUtils.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-time">${AdminUtils.formatTime(activity.timestamp)}</div>
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
     * Update queue status display
     * @param {Object} queueData - Queue status data
     */
    updateQueueStatus(queueData) {
        if (!queueData) {
            this.showQueueError('No queue data available');
            return;
        }

        const { status, stats, health } = queueData;

        // Cache DOM elements for better performance
        const elements = this.getQueueElements();

        // Update queue length
        if (elements.queueLength) {
            elements.queueLength.textContent = status?.length || 0;
        }

        // Update queue status
        if (elements.queueStatus) {
            elements.queueStatus.textContent = status?.isProcessing ? 'Processing' : 'Idle';
        }

        // Update processing icon
        if (elements.processingIcon) {
            elements.processingIcon.className = `fas fa-cog ${status?.isProcessing ? 'fa-spin' : ''}`;
        }

        // Update oldest request age
        if (elements.oldestAge && stats?.oldestRequest) {
            const ageInSeconds = Math.floor(stats.oldestRequest / 1000);
            elements.oldestAge.textContent = ageInSeconds > 60 ?
                `${Math.floor(ageInSeconds / 60)}m ${ageInSeconds % 60}s` :
                `${ageInSeconds}s`;
        }

        // Update queue health
        if (elements.healthValue && elements.healthIcon) {
            elements.healthValue.textContent = health?.status || 'Unknown';
            elements.healthIcon.className = `fas fa-heartbeat ${
                health?.status === 'healthy' ? 'text-green-500' :
                health?.status === 'warning' ? 'text-yellow-500' :
                'text-red-500'
            }`;
        }

        // Show/hide clear queue button based on queue length
        if (elements.clearBtn) {
            elements.clearBtn.style.display = (status?.length || 0) > 0 ? 'inline-block' : 'none';
        }

        // Update queue details if visible
        this.updateQueueDetails(status?.pendingRequests || []);

        // Show health issues if any
        this.updateHealthIssues(health?.issues || []);
    }

    /**
     * Cache queue DOM elements for better performance
     * @returns {Object} Cached DOM elements
     */
    getQueueElements() {
        if (!this._queueElements) {
            this._queueElements = {
                queueLength: document.getElementById('queue-length'),
                queueStatus: document.querySelector('.queue-stat-card:nth-child(2) .queue-stat-value'),
                processingIcon: document.querySelector('.queue-stat-card:nth-child(2) .queue-stat-icon i'),
                oldestAge: document.getElementById('queue-oldest-age'),
                healthValue: document.querySelector('.queue-stat-card:nth-child(4) .queue-stat-value'),
                healthIcon: document.querySelector('.queue-stat-card:nth-child(4) .queue-stat-icon i'),
                clearBtn: document.getElementById('clear-queue-btn')
            };
        }
        return this._queueElements;
    }

    /**
     * Update health issues display
     * @param {Array} issues - Array of health issues
     */
    updateHealthIssues(issues) {
        const healthEl = document.querySelector('.queue-stat-card:nth-child(4) .queue-stat-content');
        if (!healthEl) return;

        // Remove existing issues display
        const existingIssues = healthEl.querySelector('.queue-health-issues');
        if (existingIssues) {
            existingIssues.remove();
        }

        // Add issues if any
        if (issues.length > 0) {
            const issuesEl = document.createElement('div');
            issuesEl.className = 'queue-health-issues';
            issuesEl.style.cssText = 'font-size: 0.75rem; color: var(--color-yellow-400); margin-top: 2px;';
            issuesEl.innerHTML = issues.map(issue => `• ${issue}`).join('<br>');
            healthEl.appendChild(issuesEl);
        }
    }

    /**
     * Update queue details section
     * @param {Array} requests - Array of pending requests
     */
    updateQueueDetails(requests) {
        const detailsEl = document.getElementById('queue-details');
        const requestsListEl = document.getElementById('queue-requests-list');

        if (!detailsEl || !requestsListEl) return;

        if (requests && requests.length > 0) {
            detailsEl.style.display = 'block';
            requestsListEl.innerHTML = requests.map((req, index) => `
                <div class="queue-request-item">
                    <div class="queue-request-position">${index + 1}</div>
                    <div class="queue-request-content">
                        <div class="queue-request-prompt">${this.escapeHtml(req.prompt)}</div>
                        <div class="queue-request-meta">
                            <span class="queue-request-id">ID: ${req.id}</span>
                            <span class="queue-request-time">${AdminUtils.formatTime(req.timestamp)}</span>
                            <span class="queue-request-providers">${req.providers?.join(', ') || 'Unknown'}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            detailsEl.style.display = 'none';
        }
    }

    /**
     * Show queue error state
     * @param {string} message - Error message
     */
    showQueueError(message) {
        const queueLengthEl = document.getElementById('queue-length');
        const queueStatusEl = document.querySelector('.queue-stat-card:nth-child(2) .queue-stat-value');
        const oldestAgeEl = document.getElementById('queue-oldest-age');
        const healthEl = document.querySelector('.queue-stat-card:nth-child(4) .queue-stat-value');

        if (queueLengthEl) queueLengthEl.textContent = 'Error';
        if (queueStatusEl) queueStatusEl.textContent = 'Error';
        if (oldestAgeEl) oldestAgeEl.textContent = 'Error';
        if (healthEl) healthEl.textContent = 'Error';

        console.error('❌ ADMIN-QUEUE: Queue error:', message);
    }

    /**
     * Format time duration in milliseconds to human readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminSummaryRenderer;
} else {
    window.AdminSummaryRenderer = AdminSummaryRenderer;
}
