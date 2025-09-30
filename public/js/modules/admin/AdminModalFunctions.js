/**
 * Admin Modal Functions
 * Handles all modal-related functionality for the admin dashboard
 * Extracted from admin.js for better modularity and maintainability
 */

class AdminModalFunctions {
    /**
     * Show refund reason modal
     * @returns {Promise<string|null>} Refund reason or null if cancelled
     */
    static showRefundReasonModal() {
        // Create a simple modal for refund reason input
        return this.createInputModal('Enter refund reason:', 'text');
    }

    /**
     * Show confirm modal
     * @param {string} message - Confirmation message
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    static showConfirmModal(message) {
        // Create a simple confirm modal
        return this.createConfirmModal(message);
    }

    /**
     * Show add credits modal
     * @returns {Promise<Object|null>} Credits data or null if cancelled
     */
    static async showAddCreditsModal() {
        console.log('🔍 ADMIN: showAddCreditsModal called');

        return new Promise(resolve => {
            const content = `
                <div class="space-y-4">
                    <p class="text-gray-300">Enter credits amount and reason:</p>
                    <input type="number" id="modal-amount" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter amount" required>
                    <input type="text" id="modal-reason" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter reason (optional)" value="Admin credit adjustment">
                    <div class="flex justify-end space-x-2">
                        <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Confirm</button>
                    </div>
                </div>
            `;

            console.log('🔍 ADMIN: Showing credits modal with content:', content);
            window.showModal('Add Credits', content);

            // Wait for modal content to be rendered before adding event listeners
            const setupEventListeners = () => {
                const amountInput = document.getElementById('modal-amount');
                const reasonInput = document.getElementById('modal-reason');
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');

                // Check if all elements exist
                if (!amountInput || !reasonInput || !cancelBtn || !confirmBtn) {
                    console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                    setTimeout(setupEventListeners, 50);
                    return;
                }

                console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

                const cleanup = () => {
                    window.hideModal();
                    if (cancelBtn) {
                        cancelBtn.removeEventListener('click', handleCancel);
                    }
                    if (confirmBtn) {
                        confirmBtn.removeEventListener('click', handleConfirm);
                    }
                    if (amountInput) {
                        amountInput.removeEventListener('keydown', handleKeydown);
                    }
                    if (reasonInput) {
                        reasonInput.removeEventListener('keydown', handleKeydown);
                    }
                };

                const handleCancel = () => {
                    console.log('🔍 ADMIN: Credits modal cancelled');
                    cleanup();
                    resolve(null);
                };

                const handleConfirm = () => {
                    const amount = parseInt(amountInput.value.trim());
                    const reason = reasonInput.value.trim() || 'Admin credit adjustment';

                    console.log('🔍 ADMIN: Credits modal confirmed with:', { amount, reason });

                    if (amount && amount > 0) {
                        cleanup();
                        console.log('🔍 ADMIN: Resolving with result:', { amount, reason });
                        resolve({ amount, reason });
                    } else {
                        console.log('🔍 ADMIN: Invalid amount, not resolving');
                        alert('Please enter a valid amount greater than 0');
                    }
                };

                const handleKeydown = e => {
                    if (e.key === 'Enter') {
                        handleConfirm();
                    } else if (e.key === 'Escape') {
                        handleCancel();
                    }
                };

                // Add event listeners
                cancelBtn.addEventListener('click', handleCancel);
                confirmBtn.addEventListener('click', handleConfirm);
                amountInput.addEventListener('keydown', handleKeydown);
                reasonInput.addEventListener('keydown', handleKeydown);

                // Focus on amount input
                setTimeout(() => amountInput.focus(), 100);
            };

            // Start setting up event listeners
            setupEventListeners();
        });
    }

    /**
     * Show suspension reason modal
     * @returns {Promise<string|null>} Suspension reason or null if cancelled
     */
    static async showSuspensionReasonModal() {
        // Create a simple modal for suspension reason input
        return await this.createInputModal('Enter suspension reason:', 'text');
    }

    /**
     * Show unsuspension reason modal
     * @returns {Promise<string|null>} Unsuspension reason or null if cancelled
     */
    static async showUnsuspensionReasonModal() {
        // Create a simple modal for unsuspension reason input
        return await this.createInputModal('Enter unsuspension reason:', 'text');
    }

