class MultiSelectDropdown {
    constructor(containerId, options = { /* Empty block */ }) {
        this.container = document.getElementById(containerId);
        this.options = {
            placeholder: 'Select options...',
            allowMultiple: true,
            showSelectedCount: true,
            maxSelections: null,
            onSelectionChange: null,
            ...options
        };

        this.selectedItems = new Set();
        this.isOpen = false;
        this.items = [];
        this.init();
    }

    init() {
        if (!this.container) {

            return;
        }

        this.render();
        this.attachEventListeners();
    }

    setItems(items) {
        this.items = items;
        this.render();
        this.attachEventListeners(); // Re-attach event listeners after re-rendering
    }

    render() {
        this.container.innerHTML = '';
        this.container.className = 'relative inline-block text-left';

        // Create the main button
        const button = document.createElement('button');

        button.type = 'button';
        button.className = 'inline-flex justify-between w-full rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors duration-200';
        button.id = `${this.container.id}-button`;

        // Button content
        const buttonContent = document.createElement('span');

        buttonContent.className = 'flex items-center';
        if (this.selectedItems.size === 0) {
            buttonContent.textContent = this.options.placeholder;
        } else if (this.options.showSelectedCount) {
            buttonContent.textContent = `${this.selectedItems.size} selected`;
        } else {
            const selectedLabels = Array.from(this.selectedItems).map(id => {
                const item = this.items.find(item => item.id === id);

                return item ? item.label : id;
            });

            buttonContent.textContent = selectedLabels.join(', ');
        }

        // Dropdown arrow
        const arrow = document.createElement('svg');

        arrow.className = 'ml-2 h-5 w-5';
        arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />';
        button.appendChild(buttonContent);
        button.appendChild(arrow);

        // Create dropdown menu
        const dropdown = document.createElement('div');

        dropdown.className = 'absolute left-0 z-10 mt-2 w-56 origin-top-left rounded-md bg-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none hidden';
        dropdown.id = `${this.container.id}-dropdown`;
        const dropdownContent = document.createElement('div');

        dropdownContent.className = 'py-1';

        // Add items to dropdown
        this.items.forEach(item => {
            const itemElement = this.createItemElement(item);

            dropdownContent.appendChild(itemElement);
        });
        dropdown.appendChild(dropdownContent);

        this.container.appendChild(button);
        this.container.appendChild(dropdown);
    }

    createItemElement(item) {
        const itemDiv = document.createElement('div');

        itemDiv.className = 'relative flex items-center px-4 py-2 text-sm hover:bg-gray-700 cursor-pointer';
        itemDiv.dataset.value = item.id;
        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.className = 'h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700';
        checkbox.checked = this.selectedItems.has(item.id);
        const label = document.createElement('label');

        label.className = 'ml-3 block text-gray-200 cursor-pointer flex-1';
        label.textContent = item.label;

        // Add star rating if item has rating
        if (item.rating) {
            const stars = document.createElement('span');

            stars.className = 'ml-2 text-yellow-400';
            stars.textContent = '★'.repeat(item.rating);
            label.appendChild(stars);
        }

        itemDiv.appendChild(checkbox);
        itemDiv.appendChild(label);

        return itemDiv;
    }

    attachEventListeners() {
        const buttonId = `${this.container.id}-button`;
        const dropdownId = `${this.container.id}-dropdown`;

        const button = document.getElementById(buttonId);
        const dropdown = document.getElementById(dropdownId);

        if (!button || !dropdown) {
            console.error('❌ Button or dropdown not found for event listeners');

            return;
        }

        // Toggle dropdown
        button.addEventListener('click', e => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Handle item selection
        dropdown.addEventListener('click', e => {
            const itemDiv = e.target.closest('[data-value]');

            if (!itemDiv) {
                return;
            }

            e.stopPropagation();
            this.toggleItem(itemDiv.dataset.value);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', e => {
            if (!this.container.contains(e.target)) {
                this.closeDropdown();
            }
        });

        // Close dropdown on escape key
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                this.closeDropdown();
            }
        });
    }

    toggleDropdown() {
        const dropdown = document.getElementById(`${this.container.id}-dropdown`);
        const button = document.getElementById(`${this.container.id}-button`);

        if (!dropdown || !button) {
            console.error('❌ Dropdown or button not found in toggleDropdown');

            return;
        }

        if (this.isOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        const dropdown = document.getElementById(`${this.container.id}-dropdown`);
        const button = document.getElementById(`${this.container.id}-button`);

        if (!dropdown || !button) {
            console.error('❌ Dropdown or button not found in openDropdown');

            return;
        }

        dropdown.classList.remove('hidden');
        this.isOpen = true;

        // Update arrow
        const arrow = button.querySelector('svg');

        if (arrow) {
            arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />';
        }
    }

    closeDropdown() {
        const dropdown = document.getElementById(`${this.container.id}-dropdown`);
        const button = document.getElementById(`${this.container.id}-button`);

        if (!dropdown || !button) {
            return;
        }

        dropdown.classList.add('hidden');
        this.isOpen = false;

        // Update arrow
        const arrow = button.querySelector('svg');

        if (arrow) {
            arrow.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />';
        }
    }

    toggleItem(itemId) {
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
        } else {
            if (this.options.maxSelections && this.selectedItems.size >= this.options.maxSelections) {
                return; // Don't add more items if max reached
            }
            this.selectedItems.add(itemId);
        }

        this.updateDisplay();
        this.updateCheckboxes();
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.selectedItems));
        }
    }

    updateDisplay() {
        const button = document.getElementById(`${this.container.id}-button`);

        if (!button) {
            return;
        }

        const buttonContent = button.querySelector('span');

        if (!buttonContent) {
            return;
        }

        if (this.selectedItems.size === 0) {
            buttonContent.textContent = this.options.placeholder;
        } else if (this.options.showSelectedCount) {
            buttonContent.textContent = `${this.selectedItems.size} selected`;
        } else {
            const selectedLabels = Array.from(this.selectedItems).map(id => {
                const item = this.items.find(item => item.id === id);

                return item ? item.label : id;
            });

            buttonContent.textContent = selectedLabels.join(', ');
        }
    }

    updateCheckboxes() {
        const dropdown = document.getElementById(`${this.container.id}-dropdown`);

        if (!dropdown) {
            return;
        }

        const checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');

        checkboxes.forEach(checkbox => {
            const itemDiv = checkbox.closest('[data-value]');

            if (itemDiv) {
                checkbox.checked = this.selectedItems.has(itemDiv.dataset.value);
            }
        });
    }

    getSelectedItems() {
        return Array.from(this.selectedItems);
    }

    setSelectedItems(itemIds) {
        this.selectedItems = new Set(itemIds);
        this.updateDisplay();
        this.updateCheckboxes();
    }

    clearSelection() {
        this.selectedItems.clear();
        this.updateDisplay();
        this.updateCheckboxes();
    }

    selectAll() {
        this.selectedItems = new Set(this.items.map(item => item.id));
        this.updateDisplay();
        this.updateCheckboxes();
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.selectedItems));
        }
    }

    deselectAll() {
        this.selectedItems.clear();
        this.updateDisplay();
        this.updateCheckboxes();
        if (this.options.onSelectionChange) {
            this.options.onSelectionChange(Array.from(this.selectedItems));
        }
    }
}

// Make it globally available
window.MultiSelectDropdown = MultiSelectDropdown;
