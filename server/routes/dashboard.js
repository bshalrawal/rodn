const express = require('express');
const router = express.Router();
const database = require('../config/database');
const { authenticate, requireRole } = require('../middlewares/auth');
const { verifyAdminToken } = require('./admin-auth');
const logger = require('../utils/logger');

// Dashboard stats (admin only)
router.get('/stats', authenticate, requireRole('super_admin', 'admin', 'editor'), async (req, res) => {
    try {
        // Get article counts by status with error handling
        let articleStats = [];
        try {
            articleStats = await database.all(
                'SELECT status, COUNT(*) as count FROM articles GROUP BY status'
            );
        } catch (error) {
            console.error('Error fetching article stats:', error);
            articleStats = [];
        }

        // Get user counts by role with error handling
        let userStats = [];
        try {
            userStats = await database.all(
                `SELECT r.name as role, COUNT(*) as count 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           GROUP BY r.name`
            );
        } catch (error) {
            console.error('Error fetching user stats:', error);
            userStats = [];
        }

        // Get total views with error handling
        let viewStats = { total_views: 0 };
        try {
            const result = await database.get(
                'SELECT SUM(view_count) as total_views FROM articles WHERE status = \'published\''
            );
            viewStats = result || { total_views: 0 };
        } catch (error) {
            console.error('Error fetching view stats:', error);
        }

        // Get pending approvals with error handling
        let pendingCount = { count: 0 };
        try {
            const result = await database.get(
                'SELECT COUNT(*) as count FROM articles WHERE status = \'pending\''
            );
            pendingCount = result || { count: 0 };
        } catch (error) {
            console.error('Error fetching pending count:', error);
        }

        // Get breaking news count with error handling
        let breakingCount = { count: 0 };
        try {
            const result = await database.get(
                'SELECT COUNT(*) as count FROM articles WHERE is_breaking = 1 AND status = \'published\''
            );
            breakingCount = result || { count: 0 };
        } catch (error) {
            console.error('Error fetching breaking count:', error);
        }

        res.json({
            articles: articleStats,
            users: userStats,
            totalViews: viewStats?.total_views || 0,
            pendingApprovals: pendingCount?.count || 0,
            breakingNews: breakingCount?.count || 0,
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        // Return default values instead of error to prevent frontend from breaking
        res.json({
            articles: [],
            users: [],
            totalViews: 0,
            pendingApprovals: 0,
            breakingNews: 0,
        });
    }
});

// Get all OAuth users (admin only)
router.get('/oauth-users', verifyAdminToken, async (req, res) => {
    try {
        const User = require('../models/User');
        const users = await User.getAllOAuthEmails();
        res.json({ users });
    } catch (error) {
        logger.error('OAuth users fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch OAuth users' });
    }
});

// Get all journalists (admin only)
router.get('/journalists', verifyAdminToken, async (req, res) => {
    try {
        const User = require('../models/User');
        const journalists = await User.getAllJournalists();
        res.json({ journalists });
    } catch (error) {
        logger.error('Journalists fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch journalists' });
    }
});

// Grant journalist access (admin only)
router.post('/grant-journalist/:userId', verifyAdminToken, async (req, res) => {
    try {
        const User = require('../models/User');
        const userId = parseInt(req.params.userId, 10);

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Grant journalist access
        await User.grantJournalistAccess(userId, req.adminId || 1);

        logger.info(`Journalist access granted to user ${userId}`);
        res.json({ message: 'Journalist access granted successfully', user });
    } catch (error) {
        logger.error('Grant journalist error:', error);
        res.status(500).json({ error: error.message || 'Failed to grant journalist access' });
    }
});

// Revoke journalist access (admin only)
router.post('/revoke-journalist/:userId', verifyAdminToken, async (req, res) => {
    try {
        const User = require('../models/User');
        const userId = parseInt(req.params.userId, 10);

        // Revoke journalist access
        await User.revokeJournalistAccess(userId, req.adminId || 1);

        logger.info(`Journalist access revoked for user ${userId}`);
        res.json({ message: 'Journalist access revoked successfully' });
    } catch (error) {
        logger.error('Revoke journalist error:', error);
        res.status(500).json({ error: error.message || 'Failed to revoke journalist access' });
    }
});

module.exports = router;
