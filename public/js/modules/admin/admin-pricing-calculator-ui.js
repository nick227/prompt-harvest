/**
 * Admin Pricing Calculator UI
 * Interactive pricing calculator interface for package management
 */

class AdminPricingCalculatorUI {
    constructor() {
        this.calculator = new AdminPricingCalculator();
        this.currentPricePerCredit = 0.04; // Default $0.04 per credit
        this.pricingMode = 'manual'; // 'manual' or 'margin-based'
        this.isInitialized = false;
    }

    /**
     * Initialize the pricing calculator UI
     */
    async init() {
        if (this.isInitialized) return;

        console.log('🧮 ADMIN-PRICING: Initializing pricing calculator UI...');

        try {
            // Setup event listeners
            this.setupEventListeners();

            // Initial calculation
            await this.updateCalculations();

            this.isInitialized = true;
            console.log('✅ ADMIN-PRICING: Pricing calculator UI initialized');
        } catch (error) {
            console.error('❌ ADMIN-PRICING: Failed to initialize pricing calculator UI:', error);
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Price per credit input
        const priceInput = document.getElementById('price-per-credit-input');
        if (priceInput) {
            priceInput.addEventListener('input', (e) => {
                this.currentPricePerCredit = parseFloat(e.target.value) || 0;
                this.updateCalculations();
                this.updateProfitMarginFromPrice();
            });
        }

        // Target margin input
        const marginInput = document.getElementById('target-margin-input');
        if (marginInput) {
            marginInput.addEventListener('input', (e) => {
                const targetMargin = parseFloat(e.target.value) || 60;
                this.updatePriceFromMargin(targetMargin);
            });
        }

        // Profit margin slider
        const marginSlider = document.getElementById('profit-margin-slider');
        if (marginSlider) {
            marginSlider.addEventListener('input', (e) => {
                const targetMargin = parseFloat(e.target.value);
                document.getElementById('target-margin-input').value = targetMargin;
                this.updatePriceFromMargin(targetMargin);
            });
        }

        // Pricing mode toggle (radio buttons)
        const modeToggles = document.querySelectorAll('input[name="pricing-mode"]');
        modeToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.pricingMode = e.target.value;
                    this.updatePricingMode();
                }
            });
        });

        // Package size inputs
        document.addEventListener('input', (e) => {
            if (e.target.matches('.package-credits-input')) {
                this.updatePackageCalculations();
            }
        });
    }

    /**
     * Update all calculations
     */
    async updateCalculations() {
        try {
            // Update provider costs
            this.updateProviderCosts();

            // Update package profitability
            this.updatePackageProfitability();

            // Update break-even analysis
            this.updateBreakEvenAnalysis();

            // Update recommendations
            this.updateRecommendations();

        } catch (error) {
            console.error('❌ ADMIN-PRICING: Failed to update calculations:', error);
        }
    }

    /**
     * Update provider costs display
     */
    updateProviderCosts() {
        const container = document.getElementById('provider-costs-container');
        if (!container) return;

        const providerCosts = this.calculator.getAllProviderCosts(this.currentPricePerCredit);

        // Group by category
        const categories = {};
        providerCosts.forEach(cost => {
            const category = this.getProviderCategory(cost.provider);
            if (!categories[category]) {
                categories[category] = [];
            }
            categories[category].push(cost);
        });

        let html = '<div class="space-y-4">';

        Object.keys(categories).forEach(category => {
            html += `
                <div class="bg-white border rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-3">${category}</h4>
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2">Provider</th>
                                    <th class="text-right py-2">Credits</th>
                                    <th class="text-right py-2">User Cost</th>
                                    <th class="text-right py-2">Dezgo Cost</th>
                                    <th class="text-right py-2">Profit</th>
                                    <th class="text-right py-2">Margin</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            categories[category].forEach(cost => {
                const profitColor = cost.netProfit > 0 ? 'text-green-600' : 'text-red-600';
                const marginColor = cost.profitMargin > 0 ? 'text-green-600' : 'text-red-600';

                html += `
                    <tr class="border-b">
                        <td class="py-2">${cost.provider}</td>
                        <td class="text-right py-2">${cost.creditCost}</td>
                        <td class="text-right py-2">${this.calculator.formatCurrency(cost.userCost)}</td>
                        <td class="text-right py-2">${this.calculator.formatCurrency(cost.dezgoCost)}</td>
                        <td class="text-right py-2 ${profitColor}">${this.calculator.formatCurrency(cost.netProfit)}</td>
                        <td class="text-right py-2 ${marginColor}">${this.calculator.formatPercentage(cost.profitMargin)}</td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Update package profitability display
     */
    updatePackageProfitability() {
        const container = document.getElementById('package-profitability-container');
        if (!container) return;

        // Get current packages from the form or use defaults
        const packages = this.getCurrentPackages();
        const profitability = this.calculator.calculatePackageProfitability(packages, this.currentPricePerCredit);

        let html = `
            <div class="bg-white border rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-3">Package Profitability Analysis</h4>
                <div class="overflow-x-auto">
                    <table class="min-w-full text-sm">
                        <thead>
                            <tr class="border-b">
                                <th class="text-left py-2">Package</th>
                                <th class="text-right py-2">Credits</th>
                                <th class="text-right py-2">Price/Credit</th>
                                <th class="text-right py-2">Total Price</th>
                                <th class="text-right py-2">Net Profit</th>
                                <th class="text-right py-2">Margin</th>
                                <th class="text-right py-2">Break-even</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        profitability.forEach(pkg => {
            const marginColor = pkg.profitMargin > 0 ? 'text-green-600' : 'text-red-600';
            const profitColor = pkg.netProfit > 0 ? 'text-green-600' : 'text-red-600';

            html += `
                <tr class="border-b">
                    <td class="py-2">${pkg.name}</td>
                    <td class="text-right py-2">${pkg.credits}</td>
                    <td class="text-right py-2">${this.calculator.formatCurrency(pkg.pricePerCredit)}</td>
                    <td class="text-right py-2">${this.calculator.formatCurrency(pkg.totalPrice)}</td>
                    <td class="text-right py-2 ${profitColor}">${this.calculator.formatCurrency(pkg.netProfit)}</td>
                    <td class="text-right py-2 ${marginColor}">${this.calculator.formatPercentage(pkg.profitMargin)}</td>
                    <td class="text-right py-2">${pkg.breakEvenGenerations} images</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Update break-even analysis
     */
    updateBreakEvenAnalysis() {
        const container = document.getElementById('break-even-container');
        if (!container) return;

        const analysis = this.calculator.calculateBreakEvenAnalysis(this.currentPricePerCredit);

        const statusColor = analysis.canBreakEven ? 'text-green-600' : 'text-red-600';
        const statusIcon = analysis.canBreakEven ? '✅' : '❌';

        let html = `
            <div class="bg-white border rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-3">Break-even Analysis</h4>
                <div class="space-y-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-2">${statusIcon}</span>
                        <span class="${statusColor} font-medium">${analysis.message}</span>
                    </div>
        `;

        if (analysis.canBreakEven) {
            html += `
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span class="text-gray-600">Profit per credit:</span>
                        <span class="font-medium">${this.calculator.formatCurrency(analysis.profitPerCredit)}</span>
                    </div>
                    <div>
                        <span class="text-gray-600">Break-even at:</span>
                        <span class="font-medium">${analysis.breakEvenGenerations} images</span>
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="text-sm">
                    <span class="text-gray-600">Required minimum price per credit:</span>
                    <span class="font-medium">${this.calculator.formatCurrency(analysis.requiredPricePerCredit)}</span>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Update pricing recommendations
     */
    updateRecommendations(targetMargin = 60) {
        const container = document.getElementById('recommendations-container');
        if (!container) return;

        const recommendations = this.calculator.generatePricingRecommendations(targetMargin);

        let html = `
            <div class="bg-white border rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-3">Pricing Recommendations</h4>
                <div class="space-y-4">
                    <div class="bg-blue-50 p-3 rounded-lg">
                        <div class="text-sm">
                            <span class="text-gray-600">Target margin:</span>
                            <span class="font-medium">${recommendations.targetMargin}%</span>
                        </div>
                        <div class="text-sm">
                            <span class="text-gray-600">Average Dezgo cost:</span>
                            <span class="font-medium">${this.calculator.formatCurrency(recommendations.averageDezgoCost)}</span>
                        </div>
                        <div class="text-sm">
                            <span class="text-gray-600">Recommended price per credit:</span>
                            <span class="font-medium text-blue-600">${this.calculator.formatCurrency(recommendations.recommendedPricePerCredit)}</span>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="border-b">
                                    <th class="text-left py-2">Package</th>
                                    <th class="text-right py-2">Credits</th>
                                    <th class="text-right py-2">Price/Credit</th>
                                    <th class="text-right py-2">Total Price</th>
                                    <th class="text-right py-2">Margin</th>
                                    <th class="text-right py-2">Savings</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        recommendations.packages.forEach(pkg => {
            const marginColor = pkg.profitMargin > 0 ? 'text-green-600' : 'text-red-600';

            html += `
                <tr class="border-b">
                    <td class="py-2">${pkg.name}</td>
                    <td class="text-right py-2">${pkg.credits}</td>
                    <td class="text-right py-2">${this.calculator.formatCurrency(pkg.pricePerCredit)}</td>
                    <td class="text-right py-2">${this.calculator.formatCurrency(pkg.totalPrice)}</td>
                    <td class="text-right py-2 ${marginColor}">${this.calculator.formatPercentage(pkg.profitMargin)}</td>
                    <td class="text-right py-2">${this.calculator.formatCurrency(pkg.savings)}</td>
                </tr>
            `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Get current packages from form inputs
     */
    getCurrentPackages() {
        // Try to get packages from form inputs, fallback to defaults
        const packages = [];

        // Look for package form inputs
        const packageInputs = document.querySelectorAll('.package-credits-input');
        if (packageInputs.length > 0) {
            packageInputs.forEach((input, index) => {
                const credits = parseInt(input.value) || 10;
                const nameInput = input.closest('.package-form')?.querySelector('.package-name-input');
                const name = nameInput?.value || `Package ${index + 1}`;

                packages.push({
                    name,
                    credits,
                    price: credits * this.currentPricePerCredit
                });
            });
        } else {
            // Default packages
            packages.push(
                { name: 'Starter', credits: 10 },
                { name: 'Pro', credits: 50 },
                { name: 'Enterprise', credits: 200 }
            );
        }

        return packages;
    }

    /**
     * Get provider category
     */
    getProviderCategory(provider) {
        if (provider === 'flux') return 'Flux';
        if (['juggernaut', 'dreamshaper', 'dreamshaperlighting', 'bluepencil', 'tshirt', 'juggernautReborn'].includes(provider)) {
            return 'SDXL';
        }
        if (['dalle', 'dalle3', 'dalle2'].includes(provider)) {
            return 'DALL-E';
        }
        return 'SD 1/2';
    }

    /**
     * Update price per credit based on profit margin
     */
    updatePriceFromMargin(targetMargin) {
        const calculation = this.calculator.calculatePriceFromProfitMargin(targetMargin);
        this.currentPricePerCredit = calculation.pricePerCredit;

        // Update the price input
        const priceInput = document.getElementById('price-per-credit-input');
        if (priceInput) {
            priceInput.value = this.currentPricePerCredit.toFixed(4);
        }

        // Update all calculations
        this.updateCalculations();

        // Update margin validation
        this.updateMarginValidation(targetMargin, calculation);
    }

    /**
     * Update profit margin display from current price
     */
    updateProfitMarginFromPrice() {
        const analysis = this.calculator.analyzeCurrentProfitMargin(this.currentPricePerCredit);

        // Update margin input to show actual margin
        const marginInput = document.getElementById('target-margin-input');
        const marginSlider = document.getElementById('profit-margin-slider');

        if (marginInput && this.pricingMode === 'manual') {
            marginInput.value = analysis.actualMargin.toFixed(1);
        }
        if (marginSlider && this.pricingMode === 'manual') {
            marginSlider.value = analysis.actualMargin.toFixed(1);
        }

        // Update margin analysis display
        this.updateMarginAnalysisDisplay(analysis);
    }

    /**
     * Update pricing mode
     */
    updatePricingMode() {
        const priceInput = document.getElementById('price-per-credit-input');
        const marginInput = document.getElementById('target-margin-input');
        const marginSlider = document.getElementById('profit-margin-slider');

        if (this.pricingMode === 'margin-based') {
            // Disable price input, enable margin controls
            if (priceInput) priceInput.disabled = true;
            if (marginInput) marginInput.disabled = false;
            if (marginSlider) marginSlider.disabled = false;

            // Set default margin and calculate price
            const defaultMargin = 60;
            if (marginInput) marginInput.value = defaultMargin;
            if (marginSlider) marginSlider.value = defaultMargin;
            this.updatePriceFromMargin(defaultMargin);

        } else {
            // Enable price input, disable margin controls
            if (priceInput) priceInput.disabled = false;
            if (marginInput) marginInput.disabled = true;
            if (marginSlider) marginSlider.disabled = true;

            // Update margin from current price
            this.updateProfitMarginFromPrice();
        }

        // Update UI labels
        this.updateModeLabels();
    }

    /**
     * Update mode labels
     */
    updateModeLabels() {
        const priceLabel = document.getElementById('price-label');
        const marginLabel = document.getElementById('margin-label');

        if (this.pricingMode === 'margin-based') {
            if (priceLabel) priceLabel.textContent = 'Calculated Price per Credit ($)';
            if (marginLabel) marginLabel.textContent = 'Target Profit Margin (%)';
        } else {
            if (priceLabel) priceLabel.textContent = 'Price per Credit ($)';
            if (marginLabel) marginLabel.textContent = 'Actual Profit Margin (%)';
        }
    }

    /**
     * Update margin validation display
     */
    updateMarginValidation(targetMargin, calculation) {
        const container = document.getElementById('margin-validation-container');
        if (!container) return;

        const validation = this.calculator.validateProfitMargin(targetMargin);

        let html = '<div class="space-y-2">';

        // Show warnings
        validation.warnings.forEach(warning => {
            html += `
                <div class="flex items-center p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                    <i class="fas fa-exclamation-triangle text-yellow-600 mr-2"></i>
                    <span class="text-sm text-yellow-800">${warning.message}</span>
                </div>
            `;
        });

        // Show errors
        validation.errors.forEach(error => {
            html += `
                <div class="flex items-center p-2 bg-red-50 border border-red-200 rounded-md">
                    <i class="fas fa-times-circle text-red-600 mr-2"></i>
                    <span class="text-sm text-red-800">${error.message}</span>
                </div>
            `;
        });

        // Show success if no issues
        if (validation.isValid && validation.warnings.length === 0) {
            html += `
                <div class="flex items-center p-2 bg-green-50 border border-green-200 rounded-md">
                    <i class="fas fa-check-circle text-green-600 mr-2"></i>
                    <span class="text-sm text-green-800">Pricing configuration is optimal</span>
                </div>
            `;
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Update margin analysis display
     */
    updateMarginAnalysisDisplay(analysis) {
        const container = document.getElementById('margin-analysis-container');
        if (!container) return;

        const statusColor = analysis.isProfitable ? 'text-green-600' : 'text-red-600';
        const statusIcon = analysis.isProfitable ? '✅' : '❌';

        let html = `
            <div class="bg-white border rounded-lg p-4">
                <h4 class="font-semibold text-gray-900 mb-3">Profit Margin Analysis</h4>
                <div class="space-y-3">
                    <div class="flex items-center">
                        <span class="text-2xl mr-2">${statusIcon}</span>
                        <span class="${statusColor} font-medium">
                            ${analysis.actualMargin.toFixed(1)}% profit margin
                        </span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span class="text-gray-600">Price per credit:</span>
                            <span class="font-medium">${this.calculator.formatCurrency(analysis.pricePerCredit)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Net price (after fees):</span>
                            <span class="font-medium">${this.calculator.formatCurrency(analysis.netPrice)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Profit per credit:</span>
                            <span class="font-medium ${statusColor}">${this.calculator.formatCurrency(analysis.profitPerCredit)}</span>
                        </div>
                        <div>
                            <span class="text-gray-600">Break-even at:</span>
                            <span class="font-medium">${this.calculator.formatCurrency(analysis.breakEvenAt)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    /**
     * Create pricing calculator UI
     */
    createPricingCalculatorUI() {
        return `
            <div class="space-y-6">
                <!-- Pricing Mode Selection -->
                <div class="bg-white border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Pricing Mode</h3>

                    <div class="flex items-center space-x-4 mb-6">
                        <label class="flex items-center">
                            <input type="radio" id="pricing-mode-toggle" name="pricing-mode" value="manual"
                                   class="mr-2" ${this.pricingMode === 'manual' ? 'checked' : ''}>
                            <span class="text-sm font-medium text-gray-700">Manual Pricing</span>
                        </label>
                        <label class="flex items-center">
                            <input type="radio" id="pricing-mode-toggle" name="pricing-mode" value="margin-based"
                                   class="mr-2" ${this.pricingMode === 'margin-based' ? 'checked' : ''}>
                            <span class="text-sm font-medium text-gray-700">Profit Margin Based</span>
                        </label>
                    </div>

                    <div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-6">
                        <div class="flex">
                            <i class="fas fa-info-circle text-blue-400 mt-0.5"></i>
                            <div class="ml-3">
                                <p class="text-sm text-blue-800">
                                    <strong>Manual Mode:</strong> Set price per credit directly<br>
                                    <strong>Margin-Based Mode:</strong> Set target profit margin and let the system calculate optimal pricing
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Pricing Controls -->
                <div class="bg-white border rounded-lg p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Pricing Controls</h3>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <label id="price-label" class="block text-sm font-medium text-gray-700 mb-1">Price per Credit ($)</label>
                            <input type="number" id="price-per-credit-input"
                                   value="${this.currentPricePerCredit}"
                                   step="0.001" min="0.001" max="1.0"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <p class="text-xs text-gray-500 mt-1">The price users pay per credit</p>
                        </div>

                        <div>
                            <label id="margin-label" class="block text-sm font-medium text-gray-700 mb-1">Target Profit Margin (%)</label>
                            <input type="number" id="target-margin-input"
                                   value="60"
                                   step="1" min="0" max="500"
                                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <p class="text-xs text-gray-500 mt-1">Your desired profit percentage</p>
                        </div>
                    </div>

                    <!-- Profit Margin Slider -->
                    <div class="mb-6">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Profit Margin Slider</label>
                        <input type="range" id="profit-margin-slider"
                               min="0" max="200" value="60" step="1"
                               class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer">
                        <div class="flex justify-between text-xs text-gray-500 mt-1">
                            <span>0%</span>
                            <span>100%</span>
                            <span>200%</span>
                        </div>
                    </div>
                </div>

                <!-- Margin Analysis -->
                <div id="margin-analysis-container">
                    <!-- Margin analysis will be populated here -->
                </div>

                <!-- Margin Validation -->
                <div id="margin-validation-container">
                    <!-- Margin validation will be populated here -->
                </div>

                <!-- Provider Costs -->
                <div id="provider-costs-container">
                    <!-- Provider costs will be populated here -->
                </div>

                <!-- Package Profitability -->
                <div id="package-profitability-container">
                    <!-- Package profitability will be populated here -->
                </div>

                <!-- Break-even Analysis -->
                <div id="break-even-container">
                    <!-- Break-even analysis will be populated here -->
                </div>

                <!-- Recommendations -->
                <div id="recommendations-container">
                    <!-- Recommendations will be populated here -->
                </div>
            </div>
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for admin dashboard to initialize
    setTimeout(() => {
        if (window.adminPricingCalculatorUI) {
            window.adminPricingCalculatorUI.init();
        }
    }, 1000);
});

// Export for use
window.AdminPricingCalculatorUI = AdminPricingCalculatorUI;
