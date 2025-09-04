// stats Manager - Consolidated from setupStatsBar.js
class StatsManager {
    constructor () {
        this.config = STATS_CONFIG;
        this.isInitialized = false;
        this.history = [];
        this.init();
    }

    init () {
        this.countElement = Utils.dom.get(this.config.selectors.imageCount);
        this.costElement = Utils.dom.get(this.config.selectors.imageCost);
        this.isInitialized = true;
    }

    async setupStatsBar () {
        try {
            const response = await fetch(this.config.api.count);
            const _results = await response.json();
            const { count } = _results;

            this.updateCountDisplay(count);
            this.updateCostDisplay(count);
            // add to history
            this.addToHistory(count, this.calculateCost(count));
            // check for milestone alert
            if (this.shouldShowAlert(count)) {
                this.showMilestoneAlert(count);
            }
        } catch (error) {
            console.error('Stats fetch error:', error);
        }
    }

    calculateCost (count) {
        return (count * this.config.costPerImage) / this.config.costDivisor;
    }

    formatCurrency (amount) {
        return amount.toLocaleString(
            this.config.currency.locale, {
                style: this.config.currency.style,
                currency: this.config.currency.currency
            }
        );
    }

    shouldShowAlert (count) {
        return count % this.config.multiplier === 0 && count > 9;
    }

    updateCountDisplay (count) {
        if (this.countElement) {
            this.countElement.textContent = count.toString();
        }
    }

    updateCostDisplay (count) {
        if (this.costElement) {
            const cost = this.calculateCost(count);

            this.costElement.textContent = this.formatCurrency(cost);
        }
    }

    showMilestoneAlert (count) {
        const message = `You have created ${count} images! These images are not not free. Please consider chipping in a few bucks. Thank You!`;

        if (typeof alert !== 'undefined') {
            alert(message);
        } else {
            console.warn(message);
        }
    }

    // utility methods for external access
    getCurrentStats () {
        const count = this.countElement ? parseInt(this.countElement.textContent) || 0 : 0;
        const cost = this.costElement ? this.costElement.textContent : this.formatCurrency(0);

        return {
            count,
            cost
        };
    }

    async refreshStats () {
        await this.setupStatsBar();
    }

    addToHistory (count, cost) {
        this.history.push({
            count,
            cost,
            timestamp: new Date().toISOString()
        });

        // keep only last 100 entries
        if (this.history.length > 100) {
            this.history = this.history.slice(-100);
        }
    }

    getHistory () {
        return [...this.history];
    }

    // Alias for backward compatibility
    getStatsHistory () {
        return this.getHistory();
    }

    getAverageCost () {
        if (this.history.length === 0) {
            return 0;
        }

        const totalCost = this.history.reduce((sum, entry) => sum + entry.cost, 0);

        return totalCost / this.history.length;
    }

    getTotalCost () {
        return this.history.reduce((sum, entry) => sum + entry.cost, 0);
    }

    getCostProjection (targetCount) {
        const currentCount = this.getCurrentStats().count;
        const remainingCount = targetCount - currentCount;
        const costPerImage = this.config.costPerImage / this.config.costDivisor;

        return {
            current: this.getCurrentStats().cost,
            projected: this.formatCurrency(remainingCount * costPerImage),
            additionalCost: remainingCount * costPerImage
        };
    }

    // Alias for backward compatibility
    calculateProjectedCost (currentCount, additionalImages) {
        const projectedCount = currentCount + additionalImages;
        const currentCost = this.calculateCost(currentCount);
        const projectedCost = this.calculateCost(projectedCount);
        const additionalCost = this.calculateCost(additionalImages);

        return {
            currentCost,
            projectedCost,
            additionalCost
        };
    }

    exportStats () {
        return {
            current: this.getCurrentStats(),
            history: this.getHistory(),
            average: this.getAverageCost(),
            total: this.getTotalCost()
        };
    }

    resetStats () {
        this.history = [];
        this.updateCountDisplay(0);
        this.updateCostDisplay(0);
    }

}

// Export for global access
window.StatsManager = StatsManager;
window.statsManager = new StatsManager();

// Export for module testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatsManager;
}
