# Database Setup - Execution Checklist

## ✅ Completed Tasks

- [x] New Turso database created: `rodn-ganeshpoudel`
- [x] Database credentials configured in `.env` 
- [x] All `SELECT *` queries replaced with explicit columns across:
  - `server/models/Article.js` (4 methods)
  - `server/routes/journalist.js` (6 queries)
- [x] CSS layout fixed (sidebars widened, text truncation added)
- [x] Migration scripts created for schema cleanup
- [x] Database initialization script created: `scripts/init-turso-db.js`
- [x] Comprehensive setup guide created: `TURSO_SETUP_COMPLETE.md`

## 🚀 Next Steps (Run These Now)

### Step 1: Initialize Database Schema
```bash
node scripts/init-turso-db.js
```

**What this does:**
- Connects to your Turso database
- Creates all 8 tables (categories, users, articles, comments, tags, article_tags, settings, media)
- Validates schema integrity
- Removes any deprecated columns (like `published`)
- Confirms database is ready

**Expected output:**
```
[INFO] Starting Turso database initialization...
✅ Connected to Turso database
✅ Schema created successfully
✅ Schema validation passed
✅ No deprecated "published" column found
✨ Database initialization complete!
```

### Step 2: Start the Server
```bash
npm start
```

**Expected output:**
```
Server running on http://0.0.0.0:3000
✅ Database connected
✅ Schema validated
✅ Server ready for requests
```

### Step 3: Test in Browser
1. Open http://localhost:3000
2. Try opening an article
3. Check sidebars - should display without text overflow
4. No SQL errors should appear

## ⚠️ If You Encounter Issues

### Issue: "Cannot find module 'dotenv'"
```bash
npm install dotenv
```

### Issue: "SQL Error: no such column: published"
This shouldn't happen, but if it does:
```bash
node scripts/init-turso-db.js
```

### Issue: "Connection refused"
Make sure your `.env` has correct values:
```bash
grep TURSO_ .env
# Should see:
# TURSO_CONNECTION_URL=libsql://rodn-ganeshpoudel.aws-ap-northeast-1.turso.io
# TURSO_AUTH_TOKEN=eyJhbGciOi...
```

### Issue: "404 Not Found" when opening articles
Database likely has no data. Seed it:
```bash
node scripts/seed.js
```

## 📋 What Changed

### Environment Files
- `.env` - Updated with new Turso credentials
- `.env.vercel.production` - Updated for Vercel deployments

### Code Files  
- `server/models/Article.js` - Fixed SELECT * queries
- `server/routes/journalist.js` - Fixed SELECT * queries  
- `server/public/site/css/main.css` - Fixed layout and text overflow
- `server/config/schema.js` - Added schema validation
- `server/server.js` - Added schema validation to startup

### New Files
- `scripts/init-turso-db.js` - Database initialization script
- `TURSO_SETUP_COMPLETE.md` - Complete setup guide
- This file

## 🔒 Security Reminder

Your `.env` file contains your Turso auth token. **DO NOT:**
- Commit to Git ✅ Already in .gitignore
- Share with others ❌ Keep private
- Put in public repos ❌ For internal use only
- Include in build logs ❌ Won't appear there

For Vercel deployment:
- Use the `.env.vercel.production` file for reference
- Set environment variables in Vercel Dashboard (encrypted)
- Never commit actual tokens to Git

## 📊 Database Overview

Your Turso database includes:

| Table | Purpose | Records |
|-------|---------|---------|
| articles | News articles | TBD |
| categories | Article categories | TBD |
| users | Authors, editors, admins | TBD |
| comments | Article comments | TBD |
| tags | Article tags | TBD |
| article_tags | Article-tag relationships | TBD |
| media | Uploaded files | TBD |
| settings | Application settings | TBD |

**Total Columns in articles table:** 30
- No deprecated `published` column ✅
- Uses `published_at` instead ✅

## 🎯 Final Verification

After completing the above steps, confirm:

- [ ] `npm start` launches without errors
- [ ] http://localhost:3000 loads in browser
- [ ] Articles list displays (if seeded)
- [ ] Opening an article shows no SQL errors
- [ ] Text in sidebars doesn't overflow
- [ ] Category filters work
- [ ] Journalist portal accessible (if logged in)
- [ ] Admin panel loads (if admin user exists)

## 📞 Support Resources

- Turso Docs: https://docs.turso.tech
- Turso Dashboard: https://app.turso.tech  
- Turso CLI: https://docs.turso.tech/cli/introduction
- Setup Guide: See `TURSO_SETUP_COMPLETE.md`

---

## Ready to Deploy?

After verifying everything works locally:

```bash
# Option 1: Deploy to Vercel
git push

# Option 2: Deploy manually
# Follow: VERCEL_DEPLOYMENT_README.md or RENDER_DEPLOYMENT_GUIDE.md
```

Your database will automatically connect using the environment variables you set in the hosting platform.
