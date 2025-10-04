/**
 * Admin Package Manager
 * Handles package and provider management operations in the admin dashboard
 * Single Responsibility: Manage package and provider operations (CRUD, activate, deactivate, etc.)
 */

class AdminPackageManager {
    constructor(uiRenderer = null) {
        this.uiRenderer = uiRenderer;
        this.apiBaseUrl = '/api/admin';
        this.currentPackages = [];
        this.isLoading = false;
        this.sharedTable = new AdminSharedTable();
    }

    /**
     * Initialize package handler
     */
    async init() {
        console.log('📦 ADMIN-PACKAGES: Initializing package handler...');

        // Check authentication before initializing
        if (!window.AdminAuthUtils?.hasValidToken()) {
            console.warn('🔐 ADMIN-PACKAGES: No valid token, skipping package handler initialization');
            return;
        }

        // Initialize shared table
        this.sharedTable.init();

        // Setup event listeners
        this.setupEventListeners();

        // Load initial packages (but don't render table yet - wait for tab to be rendered)
        await this.loadPackagesData();

        console.log('✅ ADMIN-PACKAGES: Package handler initialized');
    }

    /**
     * Setup event listeners for package management
     */
    setupEventListeners() {
        console.log('📦 ADMIN-PACKAGES: Setting up event listeners');

        // Listen for admin table actions
        document.addEventListener('admin-table-action', event => {
            console.log('📦 ADMIN-PACKAGES: admin-table-action event received:', event.detail);
            const { action, data, dataType } = event.detail;

            // Only handle package-related actions
            if (dataType !== 'packages') {
                console.log('📦 ADMIN-PACKAGES: Ignoring non-package action:', dataType);
                return;
            }

            console.log('📦 ADMIN-PACKAGES: Processing package action:', action);
            switch (action) {
                case 'create':
                case 'create-package':
                    console.log('📦 ADMIN-PACKAGES: admin-table-action create-package received');
                    this.showCreatePackageForm();
                    break;
                case 'edit':
                    this.showEditPackageForm(data);
                    break;
                case 'delete':
                    this.showDeletePackageConfirmation(data);
                    break;
            }
        });

        // Listen for form submissions
        document.addEventListener('admin-form-submit', event => {
            const { formType, data } = event.detail;

            if (formType === 'package-form') {
                this.handlePackageFormSubmit(data);
            }
        });

        // Listen for package-specific button clicks
        document.addEventListener('click', event => {
            if (event.target.matches('[data-action="create-package"]')) {
                console.log('📦 ADMIN-PACKAGES: Add Package button clicked');
                event.preventDefault();
                this.showCreatePackageForm();
            } else if (event.target.matches('[data-action="edit"]') && event.target.closest('table[data-type="packages"]')) {
                event.preventDefault();
                const { id } = event.target.dataset;
                const packageData = this.currentPackages.find(pkg => pkg.id === id);

                if (packageData) {
                    this.showEditPackageForm(packageData);
                }
            } else if (event.target.matches('[data-action="delete"]') && event.target.closest('table[data-type="packages"]')) {
                event.preventDefault();
                const { id } = event.target.dataset;
                const packageData = this.currentPackages.find(pkg => pkg.id === id);

                if (packageData) {
                    this.showDeletePackageConfirmation(packageData);
                }
            }
        });
    }

