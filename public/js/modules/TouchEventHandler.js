/**
 * Touch Event Handler Module
 * Handles touch/swipe navigation for mobile devices
 * Uses modern Touch Events API for reliable swipe detection
 */
class TouchEventHandler {
    constructor(imageManager) {
        this.imageManager = imageManager;
        this.fullscreenContainer = null;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.isSwipeInProgress = false;

        // Configuration
        this.minSwipeDistance = 30; // Reduced for more responsive swipes
        this.maxVerticalDistance = 100;

        this.cleanupTouchEvents = null;
    }

    setup(fullscreenContainer) {
        this.fullscreenContainer = fullscreenContainer;


        if (!this.fullscreenContainer) {
            console.warn('⚠️ TOUCH HANDLER: No fullscreen container found for touch events');

            return;
        }

        this.addTouchEventListeners();
    }

    addTouchEventListeners() {
        const handleTouchStart = event => {

            if (event.touches.length !== 1) {
                return; // Only handle single touch
            }

            // Check if touch target is an interactive element
            const { target } = event;
            const isInteractive = target.closest('button') ||
                                 target.closest('input') ||
                                 target.closest('select') ||
                                 target.closest('textarea') ||
                                 target.closest('.info-box-toggle') ||
                                 target.closest('.info-box-header');

            if (isInteractive) {
                return; // Don't interfere with interactive elements
            }

            this.touchStartX = event.touches[0].clientX;
            this.touchStartY = event.touches[0].clientY;
            this.isSwipeInProgress = true;


            // Prevent default to avoid scrolling during swipe
            event.preventDefault();
        };

        const handleTouchMove = event => {
            if (!this.isSwipeInProgress || event.touches.length !== 1) {
                return;
            }

            // Check if touch target is an interactive element
            const { target } = event;
            const isInteractive = target.closest('button') ||
                                 target.closest('input') ||
                                 target.closest('select') ||
                                 target.closest('textarea') ||
                                 target.closest('.info-box-toggle') ||
                                 target.closest('.info-box-header');

            if (isInteractive) {
                return; // Don't interfere with interactive elements
            }

            // Prevent default to avoid scrolling during swipe
            event.preventDefault();
        };

        const handleTouchEnd = event => {

            if (!this.isSwipeInProgress) {
                return;
            }

            this.touchEndX = event.changedTouches[0].clientX;
            this.touchEndY = event.changedTouches[0].clientY;

            const deltaX = this.touchEndX - this.touchStartX;
            const deltaY = Math.abs(this.touchEndY - this.touchStartY);


            // Check if this is a valid horizontal swipe
            if (Math.abs(deltaX) >= this.minSwipeDistance && deltaY <= this.maxVerticalDistance) {

                if (deltaX > 0) {
                    // Swipe right - go to previous image
                    this.imageManager.navigateImage('prev');
                } else {
                    // Swipe left - go to next image
                    this.imageManager.navigateImage('next');
                }
            }
            // No swipe threshold met - do nothing

            this.isSwipeInProgress = false;
        };

        const handleTouchCancel = () => {
            this.isSwipeInProgress = false;
        };

        // Add touch event listeners
        this.fullscreenContainer.addEventListener('touchstart', handleTouchStart, { passive: false });
        this.fullscreenContainer.addEventListener('touchmove', handleTouchMove, { passive: false });
        this.fullscreenContainer.addEventListener('touchend', handleTouchEnd, { passive: false });
        this.fullscreenContainer.addEventListener('touchcancel', handleTouchCancel, { passive: false });

        // Store cleanup function
        this.cleanupTouchEvents = () => {
            this.fullscreenContainer.removeEventListener('touchstart', handleTouchStart);
            this.fullscreenContainer.removeEventListener('touchmove', handleTouchMove);
            this.fullscreenContainer.removeEventListener('touchend', handleTouchEnd);
            this.fullscreenContainer.removeEventListener('touchcancel', handleTouchCancel);
        };
    }

    cleanup() {
        if (this.cleanupTouchEvents) {
            this.cleanupTouchEvents();
            this.cleanupTouchEvents = null;
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.TouchEventHandler = TouchEventHandler;
}
