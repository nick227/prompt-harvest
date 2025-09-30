/**
 * Admin Queue Monitor - Enterprise Queue Monitoring Dashboard
 *
 * Provides comprehensive monitoring of the enterprise QueueManager system
 * with real-time metrics, health status, and operational controls.
 */

/* global Chart */

class AdminQueueMonitor {
    // Constants
    static REFRESH_INTERVAL = 5000; // 5 seconds
    static UPDATE_DEBOUNCE_MS = 1000; // 1 second
    static MAX_CHART_RETRIES = 5;
    static MAX_DATA_POINTS = 20;
    static CHART_POLLING_INTERVAL = 1000; // 1 second
    static MAX_POLLING_ATTEMPTS = 20; // 20 seconds

    constructor() {
        this.apiBaseUrl = window.ADMIN_CONFIG?.apiBaseUrl || '/api/admin';
        this.refreshInterval = AdminQueueMonitor.REFRESH_INTERVAL;
        this.refreshTimer = null;
        this.charts = {};
        this.isMonitoring = false;
        this.lastUpdateTime = 0;
        this.updateDebounceMs = AdminQueueMonitor.UPDATE_DEBOUNCE_MS;
        this.chartRetryCount = 0;
        this.maxChartRetries = AdminQueueMonitor.MAX_CHART_RETRIES;
        this.chartRetryTimer = null;
        this.chartPollingTimer = null;

        // Queue health thresholds
        this.thresholds = {
            queueSize: { warning: 10, critical: 20 },
            activeJobs: { warning: 8, critical: 10 },
            errorRate: { warning: 0.1, critical: 0.2 },
            avgProcessingTime: { warning: 30000, critical: 60000 } // 30s/60s
        };
    }

    /**
     * Initialize the queue monitoring dashboard
     */
    init() {
        console.log('🚀 ADMIN-QUEUE: Initializing enterprise queue monitoring...');
        this.createQueueDashboard();
        this.startRealTimeMonitoring();
        this.setupEventHandlers();
        this.loadLogs(); // Load initial logs
    }

    /**
     * Initialize when tab becomes active
     */
    initWhenActive() {
        console.log('🚀 ADMIN-QUEUE: Initializing queue monitoring for active tab...');

        // Stop any existing monitoring
        this.stopRealTimeMonitoring();

        this.createQueueDashboard();
        this.startRealTimeMonitoring();
        this.setupEventHandlers();
        this.loadLogs(); // Load initial logs

        // Listen for Chart.js loaded event
        window.addEventListener('chartjs-loaded', () => {
            console.log('📊 ADMIN-QUEUE: Chart.js loaded event received, reinitializing charts...');
            // Reset retry count when Chart.js is loaded
            this.chartRetryCount = 0;
            // Wait a bit for Chart to be fully available
            setTimeout(() => {
                this.initializeCharts();
            }, 100);
        });

        // Check if Chart.js is already loaded
        if (typeof Chart !== 'undefined') {
            console.log('📊 ADMIN-QUEUE: Chart.js already available, initializing charts immediately...');
            this.initializeCharts();
        } else {
            // Start polling for Chart.js availability
            this.startChartJSPolling();
        }
    }

    /**
     * Start polling for Chart.js availability
     */
    startChartJSPolling() {
        console.log('🔄 ADMIN-QUEUE: Starting Chart.js polling...');
        let pollCount = 0;

        this.chartPollingTimer = setInterval(() => {
            pollCount++;

            if (typeof Chart !== 'undefined') {
                console.log('📊 ADMIN-QUEUE: Chart.js detected via polling, initializing charts...');
                clearInterval(this.chartPollingTimer);
                this.chartPollingTimer = null;
                this.initializeCharts();
            } else if (pollCount >= AdminQueueMonitor.MAX_POLLING_ATTEMPTS) {
                console.warn('⚠️ ADMIN-QUEUE: Chart.js polling timeout, charts will not be available');
                clearInterval(this.chartPollingTimer);
                this.chartPollingTimer = null;
            }
        }, AdminQueueMonitor.CHART_POLLING_INTERVAL);
    }

