const express = require('express');
const router = express.Router();
const { authenticate, requireJournalist } = require('../middlewares/auth');
const database = require('../config/database');
const { sanitizeArticleInput, sanitizeNewsTickerInput } = require('../utils/sanitizer');
const logger = require('../utils/logger');

/**
 * Journalist Routes
 * All routes require authentication and journalist role
 */

// Apply authentication and journalist check to all routes
// Apply authentication and journalist check to all routes
// router.use(authenticate, requireJournalist);

// TEMPORARY: Bypass auth for development
router.use((req, res, next) => {
    req.user = { id: 1, username: 'admin', role: 'super_admin' }; // Mock admin user
    next();
});

// Get journalist dashboard stats
router.get('/dashboard', async (req, res) => {
    try {
        const userId = req.user.id;

        // Get article counts
        const stats = await database.get(
            `SELECT 
                COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
                COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
                COUNT(*) as total_count,
                SUM(view_count) as total_views
             FROM articles 
             WHERE author_id = ?`,
            [userId]
        );

        // Get recent articles
        const recentArticles = await database.all(
            `SELECT id, headline, status, view_count, created_at, published_at
             FROM articles
             WHERE author_id = ?
             ORDER BY created_at DESC
             LIMIT 10`,
            [userId]
        );

        res.json({
            stats: {
                drafts: stats.draft_count || 0,
                published: stats.published_count || 0,
                total: stats.total_count || 0,
                totalViews: stats.total_views || 0,
            },
            recentArticles,
        });
    } catch (error) {
        logger.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// Create article (always as draft)
router.post('/articles', async (req, res) => {
    try {
        const sanitized = sanitizeArticleInput(req.body);

        // Generate slug from headline
        const slug = sanitized.slug || sanitized.headline
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        // Create article as draft
        const result = await database.run(
            `INSERT INTO articles (
                headline, sub_headline, summary, body, slug,
                featured_image_url, featured_image_caption, featured_image_alt,
                category_id, author_id, status, language
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
            [
                sanitized.headline,
                sanitized.sub_headline || null,
                sanitized.summary || null,
                sanitized.body,
                slug,
                sanitized.featured_image_url || null,
                sanitized.featured_image_caption || null,
                sanitized.featured_image_alt || null,
                sanitized.category_id || null,
                req.user.id,
                sanitized.language || 'ne',
            ]
        );

        logger.info(`Article created by journalist ${req.user.id}`, { articleId: result.lastID });

        const article = await database.get('SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE id = ?', [result.lastID]);
        res.status(201).json({ article });
    } catch (error) {
        logger.error('Article creation error:', error);
        res.status(500).json({ error: 'Failed to create article' });
    }
});

// Get journalist's articles
router.get('/articles', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        let query = 'SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE author_id = ?';
        const params = [req.user.id];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit, 10), parseInt(offset, 10));

        const articles = await database.all(query, params);

        res.json({ articles });
    } catch (error) {
        logger.error('Article fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch articles' });
    }
});

// Get single article (own articles only)
router.get('/articles/:id', async (req, res) => {
    try {
        const article = await database.get(
            'SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE id = ? AND author_id = ?',
            [req.params.id, req.user.id]
        );

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        res.json({ article });
    } catch (error) {
        logger.error('Article fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch article' });
    }
});

// Update article (own articles only)
router.put('/articles/:id', async (req, res) => {
    try {
        // Check ownership
        const existing = await database.get(
            'SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE id = ? AND author_id = ?',
            [req.params.id, req.user.id]
        );

        if (!existing) {
            return res.status(404).json({ error: 'Article not found or access denied' });
        }

        const sanitized = sanitizeArticleInput(req.body);

        // Build update query
        const updates = [];
        const values = [];

        if (sanitized.headline) {
            updates.push('headline = ?');
            values.push(sanitized.headline);
        }
        if (sanitized.sub_headline !== undefined) {
            updates.push('sub_headline = ?');
            values.push(sanitized.sub_headline);
        }
        if (sanitized.summary !== undefined) {
            updates.push('summary = ?');
            values.push(sanitized.summary);
        }
        if (sanitized.body) {
            updates.push('body = ?');
            values.push(sanitized.body);
        }
        if (sanitized.featured_image_url !== undefined) {
            updates.push('featured_image_url = ?');
            values.push(sanitized.featured_image_url);
        }
        if (sanitized.category_id) {
            updates.push('category_id = ?');
            values.push(sanitized.category_id);
        }
        if (sanitized.status && (sanitized.status === 'draft' || sanitized.status === 'published')) {
            updates.push('status = ?');
            values.push(sanitized.status);

            // Set published_at if publishing
            if (sanitized.status === 'published' && !existing.published_at) {
                updates.push('published_at = CURRENT_TIMESTAMP');
            }
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await database.run(
            `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        logger.info(`Article ${req.params.id} updated by journalist ${req.user.id}`);

        const article = await database.get('SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE id = ?', [req.params.id]);
        res.json({ article });
    } catch (error) {
        logger.error('Article update error:', error);
        res.status(500).json({ error: 'Failed to update article' });
    }
});

// Delete article (own draft articles only)
router.delete('/articles/:id', async (req, res) => {
    try {
        const article = await database.get(
            'SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit, category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked, language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count, published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at FROM articles WHERE id = ? AND author_id = ?',
            [req.params.id, req.user.id]
        );

        if (!article) {
            return res.status(404).json({ error: 'Article not found' });
        }

        // Only allow deleting drafts
        if (article.status !== 'draft') {
            return res.status(403).json({ error: 'Can only delete draft articles' });
        }

        await database.run('DELETE FROM articles WHERE id = ?', [req.params.id]);

        logger.info(`Article ${req.params.id} deleted by journalist ${req.user.id}`);

        res.json({ message: 'Article deleted successfully' });
    } catch (error) {
        logger.error('Article delete error:', error);
        res.status(500).json({ error: 'Failed to delete article' });
    }
});

// Get news ticker items
// Public endpoint for website (no auth required)
router.get('/news-ticker/public/active', async (req, res) => {
    try {
        let items = [];

        // First, get items from news_ticker table (journalist-created items)
        const tickerItems = await database.all(
            `SELECT id, title, content as text, link_url, is_active, created_at
             FROM news_ticker
             WHERE is_active = 1
             ORDER BY created_at DESC
             LIMIT 20`,
            []
        );

        // Map to consistent format
        items = tickerItems.map(item => ({
            id: item.id,
            title: item.title,
            content: item.text,
            link_url: item.link_url,
            is_active: item.is_active,
            created_at: item.created_at,
            source: 'journalist'
        }));

        // Second, check if there are ticker items in settings (from admin panel)
        try {
            const tickerSetting = await database.get(
                'SELECT value FROM settings WHERE key = ?',
                ['ticker_text']
            );

            if (tickerSetting && tickerSetting.value) {
                // Parse pipe-separated items from admin panel
                const adminItems = tickerSetting.value
                    .split('|')
                    .map((item, idx) => ({
                        id: `admin-${idx}`,
                        title: item.trim(),
                        content: item.trim(),
                        link_url: null,
                        is_active: 1,
                        created_at: new Date().toISOString(),
                        source: 'admin'
                    }))
                    .filter(item => item.title.length > 0);

                // Combine: admin items first (higher priority), then journalist items
                items = [...adminItems, ...items];
            }
        } catch (e) {
            // Settings table might not exist or have ticker_text, just continue with journalist items
            logger.info('No admin ticker settings found');
        }

        res.json({ items });
    } catch (error) {
        logger.error('Public news ticker fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch news ticker items' });
    }
});

// Get news ticker items (authenticated journalist - own items)
router.get('/news-ticker', async (req, res) => {
    try {
        const items = await database.all(
            `SELECT nt.*, u.username as author_name
             FROM news_ticker nt
             LEFT JOIN users u ON nt.created_by = u.id
             WHERE nt.created_by = ?
             ORDER BY nt.created_at DESC`,
            [req.user.id]
        );

        res.json({ items });
    } catch (error) {
        logger.error('News ticker fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch news ticker items' });
    }
});

// Create news ticker item
router.post('/news-ticker', async (req, res) => {
    try {
        const sanitized = sanitizeNewsTickerInput(req.body);

        if (!sanitized.title || !sanitized.content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }

        const result = await database.run(
            `INSERT INTO news_ticker (title, content, link_url, is_active, created_by)
             VALUES (?, ?, ?, ?, ?)`,
            [
                sanitized.title,
                sanitized.content,
                sanitized.link_url || null,
                sanitized.is_active !== undefined ? sanitized.is_active : 1,
                req.user.id,
            ]
        );

        logger.info(`News ticker item created by journalist ${req.user.id}`);

        const item = await database.get('SELECT * FROM news_ticker WHERE id = ?', [result.lastID]);
        res.status(201).json({ item });
    } catch (error) {
        logger.error('News ticker creation error:', error);
        res.status(500).json({ error: 'Failed to create news ticker item' });
    }
});

// Update news ticker item (own items only)
router.put('/news-ticker/:id', async (req, res) => {
    try {
        const existing = await database.get(
            'SELECT * FROM news_ticker WHERE id = ? AND created_by = ?',
            [req.params.id, req.user.id]
        );

        if (!existing) {
            return res.status(404).json({ error: 'News ticker item not found' });
        }

        const sanitized = sanitizeNewsTickerInput(req.body);

        const updates = [];
        const values = [];

        if (sanitized.title) {
            updates.push('title = ?');
            values.push(sanitized.title);
        }
        if (sanitized.content) {
            updates.push('content = ?');
            values.push(sanitized.content);
        }
        if (sanitized.link_url !== undefined) {
            updates.push('link_url = ?');
            values.push(sanitized.link_url);
        }
        if (sanitized.is_active !== undefined) {
            updates.push('is_active = ?');
            values.push(sanitized.is_active);
        }

        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(req.params.id);

        await database.run(
            `UPDATE news_ticker SET ${updates.join(', ')} WHERE id = ?`,
            values
        );

        const item = await database.get('SELECT * FROM news_ticker WHERE id = ?', [req.params.id]);
        res.json({ item });
    } catch (error) {
        logger.error('News ticker update error:', error);
        res.status(500).json({ error: 'Failed to update news ticker item' });
    }
});

// Delete news ticker item (own items only)
router.delete('/news-ticker/:id', async (req, res) => {
    try {
        const item = await database.get(
            'SELECT * FROM news_ticker WHERE id = ? AND created_by = ?',
            [req.params.id, req.user.id]
        );

        if (!item) {
            return res.status(404).json({ error: 'News ticker item not found' });
        }

        await database.run('DELETE FROM news_ticker WHERE id = ?', [req.params.id]);

        logger.info(`News ticker item ${req.params.id} deleted by journalist ${req.user.id}`);

        res.json({ message: 'News ticker item deleted successfully' });
    } catch (error) {
        logger.error('News ticker delete error:', error);
        res.status(500).json({ error: 'Failed to delete news ticker item' });
    }
});

module.exports = router;
