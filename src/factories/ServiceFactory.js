/**
 * Service Factory for Dependency Injection
 * Manages service instantiation and lifecycle
 */
export class ServiceFactory {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
        this.creating = new Set(); // Track services being created to detect circular dependencies
    }

    /**
     * Register a service creator function
     * @param {string} name - Service name
     * @param {Function} creator - Function that creates the service (receives factory as parameter)
     * @param {Object} options - Options
     * @param {boolean} options.singleton - Whether to cache the instance
     */
    register(name, creator, { singleton = false } = {}) {
        if (this.services.has(name)) {
            console.warn(`⚠️ Service "${name}" is already registered. Overwriting.`);
        }

        this.services.set(name, { creator, singleton });

        return this;
    }

    /**
     * Get or create a service instance
     * @param {string} name - Service name
     * @returns {*} Service instance
     */
    get(name) {
        // Check if service is registered
        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service "${name}" is not registered. Available services: ${[...this.services.keys()].join(', ')}`);
        }

        // Check for circular dependency
        if (this.creating.has(name)) {
            throw new Error(`Circular dependency detected: ${name} is already being created`);
        }

        // Return singleton if already created
        if (service.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        try {
            // Mark as being created
            this.creating.add(name);

            // Create instance
            const instance = service.creator(this);

            // Cache if singleton
            if (service.singleton) {
                this.singletons.set(name, instance);
            }

            return instance;
        } catch (error) {
            throw new Error(`Failed to create service "${name}": ${error.message}`);
        } finally {
            // Remove from creating set
            this.creating.delete(name);
        }
    }

    /**
     * Check if a service is registered
     * @param {string} name - Service name
     * @returns {boolean}
     */
    has(name) {
        return this.services.has(name);
    }

    /**
     * Clear all singletons (useful for testing)
     */
    clearSingletons() {
        this.singletons.clear();
    }

    /**
     * Get all registered service names
     * @returns {string[]}
     */
    getServiceNames() {
        return [...this.services.keys()];
    }
}

