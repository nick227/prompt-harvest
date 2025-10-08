// Feed UI Event Factory - Creates custom events for feed UI
// Handles browser compatibility for CustomEvent creation

class FeedUIEventFactory {
    // Static event name constant
    static LAST_IMAGE_VISIBLE_EVENT = 'lastImageVisible';

    // Create lastImageVisible event with browser compatibility fallback
    static createLastImageVisibleEvent(lastImage, manager) {
        // Tiny legacy safety for CustomEvent (IO-less browsers are often older)
        if (typeof CustomEvent !== 'function') {
            // Fallback for IE11 and older browsers
            const event = document.createEvent('CustomEvent');

            event.initCustomEvent(
                FeedUIEventFactory.LAST_IMAGE_VISIBLE_EVENT,
                true, // bubbles
                false, // cancelable
                { element: lastImage, manager, timestamp: Date.now() } // detail
            );

            return event;
        }

        return new CustomEvent(FeedUIEventFactory.LAST_IMAGE_VISIBLE_EVENT, {
            detail: {
                element: lastImage,
                manager,
                timestamp: Date.now()
            },
            bubbles: true,
            composed: true // Crosses Shadow DOM boundaries
        });
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    window.FeedUIEventFactory = FeedUIEventFactory;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FeedUIEventFactory;
}

