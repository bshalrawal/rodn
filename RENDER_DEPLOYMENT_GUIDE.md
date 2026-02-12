# Render Deployment Guide - RODB News Platform

## 📋 Overview

This document provides complete instructions to deploy RODB to Render as a persistent Node.js service.

**Key Differences from Vercel:**
- ✓ Long-lived Express server (no serverless cold starts)
- ✓ Consistent process uptime
- ✓ Scheduled jobs via Render's native cron system
- ✗ No local persistent filesystem (use S3/object storage for uploads)
- ✓ Better for monolithic Express apps

---

## 🚀 Quick Start

### Prerequisites
- GitHub repository connected to Render (done: https://github.com/gneshpoudel-art/rodn)
- Turso database credentials
- Generated secrets (JWT_SECRET, JWT_REFRESH_SECRET, SESSION_SECRET, ADMIN_SECRET, CRON_SECRET)

### Step 1: Create Render Account & Connect GitHub
1. Go to https://render.com
2. Sign up with GitHub account
3. Authorize access to your repositories

### Step 2: Create New Web Service
1. Dashboard → **New +** → **Web Service**
2. Connect GitHub → Select `rodn` repository
3. Configure:
   - **Name**: `rodb-news-platform`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Starter (free tier) or Standard

### Step 3: Add Environment Variables
Click **Add Environment Variable** and add each:

**Required:**
```
NODE_ENV = production
PORT = 10000
LOG_LEVEL = info
TURSO_CONNECTION_URL = libsql://rodb-ganeshpoudel.aws-ap-northeast-1.turso.io
TURSO_AUTH_TOKEN = eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9...
JWT_SECRET = 16c5b90b2ba090c11b5fd87d47539feba154725fc55c2290461e56eb670b6cf7
JWT_REFRESH_SECRET = 5e973cdb0058370ed4922734e4e5c85d3d5d7040f6af5fbf7cdce7906d50b5b6
SESSION_SECRET = 8368a4e8eb547797858d90dc7bce8055e8df3de504fc9910d0fd8e97e80876d8
ADMIN_SECRET = 50100a72a0591ac2e1ad984cdd3e60180bddc3c95fd7b48a7482535a714704bc
CRON_SECRET = 4c96737218b2babf087fa303731be2c91e08c7821ae1c685ddd4c68ff4c4208c
CORS_ORIGIN = https://yourdomain.com
FRONTEND_URL = https://yourdomain.com
```

**Optional:**
```
LOG_LEVEL = debug (for troubleshooting)
REDIS_URL = redis://... (for persistent sessions)
BLOB_READ_WRITE_TOKEN = vercel_blob_... (for file uploads)
```

### Step 4: Deploy
1. Click **Create Web Service**
2. Render will build and deploy automatically
3. You'll get a URL: `https://rodb-news-platform-xxxx.onrender.com`

### Step 5: Set Up Custom Domain (Optional)
1. Go to service → **Settings** → **Custom Domain**
2. Add your domain
3. Update DNS records pointing to Render

### Step 6: Configure Scheduled Jobs
1. Once deployed, get your service URL
2. Go to service → **Scheduled Jobs** tab
3. Create two jobs:

**Job 1: Publish Scheduled Articles**
```
Name: publish-scheduled-articles
Schedule: 0 */6 * * * (UTC)
Endpoint: GET /api/cron/publish-scheduled-articles
Headers: x-cron-secret: <your-cron-secret>
```

**Job 2: Cleanup Old Logs**
```
Name: cleanup-old-logs
Schedule: 0 2 * * * (UTC)
Endpoint: GET /api/cron/cleanup-old-logs
Headers: x-cron-secret: <your-cron-secret>
```

---

## 🔧 Server Configuration

### PORT Configuration
Your `server/server.js` already supports PORT:
```javascript
const PORT = process.env.PORT || 3000;
```

Render assigns port `10000` by default (set in render.yaml). The server will listen on this port.

### Health Check
Render pings `/api/health` to ensure service is running. This is already implemented and returns:
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T...",
  "database": "connected"
}
```

---

## 🗄️ Database Setup

### First Deployment: Initialize Database
On first deployment, the server automatically:
1. Connects to Turso database
2. Creates schema (idempotent - safe if called multiple times)
3. Seeds default data (idempotent - checks if data exists)

**No manual DB init needed** — all handled in `server/server.js` `seedDefaultData()`.

### Verify Database Connection
After deployment, check logs:
```
Render Dashboard → Service → Logs
```

Look for:
```
RODB Server Starting
Database connected successfully
Default data seeded
```

---

## 📊 File Uploads (Critical)

### Problem
Render's ephemeral filesystem deletes uploaded files when the service restarts.

### Solution: Use Object Storage

**Option 1: Vercel Blob Storage** (recommended if using Vercel elsewhere)
- Add `BLOB_READ_WRITE_TOKEN` env var
- Use [FILE_UPLOADS_BLOB_STORAGE.md](FILE_UPLOADS_BLOB_STORAGE.md) guide

**Option 2: AWS S3**
```bash
npm install aws-sdk multer-s3
```

Update `server/routes/media.js`:
```javascript
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const upload = multerS3({
  s3: s3,
  bucket: process.env.S3_BUCKET_NAME,
  key: (req, file, cb) => {
    const filename = `${Date.now()}-${file.originalname}`;
    cb(null, `uploads/${filename}`);
  }
});

