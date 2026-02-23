# Turso Database Setup - Complete Guide

## Status
✅ **New Turso database created and credentials configured**

Database URL: `libsql://rodn-ganeshpoudel.aws-ap-northeast-1.turso.io`
Region: AWS - Tokyo (ap-northeast-1)

## What's Been Done

1. ✅ Updated `.env` with new Turso database credentials
2. ✅ Updated `.env.vercel.production` for Vercel deployments
3. ✅ Fixed all `SELECT *` queries in codebase to use explicit columns
4. ✅ Created migration scripts for schema cleanup
5. ✅ Created database initialization script

## Database Schema

Your articles table will have these 30 columns:

```
id, headline, sub_headline, summary, body, slug,
featured_image_url, featured_image_caption, featured_image_alt, featured_image_credit,
category_id, author_id, editor_id, status,
is_breaking, is_pinned, is_featured, is_opinion, is_fact_checked,
language, location_tag, source_attribution,
seo_title, seo_description, reading_time,
view_count, like_count, comment_count,
published_at, scheduled_publish_at, scheduled_unpublish_at,
created_at, updated_at
```

**IMPORTANT:** The deprecated `published` column is NOT included.

## Quick Start

### Option 1: Automatic Setup (Recommended)

```bash
# Run the initialization script
node scripts/init-turso-db.js
```

This will:
- Connect to your Turso database
- Create all tables with correct schema
- Validate that all columns are correct
- Remove any deprecated columns
- Verify the database is ready

### Option 2: Manual Turso CLI Setup

```bash
# Install Turso CLI if not already installed
# https://docs.turso.tech/cli/introduction

# Authenticate
turso auth login

# Connect to your database
turso db shell rodn-ganeshpoudel

# Then run the schema creation SQL (see schema.sql below)
```

### Option 3: Using Turso Web Dashboard

1. Go to https://app.turso.tech
2. Open your database: `rodn-ganeshpoudel`
3. Go to "SQL Shell" or "Database > Run SQL"
4. Paste the entire schema.sql content (see below)
5. Execute

## Complete Schema SQL

```sql
-- Create Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  icon TEXT,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK(role IN ('admin', 'editor', 'journalist', 'user')) DEFAULT 'user',
  permissions TEXT DEFAULT '[]',
  is_active BOOLEAN DEFAULT 1,
  profile_image_url TEXT,
  bio TEXT,
  social_links TEXT DEFAULT '{}',
  notification_preferences TEXT DEFAULT '{"email":true,"push":true}',
  language TEXT DEFAULT 'en',
  last_login DATETIME,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  headline TEXT NOT NULL,
  sub_headline TEXT,
  summary TEXT,
  body TEXT,
  slug TEXT UNIQUE NOT NULL,
  featured_image_url TEXT,
  featured_image_caption TEXT,
  featured_image_alt TEXT,
  featured_image_credit TEXT,
  category_id TEXT NOT NULL,
  author_id TEXT NOT NULL,
  editor_id TEXT,
  status TEXT CHECK(status IN ('draft', 'published', 'archived', 'scheduled')) DEFAULT 'draft',
  is_breaking BOOLEAN DEFAULT 0,
  is_pinned BOOLEAN DEFAULT 0,
  is_featured BOOLEAN DEFAULT 0,
  is_opinion BOOLEAN DEFAULT 0,
  is_fact_checked BOOLEAN DEFAULT 0,
  language TEXT DEFAULT 'en',
  location_tag TEXT,
  source_attribution TEXT,
  seo_title TEXT,
  seo_description TEXT,
  reading_time INTEGER,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  published_at DATETIME,
  scheduled_publish_at DATETIME,
  scheduled_unpublish_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(category_id) REFERENCES categories(id),
  FOREIGN KEY(author_id) REFERENCES users(id),
  FOREIGN KEY(editor_id) REFERENCES users(id)
);

-- Create Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  parent_comment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY(parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Create Tags table
CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create ArticleTags junction table
CREATE TABLE IF NOT EXISTS article_tags (
  article_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (article_id, tag_id),
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Create Settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  type TEXT DEFAULT 'string',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create Media table
CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  size INTEGER,
  url TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  uploaded_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(uploaded_by) REFERENCES users(id)
);

-- Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_articles_slug ON articles(slug);
CREATE INDEX IF NOT EXISTS idx_articles_category_id ON articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author_id ON articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_status ON articles(status);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_comments_article_id ON comments(article_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Verify schema
SELECT 'Database schema initialized successfully!' as status;
```

## Verification Checklist

After running the setup, verify everything is correct:

```bash
# Check if articles table exists
turso db shell rodn-ganeshpoudel
> SELECT name FROM sqlite_master WHERE type='table';

# Check articles table schema
> PRAGMA table_info(articles);

# Make sure there's NO 'published' column in the output
# You should see 'published_at' instead

# Count records
> SELECT COUNT(*) FROM articles;
```

## Starting the Server

```bash
# Install dependencies if needed
npm install

# Make sure .env has the correct Turso credentials
cat .env | grep TURSO

# Start the server
npm start

# The server should connect successfully and create/validate schema
```

## If You See SQL Errors

### Error: "no such column: published"
This means your database still has the deprecated column.
```bash
# Run the migration to remove it
node scripts/init-turso-db.js
```

### Error: "no such table: articles"
This means the schema hasn't been created yet.
```bash
# Run initialization
node scripts/init-turso-db.js
```

### Error: "Access denied" or "Unauthorized"
Check that your `.env` file has:
- Correct `TURSO_CONNECTION_URL`
- Correct `TURSO_AUTH_TOKEN`

```bash
cat .env | grep TURSO_
```

## Important: Keep Your Token Safe

Your auth token in `.env` should never be:
- Committed to Git
- Shared publicly
- Left in build logs

The `.env` file is already in `.gitignore` - keep it that way!

For Vercel, your token is stored in:
- `.env.vercel.production` (DO NOT COMMIT)
- Vercel project settings → Environment Variables (encrypted)

## Next Steps

1. ✅ Run: `node scripts/init-turso-db.js`
2. ✅ Verify schema created successfully
3. ✅ Start server: `npm start`
4. ✅ Test opening an article in the UI
5. ✅ Verify sidebars display without text overflow
6. ✅ Deploy to Vercel when ready

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect to Turso | Check TURSO_CONNECTION_URL and TURSO_AUTH_TOKEN in .env |
| Schema creation fails | Run scripts/init-turso-db.js with valid credentials |
| SQL errors for 'published' column | Run init script to remove deprecated column |
| Articles show no data | Seed database with test data: `node scripts/seed.js` |
| CSS layout still broken | Run in browser: `Ctrl+Shift+Delete` → Clear cache → Refresh |

## Files Modified

- `.env` - Updated with Turso credentials
- `.env.vercel.production` - Updated for Vercel
- `server/models/Article.js` - Fixed SELECT * queries
- `server/routes/journalist.js` - Fixed SELECT * queries
- `server/public/site/css/main.css` - Fixed layout overflow
- `scripts/init-turso-db.js` - New initialization script

## Support

For Turso database issues:
- Docs: https://docs.turso.tech
- Dashboard: https://app.turso.tech
- CLI: https://docs.turso.tech/cli/introduction

For application issues:
- Check server logs: `npm start` output
- Check browser console: F12 → Console tab
- Check browser network: F12 → Network tab