    /**
     * Destroy existing charts to prevent canvas reuse errors
     */
    destroyExistingCharts() {
        console.log('🧹 ADMIN-QUEUE: Destroying existing charts...');

        // Destroy all existing charts
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                try {
                    chart.destroy();
                } catch (error) {
                    console.warn('⚠️ ADMIN-QUEUE: Error destroying chart:', error);
                }
            }
        });

        // Clear the charts object
        this.charts = {};
    }

    /**
     * Create a chart with common configuration
     * @param {string} canvasId - Canvas element ID
     * @param {string} label - Chart label
     * @param {string} color - Chart color
     * @param {Object} options - Additional chart options
     * @returns {Chart|null} Created chart instance
     */
    createChart(canvasId, label, color, options = {}) {
        const canvas = document.getElementById(canvasId);

        if (!canvas) {
            console.warn(`⚠️ ADMIN-QUEUE: Canvas element '${canvasId}' not found`);

            return null;
        }

        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        };

        const chartOptions = { ...defaultOptions, ...options };

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label,
                    data: [],
                    borderColor: color,
                    backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
    }

    /**
     * Create the comprehensive queue monitoring dashboard
     */
    createQueueDashboard() {
        const dashboardHTML = `
            <div id="queue-monitor-dashboard" class="queue-monitor-dashboard">
                <!-- Alert Container -->
                <div id="queue-alerts" class="queue-alerts-container"></div>

                <!-- Queue Status Overview -->
                <div class="queue-status-overview">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-tasks"></i>
                        Queue Status Overview
                    </h2>
                    <div class="status-cards-grid">
                        <div class="status-card" id="queue-health-card">
                            <div class="status-card-header">
                                <i class="fas fa-heartbeat"></i>
                                <span>Health Status</span>
                            </div>
                            <div class="status-card-content">
                                <div class="status-indicator" id="health-indicator">
                                    <span class="status-dot"></span>
                                    <span class="status-text">Checking...</span>
                                </div>
                            </div>
                        </div>

                        <div class="status-card" id="queue-size-card">
                            <div class="status-card-header">
                                <i class="fas fa-list"></i>
                                <span>Queue Size</span>
                            </div>
                            <div class="status-card-content">
                                <div class="metric-value" id="queue-size-value">-</div>
                                <div class="metric-label">Pending Tasks</div>
                            </div>
                        </div>

                        <div class="status-card" id="active-jobs-card">
                            <div class="status-card-header">
                                <i class="fas fa-cogs"></i>
                                <span>Active Jobs</span>
                            </div>
                            <div class="status-card-content">
                                <div class="metric-value" id="active-jobs-value">-</div>
                                <div class="metric-label">Processing</div>
                            </div>
                        </div>

                        <div class="status-card" id="concurrency-card">
                            <div class="status-card-header">
                                <i class="fas fa-layer-group"></i>
                                <span>Concurrency</span>
                            </div>
                            <div class="status-card-content">
                                <div class="metric-value" id="concurrency-value">-</div>
                                <div class="metric-label">Max Parallel</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Real-time Metrics Charts -->
                <div class="queue-metrics-section">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-chart-line"></i>
                        Real-time Metrics
                    </h2>
                    <div class="metrics-charts-grid">
                        <div class="chart-container">
                            <h3>Queue Size Over Time</h3>
                            <canvas id="queue-size-chart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h3>Processing Rate</h3>
                            <canvas id="processing-rate-chart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h3>Error Rate</h3>
                            <canvas id="error-rate-chart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h3>Average Processing Time</h3>
                            <canvas id="processing-time-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Queue Health & Diagnostics -->
                <div class="queue-health-section">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-stethoscope"></i>
                        Health & Diagnostics
                    </h2>
                    <div class="health-diagnostics-grid">
                        <div class="diagnostic-panel">
                            <h3>Initialization Status</h3>
                            <div id="init-status-content">
                                <div class="status-item">
                                    <span class="status-label">Status:</span>
                                    <span id="init-status" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Last Init:</span>
                                    <span id="last-init-time" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Last Error:</span>
                                    <span id="last-error" class="status-value">-</span>
                                </div>
                            </div>
                        </div>

                        <div class="diagnostic-panel">
                            <h3>Backpressure Status</h3>
                            <div id="backpressure-content">
                                <div class="status-item">
                                    <span class="status-label">Max Queue Size:</span>
                                    <span id="max-queue-size" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Waiting Room:</span>
                                    <span id="waiting-room-cap" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Utilization:</span>
                                    <span id="utilization" class="status-value">-</span>
                                </div>
                            </div>
                        </div>

                        <div class="diagnostic-panel">
                            <h3>Performance Metrics</h3>
                            <div id="performance-content">
                                <div class="status-item">
                                    <span class="status-label">Avg Processing Time:</span>
                                    <span id="avg-processing-time" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Success Rate:</span>
                                    <span id="success-rate" class="status-value">-</span>
                                </div>
                                <div class="status-item">
                                    <span class="status-label">Retry Rate:</span>
                                    <span id="retry-rate" class="status-value">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Queue Controls -->
                <div class="queue-controls-section">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-sliders-h"></i>
                        Queue Controls
                    </h2>
                    <div class="controls-grid">
                        <div class="control-group">
                            <label for="concurrency-slider">Concurrency Level</label>
                            <div class="slider-container">
                                <input type="range" id="concurrency-slider" min="1" max="10" value="2" class="slider">
                                <span id="concurrency-display" class="slider-value">2</span>
                            </div>
                            <button id="update-concurrency-btn" class="btn btn-primary">
                                <i class="fas fa-save"></i>
                                Update Concurrency
                            </button>
                        </div>

                        <div class="control-group">
                            <label>Queue Actions</label>
                            <div class="action-buttons">
                                <button id="pause-queue-btn" class="btn btn-warning">
                                    <i class="fas fa-pause"></i>
                                    Pause Queue
                                </button>
                                <button id="resume-queue-btn" class="btn btn-success">
                                    <i class="fas fa-play"></i>
                                    Resume Queue
                                </button>
                                <button id="clear-queue-btn" class="btn btn-danger">
                                    <i class="fas fa-trash"></i>
                                    Clear Queue
                                </button>
                            </div>
                        </div>

                        <div class="control-group">
                            <label>Monitoring Controls</label>
                            <div class="monitoring-controls">
                                <button id="toggle-monitoring-btn" class="btn btn-info">
                                    <i class="fas fa-eye"></i>
                                    <span id="monitoring-status">Start Monitoring</span>
                                </button>
                                <button id="refresh-data-btn" class="btn btn-secondary">
                                    <i class="fas fa-sync"></i>
                                    Refresh Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Queue Logs -->
                <div class="queue-logs-section">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-file-alt"></i>
                        Queue Logs
                        <div class="log-controls">
                            <select id="log-level-filter" class="log-filter">
                                <option value="">All Levels</option>
                                <option value="error">Errors</option>
                                <option value="warning">Warnings</option>
                                <option value="info">Info</option>
                                <option value="debug">Debug</option>
                            </select>
                            <button id="refresh-logs-btn" class="btn btn-secondary">
                                <i class="fas fa-sync"></i>
                                Refresh Logs
                            </button>
                        </div>
                    </h2>
                    <div class="logs-container">
                        <div class="logs-stats" id="logs-stats">
                            <div class="log-stat">
                                <span class="stat-label">Total Logs:</span>
                                <span class="stat-value" id="total-logs">-</span>
                            </div>
                            <div class="log-stat">
                                <span class="stat-label">Recent Errors:</span>
                                <span class="stat-value" id="recent-errors">-</span>
                            </div>
                            <div class="log-stat">
                                <span class="stat-label">Recent Warnings:</span>
                                <span class="stat-value" id="recent-warnings">-</span>
                            </div>
                        </div>
                        <div class="logs-list" id="logs-list">
                            <div class="log-entry placeholder">
                                <i class="fas fa-spinner fa-spin"></i>
                                Loading logs...
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Alerts & Notifications -->
                <div class="queue-alerts-section">
                    <h2 class="dashboard-section-title">
                        <i class="fas fa-bell"></i>
                        Alerts & Notifications
                    </h2>
                    <div id="queue-alerts-container" class="alerts-container">
                        <!-- Alerts will be populated dynamically -->
                    </div>
                </div>
            </div>
        `;

        // Insert the dashboard into the queue monitor tab panel
        const tabPanel = document.getElementById('queue-monitor-tab');

        if (tabPanel) {
            tabPanel.innerHTML = dashboardHTML;
            this.initializeCharts();
        }
    }

    /**
     * Initialize Chart.js charts for real-time monitoring
     */
    initializeCharts() {
        // Check if Chart.js is available
        if (typeof Chart === 'undefined') {
            this.chartRetryCount++;
            if (this.chartRetryCount <= this.maxChartRetries) {
                console.warn(
                    `⚠️ ADMIN-QUEUE: Chart.js not loaded yet. Retrying in 1 second... (${this.chartRetryCount}/${this.maxChartRetries})`
                );
                // Retry after a short delay
                this.chartRetryTimer = setTimeout(() => {
                    this.initializeCharts();
                }, 1000);

                return;
            } else {
                console.error('❌ ADMIN-QUEUE: Chart.js failed to load after maximum retries. Charts will not be available.');
                this.showAlert('Chart.js library failed to load. Charts will not be available.', 'error');

                return;
            }
        }

        console.log('✅ ADMIN-QUEUE: Chart.js is available, initializing charts...');

        // Stop any existing retry timers
        if (this.chartRetryTimer) {
            clearTimeout(this.chartRetryTimer);
            this.chartRetryTimer = null;
        }

        // Destroy existing charts before reinitializing
        this.destroyExistingCharts();

        // Queue Size Chart
        if (!this.charts.queueSize) {
            this.charts.queueSize = this.createChart(
                'queue-size-chart',
                'Queue Size',
                'rgb(59, 130, 246)'
            );
        }

        // Processing Rate Chart
        if (!this.charts.processingRate) {
            this.charts.processingRate = this.createChart(
                'processing-rate-chart',
                'Tasks/Minute',
                'rgb(34, 197, 94)'
            );
        }

        // Error Rate Chart
        if (!this.charts.errorRate) {
            this.charts.errorRate = this.createChart(
                'error-rate-chart',
                'Error Rate %',
                'rgb(239, 68, 68)',
                {
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            );
        }

        // Processing Time Chart
        if (!this.charts.processingTime) {
            this.charts.processingTime = this.createChart(
                'processing-time-chart',
                'Avg Time (ms)',
                'rgb(168, 85, 247)'
            );
        }
    }

    /**
     * Start real-time monitoring
     */
    startRealTimeMonitoring() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.isMonitoring = true;
        this.updateMonitoringStatus();

        // Initial data load
        this.refreshQueueData();

        // Set up periodic refresh
        this.refreshTimer = setInterval(() => {
            // Only refresh if the queue monitor tab is visible
            const queueMonitorTab = document.getElementById('queue-monitor-tab');

            if (queueMonitorTab && queueMonitorTab.style.display !== 'none') {
                this.refreshQueueData();
            }
        }, this.refreshInterval);
    }

    /**
     * Stop real-time monitoring
     */
    stopRealTimeMonitoring() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        this.isMonitoring = false;
        this.updateMonitoringStatus();
    }

    /**
     * Refresh queue data from API
     */
    async refreshQueueData() {
        try {
            // Check authentication first
            if (!this.isAuthenticated()) {
                console.warn('⚠️ ADMIN-QUEUE: User not authenticated, skipping queue data refresh');

                return;
            }

            // Debounce rapid updates to prevent excessive API calls
            const now = Date.now();

            if (now - this.lastUpdateTime < this.updateDebounceMs) {
                return;
            }

            this.lastUpdateTime = now;

            // Use consolidated dashboard endpoint for optimal performance
            const response = await fetch(`${this.apiBaseUrl}/queue/dashboard`, {
                headers: {
                    Authorization: `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Authentication failed. Please refresh the page and log in again.');
                }
                throw new Error(`Failed to fetch queue data: ${response.status} ${response.statusText}`);
            }

            const dashboardData = await response.json();

            if (dashboardData.success) {
                this.updateDashboard(dashboardData.data.overview, dashboardData.data.metrics);
                this.updateCharts(dashboardData.data.metrics);
                this.checkAlerts(dashboardData.data.overview, dashboardData.data.metrics);
            }
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error refreshing queue data:', error);
            this.showAlert('Failed to refresh queue data', 'error');
        }
    }

    /**
     * Update dashboard with fresh data
     */
    updateDashboard(statusData, metricsData) {
        // Update status cards
        this.updateStatusCard('queue-size-value', statusData.current?.queueSize ?? 0);
        this.updateStatusCard('active-jobs-value', statusData.current?.activeJobs ?? 0);
        this.updateStatusCard('concurrency-value', statusData.current?.concurrency ?? 2);

        // Update health status
        this.updateHealthStatus(statusData.health?.status ?? 'unknown');

        // Update initialization status
        this.updateStatusCard('init-status', statusData.initialization?.isInitialized ? 'Initialized' : 'Not Initialized');
        this.updateStatusCard('last-init-time', statusData.initialization?.lastInitTime || 'Never');
        this.updateStatusCard('last-error', statusData.initialization?.lastError || 'None');

        // Update backpressure status
        if (metricsData.backpressure) {
            this.updateStatusCard('max-queue-size', metricsData.backpressure.maxQueueSize || 'N/A');
            this.updateStatusCard('waiting-room-cap', metricsData.backpressure.waitingRoomCap || 'N/A');
            this.updateStatusCard('utilization', `${Math.round(metricsData.backpressure.utilization || 0)}%`);
        }

        // Update performance metrics
        if (metricsData.performance) {
            this.updateStatusCard('avg-processing-time', `${Math.round(metricsData.performance.avgProcessingTime || 0)}ms`);
            this.updateStatusCard('success-rate', `${Math.round((metricsData.performance.successRate || 0) * 100)}%`);
            this.updateStatusCard('retry-rate', `${Math.round((metricsData.performance.retryRate || 0) * 100)}%`);
        }
    }

    /**
     * Update individual status card
     */
    updateStatusCard(elementId, value) {
        const element = document.getElementById(elementId);

        if (element) {
            element.textContent = value;
        }
    }

    /**
     * Update health status indicator
     */
    updateHealthStatus(status) {
        const indicator = document.getElementById('health-indicator');

        if (!indicator) { return; }

        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('.status-text');

        const statusConfig = {
            healthy: { color: 'green', text: 'Healthy' },
            warning: { color: 'yellow', text: 'Warning' },
            error: { color: 'red', text: 'Error' },
            unknown: { color: 'gray', text: 'Unknown' }
        };

        const config = statusConfig[status] || statusConfig.unknown;

        dot.className = `status-dot ${config.color}`;
        text.textContent = config.text;
    }

    /**
     * Update charts with new data
     */
    updateCharts(metricsData) {
        const now = new Date().toLocaleTimeString();

        // Update queue size chart
        if (this.charts.queueSize) {
            this.updateChart(this.charts.queueSize, now, metricsData.current?.queueSize || 0);
        }

        // Update processing rate chart
        if (this.charts.processingRate) {
            this.updateChart(this.charts.processingRate, now, metricsData.performance?.tasksPerMinute || 0);
        }

        // Update error rate chart
        if (this.charts.errorRate) {
            this.updateChart(this.charts.errorRate, now, (metricsData.performance?.errorRate || 0) * 100);
        }

        // Update processing time chart
        if (this.charts.processingTime) {
            this.updateChart(this.charts.processingTime, now, metricsData.performance?.avgProcessingTime || 0);
        }
    }

    /**
     * Update individual chart with optimized performance
     * @param {Chart} chart - Chart instance to update
     * @param {string} label - Data label
     * @param {number} value - Data value
     */
    updateChart(chart, label, value) {
        // Validate chart exists and has data structure
        if (!this.isValidChart(chart)) {
            console.warn('⚠️ ADMIN-QUEUE: Chart structure invalid, skipping update');

            return;
        }

        // Validate input data
        if (typeof value !== 'number' || isNaN(value)) {
            console.warn('⚠️ ADMIN-QUEUE: Invalid chart value, skipping update:', value);

            return;
        }

        try {
            // Add new data point
            chart.data.labels.push(label);
            chart.data.datasets[0].data.push(value);

            // Keep only last N data points for optimal performance
            if (chart.data.labels.length > AdminQueueMonitor.MAX_DATA_POINTS) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }

            // Use 'none' animation for real-time performance
            chart.update('none');
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error updating chart:', error);
        }
    }

    /**
     * Validate chart structure
     * @param {Chart} chart - Chart instance to validate
     * @returns {boolean} True if chart is valid
     */
    isValidChart(chart) {
        return chart &&
               chart.data &&
               chart.data.labels &&
               chart.data.datasets &&
               chart.data.datasets[0] &&
               Array.isArray(chart.data.labels) &&
               Array.isArray(chart.data.datasets[0].data);
    }

    /**
     * Check for alerts and warnings
     */
    checkAlerts(statusData, metricsData) {
        const alerts = [];

        // Queue size alerts
        const queueSize = statusData.current?.queueSize || 0;

        if (queueSize >= this.thresholds.queueSize.critical) {
            alerts.push({
                type: 'critical',
                message: `Queue size critical: ${queueSize} tasks`,
                icon: 'fas fa-exclamation-triangle'
            });
        } else if (queueSize >= this.thresholds.queueSize.warning) {
            alerts.push({
                type: 'warning',
                message: `Queue size high: ${queueSize} tasks`,
                icon: 'fas fa-exclamation-circle'
            });
        }

        // Active jobs alerts
        const activeJobs = statusData.current?.activeJobs || 0;

        if (activeJobs >= this.thresholds.activeJobs.critical) {
            alerts.push({
                type: 'critical',
                message: `High active jobs: ${activeJobs}`,
                icon: 'fas fa-cogs'
            });
        }

        // Error rate alerts
        const errorRate = metricsData.performance?.errorRate || 0;

        if (errorRate >= this.thresholds.errorRate.critical) {
            alerts.push({
                type: 'critical',
                message: `High error rate: ${Math.round(errorRate * 100)}%`,
                icon: 'fas fa-times-circle'
            });
        } else if (errorRate >= this.thresholds.errorRate.warning) {
            alerts.push({
                type: 'warning',
                message: `Elevated error rate: ${Math.round(errorRate * 100)}%`,
                icon: 'fas fa-exclamation-circle'
            });
        }

        // Processing time alerts
        const avgProcessingTime = metricsData.performance?.avgProcessingTime || 0;

        if (avgProcessingTime >= this.thresholds.avgProcessingTime.critical) {
            alerts.push({
                type: 'critical',
                message: `Slow processing: ${Math.round(avgProcessingTime / 1000)}s avg`,
                icon: 'fas fa-clock'
            });
        }

        this.displayAlerts(alerts);
    }

    /**
     * Display alerts in the alerts container
     */
    displayAlerts(alerts) {
        const container = document.getElementById('queue-alerts-container');

        if (!container) { return; }

        if (alerts.length === 0) {
            container.innerHTML = '<div class="no-alerts">No active alerts</div>';

            return;
        }

        const alertsHTML = alerts.map(alert => `
            <div class="alert alert-${alert.type}">
                <i class="${alert.icon}"></i>
                <span>${alert.message}</span>
            </div>
        `).join('');

        container.innerHTML = alertsHTML;
    }

    /**
     * Show temporary alert with visual feedback
     */
    showAlert(message, type = 'info') {
        console.log(`ALERT [${type.toUpperCase()}]: ${message}`);

        // Create visual alert if alert container exists
        const alertContainer = document.getElementById('queue-alerts');

        if (alertContainer) {
            const alertId = `alert-${Date.now()}`;
            const alertHTML = `
                <div id="${alertId}" class="queue-alert queue-alert-${type}">
                    <i class="fas fa-${this.getAlertIcon(type)}"></i>
                    <span>${message}</span>
                    <button onclick="this.parentElement.remove()" class="alert-close">&times;</button>
                </div>
            `;

            alertContainer.insertAdjacentHTML('beforeend', alertHTML);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                const alert = document.getElementById(alertId);

                if (alert) {
                    alert.remove();
                }
            }, 5000);
        }
    }

    /**
     * Get icon for alert type
     */
    getAlertIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-triangle',
            warning: 'exclamation-circle',
            info: 'info-circle'
        };

        return icons[type] || 'info-circle';
    }

    /**
     * Update monitoring status button
     */
    updateMonitoringStatus() {
        const button = document.getElementById('toggle-monitoring-btn');
        const status = document.getElementById('monitoring-status');

        if (button && status) {
            if (this.isMonitoring) {
                button.className = 'btn btn-warning';
                status.textContent = 'Stop Monitoring';
            } else {
                button.className = 'btn btn-info';
                status.textContent = 'Start Monitoring';
            }
        }
    }

    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        // Concurrency slider
        const concurrencySlider = document.getElementById('concurrency-slider');
        const concurrencyDisplay = document.getElementById('concurrency-display');

        if (concurrencySlider && concurrencyDisplay) {
            concurrencySlider.addEventListener('input', e => {
                concurrencyDisplay.textContent = e.target.value;
            });
        }

        // Update concurrency button
        const updateConcurrencyBtn = document.getElementById('update-concurrency-btn');

        if (updateConcurrencyBtn) {
            updateConcurrencyBtn.addEventListener('click', () => {
                this.updateConcurrency();
            });
        }

        // Queue control buttons
        const pauseBtn = document.getElementById('pause-queue-btn');
        const resumeBtn = document.getElementById('resume-queue-btn');
        const clearBtn = document.getElementById('clear-queue-btn');

        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseQueue());
        }
        if (resumeBtn) {
            resumeBtn.addEventListener('click', () => this.resumeQueue());
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearQueue());
        }

        // Monitoring controls
        const toggleMonitoringBtn = document.getElementById('toggle-monitoring-btn');
        const refreshDataBtn = document.getElementById('refresh-data-btn');

        if (toggleMonitoringBtn) {
            toggleMonitoringBtn.addEventListener('click', () => {
                if (this.isMonitoring) {
                    this.stopRealTimeMonitoring();
                } else {
                    this.startRealTimeMonitoring();
                }
            });
        }

        if (refreshDataBtn) {
            refreshDataBtn.addEventListener('click', () => {
                this.refreshQueueData();
            });
        }

        // Log controls
        const logLevelFilter = document.getElementById('log-level-filter');
        const refreshLogsBtn = document.getElementById('refresh-logs-btn');

        if (logLevelFilter) {
            logLevelFilter.addEventListener('change', () => this.loadLogs());
        }

        if (refreshLogsBtn) {
            refreshLogsBtn.addEventListener('click', () => this.loadLogs());
        }
    }

    /**
     * Load queue logs
     */
    async loadLogs() {
        try {
            const logLevelFilter = document.getElementById('log-level-filter');
            const level = logLevelFilter ? logLevelFilter.value : '';

            const response = await fetch(`${this.apiBaseUrl}/queue/logs?limit=50&level=${level}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.displayLogs(data.data.logs);
            this.loadLogStats();
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Failed to load logs:', error);
            this.showAlert('Failed to load queue logs', 'error');
        }
    }

    /**
     * Load log statistics
     */
    async loadLogStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/logs/stats`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${this.getAuthToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            this.displayLogStats(data.data.stats);
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Failed to load log stats:', error);
        }
    }

    /**
     * Display logs in the UI
     */
    displayLogs(logs) {
        const logsList = document.getElementById('logs-list');

        if (!logsList) { return; }

        if (logs.length === 0) {
            logsList.innerHTML = '<div class="log-entry placeholder">No logs available</div>';

            return;
        }

        const logsHTML = logs.map(log => {
            const levelClass = `log-${log.level}`;
            const timestamp = new Date(log.timestamp).toLocaleString();
            const contextStr = log.context ? JSON.stringify(log.context, null, 2) : '';
            const errorStr = log.error ? JSON.stringify(log.error, null, 2) : '';

            return `
                <div class="log-entry ${levelClass}">
                    <div class="log-header">
                        <span class="log-level">${log.level.toUpperCase()}</span>
                        <span class="log-timestamp">${timestamp}</span>
                        <span class="log-id">${log.id}</span>
                    </div>
                    <div class="log-message">${log.message}</div>
                    ${contextStr ? `<div class="log-context"><pre>${contextStr}</pre></div>` : ''}
                    ${errorStr ? `<div class="log-error"><pre>${errorStr}</pre></div>` : ''}
                </div>
            `;
        }).join('');

        logsList.innerHTML = logsHTML;
    }

    /**
     * Display log statistics
     */
    displayLogStats(stats) {
        const totalLogsEl = document.getElementById('total-logs');
        const recentErrorsEl = document.getElementById('recent-errors');
        const recentWarningsEl = document.getElementById('recent-warnings');

        if (totalLogsEl) {
            totalLogsEl.textContent = stats.total || 0;
        }
        if (recentErrorsEl) {
            recentErrorsEl.textContent = stats.recentErrors || 0;
        }
        if (recentWarningsEl) {
            recentWarningsEl.textContent = stats.recentWarnings || 0;
        }
    }

    /**
     * Update queue concurrency
     */
    async updateConcurrency() {
        const slider = document.getElementById('concurrency-slider');
        const newConcurrency = parseInt(slider.value);

        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/concurrency`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getAuthToken()}`
                },
                body: JSON.stringify({ concurrency: newConcurrency })
            });

            if (!response.ok) {
                throw new Error('Failed to update concurrency');
            }

            const result = await response.json();

            if (result.success) {
                this.showAlert(`Concurrency updated to ${newConcurrency}`, 'success');
                this.refreshQueueData();
            } else {
                throw new Error(result.error || 'Update failed');
            }
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error updating concurrency:', error);
            this.showAlert(`Failed to update concurrency: ${error.message}`, 'error');
        }
    }

    /**
     * Pause queue
     */
    async pauseQueue() {
        // Implementation for pausing queue
        this.showAlert('Queue pause functionality not yet implemented', 'info');
    }

    /**
     * Resume queue
     */
    async resumeQueue() {
        // Implementation for resuming queue
        this.showAlert('Queue resume functionality not yet implemented', 'info');
    }

    /**
     * Clear queue
     */
    async clearQueue() {
        if (!confirm('Are you sure you want to clear the queue? This will remove all pending tasks.')) {
            return;
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to clear queue');
            }

            const result = await response.json();

            if (result.success) {
                this.showAlert(`Queue cleared: ${result.data.clearedCount} tasks removed`, 'success');
                this.refreshQueueData();
            } else {
                throw new Error(result.error || 'Clear failed');
            }
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error clearing queue:', error);
            this.showAlert(`Failed to clear queue: ${error.message}`, 'error');
        }
    }

    /**
     * Get authentication token
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() || '';
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const token = this.getAuthToken();

        return token && token.length > 0;
    }

    /**
     * Cleanup when component is destroyed
     */
    destroy() {
        this.stopRealTimeMonitoring();

        // Clear retry timer
        if (this.chartRetryTimer) {
            clearTimeout(this.chartRetryTimer);
            this.chartRetryTimer = null;
        }

        // Clear polling timer
        if (this.chartPollingTimer) {
            clearInterval(this.chartPollingTimer);
            this.chartPollingTimer = null;
        }

        // Destroy charts
        this.destroyExistingCharts();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminQueueMonitor;
} else {
    window.AdminQueueMonitor = AdminQueueMonitor;
}
