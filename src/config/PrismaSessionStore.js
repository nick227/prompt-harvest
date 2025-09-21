import { PrismaClient } from '@prisma/client';
import { EventEmitter } from 'events';
import { sync } from 'uid-safe';

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
            if (!callback) {
                return;
            }

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

            try {
                JSON.parse(session.data);
            } catch (parseError) {
                console.error('Session data parse error:', parseError);
                // If data is corrupted, destroy the session
                await this.destroy(sid);

                return callback(null, null);
            }

            // Return null to let express-session handle as new session
            callback(null, null);
        } catch (error) {
            console.error('Session get error:', error);
            callback(error);
        }
    }

    async set(sid, session, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                if (callback && typeof callback === 'function') {
                    return callback(null);
                }

                return;
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

            if (callback && typeof callback === 'function') {
                callback(null);
            }
        } catch (error) {
            console.error('Session set error:', error);
            if (callback && typeof callback === 'function') {
                callback(error);
            }
        }
    }

    async destroy(sid, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                if (callback && typeof callback === 'function') {
                    return callback(null);
                }

                return;
            }

            await this.prisma.session.deleteMany({
                where: { sid }
            });

            if (callback && typeof callback === 'function') {
                callback(null);
            }
        } catch (error) {
            console.error('Session destroy error:', error);
            if (callback && typeof callback === 'function') {
                callback(error);
            }
        }
    }

    async touch(sid, session, callback) {
        try {
            if (!this.prisma || !this.prisma.session) {
                if (callback && typeof callback === 'function') {
                    return callback(null);
                }

                return;
            }

            const expiresAt = new Date(Date.now() + (this.ttl * 1000));

            await this.prisma.session.updateMany({
                where: { sid },
                data: { expiresAt }
            });

            if (callback && typeof callback === 'function') {
                callback(null);
            }
        } catch (error) {
            console.error('Session touch error:', error);
            if (callback && typeof callback === 'function') {
                callback(error);
            }
        }
    }

    // Create a new session (required by express-session)
    createSession(req, sess) {
        try {
            // Handle both cases: req object with sessionID or just sessionID string
            const sessionID = req.sessionID || req;

            const session = { ...sess || {} };

            session.id = sessionID;

            // Attach session methods to the session object

            const self = this;

            session.save = callback => {
                self.save({ sessionID }, callback);
            };
            session.touch = callback => {
                self.touch({ sessionID }, callback);
            };
            session.reload = callback => {
                self.get(sessionID, callback);
            };
            session.destroy = callback => {
                self.destroy(sessionID, callback);
            };
            session.regenerate = callback => {
                self.regenerate({ sessionID }, callback);
            };

            return session;
        } catch (error) {
            console.error('Error creating session object:', error);

            return null;
        }
    }

    // Regenerate session ID (required by express-session)
    regenerate(req, callback) {
        // Generate new session ID
        const originalSid = req.sessionID;

        // Create new session ID
        req.sessionID = sync(24);
        req.session = this.createSession(req, req.session || {});

        // Delete old session if it exists
        if (originalSid) {
            this.destroy(originalSid, destroyErr => {
                if (destroyErr) {
                    console.error('Error destroying old session during regenerate:', destroyErr);
                }
                callback(null);
            });
        } else {
            callback(null);
        }
    }

    // Save session (required by express-session)
    save(req, callback) {
        if (!req.sessionID) {
            req.sessionID = sync(24);
        }

        const session = req.session || {};

        session.id = req.sessionID;

        this.set(req.sessionID, session, err => {
            if (err) {
                return callback(err);
            }
            callback(null);
        });
    }

    // Touch session (required by express-session)
    touch(req, callback) {
        if (!callback) {
            return;
        }

        if (!req.sessionID) {
            return callback(null);
        }

        this.get(req.sessionID, (err, session) => {
            if (err) {
                return callback(err);
            }
            if (!session) {
                return callback(null);
            }

            // Update the session with new expiration
            this.set(req.sessionID, session, callback);
        });
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
