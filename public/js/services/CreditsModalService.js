/**
 * CreditsModalService - Handles credits modal functionality
 * Responsible for showing modal when users run out of credits
 */

class CreditsModalService {
    constructor() {
        this.modal = null;
    }

    /**
     * Show the credits modal when user has insufficient credits
     * @param {Object} errorData - Error data from 402 response
     */
    showCreditsModal(errorData) {
        console.log('💳 CREDITS: Showing credits modal with error data:', errorData);

        const required = errorData?.required || 1;
        const current = errorData?.current || 0;
        const shortfall = errorData?.shortfall || required;

        // Show alert first
        const alertMessage = `Insufficient Credits!\n\nYou need ${required} credits to generate this image, but you only have ${current} credits.\n\nPlease add more credits to continue.`;

        alert(alertMessage);

        // Then show the modal
        this.displayModal(shortfall);
    }

    /**
     * Display the credits modal
     * @param {number} shortfall - Number of credits needed
     */
    displayModal(shortfall = 1) {
        console.log('🎨 CREDITS: Displaying modal with shortfall:', shortfall);

        // Create the modal if it doesn't exist
        let modal = document.getElementById('credits-modal');

        if (!modal) {
            modal = this.createModal(shortfall);
            document.body.appendChild(modal);
            console.log('🎨 CREDITS: Modal created and appended to body');
        } else {
            console.log('🎨 CREDITS: Using existing modal');
        }

        // Show the modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        console.log('🎨 CREDITS: Modal should now be visible');

        // Load packages and sample image
        this.loadPackagesForModal();
        this.loadSampleImage();
    }

    /**
     * Create the modal HTML structure
     * @param {number} shortfall - Number of credits needed
     * @returns {HTMLElement} Modal element
     */
    createModal(shortfall = 1) {
        console.log('🎨 CREDITS: Creating modal HTML with shortfall:', shortfall);
        const modal = document.createElement('div');

        modal.id = 'credits-modal';
        modal.className = 'credits-modal-overlay';

        // Add inline styles as fallback
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;

        modal.innerHTML = `
            <div class="credits-modal" style="background: var(--color-surface-primary); border-radius: 8px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15); max-width: 800px; width: 90%; max-height: 85vh; overflow: hidden; position: relative; border: 1px solid var(--color-border-primary);">
                <div class="credits-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 24px; background: var(--color-surface-secondary); border-bottom: 1px solid var(--color-border-primary);">
                    <h2 style="color: var(--color-text-primary); margin: 0; font-size: 22px; font-weight: 700;">Add Credits</h2>
                    <button class="credits-modal-close" onclick="window.creditsModalService.closeModal()" style="background: none; border: none; color: var(--color-text-primary); font-size: 28px; cursor: pointer; padding: 4px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: bold;">&times;</button>
                </div>

                <div class="credits-modal-content" style="padding: 30px;">
                    <div style="display: flex; gap: 30px; align-items: flex-start;">
                        <div style="flex: 1;" class="credits-modal-sample-image-container hide-mobile">
                            <div id="credits-sample-image" style="width: 280px; height: 200px; background: var(--color-surface-tertiary); border-radius: 6px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center; color: var(--color-text-primary); font-size: 16px; font-weight: 500; border: 2px solid var(--color-border-secondary);">
                                Loading sample image...
                            </div>
                            <div style="background: var(--color-surface-secondary); padding: 20px; border-radius: 6px; border: 1px solid var(--color-border-primary);">
                                <h3 style="color: var(--color-text-primary); font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">Insufficient Credits</h3>
                                <p style="color: var(--color-text-primary); font-size: 16px; margin: 0 0 12px 0; line-height: 1.5; font-weight: 500;">
                                    You need <strong style="color: var(--color-status-error); font-weight: 700;">${shortfall} credit${shortfall > 1 ? 's' : ''}</strong> to generate images.
                                </p>
                                <p style="color: var(--color-text-secondary); font-size: 14px; margin: 0; line-height: 1.5;">
                                    Choose a package below to continue generating high-quality AI images.
                                </p>
                            </div>
                        </div>

                        <div style="flex: 1;">
                            <h3 style="color: var(--color-text-primary); font-size: 20px; font-weight: 700; margin: 0 0 20px 0;">Credit Packages</h3>
                            <div id="credits-packages-grid" class="credits-packages-grid" style="display: grid; grid-template-columns: 1fr; gap: 15px; margin-bottom: 25px; max-height: 350px; overflow-y: auto;">
                                <div class="credits-loading" style="text-align: center; color: var(--color-text-primary); padding: 30px; font-size: 16px; font-weight: 500;">Loading packages...</div>
                            </div>

                            <div style="text-align: center; padding-top: 15px; border-top: 1px solid var(--color-border-primary);">
                                <button class="credits-modal-cancel" onclick="window.creditsModalService.closeModal()" style="background: var(--color-surface-secondary); border: 2px solid var(--color-border-primary); color: var(--color-text-primary); padding: 12px 24px; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer;">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Close the modal
     */
    closeModal() {
        const modal = document.getElementById('credits-modal');

        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    /**
     * Load sample image from the API
     */
    async loadSampleImage() {
        try {
            const sampleImageDiv = document.getElementById('credits-sample-image');

            if (!sampleImageDiv) {
                return;
            }

            console.log('🎨 CREDITS: Loading sample image...');

            // Try to get a sample image from your images API
            const response = await fetch('/api/images/sample');

            console.log('🎨 CREDITS: Sample image response status:', response.status);

            if (response.ok) {
                const data = await response.json();

                console.log('🎨 CREDITS: Sample image data:', data);

                if (data.success && data.data && data.data.image && data.data.image.url) {
                    const imageUrl = data.data.image.url;

                    console.log('🎨 CREDITS: Loading image from URL:', imageUrl);

                    sampleImageDiv.innerHTML = `
                        <img src="${imageUrl}" alt="Sample AI generated image"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border-secondary);"
                             onerror="this.parentElement.innerHTML='<div style=\\'color: var(--color-text-primary); font-size: 16px; font-weight: 500;\\'>Sample image failed to load</div>'">
                    `;

                    return;
                }
            } else {
                console.log('🎨 CREDITS: Sample image API failed with status:', response.status);
            }
        } catch (error) {
            console.log('🎨 CREDITS: Could not load sample image:', error);
        }

        // Fallback: show a simple placeholder with better styling
        const sampleImageDiv = document.getElementById('credits-sample-image');

        if (sampleImageDiv) {
            sampleImageDiv.innerHTML = `
                <div style="color: var(--color-text-primary); font-size: 16px; font-weight: 500; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <div style="font-size: 48px; margin-bottom: 10px;">🎨</div>
                    <div>AI Generated Image</div>
                    <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 8px;">Sample preview</div>
                </div>
            `;
        }
    }

    /**
     * Load credit packages for the modal
     */
    async loadPackagesForModal() {
        try {
            const packagesGrid = document.getElementById('credits-packages-grid');

            if (!packagesGrid) {
                return;
            }

            // Use UnifiedCreditService if available (the working system)
            if (window.UnifiedCreditService) {
                const packages = await window.UnifiedCreditService.getPackages();

                this.renderPackagesInModal(packages);
            } else {
                // Fallback: direct API call
                const response = await fetch('/api/credits/packages');

                if (response.ok) {
                    const data = await response.json();

                    this.renderPackagesInModal(data.packages || []);
                } else {
                    packagesGrid.innerHTML = '<div class="credits-error">Unable to load packages. Please try again later.</div>';
                }
            }
        } catch (error) {
            console.error('❌ CREDITS: Failed to load packages for modal:', error);
            const packagesGrid = document.getElementById('credits-packages-grid');

            if (packagesGrid) {
                packagesGrid.innerHTML = '<div class="credits-error">Unable to load packages. Please try again later.</div>';
            }
        }
    }

    /**
     * Render packages in the modal
     * @param {Array} packages - Array of package objects
     */
    renderPackagesInModal(packages) {
        const packagesGrid = document.getElementById('credits-packages-grid');

        if (!packagesGrid || !packages.length) {
            packagesGrid.innerHTML = '<div class="credits-error">No packages available.</div>';

            return;
        }

        packagesGrid.innerHTML = '';

        packages.forEach(pkg => {
            const packageElement = document.createElement('div');

            packageElement.className = 'credits-package-card';
            packageElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <div style="font-weight: 700; color: var(--color-text-primary); font-size: 18px;">${pkg.name}</div>
                    <div style="background: var(--color-surface-tertiary); color: var(--color-text-primary); padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 600; border: 1px solid var(--color-border-primary);">${pkg.credits.toLocaleString()} credits</div>
                </div>
                <div style="font-size: 24px; font-weight: 800; color: var(--color-text-primary); margin-bottom: 12px;">$${pkg.price}</div>
                <div style="color: var(--color-text-secondary); font-size: 14px; margin-bottom: 16px; line-height: 1.4;">${pkg.description || 'Perfect for getting started with AI image generation'}</div>
                <button onclick="window.creditsModalService.purchasePackage('${pkg.id}')" style="width: 100%; background: var(--color-accent-primary); color: var(--color-text-inverse); border: none; padding: 12px; border-radius: 6px; font-size: 16px; font-weight: 700; cursor: pointer; transition: all 0.2s ease;">
                    Buy Now
                </button>
            `;

