/**
 * Optimized Admin Authentication Middleware
 * Improved performance with caching and reduced database queries
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// In-memory cache for admin status (production would use Redis)
const adminCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Optimized middleware to verify admin access
 * Uses caching to reduce database queries
 */
// eslint-disable-next-line max-lines-per-function, max-statements
export const requireAdminOptimized = async (req, res, next) => {
    try {
        // Check if user is authenticated
        if (!req.session?.userId) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please log in to access admin features'
            });
        }

        const { userId } = req.session;
        const cacheKey = `admin_${userId}`;
        const cached = adminCache.get(cacheKey);

        // Check cache first
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            if (!cached.isAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    message: 'You do not have permission to access admin features'
                });
            }

            req.user = cached.user;
            req.adminUser = cached.user;

            return next();
        }

        // Cache miss - query database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                isAdmin: true,
                createdAt: true
            }
        });

        if (!user) {
            // Remove from cache if user not found
            adminCache.delete(cacheKey);

            return res.status(401).json({
                success: false,
                error: 'User not found',
                message: 'Your session is invalid. Please log in again.'
            });
        }

        // Cache the result
        adminCache.set(cacheKey, {
            user,
            isAdmin: user.isAdmin,
            timestamp: Date.now()
        });

        // Check admin status
        if (!user.isAdmin) {
            console.log(`🔐 ADMIN-AUTH: Non-admin access attempt: ${user.email}`);

            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                message: 'You do not have permission to access admin features'
            });
        }

        req.user = user;
        req.adminUser = user;
        next();

    } catch (error) {
        console.error('❌ ADMIN-AUTH: Middleware error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication error',
            message: 'Failed to verify admin access'
        });
    }
};

/**
 * Clear admin cache for specific user
 */
export const clearAdminCache = userId => {
    const cacheKey = `admin_${userId}`;

    adminCache.delete(cacheKey);
    console.log(`🗑️ ADMIN-AUTH: Cleared cache for user ${userId}`);
};

/**
 * Clear entire admin cache
 */
export const clearAllAdminCache = () => {
    adminCache.clear();
    console.log('🗑️ ADMIN-AUTH: Cleared all admin cache');
};

/**
 * Get cache statistics
 */
export const getAdminCacheStats = () => {
    const entries = Array.from(adminCache.entries());
    const validEntries = entries.filter(([, value]) => Date.now() - value.timestamp < CACHE_TTL
    );

    return {
        total: entries.length,
        valid: validEntries.length,
        expired: entries.length - validEntries.length
    };
};

/**
 * Cleanup expired cache entries
 */
export const cleanupAdminCache = () => {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, value] of adminCache.entries()) {
        if (now - value.timestamp >= CACHE_TTL) {
            keysToDelete.push(key);
        }
    }

    keysToDelete.forEach(key => adminCache.delete(key));

    if (keysToDelete.length > 0) {
        console.log(`🧹 ADMIN-AUTH: Cleaned ${keysToDelete.length} expired cache entries`);
    }
};

// Auto-cleanup every 10 minutes
setInterval(cleanupAdminCache, 10 * 60 * 1000);

/**
 * Enhanced admin action logging with batching
 */
class AdminActionLogger {
    constructor() {
        this.logQueue = [];
        this.batchSize = 50;
        this.flushInterval = 30 * 1000; // 30 seconds

        // Start batch flushing
        setInterval(() => this.flushLogs(), this.flushInterval);
    }

    log(userId, action, details = {}) {
        this.logQueue.push({
            timestamp: new Date().toISOString(),
            userId,
            action,
            details
        });

        // Flush if batch is full
        if (this.logQueue.length >= this.batchSize) {
            this.flushLogs();
        }
    }

    flushLogs() {
        if (this.logQueue.length === 0) {
            return;
        }

        const logsToFlush = this.logQueue.splice(0);

        // In production, you would send these to a logging service
        console.log(`📝 ADMIN-LOGGER: Flushing ${logsToFlush.length} admin actions`);

        // For now, just log to console (could be sent to external logging service)
        logsToFlush.forEach(log => {
            console.log(`📋 ADMIN-ACTION: ${log.action} by ${log.userId} at ${log.timestamp}`);
        });
    }
}

const actionLogger = new AdminActionLogger();

/**
 * Optimized admin action logging middleware
 */
export const logAdminActionOptimized = action => (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
        // Log successful actions only
        if (req.adminUser && (!data.error || data.success !== false)) {
            actionLogger.log(req.adminUser.id, action, {
                method: req.method,
                path: req.path,
                timestamp: new Date().toISOString()
            });
        }

        return originalJson.call(this, data);
    };

    next();
};

export default {
    requireAdminOptimized,
    clearAdminCache,
    clearAllAdminCache,
    getAdminCacheStats,
    cleanupAdminCache,
    logAdminActionOptimized
};
