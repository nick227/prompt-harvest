/**
 * Admin Image Manager - Handles all image-related operations in the admin dashboard
 * Single Responsibility: Manage image operations (view, edit, delete, moderate, etc.)
 */

/* global AdminUtils */

class AdminImageManager {
    constructor(uiRenderer) {
        this.uiRenderer = uiRenderer;
    }

    async viewImage(imageId) {
        try {
            // For demo purposes, create a mock image object
            const mockImage = {
                id: imageId,
                url: 'https://via.placeholder.com/800x600/4ECDC4/FFFFFF?text=Demo+Image',
                prompt: 'A beautiful demo image for testing purposes',
                status: 'completed',
                createdAt: new Date().toISOString(),
                user: { email: 'demo@example.com' },
                model: 'dall-e-3',
                width: 1024,
                height: 1024,
                tags: ['demo', 'test', 'placeholder']
            };

            this.showImageViewerModal(mockImage);
        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error fetching image for viewing:', error);
            AdminUtils.showNotification(`Failed to load image: ${error.message}`, 'error');
        }
    }

    showImageViewerModal(image) {
        const modalContent = `
            <div class="image-viewer-content">
                <div class="image-viewer-grid">
                    <div class="image-viewer-image">
                        <img src="${image.url}" class="img-fluid rounded" alt="Generated Image" style="max-height: 400px; object-fit: contain;">
                    </div>
                    <div class="image-viewer-details">
                        <h6>Image Information</h6>
                        <p><strong>ID:</strong> ${image.id}</p>
                        <p><strong>Prompt:</strong> ${image.prompt || 'N/A'}</p>
                        <p><strong>Status:</strong> <span class="badge badge-${image.status === 'active' ? 'success' : 'secondary'}">${image.status}</span></p>
                        <p><strong>Created:</strong> ${new Date(image.createdAt).toLocaleString()}</p>
                        <p><strong>User:</strong> ${image.user?.email || 'Unknown'}</p>
                        <p><strong>Model:</strong> ${image.model || 'N/A'}</p>
                        <p><strong>Size:</strong> ${image.width}x${image.height}</p>
                        ${image.tags && image.tags.length > 0
        ? `
                            <p><strong>Tags:</strong> ${image.tags.join(', ')}</p>
                        `
        : ''}
                        ${image.likes ? `<p><strong>Likes:</strong> ${image.likes}</p>` : ''}
                    </div>
                </div>
                <div class="image-viewer-actions">
                    <a href="${image.url}" target="_blank" class="btn btn-primary">
                        <i class="fas fa-external-link-alt"></i> Open Full Size
                    </a>
                </div>
            </div>
        `;

        // Use the unified modal system
        if (window.adminModal) {
            window.adminModal.show('Image Details', modalContent, { size: 'lg' });
        } else {
            console.error('❌ ADMIN-IMAGE: AdminModalManager not available');
            AdminUtils.showNotification('Modal system not available', 'error');
        }
    }

    async toggleImageVisibility(imageId) {
        try {
            // For demo purposes, simulate the toggle functionality
            // In a real implementation, this would make an API call

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Show success notification
            AdminUtils.showNotification('Image visibility toggled successfully', 'success');

            // Refresh the images table
            if (window.adminApp?.dashboardManager) {
                await window.adminApp.dashboardManager.handleHistoryRefresh('images');
            }

        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error toggling image visibility:', error);
            AdminUtils.showNotification(`Failed to toggle image visibility: ${error.message}`, 'error');
        }
    }

    async adminHideImage(imageId) {
        if (!confirm('Are you sure you want to hide this image from everyone? This will hide it from all users including the original creator.')) {
            return;
        }

        try {
            // For demo purposes, simulate the hide functionality

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Show success notification
            AdminUtils.showNotification('Image hidden from everyone successfully', 'success');

            // Refresh the images table
            if (window.adminApp?.dashboardManager) {
                await window.adminApp.dashboardManager.handleHistoryRefresh('images');
            }

        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error hiding image:', error);
            AdminUtils.showNotification(`Failed to hide image: ${error.message}`, 'error');
        }
    }

    async adminShowImage(imageId) {
        try {
            // For demo purposes, simulate the show functionality

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Show success notification
            AdminUtils.showNotification('Image shown to everyone successfully', 'success');

            // Refresh the images table
            if (window.adminApp?.dashboardManager) {
                await window.adminApp.dashboardManager.handleHistoryRefresh('images');
            }

        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error showing image:', error);
            AdminUtils.showNotification(`Failed to show image: ${error.message}`, 'error');
        }
    }

