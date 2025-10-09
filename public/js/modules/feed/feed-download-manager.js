// Feed Download Manager - Handles image download functionality
class FeedDownloadManager {

    // Handle auto download for feed
    handleAutoDownloadForFeed(imageData, isNewGeneration = false) {
        // Only trigger auto download for new generations, not existing images loaded on page load
        if (!isNewGeneration) {
            return;
        }

        const autoDownload = document.querySelector('input[name="autoDownload"]:checked');

        if (autoDownload) {
            // Use a more reliable download method that should show Save As dialog
            this.downloadImageFile(imageData.url || imageData.imageUrl);
        }
    }

    // Download image file
    downloadImageFile(imageUrl) {
        if (!imageUrl) {
            console.error('❌ DOWNLOAD MANAGER: No image URL provided');

            return;
        }

        try {
            // Method 1: Try fetch + blob download (most reliable for Save As dialog)
            this.downloadImageAsBlob(imageUrl);
        } catch (error) {
            console.error('❌ DOWNLOAD MANAGER: Blob download failed, trying fallback:', error);

            // Method 2: Fallback to anchor download
            try {
                const a = document.createElement('a');
                const fileName = this.generateFileName(imageUrl);

                a.href = imageUrl;
                a.download = fileName;
                a.style.display = 'none';

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

            } catch (fallbackError) {
                console.error('❌ DOWNLOAD MANAGER: All download methods failed:', fallbackError);
            }
        }
    }

    // Download image as blob
    async downloadImageAsBlob(imageUrl) {
        try {
            // Fetch the image as a blob
            const response = await fetch(imageUrl);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const blob = await response.blob();
            const fileName = this.generateFileName(imageUrl);

            // Create object URL and download
            const objectUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');

            a.href = objectUrl;
            a.download = fileName;
            a.style.display = 'none';

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Clean up object URL
            URL.revokeObjectURL(objectUrl);

        } catch (error) {
            console.error('❌ DOWNLOAD MANAGER: Blob download failed:', error);
            throw error; // Re-throw to trigger fallback
        }
    }

    // Generate filename
    generateFileName(imageUrl) {
        try {
            const { pathname } = new URL(imageUrl);
            const fileName = pathname.split('/').pop();

            // If no filename or extension, generate one
            if (!fileName || !fileName.includes('.')) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

                return `generated-image-${timestamp}.jpg`;
            }

            return decodeURIComponent(fileName);
        } catch (error) {
            // Fallback filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

            return `generated-image-${timestamp}.jpg`;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedDownloadManager = FeedDownloadManager;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedDownloadManager;
}
