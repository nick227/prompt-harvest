import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';

class PrismaSessionStore extends EventEmitter {
    constructor(options = {}) {
        super();
        this.prisma = options.prisma || new PrismaClient();
        this.ttl = options.ttl || 86400; // 24 hours default

        // Ensure prisma is connected
        if (this.prisma && !this.prisma._engine) {
            console.warn('⚠️ Prisma client may not be properly connected');
        }
    }

    async get(sid, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                return callback(null, null);
            }

            const session = await this.prisma.session.findUnique({
                where: { sid }
            });

            if (!session) {
                return callback(null, null);
            }

            // Check if session is expired
            if (session.expiresAt < new Date()) {
                await this.destroy(sid);
                return callback(null, null);
            }

            const data = JSON.parse(session.data);
            callback(null, data);
        } catch (error) {
            console.error('Session get error:', error);
            callback(error);
        }
    }

    async set(sid, session, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                return callback(null);
            }

            const expiresAt = new Date(Date.now() + (this.ttl * 1000));
            const data = JSON.stringify(session);

            await this.prisma.session.upsert({
                where: { sid },
                update: {
                    data,
                    expiresAt
                },
                create: {
                    sid,
                    data,
                    expiresAt
                }
            });

            callback(null);
        } catch (error) {
            console.error('Session set error:', error);
            callback(error);
        }
    }

    async destroy(sid, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                return callback(null);
            }

            await this.prisma.session.deleteMany({
                where: { sid }
            });
            callback(null);
        } catch (error) {
            console.error('Session destroy error:', error);
            callback(error);
        }
    }

    async touch(sid, session, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                return callback(null);
            }

            const expiresAt = new Date(Date.now() + (this.ttl * 1000));

            await this.prisma.session.updateMany({
                where: { sid },
                data: { expiresAt }
            });

            callback(null);
        } catch (error) {
            console.error('Session touch error:', error);
            callback(error);
        }
    }

    // Create a new session (required by express-session)
    createSession(req, sess) {
        const session = Object.create(null);
        Object.assign(session, sess);
        session.id = req.sessionID;
        return session;
    }

    // Regenerate session ID (required by express-session)
    regenerate(req, callback) {
        // Generate new session ID
        const originalSid = req.sessionID;

        // Create new session ID
        req.sessionID = require('uid-safe').sync(24);
        req.session = this.createSession(req, req.session || {});

        // Delete old session if it exists
        if (originalSid) {
            this.destroy(originalSid, (destroyErr) => {
                if (destroyErr) {
                    console.error('Error destroying old session during regenerate:', destroyErr);
                }
                callback(null);
            });
        } else {
            callback(null);
        }
    }

    // Clean up expired sessions
    async cleanup() {
        try {
            if (!this.prisma) {
                return { success: false, error: 'Prisma client not available' };
            }

            // Test connection before cleanup
            await this.prisma.$queryRaw`SELECT 1`;

            // Check if session model exists
            if (!this.prisma.session) {
                console.log('⚠️ Session model not available in Prisma client - skipping cleanup');
                return { success: false, error: 'Session model not available - Prisma client needs regeneration' };
            }

            const result = await this.prisma.session.deleteMany({
                where: {
                    expiresAt: {
                        lt: new Date()
                    }
                }
            });

            return {
                success: true,
                deletedCount: result.count,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Session cleanup error:', error);
            return {
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    // Get session statistics
    async getStats() {
        try {
            if (!this.prisma) {
                return null;
            }

            // Check if session model exists
            if (!this.prisma.session) {
                console.log('⚠️ Session model not available in Prisma client - skipping stats');
                return { error: 'Session model not available - Prisma client needs regeneration' };
            }

            const [total, expired] = await Promise.all([
                this.prisma.session.count(),
                this.prisma.session.count({
                    where: {
                        expiresAt: {
                            lt: new Date()
                        }
                    }
                })
            ]);

            return {
                total,
                expired,
                active: total - expired,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('Session stats error:', error);
            return null;
        }
    }
}

export default PrismaSessionStore;