    async deleteImage(imageId, permanent = false) {
        const deleteType = permanent ? 'permanently delete' : 'delete';
        const confirmMessage = permanent
            ? 'Are you sure you want to PERMANENTLY delete this image? This will remove it from both the database and cloud storage. This action cannot be undone.'
            : 'Are you sure you want to delete this image? This will mark it as deleted but keep the record for audit purposes.';

        if (!confirm(confirmMessage)) {
            return;
        }

        try {

            // Call the API service
            const response = await window.adminApp?.apiService?.deleteImage(imageId, permanent);

            if (response?.success) {
                const message = permanent
                    ? 'Image permanently deleted successfully'
                    : 'Image deleted successfully (soft delete)';

                AdminUtils.showNotification(message, 'success');

                // Refresh the images table
                if (window.adminApp?.dashboardManager) {
                    await window.adminApp.dashboardManager.handleHistoryRefresh('images');
                }

            } else {
                throw new Error(response?.message || 'Delete operation failed');
            }
        } catch (error) {
            console.error(`❌ ADMIN-IMAGE: Error ${deleteType} image:`, error);
            AdminUtils.showNotification(`Failed to ${deleteType} image: ${error.message}`, 'error');
        }
    }

    async moderateImage(imageId) {
        try {
            // For demo purposes, create a mock image object
            const mockImage = {
                id: imageId,
                url: 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=Moderation+Demo',
                prompt: 'A demo image for moderation testing',
                status: 'pending',
                createdAt: new Date().toISOString(),
                user: { email: 'demo@example.com' }
            };

            this.showImageModerationModal(mockImage);
        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error fetching image for moderation:', error);
            AdminUtils.showNotification(`Failed to load image: ${error.message}`, 'error');
        }
    }

    showImageModerationModal(image) {
        const modalContent = `
            <div class="image-moderation-content">
                <div class="image-moderation-grid">
                    <div class="image-moderation-image">
                        <img src="${image.url}" class="img-fluid rounded" alt="Generated Image" style="max-height: 400px; object-fit: contain;">
                    </div>
                    <div class="image-moderation-details">
                        <h6>Image Information</h6>
                        <p><strong>ID:</strong> ${image.id}</p>
                        <p><strong>Prompt:</strong> ${image.prompt || 'N/A'}</p>
                        <p><strong>Current Status:</strong> <span class="badge badge-${image.status === 'active' ? 'success' : 'secondary'}">${image.status}</span></p>
                        <p><strong>Created:</strong> ${new Date(image.createdAt).toLocaleString()}</p>
                        <p><strong>User:</strong> ${image.user?.email || 'Unknown'}</p>

                        <hr>
                        <h6>Moderation Actions</h6>
                        <div class="moderation-actions">
                            <button type="button" class="btn btn-success btn-sm mb-2" id="approveImage">
                                <i class="fas fa-check"></i> Approve Image
                            </button>
                            <button type="button" class="btn btn-warning btn-sm mb-2" id="flagImage">
                                <i class="fas fa-flag"></i> Flag for Review
                            </button>
                            <button type="button" class="btn btn-danger btn-sm mb-2" id="rejectImage">
                                <i class="fas fa-times"></i> Reject Image
                            </button>
                        </div>

                        <div class="moderation-reason mt-3" id="moderationReason" style="display: none;">
                            <label for="reasonText">Reason for action:</label>
                            <textarea id="reasonText" class="form-control" rows="3" placeholder="Enter reason for moderation action..."></textarea>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Use the unified modal system
        if (window.adminModal) {
            window.adminModal.show('Moderate Image', modalContent, { size: 'lg' });

            // Setup moderation action handlers after modal is shown
            setTimeout(() => {
                this.setupModerationHandlers(image.id);
            }, 100);
        } else {
            console.error('❌ ADMIN-IMAGE: AdminModalManager not available');
            AdminUtils.showNotification('Modal system not available', 'error');
        }
    }

    setupModerationHandlers(imageId) {
        const approveBtn = document.getElementById('approveImage');
        const flagBtn = document.getElementById('flagImage');
        const rejectBtn = document.getElementById('rejectImage');
        const reasonDiv = document.getElementById('moderationReason');
        const reasonText = document.getElementById('reasonText');

        if (!approveBtn || !flagBtn || !rejectBtn) {
            console.error('❌ ADMIN-IMAGE: Moderation buttons not found');

            return;
        }

        const showReasonField = () => {
            if (reasonDiv) {
                reasonDiv.style.display = 'block';
            }
        };

        const hideReasonField = () => {
            if (reasonDiv) {
                reasonDiv.style.display = 'none';
            }
            if (reasonText) {
                reasonText.value = '';
            }
        };

        const closeModal = () => {
            if (window.adminModal) {
                window.adminModal.close();
            }
        };

        approveBtn.addEventListener('click', async () => {
            await this.performModerationAction(imageId, 'approve', reasonText?.value || '');
            closeModal();
        });

        flagBtn.addEventListener('click', () => {
            showReasonField();
            flagBtn.onclick = async () => {
                await this.performModerationAction(imageId, 'flag', reasonText?.value || '');
                closeModal();
            };
        });

        rejectBtn.addEventListener('click', () => {
            showReasonField();
            rejectBtn.onclick = async () => {
                await this.performModerationAction(imageId, 'reject', reasonText?.value || '');
                closeModal();
            };
        });
    }

    async performModerationAction(imageId, action, reason = '') {
        try {
            // Check authentication before making request
            if (!window.AdminAuthUtils?.hasValidToken()) {
                console.warn('🔐 ADMIN-IMAGE: No valid token for moderation action, skipping');

                return;
            }

            const authToken = window.AdminAuthUtils.getAuthToken();
            const response = await fetch(`/api/admin/images/${imageId}/moderate`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, reason })
            });

            if (response.ok) {
                const actionText = action === 'approve' ? 'approved' : action === 'flag' ? 'flagged' : 'rejected';

                AdminUtils.showNotification(`Image ${actionText} successfully`, 'success');

                // Refresh the images table
                if (window.adminApp?.dashboardManager) {
                    await window.adminApp.dashboardManager.handleHistoryRefresh('images');
                }
            } else {
                const error = await response.json();

                AdminUtils.showNotification(`Failed to moderate image: ${error.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error moderating image:', error);
            AdminUtils.showNotification(`Failed to moderate image: ${error.message}`, 'error');
        }
    }

