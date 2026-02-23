const AuthService = require('../services/authService');
const User = require('../models/User');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const securityConfig = require('../config/security');

// Authenticate user middleware (now also accepts admin tokens)
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader === 'Bearer null' || authHeader === 'Bearer undefined') {
            // 🔒 SECURITY FIX: Require valid token - no bypass allowed
            logger.warn('Authentication failed: Missing or invalid authorization header');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const token = authHeader.replace('Bearer ', '');

        // 🔒 SECURITY FIX: Properly verify token - no admin bypass
        // Verify token using proper JWT validation
        let decoded;
        try {
            decoded = await AuthService.verifyToken(token);
        } catch (error) {
            logger.error('Token verification failed:', error.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Validate decoded token has userId
        if (!decoded || !decoded.userId) {
            logger.warn('Invalid token structure: missing userId');
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Get user with roles and permissions
        const user = await User.findByIdWithRoles(decoded.userId);

        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.is_suspended) {
            return res.status(403).json({ error: 'Account is suspended' });
        }

        if (!user.is_active) {
            return res.status(403).json({ error: 'Account is not active' });
        }

        // Get permissions
        const permissions = await User.getUserPermissions(user.id);
        user.permissions = permissions.map(p => p.name);

        // Attach user to request
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        // If token is invalid but we want to allow bypass, we could handle it here too.
        // But for now, if a token IS provided but invalid, we still reject. 
        // Only missing token triggers bypass.
        logger.error('Authentication error:', error);
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// Check if user has specific role
function requireRole(...roleNames) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRoles = req.user.roles.map(r => r.name);
        const hasRole = roleNames.some(role => userRoles.includes(role));

        if (!hasRole) {
            logger.warn(`Access denied for user ${req.user.id}. Required roles: ${roleNames.join(', ')}`);
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Check if user has specific permission
function requirePermission(...permissionNames) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const hasPermission = permissionNames.some(perm => req.user.permissions.includes(perm));

        if (!hasPermission) {
            logger.warn(`Access denied for user ${req.user.id}. Required permissions: ${permissionNames.join(', ')}`);
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Optional authentication (doesn't fail if no token)
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');
            const decoded = await AuthService.verifyToken(token);
            const user = await User.findByIdWithRoles(decoded.userId);

            if (user && user.is_active && !user.is_suspended) {
                const permissions = await User.getUserPermissions(user.id);
                user.permissions = permissions.map(p => p.name);
                req.user = user;
            }
        }
    } catch (error) {
        // Silently fail for optional auth
        logger.debug('Optional auth failed:', error.message);
    }

    next();
}

// Require journalist role
function requireJournalist(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is a journalist
    if (!req.user.is_journalist && !req.user.permissions?.includes('article.create')) {
        logger.warn(`Journalist access denied for user ${req.user.id}`);
        return res.status(403).json({ error: 'Journalist access required' });
    }

    next();
}

module.exports = {
    authenticate,
    requireRole,
    requirePermission,
    optionalAuth,
    requireJournalist,
};
