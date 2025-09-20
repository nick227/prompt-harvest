/**
 * Mobile-Optimized Table Component
 * Automatically converts tables to card layout on mobile devices
 */
class MobileTable {
    constructor(tableElement, options = {}) {
        this.table = tableElement;
        this.options = {
            breakpoint: 640, // px
            cardClass: 'history-card',
            rowClass: 'history-card-row',
            labelClass: 'history-card-label',
            valueClass: 'history-card-value',
            ...options
        };
        this.isMobile = false;
        this.originalHTML = '';
        this.headers = [];
        this.init();
    }

    init() {
        if (!this.table) {
            return;
        }
        // Store original table HTML
        this.originalHTML = this.table.innerHTML;
        // Extract headers
        this.extractHeaders();
        // Setup responsive behavior
        this.setupResponsive();
        // Initial check
        this.checkBreakpoint();
    }

    extractHeaders() {
        const headerRow = this.table.querySelector('thead tr');

        if (headerRow) {
            this.headers = Array.from(headerRow.querySelectorAll('th')).map(th => th.textContent.trim());
        }
    }

    setupResponsive() {
        // Use ResizeObserver for better performance than window resize
        if ('ResizeObserver' in window) {
            this.resizeObserver = new ResizeObserver(() => {

                this.checkBreakpoint();
            });
            this.resizeObserver.observe(document.body);
        } else {
            // Fallback to window resize with throttling
            let resizeTimeout;

            window.addEventListener('resize', () => {

                clearTimeout(resizeTimeout);

                resizeTimeout = setTimeout(() => this.checkBreakpoint(), 150);
            });
        }
    }

    checkBreakpoint() {
        const shouldBeMobile = window.innerWidth <= this.options.breakpoint;

        if (shouldBeMobile !== this.isMobile) {
            this.isMobile = shouldBeMobile;
            this.render();
        }
    }

    render() {
        if (this.isMobile) {
            this.renderMobileCards();
        } else {
            this.renderDesktopTable();
        }
    }

    renderMobileCards() {
        const tbody = this.table.querySelector('tbody');

        if (!tbody) {
            return;
        }

        const rows = Array.from(tbody.querySelectorAll('tr'));

        // Create cards container
        const cardsContainer = document.createElement('div');

        cardsContainer.className = 'history-cards';

        rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td'));
            const card = this.createCard(cells);

            cardsContainer.appendChild(card);
        });

        // Replace table with cards
        this.table.style.display = 'none';

        // Insert cards after table
        const cardsElement = this.table.parentNode.querySelector('.history-cards');

        if (cardsElement) {
            cardsElement.replaceWith(cardsContainer);
        } else {
            this.table.parentNode.insertBefore(cardsContainer, this.table.nextSibling);
        }
    }

    renderDesktopTable() {
        // Show original table
        this.table.style.display = 'table';

        // Remove cards if they exist
        const cardsElement = this.table.parentNode.querySelector('.history-cards');

        if (cardsElement) {
            cardsElement.remove();
        }
    }

    createCard(cells) {
        const card = document.createElement('div');

        card.className = this.options.cardClass;

        cells.forEach((cell, index) => {
            if (index < this.headers.length) {
                const row = document.createElement('div');

                row.className = this.options.rowClass;

                const label = document.createElement('span');

                label.className = this.options.labelClass;
                label.textContent = this.headers[index];

                const value = document.createElement('span');

                value.className = this.options.valueClass;
                value.innerHTML = cell.innerHTML; // Preserve any HTML formatting

                row.appendChild(label);
                row.appendChild(value);
                card.appendChild(row);
            }
        });

        return card;
    }

    // Update table data (for dynamic content)
    updateData(newTableHTML) {
        this.originalHTML = newTableHTML;
        this.table.innerHTML = newTableHTML;
        this.extractHeaders();
        this.render();
    }

    // Cleanup
    destroy() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
        }

        // Restore original table
        this.renderDesktopTable();
    }
}

// Auto-initialize for tables with mobile-table class
document.addEventListener('DOMContentLoaded', () => {
    const mobileTables = document.querySelectorAll('.history-table');

    mobileTables.forEach(table => {
        new MobileTable(table);
    });
});

// Export removed - using window globals only