    async generateImageTags(imageId) {
        try {
            // For demo purposes, simulate the tag generation

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Show success message
            AdminUtils.showNotification('AI tags generation started. Tags will appear when ready.', 'success');

            // Refresh the images table after a short delay to show updated tags
            setTimeout(async () => {
                if (window.adminApp?.dashboardManager) {
                    await window.adminApp.dashboardManager.handleHistoryRefresh('images');
                }
            }, 2000);
        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error generating tags:', error);
            AdminUtils.showNotification(`Failed to generate tags: ${error.message}`, 'error');
        }
    }

    async editImageTags(imageId) {
        try {
            // For demo purposes, use mock tags
            const mockTags = ['demo', 'test', 'placeholder', 'admin', 'sample'];

            // Show tag editing modal
            this.showTagEditModal(imageId, mockTags);
        } catch (error) {
            console.error('❌ ADMIN-IMAGE: Error fetching image for tag editing:', error);
            AdminUtils.showNotification(`Failed to load image data: ${error.message}`, 'error');
        }
    }

    showTagEditModal(imageId, currentTags) {
        const modalContent = `
            <div class="tag-edit-content">
                <div class="form-group">
                    <label for="imageTags">Tags (comma-separated):</label>
                    <textarea id="imageTags" class="form-control" rows="3" placeholder="Enter tags separated by commas">${currentTags.join(', ')}</textarea>
                    <small class="form-text text-muted">Enter tags separated by commas. Tags will be automatically cleaned and validated.</small>
                </div>
                <div class="tag-edit-actions">
                    <button type="button" class="btn btn-primary" id="saveTagsBtn">Save Tags</button>
                </div>
            </div>
        `;

        // Use the unified modal system
        if (window.adminModal) {
            window.adminModal.show('Edit Image Tags', modalContent);

            // Setup save button handler after modal is shown
            setTimeout(() => {
                this.setupTagEditHandlers(imageId);
            }, 100);
        } else {
            console.error('❌ ADMIN-IMAGE: AdminModalManager not available');
            AdminUtils.showNotification('Modal system not available', 'error');
        }
    }

    setupTagEditHandlers(imageId) {
        const saveBtn = document.getElementById('saveTagsBtn');
        const tagsInput = document.getElementById('imageTags');

        if (!saveBtn || !tagsInput) {
            console.error('❌ ADMIN-IMAGE: Tag edit elements not found');

            return;
        }

        saveBtn.addEventListener('click', async () => {
            const tags = tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);

            try {
                // Check authentication before making request
                if (!window.AdminAuthUtils?.hasValidToken()) {
                    console.warn('🔐 ADMIN-IMAGE: No valid token for tag update, skipping');

                    return;
                }

                const authToken = window.AdminAuthUtils.getAuthToken();
                const response = await fetch(`/api/admin/images/${imageId}/update-tags`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ tags })
                });

                if (response.ok) {
                    if (window.adminModal) {
                        window.adminModal.close();
                    }
                    AdminUtils.showNotification('Tags updated successfully', 'success');

                    // Refresh the images table
                    if (window.adminApp?.dashboardManager) {
                        await window.adminApp.dashboardManager.handleHistoryRefresh('images');
                    }
                } else {
                    const error = await response.json();

                    AdminUtils.showNotification(`Failed to update tags: ${error.error || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('❌ ADMIN-IMAGE: Error updating tags:', error);
                AdminUtils.showNotification(`Failed to update tags: ${error.message}`, 'error');
            }
        });
    }

    destroy() {
        // Clean up any event listeners or resources
    }
}

// Export for global access
window.AdminImageManager = AdminImageManager;