module.exports = upload;
```

Add env vars:
```
AWS_ACCESS_KEY_ID = your-key
AWS_SECRET_ACCESS_KEY = your-secret
AWS_REGION = us-east-1
S3_BUCKET_NAME = your-bucket
```

**Option 3: Backblaze B2**
- S3-compatible API
- Cheaper than AWS
- Same code as S3 with different endpoint

**Option 4: Cloudflare R2**
- S3-compatible
- Included in Cloudflare plans
- Zero egress fees

---

## 📝 Logging

### Render Logs
All logs go to stdout/stderr and are captured by Render.

View logs:
```
Render Dashboard → Service → Logs
```

### Winston Configuration
Your `server/utils/logger.js` outputs to:
- Console (captured by Render)
- Local log files (ephemeral, deleted on restart)

**For persistent logging, add:**

Option A: Integrate with Datadog / LogDNA
```javascript
const LogDNA = require('@logdna/nodejs');
LogDNA.setupDefaultLogger({
  key: process.env.LOGDNA_KEY,
  app: 'rodb-news'
});
```

Option B: Send to external logging service (Sentry, Papertrail, etc.)

### Log Levels
Set via `LOG_LEVEL` env var:
- `error` — Only errors
- `warn` — Errors + warnings
- `info` — Normal info (recommended)
- `debug` — Detailed debugging

---

## ⏰ Scheduled Jobs (Cron)

### How They Work
Render Scheduled Jobs make HTTP requests to your service at specified times.

### Current Jobs
**Job 1: Publish Scheduled Articles**
- Schedule: `0 */6 * * *` (every 6 hours at :00)
- Endpoint: `GET /api/cron/publish-scheduled-articles`
- Secured by `x-cron-secret` header

**Job 2: Cleanup Old Logs**
- Schedule: `0 2 * * *` (daily at 2 AM UTC)
- Endpoint: `GET /api/cron/cleanup-old-logs`
- Secured by `x-cron-secret` header

### Adding More Cron Jobs
1. Add endpoint in `server/routes/*.js`:
```javascript
router.get('/cron/my-task', async (req, res) => {
  // Verify cron secret
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Do work
  try {
    // Your logic here
    res.json({ success: true });
  } catch (err) {
    logger.error('Cron task failed:', err);
    res.status(500).json({ error: err.message });
  }
});
```

2. Add to service routes (imported in `app.js`)
3. Add Scheduled Job in Render Dashboard:
   - Endpoint: `/api/cron/my-task`
   - Schedule: Your cron expression
   - Headers: `x-cron-secret: <your-secret>`

---

## 🔐 Security Best Practices

### Environment Variables
- ✓ Store secrets in Render Dashboard (encrypted)
- ✓ Never commit secrets to Git
- ✓ Use different secrets per environment
- ✓ Rotate secrets periodically

### CORS Configuration
- `CORS_ORIGIN` set to your frontend domain
- Prevents unauthorized API access
- Update when deploying frontend

### CRON_SECRET
- Verifies cron job requests
- Prevents unauthorized task execution
- Must be strong and secret

### Helmet Security Headers
Already enabled in `server/app.js`:
```javascript
app.use(helmet());
```

Provides:
- XSS protection
- Content Security Policy
- MIME type sniffing prevention
- Clickjacking protection

---

## 📈 Scaling & Performance

### Vertical Scaling
- Upgrade plan: Starter → Standard → Pro
- Increases CPU and memory
- Pay more, app runs faster

### Horizontal Scaling
- Use multiple instances
- Render handles load balancing
- Connect to shared database (Turso) + shared session store (Redis)

### Connection Pooling
Your code uses singleton pattern:
```javascript
// server/config/database.js
let dbConnection = null;

function getConnection() {
  if (!dbConnection) {
    dbConnection = createConnection();
  }
  return dbConnection;
}
```

This ensures only one DB connection per process, improving performance.

### Caching Strategy
- Static files: CDN (Render provides)
- API responses: Add Redis
- Session data: Redis or Turso

---

## 🧪 Testing Before Production

### Local Testing
```bash
# Set Render-like environment
PORT=10000 NODE_ENV=production npm start
```

### Verify Endpoints
```bash
# Health check
curl https://your-render-url/api/health

# Test API
curl https://your-render-url/api/articles

# Test cron (with secret)
curl -H "x-cron-secret: your-secret" https://your-render-url/api/cron/publish-scheduled-articles
```

### Monitor Logs
```
Render Dashboard → Service → Logs
```

Look for:
- Successful startup messages
- No ERROR entries
- Cron jobs executing on schedule

---

## 🔗 Environment Variables Reference

| Variable | Example | Required | Where to Get |
|----------|---------|----------|-------------|
| NODE_ENV | production | ✓ | Set to production |
| PORT | 10000 | ✓ | Default (don't override) |
| LOG_LEVEL | info | ✓ | Choose: error, warn, info, debug |
| TURSO_CONNECTION_URL | libsql://... | ✓ | Turso Console |
| TURSO_AUTH_TOKEN | eyJ... | ✓ | Turso Console |
| JWT_SECRET | (64-char hex) | ✓ | Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| JWT_REFRESH_SECRET | (64-char hex) | ✓ | Generate same way |
| SESSION_SECRET | (64-char hex) | ✓ | Generate same way |
| ADMIN_SECRET | (64-char hex) | ✓ | Generate same way |
| CRON_SECRET | (64-char hex) | ✓ | Generate same way |
| CORS_ORIGIN | https://yourdomain.com | ✓ | Your frontend URL |
| FRONTEND_URL | https://yourdomain.com | ✓ | Your frontend URL |
| LOG_LEVEL | info | ✗ | Optional: debug for testing |
| REDIS_URL | redis://... | ✗ | Redis Cloud, Upstash (optional) |
| BLOB_READ_WRITE_TOKEN | vercel_blob_... | ✗ | Vercel (optional, for uploads) |

---

## ❌ Common Issues & Solutions

### Issue: Build Fails
**Solution**: Check logs in Render Dashboard
```
Render Dashboard → Service → Logs → Build Logs
```

Common causes:
- Missing environment variables
- Dependencies not installing
- Node version mismatch

### Issue: Service Won't Start
**Solution**: 
1. Check logs: `npm start` must succeed
2. Verify PORT env var set to 10000
3. Verify `server/server.js` can run locally: `npm start`

### Issue: Database Connection Failed
**Solution**:
1. Verify TURSO_CONNECTION_URL (libsql://...)
2. Verify TURSO_AUTH_TOKEN (full token copied)
3. Test locally with `.env`:
```bash
TURSO_CONNECTION_URL=libsql://... \
TURSO_AUTH_TOKEN=... \
npm start
```

### Issue: Cron Jobs Not Running
**Solution**:
1. Verify Scheduled Jobs created in Render
2. Check endpoint is reachable: `curl https://your-url/api/cron/...`
3. Verify CRON_SECRET header sent
4. Check service logs during scheduled time

### Issue: Files Disappear After Restart
**Solution**: Use object storage (S3, Backblaze, Vercel Blob)
- Render filesystem is ephemeral
- Not suitable for persistent uploads

---

## 📚 Comparison: Vercel vs Render

| Feature | Vercel | Render |
|---------|--------|--------|
| Model | Serverless (per-request) | Persistent process |
| Cold Starts | 2-3 seconds | None (always warm) |
| Scaling | Automatic per request | Vertical + horizontal |
| Setup | Serverless handler | Express server |
| Crons | Native vercel.json config | HTTP-based scheduled jobs |
| File Storage | Vercel Blob | S3 / external storage |
| Free Tier | 15GB compute | 750 hours/month |
| Cost | Per invocation | Per instance-hour |
| Best For | APIs, Functions, SPA | Full-stack monoliths |

---

## ✅ Deployment Checklist

- [ ] GitHub repo pushed (`git push -u origin main`)
- [ ] Render account created
- [ ] Web Service created and connected to GitHub
- [ ] All environment variables added to Render
- [ ] Build Command: `npm install`
- [ ] Start Command: `npm start`
- [ ] Initial deployment successful (check logs)
- [ ] Service URL working and healthy check passes
- [ ] API endpoints tested (articles, auth, etc.)
- [ ] Scheduled jobs created and visible in Render
- [ ] File uploads configured (S3 or Vercel Blob)
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Render)
- [ ] Monitoring/logging configured
- [ ] Production ready ✓

---

## 🚀 Next Steps

1. **Add Database Backups**: Turso provides automatic backups
2. **Set Up Monitoring**: Render native monitoring or Datadog
3. **Configure Email Service**: SendGrid, Mailgun for notifications
4. **Set Up Analytics**: Track page views, user events
5. **Optimize Performance**: CDN, caching, database indexes
6. **Set Up CI/CD**: Auto-deploy on push (optional, Render does this)

---

**Document**: Render Deployment Guide for RODB News Platform  
**Version**: 1.0  
**Status**: Production Ready  
**Last Updated**: February 12, 2026
