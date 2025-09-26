/**
 * Consolidated Image Factory - Replace scattered image creation logic
 * Consolidates image creation from: feed-manager.js, images.js, image-ui.js
 */

class ImageFactory {
    static createImageData(result) {
        // Normalize different API response formats
        return {
            id: result.id || result.imageId || Date.now().toString(),
            url: result.imageUrl || result.image || result.url || `uploads/${result.imageName}`,
            title: result.prompt || result.title || 'Generated Image',
            prompt: result.prompt || '',
            original: result.original || result.prompt || '',
            provider: result.provider || result.providerName || 'unknown',
            guidance: result.guidance || '',
            rating: result.rating || 0,
            userId: result.userId || null,
            createdAt: result.createdAt || result.timestamp || new Date().toISOString()
        };
    }

    static createImageElement(imageData, options = {}) {
        const img = document.createElement('img');

        // Standard properties
        // Handle base64 data URLs properly
        if (imageData.url && (imageData.url.startsWith('iVBORw0KGgo') || imageData.url.startsWith('/9j/'))) {
            // It's base64 image data, format as data URL
            img.src = `data:image/jpeg;base64,${imageData.url}`;
        } else {
            img.src = imageData.url;
        }
        img.alt = imageData.title;
        img.title = imageData.title;
        img.classList.add('generated-image');

        // Dataset attributes
        Object.entries(imageData).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                img.dataset[key] = value.toString();
            }
        });

        // Apply options
        const defaultStyles = {
            width: '100%',
            height: options.height || '150px',
            objectFit: 'cover',
            cursor: 'pointer',
            borderRadius: '3px'
        };

        Object.assign(img.style, defaultStyles, options.styles || {});

        return img;
    }

    static createImageWrapper(imageData, options = {}) {
        const wrapper = document.createElement('div');

        wrapper.className = 'image-wrapper';

        const img = this.createImageElement(imageData, options);

        wrapper.appendChild(img);

        // Add rating display if available
        if (imageData.rating && imageData.rating > 0) {
            const ratingElement = document.createElement('div');

            ratingElement.className = 'rating';
            ratingElement.textContent = `★ ${imageData.rating}`;
            wrapper.appendChild(ratingElement);
        }

        return wrapper;
    }

    static createListItem(imageData, options = {}) {
        const li = document.createElement('li');

        li.className = 'image-item';

        // Standard list item styles
        Object.assign(li.style, {
            width: '100%',
            height: options.height || '150px',
            minHeight: options.height || '150px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0',
            padding: '0'
        });

        // Add filter attributes
        const currentUser = this.getCurrentUser();
        const isUserImage = currentUser && imageData.userId === currentUser.id;
        const filterType = isUserImage ? 'user' : 'site';

        li.setAttribute('data-filter', filterType);
        li.setAttribute('data-user-id', imageData.userId || 'unknown');
        li.setAttribute('data-image-id', imageData.id);

        return li;
    }

    static getCurrentUser() {
        // Consolidated user detection logic
        if (window.authComponent?.getUser) {
            return window.authComponent.getUser();
        }

        const userData = localStorage.getItem('userData');

        if (userData) {
            try {
                const parsed = JSON.parse(userData);

                return parsed.data?.user || parsed.user || (parsed.id ? parsed : null);
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }

        return null;
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.ImageFactory = ImageFactory;
}