            packagesGrid.appendChild(packageElement);
        });
    }

    /**
     * Purchase a credit package
     * @param {string} packageId - Package ID to purchase
     */
    async purchasePackage(packageId) {
        try {
            console.log('💳 CREDITS: Purchasing package:', packageId);

            // Use UnifiedCreditService (the working system)
            if (window.UnifiedCreditService) {
                await window.UnifiedCreditService.purchasePackage(packageId);
            } else {
                // Fallback: direct API call
                const response = await fetch('/api/credits/purchase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.getAuthToken()}`
                    },
                    body: JSON.stringify({
                        packageId,
                        successUrl: `${window.location.origin}/purchase-success.html`,
                        cancelUrl: window.location.href
                    })
                });

                if (response.ok) {
                    const data = await response.json();

                    if (data.url) {
                        window.location.href = data.url;
                    } else {
                        throw new Error('No checkout URL received');
                    }
                } else {
                    const errorData = await response.json();

                    throw new Error(errorData.message || 'Purchase failed');
                }
            }
        } catch (error) {
            console.error('❌ CREDITS: Package purchase failed:', error);
            alert(`Purchase failed: ${error.message}. Please try again or contact support.`);
        }
    }

    /**
     * Get authentication token for API calls
     * @returns {string|null} Auth token
     */
    getAuthToken() {
        return window.AdminAuthUtils?.getAuthToken() ||
               localStorage.getItem('authToken') ||
               sessionStorage.getItem('authToken');
    }
}

// Export for global access
window.CreditsModalService = CreditsModalService;

// Create global instance
window.creditsModalService = new CreditsModalService();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CreditsModalService;
}
