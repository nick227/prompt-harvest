/**
 * SystemSettingsManager - Handles system settings CRUD operations in admin panel
 * Single Responsibility: Manage system settings UI and API interactions
 */

/* global AdminAPIService, AdminUtils */

class SystemSettingsManager {
    constructor() {
        this.apiService = new AdminAPIService();
        this.settings = [];
        this.isLoading = false;
    }

    init() {
        console.log('⚙️ SYSTEM-SETTINGS: Initializing system settings manager...');
        this.setupEventListeners();
        this.loadSettings();
        console.log('✅ SYSTEM-SETTINGS: System settings manager initialized');
    }

    setupEventListeners() {
        // Refresh settings button
        const refreshBtn = document.getElementById('refresh-settings');

        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadSettings());
        }

        // Add setting button
        const addBtn = document.getElementById('add-setting-btn');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.showAddSettingModal());
        }

        // Initialize defaults button
        const initBtn = document.getElementById('initialize-defaults-btn');

        if (initBtn) {
            initBtn.addEventListener('click', () => this.initializeDefaults());
        }
    }

    async loadSettings() {
        if (this.isLoading) { return; }

        this.isLoading = true;
        const container = document.getElementById('system-settings-list');

        try {
            container.innerHTML = '<div class="loading-placeholder">Loading system settings...</div>';

            const response = await this.apiService.get('/system-settings');

            if (response.success) {
                this.settings = response.data;
                this.renderSettings();
            } else {
                throw new Error(response.error || 'Failed to load system settings');
            }
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error loading settings:', error);
            container.innerHTML = `<div class="error-message">Failed to load system settings: ${error.message}</div>`;
        } finally {
            this.isLoading = false;
        }
    }

    renderSettings() {
        const container = document.getElementById('system-settings-list');

        if (!container) { return; }

        if (this.settings.length === 0) {
            container.innerHTML = '<div class="no-data">No system settings found. Click "Initialize Defaults" to create default settings.</div>';

            return;
        }

        const settingsHTML = this.settings.map(setting => `
            <div class="setting-item" data-key="${this.escapeHtml(setting.key)}">
                <div class="setting-header">
                    <div class="setting-key">
                        <strong>${this.escapeHtml(setting.key)}</strong>
                        <span class="setting-type">${setting.dataType}</span>
                    </div>
                    <div class="setting-actions">
                        <button class="btn btn-sm btn-outline edit-setting-btn" data-key="${this.escapeHtml(setting.key)}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger delete-setting-btn" data-key="${this.escapeHtml(setting.key)}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = settingsHTML;
        this.setupSettingEventListeners();
    }

    setupSettingEventListeners() {
        const container = document.getElementById('system-settings-list');

        if (!container) { return; }

        // Edit setting buttons
        container.addEventListener('click', e => {
            const editBtn = e.target.closest('.edit-setting-btn');

            if (editBtn) {
                const { key } = editBtn.dataset;

                this.editSetting(key);

                return;
            }

            // Delete setting buttons
            const deleteBtn = e.target.closest('.delete-setting-btn');

            if (deleteBtn) {
                const { key } = deleteBtn.dataset;

                this.deleteSetting(key);

                return;
            }
        });
    }

    showAddSettingModal() {
        const modalContent = `
            <form id="add-setting-form">
                <div class="form-group">
                    <label for="setting-key">Setting Key:</label>
                    <input type="text" id="setting-key" class="form-control" placeholder="e.g., new_user_welcome_credits" required>
                    <small class="form-text">Unique identifier for the setting</small>
                </div>
                <div class="form-group">
                    <label for="setting-value">Value:</label>
                    <input type="text" id="setting-value" class="form-control" placeholder="Enter value..." required>
                </div>
                <div class="form-group">
                    <label for="setting-type">Data Type:</label>
                    <select id="setting-type" class="form-control" required>
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="json">JSON</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="setting-description">Description:</label>
                    <textarea id="setting-description" class="form-control" rows="3" placeholder="Describe what this setting controls..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="window.adminModal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Setting</button>
                </div>
            </form>
        `;

        window.adminModal.show('Add System Setting', modalContent, { size: 'md' });

        // Setup form submission
        setTimeout(() => {
            const form = document.getElementById('add-setting-form');

            if (form) {
                form.addEventListener('submit', e => {
                    e.preventDefault();
                    this.saveNewSetting();
                });
            }
        }, 100);
    }

    async saveNewSetting() {
        const key = document.getElementById('setting-key').value.trim();
        const value = document.getElementById('setting-value').value.trim();
        const dataType = document.getElementById('setting-type').value;
        const description = document.getElementById('setting-description').value.trim();

        if (!key || !value) {
            this.showNotification('Key and value are required!', 'error');

            return;
        }

        try {
            const response = await this.apiService.post('/system-settings', {
                key,
                value: this.convertValue(value, dataType),
                description,
                dataType
            });

            if (response.success) {
                this.showNotification(`Setting "${key}" created successfully`, 'success');
                window.adminModal.close();
                this.loadSettings();
            } else {
                throw new Error(response.error || 'Failed to create setting');
            }
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error creating setting:', error);
            this.showNotification(`Failed to create setting: ${error.message}`, 'error');
        }
    }

    editSetting(key) {
        const setting = this.settings.find(s => s.key === key);

        if (!setting) { return; }

        const modalContent = `
            <form id="edit-setting-form">
                <div class="form-group">
                    <label for="edit-setting-key">Setting Key:</label>
                    <input type="text" id="edit-setting-key" class="form-control" value="${this.escapeHtml(setting.key)}" readonly>
                    <small class="form-text">Key cannot be changed</small>
                </div>
                <div class="form-group">
                    <label for="edit-setting-value">Value:</label>
                    <input type="text" id="edit-setting-value" class="form-control" value="${this.escapeHtml(String(setting.convertedValue))}" required>
                </div>
                <div class="form-group">
                    <label for="edit-setting-type">Data Type:</label>
                    <select id="edit-setting-type" class="form-control" required>
                        <option value="string" ${setting.dataType === 'string' ? 'selected' : ''}>String</option>
                        <option value="number" ${setting.dataType === 'number' ? 'selected' : ''}>Number</option>
                        <option value="boolean" ${setting.dataType === 'boolean' ? 'selected' : ''}>Boolean</option>
                        <option value="json" ${setting.dataType === 'json' ? 'selected' : ''}>JSON</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit-setting-description">Description:</label>
                    <textarea id="edit-setting-description" class="form-control" rows="3">${this.escapeHtml(setting.description || '')}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-outline" onclick="window.adminModal.close()">Cancel</button>
                    <button type="submit" class="btn btn-primary">Update Setting</button>
                </div>
            </form>
        `;

        window.adminModal.show(`Edit Setting: ${this.escapeHtml(setting.key)}`, modalContent, { size: 'md' });

        // Setup form submission
        setTimeout(() => {
            const form = document.getElementById('edit-setting-form');

            if (form) {
                form.addEventListener('submit', e => {
                    e.preventDefault();
                    this.updateSetting(key);
                });
            }
        }, 100);
    }

    async updateSetting(key) {
        const value = document.getElementById('edit-setting-value').value.trim();
        const dataType = document.getElementById('edit-setting-type').value;
        const description = document.getElementById('edit-setting-description').value.trim();

        if (!value) {
            this.showNotification('Value is required!', 'error');

            return;
        }

        try {
            const response = await this.apiService.post('/system-settings', {
                key,
                value: this.convertValue(value, dataType),
                description,
                dataType
            });

            if (response.success) {
                this.showNotification(`Setting "${key}" updated successfully`, 'success');
                window.adminModal.close();
                this.loadSettings();
            } else {
                throw new Error(response.error || 'Failed to update setting');
            }
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error updating setting:', error);
            this.showNotification(`Failed to update setting: ${error.message}`, 'error');
        }
    }

    async deleteSetting(key) {
        if (!confirm(`Are you sure you want to delete the setting "${key}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await this.apiService.delete(`/system-settings/${encodeURIComponent(key)}`);

            if (response.success) {
                this.showNotification(`Setting "${key}" deleted successfully`, 'success');
                this.loadSettings();
            } else {
                throw new Error(response.error || 'Failed to delete setting');
            }
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error deleting setting:', error);
            this.showNotification(`Failed to delete setting: ${error.message}`, 'error');
        }
    }

    async initializeDefaults() {
        if (!confirm('This will create default system settings. Existing settings will be updated. Continue?')) {
            return;
        }

        try {
            const response = await this.apiService.post('/system-settings/initialize');

            if (response.success) {
                this.showNotification('Default system settings initialized successfully', 'success');
                this.loadSettings();
            } else {
                throw new Error(response.error || 'Failed to initialize defaults');
            }
        } catch (error) {
            console.error('❌ SYSTEM-SETTINGS: Error initializing defaults:', error);
            this.showNotification(`Failed to initialize defaults: ${error.message}`, 'error');
        }
    }

    convertValue(value, dataType) {
        switch (dataType) {
            case 'number':
                return parseInt(value, 10);
            case 'boolean':
                return value === 'true' || value === true;
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    formatValue(value, dataType) {
        switch (dataType) {
            case 'boolean':
                return value ? 'true' : 'false';
            case 'json':
                return JSON.stringify(value);
            default:
                return String(value);
        }
    }

    formatTimestamp(timestamp) {
        if (!timestamp) { return 'Unknown'; }
        const date = new Date(timestamp);

        return date.toLocaleString();
    }

    escapeHtml(text) {
        if (!text) { return ''; }
        const div = document.createElement('div');

        div.textContent = text;

        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Use the global notification system if available
        if (window.adminApp && window.adminApp.showNotification) {
            window.adminApp.showNotification(message, type);
        } else {
            console.log(`🔔 SYSTEM-SETTINGS: ${message}`);
        }
    }
}

// Export for global access
window.SystemSettingsManager = SystemSettingsManager;
