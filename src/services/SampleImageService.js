/**
 * Sample Image Service
 * Provides cached sample images for the credits modal
 * No database queries needed - just returns pre-configured sample images
 */

export class SampleImageService {
    constructor() {
        // Cached sample images - can be updated on server startup
        this.sampleImages = [
            {
                id: 'sample-1',
                url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop&crop=center',
                prompt: 'A beautiful mountain landscape with a serene lake'
            },
            {
                id: 'sample-2',
                url: 'https://images.unsplash.com/photo-1519904981063-b0cf448d479e?w=400&h=300&fit=crop&crop=center',
                prompt: 'A stunning sunset over rolling hills'
            },
            {
                id: 'sample-3',
                url: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=400&h=300&fit=crop&crop=center',
                prompt: 'A peaceful forest scene with sunlight filtering through trees'
            }
        ];
    }

    /**
     * Get a random sample image
     * @returns {Object} Sample image object
     */
    getRandomSampleImage() {
        const randomIndex = Math.floor(Math.random() * this.sampleImages.length);

        return this.sampleImages[randomIndex];
    }

    /**
     * Get a specific sample image by ID
     * @param {string} id - Sample image ID
     * @returns {Object|null} Sample image object or null if not found
     */
    getSampleImageById(id) {
        return this.sampleImages.find(img => img.id === id) || null;
    }

    /**
     * Get all sample images
     * @returns {Array} Array of sample images
     */
    getAllSampleImages() {
        return this.sampleImages;
    }

    /**
     * Update sample images (can be called on server startup)
     * @param {Array} newSampleImages - New array of sample images
     */
    updateSampleImages(newSampleImages) {
        this.sampleImages = newSampleImages;
    }
}

// Create singleton instance
export const sampleImageService = new SampleImageService();
