/**
 * Core Loader - Universal core services
 * Initializes universal services that ALL pages need
 */

import { AuthService } from '../../core/auth-service.js';
import { UserService } from '../../core/user-service.js';
import { ApiService } from '../../core/api-service.js';
import { ErrorHandler } from '../../core/error-handler.js';
import { NotificationService } from '../../core/notification-service.js';
import { ImageFactory } from '../../core/image-factory.js';
import { PromptHistoryService } from '../../core/prompt-history-service.js';
import { Constants } from '../../core/constants.js';

export class CoreLoader {
    constructor() {
        this.services = {};
        this.isInitialized = false;
    }

    /**
     * Initialize core services in proper order
     */
    static async initialize() {
        console.log('🚀 CORE-LOADER: Initializing core services...');
        
        try {
            // Initialize constants first
            await this.initializeConstants();
            
            // Initialize API service
            await this.initializeApiService();
            
            // Initialize auth service
            await this.initializeAuthService();
            
            // Initialize user service
            await this.initializeUserService();
            
            // Initialize error handler
            await this.initializeErrorHandler();
            
            // Initialize notification service
            await this.initializeNotificationService();
            
            // Initialize image factory
            await this.initializeImageFactory();
            
            // Initialize prompt history service
            await this.initializePromptHistoryService();
            
            console.log('✅ CORE-LOADER: All core services initialized successfully');
            
            return {
                authService: window.authService,
                userService: window.userService,
                apiService: window.apiService,
                errorHandler: window.errorHandler,
                notificationService: window.notificationService,
                imageFactory: window.imageFactory,
                promptHistoryService: window.promptHistoryService,
                constants: window.Constants
            };
        } catch (error) {
            console.error('❌ CORE-LOADER: Failed to initialize core services:', error);
            throw error;
        }
    }

    /**
     * Initialize constants
     */
    static async initializeConstants() {
        console.log('📋 CORE-LOADER: Initializing constants...');
        
        // Constants are already available globally
        // Just ensure they're accessible
        if (typeof window !== 'undefined') {
            window.Constants = Constants;
        }
    }

    /**
     * Initialize API service
     */
    static async initializeApiService() {
        console.log('🌐 CORE-LOADER: Initializing API service...');
        
        if (typeof window !== 'undefined') {
            window.apiService = new ApiService();
            window.ApiService = ApiService;
        }
    }

    /**
     * Initialize auth service
     */
    static async initializeAuthService() {
        console.log('🔐 CORE-LOADER: Initializing auth service...');
        
        if (typeof window !== 'undefined') {
            window.authService = new AuthService();
            window.AuthService = AuthService;
            
            // Wait for auth service to be ready
            await window.authService.init();
        }
    }

    /**
     * Initialize user service
     */
    static async initializeUserService() {
        console.log('👤 CORE-LOADER: Initializing user service...');
        
        if (typeof window !== 'undefined') {
            window.userService = new UserService();
            window.UserService = UserService;
            
            // Wait for user service to be ready
            await window.userService.init();
        }
    }

    /**
     * Initialize error handler
     */
    static async initializeErrorHandler() {
        console.log('⚠️ CORE-LOADER: Initializing error handler...');
        
        if (typeof window !== 'undefined') {
            // Error handler is likely already available
            // Just ensure it's accessible
            if (window.ErrorHandler) {
                window.errorHandler = new window.ErrorHandler();
            }
        }
    }

    /**
     * Initialize notification service
     */
    static async initializeNotificationService() {
        console.log('🔔 CORE-LOADER: Initializing notification service...');
        
        if (typeof window !== 'undefined') {
            // Notification service is likely already available
            // Just ensure it's accessible
            if (window.NotificationService) {
                window.notificationService = new window.NotificationService();
            }
        }
    }

    /**
     * Initialize image factory
     */
    static async initializeImageFactory() {
        console.log('🖼️ CORE-LOADER: Initializing image factory...');
        
        if (typeof window !== 'undefined') {
            // Image factory is likely already available
            // Just ensure it's accessible
            if (window.ImageFactory) {
                window.imageFactory = new window.ImageFactory();
            }
        }
    }

    /**
     * Initialize prompt history service
     */
    static async initializePromptHistoryService() {
        console.log('📝 CORE-LOADER: Initializing prompt history service...');
        
        if (typeof window !== 'undefined') {
            // Prompt history service is likely already available
            // Just ensure it's accessible
            if (window.PromptHistoryService) {
                window.promptHistoryService = new window.PromptHistoryService();
            }
        }
    }

    /**
     * Check if core services are ready
     */
    static isReady() {
        return window.authService && 
               window.userService && 
               window.apiService &&
               window.authService.isInitialized &&
               window.userService.isInitialized;
    }

    /**
     * Wait for core services to be ready
     */
    static async waitForReady() {
        const maxWait = 10000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            if (this.isReady()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        throw new Error('CoreLoader: Services not ready within timeout');
    }
}

// Auto-initialize when loaded
if (typeof window !== 'undefined') {
    // Initialize core services when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            CoreLoader.initialize();
        });
    } else {
        CoreLoader.initialize();
    }
}
