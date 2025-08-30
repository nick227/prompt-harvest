export const requireAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please log in to access this resource'
        });
    }
    next();
};

export const optionalAuth = (req, res, next) => {
    // This middleware allows the request to proceed even without authentication
    // but ensures req.user is defined for consistency
    if (!req.user) {
        req.user = { _id: 'undefined' };
    }
    next();
};

export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            message: 'Please log in to access this resource'
        });
    }

    if (!req.user.isAdmin) {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Admin privileges required'
        });
    }
    next();
};

export const extractUserId = (req, res, next) => {
    // Extract user ID from request and add to req object
    req.userId = req.user?._id || 'undefined';
    next();
};
