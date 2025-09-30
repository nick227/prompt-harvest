/**
 * Simple Admin Dashboard Renderer
 * Provides basic admin dashboard functionality with package management
 */

class AdminSimpleRenderer {
    constructor() {
        this.currentSection = null;
        this.sections = {};
        this.isInitialized = false;
    }

    /**
     * Initialize the admin dashboard
     */
    async init() {
        if (this.isInitialized) return;

        console.log('🏗️ ADMIN-RENDERER: Initializing simple admin dashboard...');

        try {
            // Setup navigation
            this.setupNavigation();

            // Load initial section
            await this.loadSection('packages');

            this.isInitialized = true;
            console.log('✅ ADMIN-RENDERER: Simple admin dashboard initialized');
        } catch (error) {
            console.error('❌ ADMIN-RENDERER: Initialization failed:', error);
        }
    }

    /**
     * Setup navigation
     */
    setupNavigation() {
        const dashboardContent = document.getElementById('admin-dashboard-content');
        if (!dashboardContent) return;

        // Create navigation sidebar
        const sidebar = document.createElement('div');
        sidebar.className = 'admin-sidebar bg-gray-800 text-white w-64 min-h-screen p-4';
        sidebar.innerHTML = `
            <div class="mb-8">
                <h2 class="text-xl font-bold">Admin Dashboard</h2>
            </div>
            <nav class="space-y-2">
                <button data-section="packages" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-boxes mr-3"></i>
                    Package Management
                </button>
                <button data-section="pricing" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-calculator mr-3"></i>
                    Cost Management
                </button>
                <button data-section="cost-analysis" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-chart-line mr-3"></i>
                    Cost Analysis
                </button>
                <button data-section="payments" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-money-bill-wave mr-3"></i>
                    Payments
                </button>
                <button data-section="users" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-users mr-3"></i>
                    User Management
                </button>
                <button data-section="activity" class="admin-nav-item w-full text-left px-4 py-2 rounded hover:bg-gray-700 flex items-center">
                    <i class="fas fa-chart-bar mr-3"></i>
                    Site Activity
                </button>
            </nav>
        `;

        // Create main content area
        const mainContent = document.createElement('div');
        mainContent.className = 'admin-main-content flex-1 p-6';
        mainContent.innerHTML = `
            <div id="admin-section-content" class="max-w-7xl mx-auto">
                <div class="loading-placeholder text-center py-12">
                    <div class="loading-spinner loading-spinner-lg"></div>
                    <h2 class="mt-4 text-xl font-semibold text-gray-700">Loading Admin Dashboard</h2>
                    <p class="mt-2 text-gray-500">Please wait...</p>
                </div>
            </div>
        `;

        // Create dashboard layout
        const dashboardLayout = document.createElement('div');
        dashboardLayout.className = 'admin-dashboard-layout flex min-h-screen';
        dashboardLayout.appendChild(sidebar);
        dashboardLayout.appendChild(mainContent);

        // Replace dashboard content
        dashboardContent.innerHTML = '';
        dashboardContent.appendChild(dashboardLayout);

        // Setup navigation event listeners
        sidebar.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                const section = e.target.dataset.section;
                this.loadSection(section);
            }
        });

        // Set active nav item
        this.updateActiveNavItem('packages');
    }

    /**
     * Load admin section
     */
    async loadSection(sectionName) {
        console.log(`📂 ADMIN-RENDERER: Loading section: ${sectionName}`);

        const content = document.getElementById('admin-section-content');
        if (!content) return;

        // Update active navigation
        this.updateActiveNavItem(sectionName);
        this.currentSection = sectionName;

        // Show loading
        content.innerHTML = `
            <div class="loading-placeholder text-center py-12">
                <div class="loading-spinner loading-spinner-lg"></div>
                <h2 class="mt-4 text-xl font-semibold text-gray-700">Loading ${sectionName}</h2>
                <p class="mt-2 text-gray-500">Please wait...</p>
            </div>
        `;

        try {
            switch (sectionName) {
                case 'packages':
                    await this.loadPackagesSection();
                    break;
                case 'pricing':
                    await this.loadPricingSection();
                    break;
                case 'cost-analysis':
                    await this.loadCostAnalysisSection();
                    break;
                case 'payments':
                    await this.loadPaymentsSection();
                    break;
                case 'users':
                    await this.loadUsersSection();
                    break;
                case 'activity':
                    await this.loadActivitySection();
                    break;
                default:
                    content.innerHTML = `
                        <div class="text-center py-12">
                            <h2 class="text-xl font-semibold text-gray-700">Section Not Found</h2>
                            <p class="mt-2 text-gray-500">The requested section "${sectionName}" is not available.</p>
                        </div>
                    `;
            }
        } catch (error) {
            console.error(`❌ ADMIN-RENDERER: Failed to load section ${sectionName}:`, error);
            content.innerHTML = `
                <div class="text-center py-12">
                    <div class="text-red-600 mb-4">
                        <i class="fas fa-exclamation-triangle text-4xl"></i>
                    </div>
                    <h2 class="text-xl font-semibold text-gray-700">Error Loading Section</h2>
                    <p class="mt-2 text-gray-500">Failed to load ${sectionName}: ${error.message}</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    /**
     * Load packages section
     */
    async loadPackagesSection() {
        const content = document.getElementById('admin-section-content');

        content.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Package Management</h1>
                        <p class="mt-1 text-sm text-gray-500">Manage credit packages and pricing</p>
                    </div>
                </div>

                <div id="packages-table-container">
                    <!-- Packages table will be loaded here by AdminPackageManager -->
                </div>

                <!-- Pricing Calculator Section -->
                <div id="pricing-calculator-section" class="mt-8">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-gray-900">Intelligent Pricing Calculator</h2>
                        <button id="toggle-pricing-calculator"
                                class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                            <i class="fas fa-calculator mr-2"></i>
                            Show Calculator
                        </button>
                    </div>
                    <div id="pricing-calculator-content" class="hidden">
                        <!-- Pricing calculator will be loaded here -->
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-info-circle text-blue-400"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-blue-800">Package Management Tips</h3>
                            <div class="mt-2 text-sm text-blue-700">
                                <ul class="list-disc list-inside space-y-1">
                                    <li>Create packages with clear value propositions</li>
                                    <li>Mark one package as "popular" to drive conversions</li>
                                    <li>Ensure packages are profitable by checking cost per credit</li>
                                    <li>Test different package configurations to optimize revenue</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Initialize package handler if available
        if (window.adminApp && window.adminApp.packageHandler) {
            await window.adminApp.packageHandler.loadPackages();
        } else {
            // Show fallback message
            const tableContainer = document.getElementById('packages-table-container');
            tableContainer.innerHTML = `
                <div class="text-center py-12">
                    <h3 class="text-lg font-semibold text-gray-700">Package Management System</h3>
                    <p class="mt-2 text-gray-500">Loading package management interface...</p>
                </div>
            `;
        }

        // Setup pricing calculator
        this.setupPricingCalculator();
    }

    /**
     * Setup pricing calculator
     */
    setupPricingCalculator() {
        const toggleBtn = document.getElementById('toggle-pricing-calculator');
        const calculatorContent = document.getElementById('pricing-calculator-content');

        if (toggleBtn && calculatorContent) {
            toggleBtn.addEventListener('click', () => {
                if (calculatorContent.classList.contains('hidden')) {
                    // Show calculator
                    calculatorContent.classList.remove('hidden');
                    toggleBtn.innerHTML = '<i class="fas fa-eye-slash mr-2"></i>Hide Calculator';

                    // Initialize calculator if not already done
                    if (!window.adminPricingCalculatorUI) {
                        window.adminPricingCalculatorUI = new AdminPricingCalculatorUI();
                        calculatorContent.innerHTML = window.adminPricingCalculatorUI.createPricingCalculatorUI();
                        window.adminPricingCalculatorUI.init();
                    }
                } else {
                    // Hide calculator
                    calculatorContent.classList.add('hidden');
                    toggleBtn.innerHTML = '<i class="fas fa-calculator mr-2"></i>Show Calculator';
                }
            });
        }
    }

    /**
     * Load pricing section
     */
    async loadPricingSection() {
        const content = document.getElementById('admin-section-content');

        content.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Cost Management</h1>
                        <p class="mt-1 text-sm text-gray-500">Configure pricing for image generation and credit packages</p>
                    </div>
                </div>

                <div class="bg-white shadow rounded-lg p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Cost Per Generation Settings</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div class="border rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-2">Premium Providers</h4>
                            <div class="space-y-2 text-sm">
                                <div>DALL-E 3: $0.02 per generation</div>
                                <div>DALL-E 2: $0.01 per generation</div>
                                <div>Flux: $0.015 per generation</div>
                                <div>Juggernaut XL: $0.012 per generation</div>
                            </div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-2">Standard Providers</h4>
                            <div class="space-y-2 text-sm">
                                <div>DreamShaper: $0.005 per generation</div>
                                <div>OpenJourney: $0.005 per generation</div>
                                <div>Analog Madness: $0.005 per generation</div>
                                <div>Portrait Plus: $0.005 per generation</div>
                            </div>
                        </div>
                        <div class="border rounded-lg p-4">
                            <h4 class="font-medium text-gray-900 mb-2">Budget Providers</h4>
                            <div class="space-y-2 text-sm">
                                <div>T-Shirt: $0.003 per generation</div>
                                <div>Cyber: $0.003 per generation</div>
                                <div>Disco: $0.003 per generation</div>
                                <div>Synthwave: $0.003 per generation</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                        </div>
                        <div class="ml-3">
                            <h3 class="text-sm font-medium text-yellow-800">Advanced Pricing Controls</h3>
                            <div class="mt-2 text-sm text-yellow-700">
                                <p>Advanced pricing controls and cost calculator are available in the Cost Analysis section.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Load cost analysis section
     */
    async loadCostAnalysisSection() {
        const content = document.getElementById('admin-section-content');

        content.innerHTML = `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Cost Analysis & Calculator</h1>
                        <p class="mt-1 text-sm text-gray-500">Analyze generation costs and pricing strategies</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Cost Calculator</h3>
                        <form id="cost-calculator-form" class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
                                <select id="provider-select" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="dalle">DALL-E 3 (Premium)</option>
                                    <option value="dalle2">DALL-E 2 (Premium)</option>
                                    <option value="flux">Flux (Premium)</option>
                                    <option value="juggernaut">Juggernaut XL (Premium)</option>
                                    <option value="redshift">Redshift (Mid-tier)</option>
                                    <option value="dreamshaper">DreamShaper (Standard)</option>
                                    <option value="tshirt">T-Shirt (Budget)</option>
                                </select>
                            </div>
                            <div class="space-y-2">
                                <label class="flex items-center">
                                    <input type="checkbox" id="multiplier" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Use Multiplier (1.5x cost)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="mixup" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Use Mixup (1.3x cost)</span>
                                </label>
                                <label class="flex items-center">
                                    <input type="checkbox" id="mashup" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                    <span class="ml-2 text-sm text-gray-700">Use Mashup (1.2x cost)</span>
                                </label>
                            </div>
                            <button type="button" id="calculate-cost" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                Calculate Cost
                            </button>
                        </form>
                        <div id="cost-result" class="mt-4 p-4 bg-gray-50 rounded-md hidden">
                            <!-- Cost calculation results will appear here -->
                        </div>
                    </div>

                    <div class="bg-white shadow rounded-lg p-6">
                        <h3 class="text-lg font-medium text-gray-900 mb-4">Package Profitability</h3>
                        <div id="profitability-analysis">
                            <p class="text-gray-500 text-sm">Click "Calculate Cost" to see package profitability analysis.</p>
                        </div>
                    </div>
                </div>

                <div class="bg-white shadow rounded-lg p-6">
                    <h3 class="text-lg font-medium text-gray-900 mb-4">Provider Cost Breakdown</h3>
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr><td class="px-6 py-4 text-sm text-gray-900">DALL-E 3</td><td class="px-6 py-4 text-sm text-gray-900">Premium</td><td class="px-6 py-4 text-sm text-gray-900">4</td><td class="px-6 py-4 text-sm text-gray-900">$0.02</td></tr>
                                <tr><td class="px-6 py-4 text-sm text-gray-900">DALL-E 2</td><td class="px-6 py-4 text-sm text-gray-900">Premium</td><td class="px-6 py-4 text-sm text-gray-900">2</td><td class="px-6 py-4 text-sm text-gray-900">$0.01</td></tr>
                                <tr><td class="px-6 py-4 text-sm text-gray-900">Flux</td><td class="px-6 py-4 text-sm text-gray-900">Premium</td><td class="px-6 py-4 text-sm text-gray-900">3</td><td class="px-6 py-4 text-sm text-gray-900">$0.015</td></tr>
                                <tr><td class="px-6 py-4 text-sm text-gray-900">DreamShaper</td><td class="px-6 py-4 text-sm text-gray-900">Standard</td><td class="px-6 py-4 text-sm text-gray-900">1</td><td class="px-6 py-4 text-sm text-gray-900">$0.005</td></tr>
                                <tr><td class="px-6 py-4 text-sm text-gray-900">T-Shirt</td><td class="px-6 py-4 text-sm text-gray-900">Budget</td><td class="px-6 py-4 text-sm text-gray-900">1</td><td class="px-6 py-4 text-sm text-gray-900">$0.003</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Setup cost calculator
        this.setupCostCalculator();
    }

    /**
     * Setup cost calculator
     */
    setupCostCalculator() {
        const calculateBtn = document.getElementById('calculate-cost');
        if (!calculateBtn) return;

        calculateBtn.addEventListener('click', async () => {
            const provider = document.getElementById('provider-select').value;
            const multiplier = document.getElementById('multiplier').checked;
            const mixup = document.getElementById('mixup').checked;
            const mashup = document.getElementById('mashup').checked;

            try {
                // Check authentication before making request
                if (!window.AdminAuthUtils?.hasValidToken()) {
                    console.warn('🔐 ADMIN-SIMPLE: No valid token for cost analysis, skipping');
                    return;
                }

                const response = await fetch('/api/admin/cost-analysis/calculate', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        provider,
                        multiplier,
                        mixup,
                        mashup
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();

                if (result.success) {
                    const costResult = document.getElementById('cost-result');
                    const data = result.data;

                    costResult.innerHTML = `
                        <h4 class="font-medium text-gray-900 mb-2">Cost Calculation Result</h4>
                        <div class="space-y-2 text-sm">
                            <div><strong>Provider:</strong> ${data.provider}</div>
                            <div><strong>Credits:</strong> ${data.credits}</div>
                            <div><strong>Cost:</strong> $${data.usdCost.toFixed(4)}</div>
                            <div><strong>Options:</strong> ${data.options.multiplier ? 'Multiplier ' : ''}${data.options.mixup ? 'Mixup ' : ''}${data.options.mashup ? 'Mashup ' : ''}</div>
                        </div>
                    `;
                    costResult.classList.remove('hidden');
                } else {
                    throw new Error(result.message || 'Failed to calculate cost');
                }

            } catch (error) {
                console.error('❌ Cost calculation failed:', error);
                if (window.showNotification) {
                    window.showNotification('Failed to calculate cost: ' + error.message, 'error');
                }
            }
        });
    }

    /**
     * Load other sections (placeholders)
     */
    async loadPaymentsSection() {
        const content = document.getElementById('admin-section-content');
        content.innerHTML = `
            <div class="text-center py-12">
                <h2 class="text-xl font-semibold text-gray-700">Payments Management</h2>
                <p class="mt-2 text-gray-500">This section is under development.</p>
            </div>
        `;
    }

    async loadUsersSection() {
        const content = document.getElementById('admin-section-content');
        content.innerHTML = `
            <div class="text-center py-12">
                <h2 class="text-xl font-semibold text-gray-700">User Management</h2>
                <p class="mt-2 text-gray-500">This section is under development.</p>
            </div>
        `;
    }

    async loadActivitySection() {
        const content = document.getElementById('admin-section-content');
        content.innerHTML = `
            <div class="text-center py-12">
                <h2 class="text-xl font-semibold text-gray-700">Site Activity</h2>
                <p class="mt-2 text-gray-500">This section is under development.</p>
            </div>
        `;
    }

    /**
     * Update active navigation item
     */
    updateActiveNavItem(sectionName) {
        const navItems = document.querySelectorAll('.admin-nav-item');
        navItems.forEach(item => {
            if (item.dataset.section === sectionName) {
                item.classList.add('bg-gray-700');
            } else {
                item.classList.remove('bg-gray-700');
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        if (!window.adminApp || !window.adminApp.dashboardManager) {
            console.log('🏗️ ADMIN-RENDERER: Initializing simple admin dashboard as fallback...');
            window.adminSimpleRenderer = new AdminSimpleRenderer();
            window.adminSimpleRenderer.init();
        }
    }, 1000);
});

// Export for use
window.AdminSimpleRenderer = AdminSimpleRenderer;