    /**
     * Load packages data from API (without rendering table)
     */
    async loadPackagesData() {
        try {
            this.isLoading = true;

            console.log('📦 ADMIN-PACKAGES: Starting to load packages data...');

            // Check authentication first
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-PACKAGES: No valid token available, skipping packages load');
                this.isLoading = false;
                return;
            }

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                console.log('🔑 ADMIN-PACKAGES: Using AdminAPIService for authenticated request');
                const result = await window.adminApiService.request('GET', '/packages');

                if (result.success) {
                    this.currentPackages = result.data;
                    console.log('✅ ADMIN-PACKAGES: Packages data loaded successfully via AdminAPIService');
                } else {
                    throw new Error(result.message || 'Failed to load packages');
                }
            } else {
                // Fallback to direct fetch with auth headers
                console.log('🔑 ADMIN-PACKAGES: Using direct fetch with auth headers');

                const headers = window.AdminAuthUtils.getAuthHeaders();

                const response = await fetch('/api/admin/packages', {
                    method: 'GET',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    this.currentPackages = result.data;
                    console.log('✅ ADMIN-PACKAGES: Packages data loaded successfully via fallback');
                } else {
                    throw new Error(result.message || 'Failed to load packages');
                }
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error loading packages data:', error);
            this.currentPackages = [];
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Load packages from API and render table
     */
    async loadPackages() {
        try {
            this.isLoading = true;

            console.log('📦 ADMIN-PACKAGES: Starting to load packages...');
            console.log('📦 ADMIN-PACKAGES: AdminAPIService available:', !!window.adminApiService);
            console.log('📦 ADMIN-PACKAGES: window.adminApiService:', window.adminApiService);

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                console.log('🔑 ADMIN-PACKAGES: Using AdminAPIService for authenticated request');
                const result = await window.adminApiService.request('GET', '/packages');

                if (result.success) {
                    this.currentPackages = result.data;
                    this.renderPackagesTable();
                    console.log('✅ ADMIN-PACKAGES: Packages loaded successfully via AdminAPIService');
                } else {
                    throw new Error(result.message || 'Failed to load packages');
                }
            } else {
                // Fallback to direct fetch with auth headers
                console.log('🔑 ADMIN-PACKAGES: Using direct fetch with auth headers');

                const headers = window.AdminAuthUtils.getAuthHeaders();

                const response = await fetch(`${this.apiBaseUrl}/packages`, {
                    method: 'GET',
                    credentials: 'include',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                console.log('📦 ADMIN-PACKAGES: API response:', result);

                if (result.success) {
                    this.currentPackages = result.data;
                    console.log('📦 ADMIN-PACKAGES: Current packages set to:', this.currentPackages);
                    this.renderPackagesTable();
                    console.log('✅ ADMIN-PACKAGES: Packages loaded successfully via fallback');
                } else {
                    throw new Error(result.message || 'Failed to load packages');
                }
            }

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Load packages failed:', error);
            this.showError(`Failed to load packages: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show modal (interface expected by admin-ui-renderer)
     */
    showModal(packageId = null) {
        if (packageId) {
            const packageData = this.currentPackages.find(pkg => pkg.id === packageId);

            if (packageData) {
                this.showEditPackageForm(packageData);
            } else {
                this.showError('Package not found');
            }
        } else {
            this.showCreatePackageForm();
        }
    }

    /**
     * Show create package form
     */
    showCreatePackageForm() {
        console.log('📦 ADMIN-PACKAGES: showCreatePackageForm called');

        const formData = {
            id: '',
            name: '',
            credits: 10,
            price: 9.99,
            description: '',
            popular: false
        };

        console.log('📦 ADMIN-PACKAGES: Calling showPackageForm with data:', formData);
        this.showPackageForm('Create Package', formData);
    }

    /**
     * Show edit package form
     */
    showEditPackageForm(packageData) {
        const formData = {
            ...packageData,
            price: packageData.price / 100 // Convert cents to dollars for form
        };

        this.showPackageForm('Edit Package hhh', formData);
    }

    /**
     * Show package form modal
     */
    showPackageForm(title, formData) {
        console.log('📦 ADMIN-PACKAGES: showPackageForm called with title:', title);
        console.log('📦 ADMIN-PACKAGES: window.showModal available:', !!window.showModal);
        console.log('📦 ADMIN-PACKAGES: window.adminModal available:', !!window.adminModal);

        const modalContent = this.generatePackageForm(formData);
        console.log('📦 ADMIN-PACKAGES: Generated modal content length:', modalContent.length);

        // Show modal using the admin modal system
        if (window.showModal) {
            console.log('📦 ADMIN-PACKAGES: Using window.showModal');
            try {
                window.showModal(title, modalContent);
                console.log('📦 ADMIN-PACKAGES: showModal called successfully');
            } catch (error) {
                console.error('📦 ADMIN-PACKAGES: Error calling showModal:', error);
            }
        } else {
            console.log('📦 ADMIN-PACKAGES: Using fallback createModal');
            // Fallback: create modal manually
            this.createModal(title, modalContent);
        }

        // Set package ID on form if editing
        const form = document.getElementById('package-form');

        if (form && formData.id) {
            form.dataset.packageId = formData.id;
        }

        // Setup form event listeners
        this.setupFormEventListeners();

        // Setup pricing calculator
        this.setupPricingCalculator();
    }

    /**
     * Generate package form HTML
     */
    generatePackageForm(formData) {
        return `
            <form id="package-form" class="space-y-6">
                <div>
                    <label for="package-name" class="block text-sm font-medium text-gray-700 mb-2">
                        Package Name <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="package-name" name="name" value="${formData.name}"
                           class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                           required>
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label for="package-credits" class="block text-sm font-medium text-gray-700 mb-2">
                            Credits <span class="text-red-500">*</span>
                        </label>
                        <input type="number" id="package-credits" name="credits" value="${formData.credits}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                               min="1" max="10000" required>
                    </div>

                    <div>
                        <label for="package-price" class="block text-sm font-medium text-gray-700 mb-2">
                            Price (USD) <span class="text-red-500">*</span>
                        </label>
                        <input type="number" id="package-price" name="price" value="${formData.price}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                               min="0.00" max="1000" step="0.01" required>
                    </div>
                </div>

                <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
                    <h4 class="text-sm font-medium text-blue-900 mb-4 flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
                        </svg>
                        Pricing Calculator
                    </h4>
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                            <label for="price-per-credit" class="block text-xs font-medium text-blue-700 mb-2">
                                Price per Credit
                            </label>
                            <input type="number" id="price-per-credit"
                                   class="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white font-mono"
                                   step="0.001" readonly>
                        </div>
                        <div>
                            <label for="profit-margin" class="block text-xs font-medium text-blue-700 mb-2">
                                Profit Margin
                            </label>
                            <input type="number" id="profit-margin"
                                   class="w-full px-3 py-2 text-sm border border-blue-200 rounded-md bg-white font-mono font-semibold"
                                   step="0.1" readonly>
                        </div>
                    </div>
                    <p class="text-xs text-blue-600 mt-3 flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Based on average Dezgo cost of $0.015 per credit
                    </p>
                </div>

                <div>
                    <label for="package-description" class="block text-sm font-medium text-gray-700 mb-2">
                        Description <span class="text-red-500">*</span>
                    </label>
                    <textarea id="package-description" name="description" rows="3"
                              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                              required>${formData.description}</textarea>
                </div>

                <div class="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input type="checkbox" id="package-popular" name="popular" ${formData.popular ? 'checked' : ''}
                           class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded">
                    <label for="package-popular" class="ml-3 block text-sm font-medium text-gray-700">
                        Mark as popular package
                    </label>
                </div>

                <div class="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                    <button type="button" id="cancel-package-form"
                            class="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" id="submit-package-form"
                            class="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                        ${formData.id ? 'Update Package' : 'Create Package'}
                    </button>
                </div>
            </form>
        `;
    }

    /**
     * Setup form event listeners
     */
    setupFormEventListeners() {
        const form = document.getElementById('package-form');
        const cancelBtn = document.getElementById('cancel-package-form');

        if (form) {
            form.addEventListener('submit', e => {
                e.preventDefault();
                this.handlePackageFormSubmit();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideModal();
            });
        }
    }

    /**
     * Setup pricing calculator
     */
    setupPricingCalculator() {
        const creditsInput = document.getElementById('package-credits');
        const priceInput = document.getElementById('package-price');
        const pricePerCreditInput = document.getElementById('price-per-credit');
        const profitMarginInput = document.getElementById('profit-margin');

        const updateCalculations = () => {
            const credits = parseFloat(creditsInput?.value) || 0;
            const price = parseFloat(priceInput?.value) || 0;

            if (credits > 0 && price > 0) {
                const pricePerCredit = price / credits;
                const averageDezgoCost = 0.015; // $0.015 per credit average
                const profitMargin = ((pricePerCredit - averageDezgoCost) / pricePerCredit * 100);

                if (pricePerCreditInput) {
                    pricePerCreditInput.value = pricePerCredit.toFixed(4);
                }
                if (profitMarginInput) {
                    profitMarginInput.value = profitMargin.toFixed(1);
                    // Color code the profit margin
                    profitMarginInput.style.color = profitMargin > 50
                        ? '#059669' :
                        profitMargin > 25 ? '#d97706' : '#dc2626';
                }
            }
        };

        if (creditsInput) {
            creditsInput.addEventListener('input', updateCalculations);
        }
        if (priceInput) {
            priceInput.addEventListener('input', updateCalculations);
        }

        // Initial calculation
        updateCalculations();
    }

    /**
     * Handle package form submission
     */
    async handlePackageFormSubmit() {
        const form = document.getElementById('package-form');

        if (!form) {
            return;
        }

        const formData = new FormData(form);

        // Get raw values
        const rawName = formData.get('name');
        const rawCredits = formData.get('credits');
        const rawPrice = formData.get('price');
        const rawDescription = formData.get('description');
        const rawPopular = formData.get('popular');

        // Convert and validate data types
        const packageData = {
            name: rawName,
            credits: parseInt(rawCredits, 10),
            price: parseFloat(rawPrice),
            description: rawDescription,
            popular: rawPopular === 'on'
        };

        // Ensure proper data types
        if (!packageData.name || packageData.name.trim() === '') {
            this.showError('Package name is required');

            return;
        }
        if (isNaN(packageData.credits) || packageData.credits < 1) {
            this.showError('Credits must be a positive number');

            return;
        }
        if (isNaN(packageData.price) || packageData.price < 0.00) {
            this.showError('Price must be at least $0.00');

            return;
        }
        if (!packageData.description || packageData.description.trim() === '') {
            this.showError('Description is required');

            return;
        }

        // Debug logging
        console.log('📦 ADMIN-PACKAGES: Raw form values:', {
            name: rawName,
            credits: rawCredits,
            price: rawPrice,
            description: rawDescription,
            popular: rawPopular
        });
        console.log('📦 ADMIN-PACKAGES: Converted package data:', packageData);
        console.log('📦 ADMIN-PACKAGES: Data types after conversion:', {
            name: typeof packageData.name,
            credits: typeof packageData.credits,
            price: typeof packageData.price,
            description: typeof packageData.description,
            popular: typeof packageData.popular
        });

        // Get the package ID from the form data if editing, or auto-generate for new packages
        const { packageId } = form.dataset;

        if (packageId) {
            packageData.id = packageId;
        }

        // Validate form data (temporarily disabled for debugging)
        // if (!this.validatePackageData(packageData)) {
        //     return;
        // }

        try {
            this.isLoading = true;

            const isEdit = packageData.id && this.currentPackages.find(pkg => pkg.id === packageData.id);

            // Check if AdminAPIService is available
            console.log('📦 ADMIN-PACKAGES: AdminAPIService available:', !!window.adminApiService);
            console.log('📦 ADMIN-PACKAGES: Auth token available:', !!localStorage.getItem('authToken'));

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                console.log('📦 ADMIN-PACKAGES: Using AdminAPIService');
                let result;

                if (isEdit) {
                    result = await window.adminApiService.request('PUT', `/packages/${packageData.id}`, packageData);
                } else {
                    result = await window.adminApiService.request('POST', '/packages', packageData);
                }

                if (result.success) {
                    this.showSuccess(isEdit ? 'Package updated successfully!' : 'Package created successfully!');
                    this.hideModal();
                    await this.loadPackages(); // Reload packages
                } else {
                    throw new Error(result.message || 'Failed to save package');
                }
            } else {
                // Fallback to direct fetch with auth headers
                console.log('📦 ADMIN-PACKAGES: Using fallback fetch method');
                const url = isEdit ? `${this.apiBaseUrl}/packages/${packageData.id}` : `${this.apiBaseUrl}/packages`;
                const method = isEdit ? 'PUT' : 'POST';

                const headers = window.AdminAuthUtils.getAuthHeaders();

                console.log('📦 ADMIN-PACKAGES: Fallback fetch details:', {
                    url,
                    method,
                    headers,
                    body: packageData
                });

                const response = await fetch(url, {
                    method,
                    credentials: 'include',
                    headers,
                    body: JSON.stringify(packageData)
                });

                if (!response.ok) {
                    // Try to get error details from response body
                    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

                    try {
                        const errorResult = await response.json();

                        if (errorResult.message) {
                            errorMessage = errorResult.message;
                        }
                    } catch (e) {
                        // If we can't parse the error response, use the default message
                    }
                    throw new Error(errorMessage);
                }

                const result = await response.json();

                if (result.success) {
                    this.showSuccess(isEdit ? 'Package updated successfully!' : 'Package created successfully!');
                    this.hideModal();
                    await this.loadPackages(); // Reload packages
                } else {
                    throw new Error(result.message || 'Failed to save package');
                }
            }

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Save package failed:', error);
            console.error('❌ ADMIN-PACKAGES: Error details:', {
                message: error.message,
                stack: error.stack,
                packageData
            });

            // Check if it's a duplicate name error
            if (error.message.includes('Package with name') && error.message.includes('already exists')) {
                this.showError('Package name already exists. Please choose a different name.');
            } else if (error.message.includes('Package name already exists')) {
                this.showError('Package name already exists. Please choose a different name.');
            } else if (error.message.includes('Invalid package data')) {
                this.showError('Invalid package data. Please check all fields and try again.');
            } else {
                this.showError(`Failed to save package: ${error.message}`);
            }
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Show delete package confirmation
     */
    showDeletePackageConfirmation(packageData) {
        const confirmMessage = `
            <div class="text-center">
                <div class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Delete Package</h3>
                <p class="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete the package "${packageData.name}"? This action cannot be undone.
                </p>
                <div class="flex justify-center space-x-3">
                    <button type="button" id="cancel-delete-package"
                            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200">
                        Cancel
                    </button>
                    <button type="button" id="confirm-delete-package" data-package-id="${packageData.id}"
                            class="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700">
                        Delete Package
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
        document.getElementById('cancel-delete-package').addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('confirm-delete-package').addEventListener('click', async e => {
            const { packageId } = e.target.dataset;

            await this.deletePackage(packageId);
        });
    }

    /**
     * Activate package
     */
    async activatePackage(packageId) {
        try {
            const response = await fetch(`/api/packages/${packageId}/activate`, {
                method: 'POST',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                await this.loadPackages();
                this.showSuccess('Package activated successfully');
            } else {
                const error = await response.json();

                this.showError(`Failed to activate package: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error activating package:', error);
            this.showError(`Failed to activate package: ${error.message}`);
        }
    }

    /**
     * Deactivate package
     */
    async deactivatePackage(packageId) {
        try {
            const response = await fetch(`/api/packages/${packageId}/deactivate`, {
                method: 'POST',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                await this.loadPackages();
                this.showSuccess('Package deactivated successfully');
            } else {
                const error = await response.json();

                this.showError(`Failed to deactivate package: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error deactivating package:', error);
            this.showError(`Failed to deactivate package: ${error.message}`);
        }
    }

    /**
     * Configure provider
     */
    async configureProvider(providerId) {
        try {
            // Fetch provider data
            const response = await fetch(`/api/providers/${providerId}`, {
                headers: window.AdminAuthUtils.getAuthHeaders()
            });
            const result = await response.json();

            if (result.success) {
                this.showProviderConfigModal(result.data);
            } else {
                throw new Error(result.error || 'Failed to fetch provider data');
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error loading provider for configuration:', error);
            this.showError(`Failed to load provider: ${error.message}`);
        }
    }

    showProviderConfigModal(provider) {
        const modalHtml = `
            <div class="modal fade" id="providerConfigModal" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Configure Provider: ${provider.name}</h5>
                            <button type="button" class="close" data-dismiss="modal">
                                <span>&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form id="providerConfigForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="providerName">Provider Name</label>
                                            <input type="text" id="providerName" class="form-control" value="${provider.name}" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="form-group">
                                            <label for="providerStatus">Status</label>
                                            <select id="providerStatus" class="form-control">
                                                <option value="active" ${provider.status === 'active' ? 'selected' : ''}>Active</option>
                                                <option value="inactive" ${provider.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                                <option value="maintenance" ${provider.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label for="providerApiKey">API Key</label>
                                    <input type="password" id="providerApiKey" class="form-control" placeholder="Enter API key to update">
                                    <small class="form-text text-muted">Leave blank to keep current API key</small>
                                </div>

                                <div class="form-group">
                                    <label for="providerConfig">Configuration (JSON)</label>
                                    <textarea id="providerConfig" class="form-control" rows="6" placeholder="Enter provider-specific configuration as JSON">${JSON.stringify(provider.config || {}, null, 2)}</textarea>
                                    <small class="form-text text-muted">Provider-specific configuration settings</small>
                                </div>

                                <div class="form-group">
                                    <div class="form-check">
                                        <input type="checkbox" id="providerEnabled" class="form-check-input" ${provider.enabled ? 'checked' : ''}>
                                        <label for="providerEnabled" class="form-check-label">
                                            Provider Enabled
                                        </label>
                                        <small class="form-text text-muted">Disable to prevent new requests to this provider</small>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-warning" id="testProviderBtn">
                                <i class="fas fa-vial"></i> Test Connection
                            </button>
                            <button type="button" class="btn btn-primary" id="saveProviderConfigBtn">
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('providerConfigModal');

        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('providerConfigModal'));

        modal.show();

        // Setup form handlers
        this.setupProviderConfigHandlers(provider.id, modal);

        // Clean up modal when hidden
        document.getElementById('providerConfigModal').addEventListener('hidden.bs.modal', () => {
            document.getElementById('providerConfigModal').remove();
        });
    }

    setupProviderConfigHandlers(providerId, modal) {
        const saveBtn = document.getElementById('saveProviderConfigBtn');
        const testBtn = document.getElementById('testProviderBtn');

        saveBtn.addEventListener('click', async () => {
            const configData = {
                status: document.getElementById('providerStatus').value,
                enabled: document.getElementById('providerEnabled').checked,
                config: {}
            };

            // Handle API key update
            const apiKey = document.getElementById('providerApiKey').value;

            if (apiKey) {
                configData.apiKey = apiKey;
            }

            // Handle JSON config
            try {
                const configText = document.getElementById('providerConfig').value;

                if (configText.trim()) {
                    configData.config = JSON.parse(configText);
                }
            } catch (error) {
                this.showError('Invalid JSON configuration');

                return;
            }

            try {
                const response = await fetch(`/api/providers/${providerId}/configure`, {
                    method: 'PUT',
                    headers: {
                        ...window.AdminAuthUtils.getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(configData)
                });

                const result = await response.json();

                if (result.success) {
                    this.showSuccess('Provider configuration updated successfully');
                    modal.hide();
                    await this.loadProvidersData();
                } else {
                    throw new Error(result.error || 'Failed to update provider configuration');
                }
            } catch (error) {
                console.error('❌ ADMIN-PACKAGES: Error updating provider config:', error);
                this.showError(`Failed to update configuration: ${error.message}`);
            }
        });

        testBtn.addEventListener('click', async () => {
            await this.testProvider(providerId);
        });
    }

    /**
     * Test provider
     */
    async testProvider(providerId) {
        try {
            const response = await fetch(`/api/providers/${providerId}/test`, {
                method: 'POST',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();

                this.showSuccess(`Provider test result: ${result.success ? 'Success' : 'Failed'}`);
            } else {
                const error = await response.json();

                this.showError(`Failed to test provider: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error testing provider:', error);
            this.showError(`Failed to test provider: ${error.message}`);
        }
    }

    /**
     * Disable provider
     */
    async disableProvider(providerId) {
        try {
            const response = await fetch(`/api/providers/${providerId}/disable`, {
                method: 'POST',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                await this.loadProvidersData();
                this.showSuccess('Provider disabled successfully');
            } else {
                const error = await response.json();

                this.showError(`Failed to disable provider: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error disabling provider:', error);
            this.showError(`Failed to disable provider: ${error.message}`);
        }
    }

    /**
     * Delete provider
     */
    async deleteProvider(providerId) {
        if (!confirm('Are you sure you want to delete this provider? This will also delete all associated models.')) {
            return;
        }

        try {
            const response = await fetch(`/api/providers/${providerId}`, {
                method: 'DELETE',
                headers: window.AdminAuthUtils.getAuthHeaders()
            });

            if (response.ok) {
                await this.loadProvidersData();
                this.showSuccess('Provider deleted successfully');
            } else {
                const error = await response.json();

                this.showError(`Failed to delete provider: ${error.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error deleting provider:', error);
            this.showError(`Failed to delete provider: ${error.message}`);
        }
    }

    /**
     * Load providers data (needed for provider operations)
     */
    async loadProvidersData() {
        try {
            const response = await fetch('/api/providers?includeModels=true', {
                headers: window.AdminAuthUtils.getAuthHeaders()
            });
            const data = await response.json();

            if (data.success) {
                // Trigger a refresh of the providers tab if it exists
                window.dispatchEvent(new CustomEvent('admin-refresh-providers'));
            } else {
                throw new Error(data.error || 'Failed to load providers');
            }
        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Error loading providers:', error);
            this.showError(`Failed to load providers: ${error.message}`);
        }
    }

    /**
     * Delete package
     */
    async deletePackage(packageId) {
        try {
            this.isLoading = true;

            // Use AdminAPIService for proper authentication
            if (window.adminApiService) {
                const result = await window.adminApiService.delete(`/packages/${packageId}`);

                if (result.success) {
                    this.showSuccess('Package deleted successfully!');
                    this.hideModal();
                    await this.loadPackages(); // Reload packages
                } else {
                    throw new Error(result.message || 'Failed to delete package');
                }
            } else {
                // Fallback to direct fetch with auth headers
                const headers = window.AdminAuthUtils.getAuthHeaders();

                const response = await fetch(`${this.apiBaseUrl}/packages/${packageId}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    this.showSuccess('Package deleted successfully!');
                    this.hideModal();
                    await this.loadPackages(); // Reload packages
                } else {
                    throw new Error(result.message || 'Failed to delete package');
                }
            }

        } catch (error) {
            console.error('❌ ADMIN-PACKAGES: Delete package failed:', error);
            this.showError(`Failed to delete package: ${error.message}`);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Render packages table
     */
    renderPackagesTable() {
        console.log('📦 ADMIN-PACKAGES: renderPackagesTable called');

        // Wait for DOM to be ready with multiple attempts
        this.waitForPackagesContainer();
    }

    waitForPackagesContainer(attempts = 0) {
        const maxAttempts = 50; // 5 seconds max
        const tableContainer = document.getElementById('packages-table-container');

        if (tableContainer) {
            console.log('✅ ADMIN-PACKAGES: packages-table-container found');
            this.doRenderPackagesTable(tableContainer);

            return;
        }

        if (attempts >= maxAttempts) {
            console.error('❌ ADMIN-PACKAGES: packages-table-container not found after', maxAttempts, 'attempts');
            console.error('🔍 ADMIN-PACKAGES: Available elements with "packages" in ID:',
                Array.from(document.querySelectorAll('[id*="packages"]')).map(el => el.id));
            console.error('🔍 ADMIN-PACKAGES: Available elements with "table" in ID:',
                Array.from(document.querySelectorAll('[id*="table"]')).map(el => el.id));

            return;
        }

        console.log(`🔍 ADMIN-PACKAGES: Waiting for packages-table-container (attempt ${attempts + 1}/${maxAttempts})`);
        setTimeout(() => this.waitForPackagesContainer(attempts + 1), 100);
    }

    doRenderPackagesTable(tableContainer) {
        console.log('📦 ADMIN-PACKAGES: doRenderPackagesTable called');

        console.log('📦 ADMIN-PACKAGES: Current packages for rendering:', this.currentPackages);

        // Prepare data for the table generator
        const tableData = this.currentPackages.map(pkg => {
            const pricePerCredit = (pkg.price / 100) / pkg.credits;
            const averageDezgoCost = 0.015;
            const profitMargin = ((pricePerCredit - averageDezgoCost) / pricePerCredit * 100);

            return {
                id: pkg.id,
                name: pkg.name,
                credits: pkg.credits,
                price: pkg.price / 100, // Convert to dollars for currency formatter
                pricePerCredit,
                profitMargin,
                isPopular: pkg.isPopular
            };
        });

        console.log('📦 ADMIN-PACKAGES: Processed table data:', tableData);

        // Use the shared table component with standardized header
        console.log('📦 ADMIN-PACKAGES: Shared table available:', !!this.sharedTable);
        if (this.sharedTable) {
            console.log('📦 ADMIN-PACKAGES: Calling sharedTable.render with:', {
                tableType: 'packages',
                data: tableData,
                container: tableContainer
            });

            this.sharedTable.render('packages', tableData, tableContainer, {
                addButton: {
                    action: 'create-package',
                    text: 'Add Package',
                    title: 'Create a new credit package'
                }
            });

            // Add profit margin summary after the table is rendered
            const profitMarginHTML = this.generateProfitMarginSummary();
            tableContainer.insertAdjacentHTML('afterbegin', profitMarginHTML);
            console.log('📦 ADMIN-PACKAGES: Table generation completed');
        } else {
            console.error('❌ ADMIN-PACKAGE: Shared table not available');
            tableContainer.innerHTML = '<div class="error-message">Shared table not available</div>';
        }

        this.setupEventListeners();
    }

    /**
     * Generate profit margin summary
     */
    generateProfitMarginSummary() {
        if (!this.currentPackages || this.currentPackages.length === 0) {
            return '';
        }

        const averageDezgoCost = 0.015; // $0.015 per credit average
        let totalRevenue = 0;
        let totalCosts = 0;
        let packageCount = 0;

        this.currentPackages.forEach(pkg => {
            const pricePerCredit = (pkg.price / 100) / pkg.credits; // Convert to dollars
            const profitMargin = ((pricePerCredit - averageDezgoCost) / pricePerCredit * 100);

            totalRevenue += pkg.price / 100; // Convert to dollars
            totalCosts += pkg.credits * averageDezgoCost;
            packageCount++;
        });

        const averageProfitMargin = totalRevenue > 0 ? ((totalRevenue - totalCosts) / totalRevenue * 100) : 0;
        const marginColor = averageProfitMargin > 50
            ? 'text-green-600' :
            averageProfitMargin > 25 ? 'text-yellow-600' : 'text-red-600';

        return `
            <div class="profit-margin-summary mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
                <div class="summary-stats flex items-center space-x-4 text-sm">
                    <span class="stat-item flex items-center">
                        <span class="stat-label text-gray-400 mr-2">Avg Profit Margin:</span>
                        <span class="stat-value ${marginColor} font-semibold">${averageProfitMargin.toFixed(1)}%</span>
                    </span>
                    <span class="stat-separator text-gray-600">•</span>
                    <span class="stat-item flex items-center">
                        <span class="stat-label text-gray-400 mr-2">Packages:</span>
                        <span class="stat-value text-gray-200 font-semibold">${packageCount}</span>
                    </span>
                    <span class="stat-separator text-gray-600">•</span>
                    <span class="stat-item flex items-center">
                        <span class="stat-label text-gray-400 mr-2">Dezgo Cost:</span>
                        <span class="stat-value text-gray-200 font-semibold">$${averageDezgoCost.toFixed(3)}/credit</span>
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * Validate package data
     */
    validatePackageData(data) {
        const errors = [];

        // Only validate ID if it exists (for editing)
        if (data.id && !(/^[a-z0-9_]+$/).test(data.id)) {
            errors.push('Package ID must contain only lowercase letters, numbers, and underscores');
        }

        if (!data.name || data.name.length < 2) {
            errors.push('Package name must be at least 2 characters');
        }

        if (!data.credits || data.credits < 1) {
            errors.push('Credits must be a positive number');
        }

        if (!data.price || data.price < 0.00) {
            errors.push('Price must be at least $0.00');
        }

        if (!data.description || data.description.length < 10) {
            errors.push('Description must be at least 10 characters');
        }

        if (errors.length > 0) {
            this.showError(errors.join('<br>'));

            return false;
        }

        return true;
    }

    /**
     * Create modal (fallback if window.showModal is not available)
     */
    createModal(title, content) {
        // Remove existing modal
        const existingModal = document.getElementById('admin-package-modal');

        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');

        modal.id = 'admin-package-modal';
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50';
        modal.innerHTML = `
            <div class="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-xl rounded-lg bg-white">
                <div class="mt-3">
                    <div class="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                        <h3 class="text-lg font-medium text-gray-900">${title}</h3>
                        <button id="close-admin-package-modal" class="text-gray-400 hover:text-gray-600 transition-colors">
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
        document.getElementById('close-admin-package-modal').addEventListener('click', () => {
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
        const modal = document.getElementById('admin-package-modal');

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
            alert(message);
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    destroy() {
        if (this.sharedTable) {
            this.sharedTable.destroy();
        }
        console.log('🗑️ ADMIN-PACKAGES: Package manager destroyed');
    }
}

// Export for global access
window.AdminPackageManager = AdminPackageManager;

// Export for module access (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPackageManager;
}
