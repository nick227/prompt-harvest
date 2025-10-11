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
        this._chartLoadedHandler = null;
        this._handlersAttached = false;
        this._abortController = null;
        this._visibilityHandler = null;
        this._handlers = {};

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
        this._initializeCore();
    }

    /**
     * Initialize when tab becomes active
     */
    initWhenActive() {
        this.stopRealTimeMonitoring();
        this._initializeCore();
        this._initializeChartLoading();
    }

    /**
     * Core initialization shared by init() and initWhenActive()
     * @private
     */
    _initializeCore() {
        this.createQueueDashboard();
        this.startRealTimeMonitoring();
        this.setupEventHandlers();
        this.loadLogs();
    }

    /**
     * Initialize Chart.js loading with proper cleanup (unified path)
     * @private
     */
    _initializeChartLoading() {
        // Remove old Chart.js event listener if exists
        if (this._chartLoadedHandler) {
            window.removeEventListener('chartjs-loaded', this._chartLoadedHandler);
        }

        // Listen for Chart.js loaded event with stored reference
        this._chartLoadedHandler = () => {
            this.chartRetryCount = 0;
            this._clearAllChartTimers();
            this.initializeCharts();
        };

        window.addEventListener('chartjs-loaded', this._chartLoadedHandler);

        // Check if Chart.js is already loaded
        if (typeof Chart !== 'undefined') {
            this.initializeCharts();
        } else {
            // Use single polling mechanism (not retry timer)
            this._startChartPolling();
        }
    }

    /**
     * Start polling for Chart.js availability (single path)
     * @private
     */
    _startChartPolling() {
        // Clear any existing polling timer
        if (this.chartPollingTimer) {
            clearInterval(this.chartPollingTimer);
        }

        let pollCount = 0;

        this.chartPollingTimer = setInterval(() => {
            pollCount++;

            if (typeof Chart !== 'undefined') {
                this._clearAllChartTimers();
                this.initializeCharts();
            } else if (pollCount >= AdminQueueMonitor.MAX_POLLING_ATTEMPTS) {
                console.warn('⚠️ ADMIN-QUEUE: Chart.js polling timeout, charts will not be available');
                this._clearAllChartTimers();
                this.showAlert('Chart.js library failed to load', 'warning');
            }
        }, AdminQueueMonitor.CHART_POLLING_INTERVAL);
    }

    /**
     * Clear all chart-related timers (unified cleanup)
     * @private
     */
    _clearAllChartTimers() {
        if (this.chartRetryTimer) {
            clearTimeout(this.chartRetryTimer);
            this.chartRetryTimer = null;
        }

        if (this.chartPollingTimer) {
            clearInterval(this.chartPollingTimer);
            this.chartPollingTimer = null;
        }
    }

    /**
     * Destroy existing charts to prevent canvas reuse errors
     */
    destroyExistingCharts() {

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
        const tabPanel = document.getElementById('queue-monitor-tab');

        if (tabPanel) {
            tabPanel.innerHTML = this._getDashboardTemplate();
            this.initializeCharts();
        }
    }

    /**
     * Get dashboard HTML template
     * @returns {string} Dashboard HTML
     * @private
     */
    _getDashboardTemplate() {
        return `
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
    }

    /**
     * Initialize Chart.js charts for real-time monitoring
     */
    initializeCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('⚠️ ADMIN-QUEUE: Chart.js not available, skipping chart initialization');

            return;
        }

        this._clearAllChartTimers();
        this.destroyExistingCharts();
        this._createAllCharts();
    }

    /**
     * Create all dashboard charts
     * @private
     */
    _createAllCharts() {
        this.charts.queueSize = this.createChart(
            'queue-size-chart',
            'Queue Size',
            'rgb(59, 130, 246)'
        );

        this.charts.processingRate = this.createChart(
            'processing-rate-chart',
            'Tasks/Minute',
            'rgb(34, 197, 94)'
        );

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

        this.charts.processingTime = this.createChart(
            'processing-time-chart',
            'Avg Time (ms)',
            'rgb(168, 85, 247)'
        );
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
            // Only refresh if page is visible and tab is active
            if (document.hidden) {
                return;
            }

            const queueMonitorTab = document.getElementById('queue-monitor-tab');

            if (queueMonitorTab && queueMonitorTab.style.display !== 'none') {
                this.refreshQueueData();
            }
        }, this.refreshInterval);

        // Setup Page Visibility API to pause polling when tab hidden
        this._setupVisibilityHandling();
    }

    /**
     * Stop real-time monitoring
     */
    stopRealTimeMonitoring() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        // Cancel any in-flight fetches
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        this.isMonitoring = false;
        this.updateMonitoringStatus();
    }

    /**
     * Setup Page Visibility API handling
     * @private
     */
    _setupVisibilityHandling() {
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
        }

        this._visibilityHandler = () => {
            if (document.hidden) {
                console.log('📴 ADMIN-QUEUE: Page hidden, pausing polling');
            } else if (this.isMonitoring) {
                console.log('👁️ ADMIN-QUEUE: Page visible, resuming polling');
                this.refreshQueueData();
            }
        };

        document.addEventListener('visibilitychange', this._visibilityHandler);
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

            // Cancel any in-flight request to prevent race conditions
            if (this._abortController) {
                this._abortController.abort();
            }

            // Create new AbortController for this request
            this._abortController = new AbortController();

            // Use consolidated dashboard endpoint for optimal performance
            const response = await fetch(`${this.apiBaseUrl}/queue/dashboard`, {
                headers: {
                    Authorization: `Bearer ${this.getAuthToken()}`
                },
                signal: this._abortController.signal
            });

            if (!response.ok) {
                if (response.status === 401) {
                    // Stop monitoring and show actionable error
                    this.stopRealTimeMonitoring();
                    this.showAlert(
                        'Authentication expired. Please refresh the page and log in again.',
                        'error'
                    );

                    return;
                }
                throw new Error(`Failed to fetch queue data: ${response.status} ${response.statusText}`);
            }

            const dashboardData = await response.json();

            if (dashboardData.success) {
                const { overview, metrics } = dashboardData.data;

                this.updateDashboard(overview, metrics);
                this.updateCharts(overview, metrics);
                this.checkAlerts(overview, metrics);
            }
        } catch (error) {
            // Ignore aborted requests (they're intentional cancellations)
            if (error.name === 'AbortError') {
                return;
            }

            console.error('❌ ADMIN-QUEUE: Error refreshing queue data:', error);
            this.showAlert('Failed to refresh queue data', 'error');
        }
    }

    /**
     * Update dashboard with fresh data
     */
    updateDashboard(statusData, metricsData) {
        // Update status cards - statusData is the overview object
        this.updateStatusCard('queue-size-value', statusData?.queueSize ?? 0);
        this.updateStatusCard('active-jobs-value', statusData?.activeJobs ?? 0);
        this.updateStatusCard('concurrency-value', statusData?.concurrency ?? 2);

        // Update health status - use status from overview or default
        this.updateHealthStatus(statusData?.status ?? 'unknown');

        // Update initialization status - overview has these fields
        this.updateStatusCard('init-status', statusData?.isInitialized ? 'Initialized' : 'Not Initialized');
        this.updateStatusCard('last-init-time', statusData?.lastInitTime || 'Never');
        this.updateStatusCard('last-error', statusData?.lastError || 'None');

        // Update backpressure status - from metrics.capacity
        if (metricsData?.capacity) {
            this.updateStatusCard('max-queue-size', metricsData.capacity.maxQueueSize || 'N/A');
            this.updateStatusCard('waiting-room-cap', 'N/A'); // Not available in current structure
            this.updateStatusCard('utilization', `${Math.round(metricsData.capacity.currentUtilization || 0)}%`);
        }

        // Update performance metrics - from metrics.performance
        if (metricsData?.performance) {
            const avgTime = metricsData.performance.avgProcessingTime || 0;
            const successRate = metricsData.performance.successRate || 0;
            const errorRate = metricsData.performance.errorRate || 0;

            this.updateStatusCard('avg-processing-time', `${Math.round(avgTime)}ms`);
            // Backend returns fractions (0.0-1.0), convert to percentage
            this.updateStatusCard('success-rate', `${Math.round(successRate * 100)}%`);
            this.updateStatusCard('retry-rate', `${Math.round(errorRate * 100)}%`);
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
    updateCharts(overviewData, metricsData) {
        const now = new Date().toLocaleTimeString();

        // Update queue size chart - from overview
        if (this.charts.queueSize) {
            this.updateChart(this.charts.queueSize, now, overviewData?.queueSize || 0);
        }

        // Update processing rate chart - from metrics.performance
        if (this.charts.processingRate) {
            const tasksPerMinute = metricsData?.performance?.tasksPerMinute || 0;

            this.updateChart(this.charts.processingRate, now, tasksPerMinute);
        }

        // Update error rate chart - from metrics.performance (convert to percentage)
        if (this.charts.errorRate) {
            const errorRate = (metricsData?.performance?.errorRate || 0) * 100;

            this.updateChart(this.charts.errorRate, now, errorRate);
        }

        // Update processing time chart - from metrics.performance
        if (this.charts.processingTime) {
            const avgTime = metricsData?.performance?.avgProcessingTime || 0;

            this.updateChart(this.charts.processingTime, now, avgTime);
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
        return !!(chart &&
               chart.data &&
               chart.data.labels &&
               chart.data.datasets &&
               chart.data.datasets[0] &&
               Array.isArray(chart.data.labels) &&
               Array.isArray(chart.data.datasets[0].data));
    }

    /**
     * Check for alerts and warnings
     */
    checkAlerts(statusData, metricsData) {
        const alerts = [];

        // Queue size alerts - statusData IS the overview, has queueSize directly
        const queueSize = statusData?.queueSize || 0;

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

        // Active jobs alerts - from overview
        const activeJobs = statusData?.activeJobs || 0;

        if (activeJobs >= this.thresholds.activeJobs.critical) {
            alerts.push({
                type: 'critical',
                message: `High active jobs: ${activeJobs}`,
                icon: 'fas fa-cogs'
            });
        }

        // Error rate alerts - from metrics.performance (already a fraction 0.0-1.0)
        const errorRate = metricsData?.performance?.errorRate || 0;

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

        // Processing time alerts - from metrics.performance
        const avgProcessingTime = metricsData?.performance?.avgProcessingTime || 0;

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
            container.textContent = '';
            const noAlerts = document.createElement('div');

            noAlerts.className = 'no-alerts';
            noAlerts.textContent = 'No active alerts';
            container.appendChild(noAlerts);

            return;
        }

        // Create alerts safely without innerHTML to prevent XSS
        container.textContent = '';
        alerts.forEach(alert => {
            const alertDiv = document.createElement('div');

            alertDiv.className = `alert alert-${this._sanitizeAlertType(alert.type)}`;

            const icon = document.createElement('i');

            icon.className = alert.icon;
            alertDiv.appendChild(icon);

            const message = document.createElement('span');

            message.textContent = alert.message;
            alertDiv.appendChild(message);

            container.appendChild(alertDiv);
        });
    }

    /**
     * Sanitize alert type to prevent XSS
     * @param {string} type - Alert type
     * @returns {string} Sanitized type
     * @private
     */
    _sanitizeAlertType(type) {
        const validTypes = ['critical', 'warning', 'info', 'success', 'error'];

        return validTypes.includes(type) ? type : 'info';
    }

    /**
     * Show temporary alert with visual feedback (XSS-safe)
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('queue-alerts');

        if (!alertContainer) { return; }

        const alertId = `alert-${Date.now()}`;
        const alertDiv = document.createElement('div');

        alertDiv.id = alertId;
        alertDiv.className = `queue-alert queue-alert-${this._sanitizeAlertType(type)}`;

        const icon = document.createElement('i');

        icon.className = `fas fa-${this.getAlertIcon(type)}`;
        alertDiv.appendChild(icon);

        const messageSpan = document.createElement('span');

        messageSpan.textContent = message;
        alertDiv.appendChild(messageSpan);

        const closeBtn = document.createElement('button');

        closeBtn.className = 'alert-close';
        closeBtn.textContent = '×';
        closeBtn.onclick = () => alertDiv.remove();
        alertDiv.appendChild(closeBtn);

        alertContainer.appendChild(alertDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (document.getElementById(alertId)) {
                alertDiv.remove();
            }
        }, 5000);
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
        if (this._handlersAttached) {
            return;
        }

        this._setupConcurrencyHandlers();
        this._setupQueueControlHandlers();
        this._setupMonitoringHandlers();
        this._setupLogHandlers();

        this._handlersAttached = true;
    }

    /**
     * Setup concurrency control handlers
     * @private
     */
    _setupConcurrencyHandlers() {
        const concurrencySlider = document.getElementById('concurrency-slider');
        const concurrencyDisplay = document.getElementById('concurrency-display');
        const updateConcurrencyBtn = document.getElementById('update-concurrency-btn');

        if (concurrencySlider && concurrencyDisplay) {
            this._handlers.concurrencyInput = e => {
                concurrencyDisplay.textContent = e.target.value;
            };
            concurrencySlider.addEventListener('input', this._handlers.concurrencyInput);
        }

        if (updateConcurrencyBtn) {
            this._handlers.updateConcurrency = () => this.updateConcurrency();
            updateConcurrencyBtn.addEventListener('click', this._handlers.updateConcurrency);
        }
    }

    /**
     * Setup queue control button handlers
     * @private
     */
    _setupQueueControlHandlers() {
        const pauseBtn = document.getElementById('pause-queue-btn');
        const resumeBtn = document.getElementById('resume-queue-btn');
        const clearBtn = document.getElementById('clear-queue-btn');

        if (pauseBtn) {
            this._handlers.pauseQueue = () => this.pauseQueue();
            pauseBtn.addEventListener('click', this._handlers.pauseQueue);
        }

        if (resumeBtn) {
            this._handlers.resumeQueue = () => this.resumeQueue();
            resumeBtn.addEventListener('click', this._handlers.resumeQueue);
        }

        if (clearBtn) {
            this._handlers.clearQueue = () => this.clearQueue();
            clearBtn.addEventListener('click', this._handlers.clearQueue);
        }
    }

    /**
     * Setup monitoring control handlers
     * @private
     */
    _setupMonitoringHandlers() {
        const toggleMonitoringBtn = document.getElementById('toggle-monitoring-btn');
        const refreshDataBtn = document.getElementById('refresh-data-btn');

        if (toggleMonitoringBtn) {
            this._handlers.toggleMonitoring = () => {
                if (this.isMonitoring) {
                    this.stopRealTimeMonitoring();
                } else {
                    this.startRealTimeMonitoring();
                }
            };
            toggleMonitoringBtn.addEventListener('click', this._handlers.toggleMonitoring);
        }

        if (refreshDataBtn) {
            this._handlers.refreshData = () => this.refreshQueueData();
            refreshDataBtn.addEventListener('click', this._handlers.refreshData);
        }
    }

    /**
     * Setup log control handlers
     * @private
     */
    _setupLogHandlers() {
        const logLevelFilter = document.getElementById('log-level-filter');
        const refreshLogsBtn = document.getElementById('refresh-logs-btn');

        if (logLevelFilter) {
            this._handlers.logLevelChange = () => this.loadLogs();
            logLevelFilter.addEventListener('change', this._handlers.logLevelChange);
        }

        if (refreshLogsBtn) {
            this._handlers.refreshLogs = () => this.loadLogs();
            refreshLogsBtn.addEventListener('click', this._handlers.refreshLogs);
        }
    }

    /**
     * Detach event handlers (for safe re-renders)
     * @private
     */
    _detachEventHandlers() {
        if (!this._handlers) {
            return;
        }

        const concurrencySlider = document.getElementById('concurrency-slider');
        const updateConcurrencyBtn = document.getElementById('update-concurrency-btn');
        const pauseBtn = document.getElementById('pause-queue-btn');
        const resumeBtn = document.getElementById('resume-queue-btn');
        const clearBtn = document.getElementById('clear-queue-btn');
        const toggleMonitoringBtn = document.getElementById('toggle-monitoring-btn');
        const refreshDataBtn = document.getElementById('refresh-data-btn');
        const logLevelFilter = document.getElementById('log-level-filter');
        const refreshLogsBtn = document.getElementById('refresh-logs-btn');

        if (concurrencySlider && this._handlers.concurrencyInput) {
            concurrencySlider.removeEventListener('input', this._handlers.concurrencyInput);
        }

        if (updateConcurrencyBtn && this._handlers.updateConcurrency) {
            updateConcurrencyBtn.removeEventListener('click', this._handlers.updateConcurrency);
        }

        if (pauseBtn && this._handlers.pauseQueue) {
            pauseBtn.removeEventListener('click', this._handlers.pauseQueue);
        }

        if (resumeBtn && this._handlers.resumeQueue) {
            resumeBtn.removeEventListener('click', this._handlers.resumeQueue);
        }

        if (clearBtn && this._handlers.clearQueue) {
            clearBtn.removeEventListener('click', this._handlers.clearQueue);
        }

        if (toggleMonitoringBtn && this._handlers.toggleMonitoring) {
            toggleMonitoringBtn.removeEventListener('click', this._handlers.toggleMonitoring);
        }

        if (refreshDataBtn && this._handlers.refreshData) {
            refreshDataBtn.removeEventListener('click', this._handlers.refreshData);
        }

        if (logLevelFilter && this._handlers.logLevelChange) {
            logLevelFilter.removeEventListener('change', this._handlers.logLevelChange);
        }

        if (refreshLogsBtn && this._handlers.refreshLogs) {
            refreshLogsBtn.removeEventListener('click', this._handlers.refreshLogs);
        }

        // Clear handler references
        this._handlers = {};
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
     * Display logs in the UI (XSS-safe)
     */
    displayLogs(logs) {
        const logsList = document.getElementById('logs-list');

        if (!logsList) { return; }

        // Clear existing logs
        logsList.textContent = '';

        if (logs.length === 0) {
            const placeholder = document.createElement('div');

            placeholder.className = 'log-entry placeholder';
            placeholder.textContent = 'No logs available';
            logsList.appendChild(placeholder);

            return;
        }

        // Create log entries safely without innerHTML
        logs.forEach(log => {
            const logEntry = this._createLogEntry(log);

            logsList.appendChild(logEntry);
        });
    }

    /**
     * Create a single log entry element (XSS-safe)
     * @param {Object} log - Log data
     * @returns {HTMLElement} Log entry element
     * @private
     */
    _createLogEntry(log) {
        const logEntry = document.createElement('div');

        logEntry.className = `log-entry log-${log.level}`;

        logEntry.appendChild(this._createLogHeader(log));
        logEntry.appendChild(this._createLogMessage(log.message));

        if (log.context) {
            logEntry.appendChild(this._createLogSection(log.context, 'log-context'));
        }

        if (log.error) {
            logEntry.appendChild(this._createLogSection(log.error, 'log-error'));
        }

        return logEntry;
    }

    /**
     * Create log header element
     * @private
     */
    _createLogHeader(log) {
        const header = document.createElement('div');

        header.className = 'log-header';

        const level = document.createElement('span');

        level.className = 'log-level';
        level.textContent = log.level.toUpperCase();
        header.appendChild(level);

        const timestamp = document.createElement('span');

        timestamp.className = 'log-timestamp';
        timestamp.textContent = new Date(log.timestamp).toLocaleString();
        header.appendChild(timestamp);

        const logId = document.createElement('span');

        logId.className = 'log-id';
        logId.textContent = log.id;
        header.appendChild(logId);

        return header;
    }

    /**
     * Create log message element
     * @private
     */
    _createLogMessage(messageText) {
        const message = document.createElement('div');

        message.className = 'log-message';
        message.textContent = messageText;

        return message;
    }

    /**
     * Create log section (context/error)
     * @private
     */
    _createLogSection(data, className) {
        const section = document.createElement('div');

        section.className = className;

        const pre = document.createElement('pre');

        pre.textContent = JSON.stringify(data, null, 2);
        section.appendChild(pre);

        return section;
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
     * Pause queue processing
     */
    async pauseQueue() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/pause`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to pause queue');
            }

            const result = await response.json();

            if (result.success) {
                this.showAlert('Queue paused successfully', 'success');
                this.refreshQueueData();
            } else {
                throw new Error(result.error || 'Pause failed');
            }
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error pausing queue:', error);
            this.showAlert(`Failed to pause queue: ${error.message}`, 'error');
        }
    }

    /**
     * Resume queue processing
     */
    async resumeQueue() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/queue/resume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.getAuthToken()}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to resume queue');
            }

            const result = await response.json();

            if (result.success) {
                this.showAlert('Queue resumed successfully', 'success');
                this.refreshQueueData();
            } else {
                throw new Error(result.error || 'Resume failed');
            }
        } catch (error) {
            console.error('❌ ADMIN-QUEUE: Error resuming queue:', error);
            this.showAlert(`Failed to resume queue: ${error.message}`, 'error');
        }
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
        // Stop monitoring (clears refreshTimer and aborts in-flight requests)
        this.stopRealTimeMonitoring();

        // Clear ALL timers
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }

        if (this.chartRetryTimer) {
            clearTimeout(this.chartRetryTimer);
            this.chartRetryTimer = null;
        }

        if (this.chartPollingTimer) {
            clearInterval(this.chartPollingTimer);
            this.chartPollingTimer = null;
        }

        // Cancel any in-flight requests
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        // Remove event listeners
        if (this._chartLoadedHandler) {
            window.removeEventListener('chartjs-loaded', this._chartLoadedHandler);
            this._chartLoadedHandler = null;
        }

        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
            this._visibilityHandler = null;
        }

        // Destroy charts
        this.destroyExistingCharts();

        // Detach event handlers before cleanup
        this._detachEventHandlers();

        // Reset handler attachment flag
        this._handlersAttached = false;

        // Clear debounce state
        this.lastUpdateTime = 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AdminQueueMonitor };
} else {
    window.AdminQueueMonitor = AdminQueueMonitor;
}
