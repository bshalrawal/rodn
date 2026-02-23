# CRITICAL FIX: Remove 'published' Column from Turso Database

## Problem
The Turso database has a deprecated `published` column in the articles table that shouldn't exist. The database schema should use `status` (VARCHAR) and `published_at` (DATETIME) instead.

**Error Message:**
```
SQL_INPUT_ERROR: SQLite input error: no such column: published (at offset 984)
```

## Solution

### Option 1: Using Turso CLI (RECOMMENDED)

1. **Authenticate with Turso CLI:**
```bash
/home/arcgg/.turso/turso auth login
```

2. **Run the migration script:**
```bash
node migrations/remove_published_column.js
```

This will automatically:
- Detect the `published` column
- Create a backup table without the column
- Drop the old table
- Recreate the table with correct schema
- Recreate all indices

### Option 2: Manual Fix via Turso Console

1. Go to Turso dashboard
2. Open database shell for `rodb`
3. Run these commands in sequence:

```sql
-- Create table with correct schema (no 'published' column)
CREATE TABLE articles_fixed AS
SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
       category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked,
       language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count,
       published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at
FROM articles;

-- Drop old table
DROP TABLE articles;

-- Rename new table
ALTER TABLE articles_fixed RENAME TO articles;

-- Recreate indices for performance
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_published ON articles(published_at);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_slug ON articles(slug);
```

## Code Changes Made

All code has been updated to use explicit column lists instead of `SELECT *`:

**Files Modified:**
- `server/models/Article.js` - Updated all article queries
- `server/routes/journalist.js` - Updated all journalist article queries

**Before:**
```javascript
SELECT * FROM articles WHERE id = ?
```

**After:**
```javascript
SELECT id, headline, sub_headline, summary, body, slug, featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
       category_id, author_id, editor_id, status, is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked,
       language, location_tag, source_attribution, seo_title, seo_description, reading_time, view_count, like_count, comment_count,
       published_at, scheduled_publish_at, scheduled_unpublish_at, created_at, updated_at
FROM articles WHERE id = ?
```

This ensures queries won't fail even if the stray `published` column remains.

## Verification

After running the fix, restart the server and verify articles load correctly:

1. Stop the server
2. Run: `npm start`
3. Try opening an article - should work without SQL errors

## If You Still See SQL Errors

Run the migration script:
```bash
cd /home/arcgg/rodb
node migrations/remove_published_column.js
```

This will provide detailed logs and automatically fix the issue.