    /**
     * Create a simple input modal
     * @param {string} message - Modal message
     * @param {string} type - Input type
     * @returns {Promise<string|null>} Input value or null if cancelled
     */
    static createInputModal(message, type = 'text') {
        console.log('🔍 ADMIN: createInputModal called with:', { message, type });

        return new Promise(resolve => {
            const content = `
                <div class="space-y-4">
                    <p class="text-gray-300">${message}</p>
                    <input type="${type}" id="modal-input" class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter ${type === 'number' ? 'amount' : 'reason'}">
                    <div class="flex justify-end space-x-2">
                        <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button id="modal-confirm" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">Confirm</button>
                    </div>
                </div>
            `;

            console.log('🔍 ADMIN: Showing modal with content:', content);
            window.showModal('Input Required', content);

            // Wait for modal content to be rendered before adding event listeners
            const setupEventListeners = () => {
                const input = document.getElementById('modal-input');
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');

                // Check if all elements exist
                if (!input || !cancelBtn || !confirmBtn) {
                    console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                    setTimeout(setupEventListeners, 50);
                    return;
                }

                console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

                const cleanup = () => {
                    window.hideModal();
                    if (cancelBtn) {
                        cancelBtn.removeEventListener('click', handleCancel);
                    }
                    if (confirmBtn) {
                        confirmBtn.removeEventListener('click', handleConfirm);
                    }
                    if (input) {
                        input.removeEventListener('keydown', handleKeydown);
                    }
                };

                const handleCancel = () => {
                    console.log('🔍 ADMIN: Modal cancelled');
                    cleanup();
                    resolve(null);
                };

                const handleConfirm = () => {
                    const value = input.value.trim();

                    console.log('🔍 ADMIN: Modal confirmed with value:', value);
                    if (value) {
                        cleanup();
                        const result = type === 'number' ? parseInt(value) || 0 : value;

                        console.log('🔍 ADMIN: Resolving with result:', result);
                        resolve(result);
                    } else {
                        console.log('🔍 ADMIN: No value provided, not resolving');
                    }
                };

                const handleKeydown = e => {
                    if (e.key === 'Enter') {
                        handleConfirm();
                    } else if (e.key === 'Escape') {
                        handleCancel();
                    }
                };

                cancelBtn.addEventListener('click', handleCancel);
                confirmBtn.addEventListener('click', handleConfirm);
                input.addEventListener('keydown', handleKeydown);

                // Focus the input
                setTimeout(() => input.focus(), 100);
            };

            // Start setting up event listeners
            setupEventListeners();
        });
    }

    /**
     * Create a simple confirm modal
     * @param {string} message - Confirmation message
     * @returns {Promise<boolean>} True if confirmed, false if cancelled
     */
    static createConfirmModal(message) {
        return new Promise(resolve => {
            const content = `
                <div class="space-y-4">
                    <p class="text-gray-300">${message}</p>
                    <div class="flex justify-end space-x-2">
                        <button id="modal-cancel" class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
                        <button id="modal-confirm" class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">Confirm</button>
                    </div>
                </div>
            `;

            window.showModal('Confirm Action', content);

            // Wait for modal content to be rendered before adding event listeners
            const setupEventListeners = () => {
                const cancelBtn = document.getElementById('modal-cancel');
                const confirmBtn = document.getElementById('modal-confirm');

                // Check if all elements exist
                if (!cancelBtn || !confirmBtn) {
                    console.log('🔍 ADMIN: Modal elements not ready, retrying...');
                    setTimeout(setupEventListeners, 50);
                    return;
                }

                console.log('🔍 ADMIN: All modal elements found, setting up event listeners');

                const cleanup = () => {
                    window.hideModal();
                    if (cancelBtn) {
                        cancelBtn.removeEventListener('click', handleCancel);
                    }
                    if (confirmBtn) {
                        confirmBtn.removeEventListener('click', handleConfirm);
                    }
                };

                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };

                const handleConfirm = () => {
                    cleanup();
                    resolve(true);
                };

                cancelBtn.addEventListener('click', handleCancel);
                confirmBtn.addEventListener('click', handleConfirm);
            };

            // Start setting up event listeners
            setupEventListeners();
        });
    }
}

// Export for use in other modules
window.AdminModalFunctions = AdminModalFunctions;
