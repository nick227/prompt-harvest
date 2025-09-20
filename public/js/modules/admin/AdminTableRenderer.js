/**
 * Admin Table Renderer - Handles table rendering for different data types
 * Single Responsibility: Render tables for packages, providers, models, and promo cards
 */

/* global AdminSharedTable */

class AdminTableRenderer {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
        this.sharedTable = new AdminSharedTable();
    }

    renderPackagesTable(packages) {
        const container = document.getElementById('packages-table-container');

        if (!packages || packages.length === 0) {
            container.innerHTML = '<div class="no-data">No packages found</div>';
            return;
        }

        // Transform packages data to match shared table format
        const transformedPackages = packages.map(pkg => {
            const pricePerCredit = (pkg.price / 100) / pkg.credits;
            const costPerCredit = 0.005; // $0.005 per credit (configurable)
            const profitPerCredit = pricePerCredit - costPerCredit;
            const profitMargin = (profitPerCredit / pricePerCredit) * 100;

            return {
                id: pkg.id,
                name: pkg.name,
                display_name: pkg.displayName,
                credits: pkg.credits,
                price: pkg.price / 100,
                price_per_credit: pricePerCredit,
                profit_margin: profitMargin,
                status: pkg.isActive ? 'active' : 'inactive',
                is_popular: pkg.isPopular,
                sort_order: pkg.sortOrder,
                created_at: pkg.createdAt || new Date().toISOString()
            };
        });

        // Use shared table component
        this.sharedTable.render('packages', transformedPackages, container);
    }

    renderProvidersTable(providers) {
        const container = document.getElementById('providers-table-container');

        if (!providers || providers.length === 0) {
            container.innerHTML = '<div class="no-data">No providers found</div>';
            return;
        }

        // Transform providers data to match shared table format
        const transformedProviders = providers.map(provider => {
            const avgCost = provider.models.length > 0
                ? provider.models.reduce((sum, model) => sum + model.costPerImage, 0) / provider.models.length
                : 0;

            return {
                id: provider.id,
                name: provider.name,
                display_name: provider.displayName,
                type: provider.type || 'image',
                cost_per_request: avgCost * 0.005, // Convert credits to dollars
                status: provider.isActive ? 'active' : 'inactive',
                last_updated: provider.updatedAt || new Date().toISOString(),
                models: provider.models // Keep models for reference
            };
        });

        // Use shared table component
        this.sharedTable.render('providers', transformedProviders, container);
    }

    renderModelsTable(models) {
        const container = document.getElementById('models-table-container');

        if (!models || models.length === 0) {
            container.innerHTML = '<div class="no-data">No models found</div>';
            return;
        }

        // Transform models data to match shared table format
        const transformedModels = models.map(model => ({
            id: model.id,
            provider: model.provider,
            name: model.name,
            displayName: model.displayName,
            costPerImage: model.costPerImage,
            isActive: model.isActive,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt
        }));

        // Use shared table component with models configuration
        this.sharedTable.render('models', transformedModels, container);
    }

    renderPromoCardsTable(promoCards) {
        const container = document.getElementById('promo-cards-table-container');

        if (!promoCards || promoCards.length === 0) {
            container.innerHTML = '<div class="no-data">No promo cards found</div>';
            return;
        }

        // Transform promo cards data to match shared table format
        const transformedPromoCards = promoCards.map(promo => ({
            id: promo.id,
            code: promo.code,
            description: `Credits: ${promo.credits}`, // Use credits as description
            discount_type: 'credits', // Promo codes give credits
            discount_value: promo.credits,
            usage_limit: promo.maxRedemptions || 'Unlimited',
            used_count: promo.redemptionCount || promo.currentRedemptions || 0,
            status: promo.status,
            expires_at: promo.expiresAt,
            created_at: promo.createdAt
        }));

        // Use shared table component with promo cards configuration
        this.sharedTable.render('promo-cards', transformedPromoCards, container);
    }

    destroy() {
        this.sharedTable.destroy();
        console.log('🗑️ ADMIN-TABLE: Table renderer destroyed');
    }
}

// Export for global access
window.AdminTableRenderer = AdminTableRenderer;
