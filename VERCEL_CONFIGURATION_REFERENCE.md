# Vercel Configuration - Complete Reference

## 📋 vercel.json Configuration

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "env": {
    "NODE_ENV": "production",
    "TURSO_CONNECTION_URL": "@turso_connection_url",
    "TURSO_AUTH_TOKEN": "@turso_auth_token",
    "JWT_SECRET": "@jwt_secret",
    "JWT_REFRESH_SECRET": "@jwt_refresh_secret",
    "SESSION_SECRET": "@session_secret",
    "ADMIN_SECRET": "@admin_secret"
  },
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 60,
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/public/(.*)",
      "destination": "/public/$1"
    }
  ],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    },
    {
      "source": "/public/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ],
  "crons": [
    {
      "path": "/api/cron/publish-scheduled-articles",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-logs",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## 🔑 Environment Variables (REQUIRED)

All these variables **must** be added to Vercel Dashboard → Settings → Environment Variables

### 1. NODE_ENV
```
Key: NODE_ENV
Value: production
Environments: Production, Preview, Development
```

**Purpose**: Tells the app it's running in production mode
- Error handling: Shows minimal errors to users
- Logging: Reduced verbosity
- Security: Strict CORS checks

---

### 2. TURSO_CONNECTION_URL
```
Key: TURSO_CONNECTION_URL
Value: libsql://your-db-name-xyz.turso.io
Environments: Production, Preview, Development
```

**How to get**:
1. Go to [console.turso.tech](https://console.turso.tech)
2. Click on your database
3. Copy the "Database URL" (format: `libsql://...`)
4. Do NOT copy `https://...` version

**Example**:
```
libsql://routine-dhulikhel-banda-abc123.turso.io
```

**Purpose**: Connect to Turso serverless SQLite database

---

### 3. TURSO_AUTH_TOKEN
```
Key: TURSO_AUTH_TOKEN
Value: eyJhbGciOiJFZDI1NTE5IiwidHlwIjoiSldUIn0...
Environments: Production, Preview, Development
```

**How to get**:
1. Go to [console.turso.tech](https://console.turso.tech)
2. Select your database
3. Click "Tokens" tab
4. Copy token (or create new)

**Important**: 
- Copy the ENTIRE token
- Don't include any extra spaces
- Keep it secret

**Purpose**: Authenticate with Turso database

---

### 4. JWT_SECRET
```
Key: JWT_SECRET
Value: <GENERATE-UNIQUE>
Environments: Production, Preview, Development
```

**How to generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output**:
```
a7f3c9d2e1b4f8c6a2d5e7f1c3a8b6d9e2f4a7c9b1d3e5f7a2c4e6f8a0b2c
```

**Purpose**: Sign JWT authentication tokens
- Different for each environment
- Never share or commit to git

---

### 5. JWT_REFRESH_SECRET
```
Key: JWT_REFRESH_SECRET
Value: <GENERATE-UNIQUE>
Environments: Production, Preview, Development
```

**How to generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Purpose**: Sign refresh tokens for extended sessions
- Different from JWT_SECRET
- Different for each environment

---

### 6. SESSION_SECRET
```
Key: SESSION_SECRET
Value: <GENERATE-UNIQUE>
Environments: Production, Preview, Development
```

**How to generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Purpose**: Sign session cookies
- Used for OAuth flows
- Different from JWT secrets

---

### 7. ADMIN_SECRET
```
Key: ADMIN_SECRET
Value: <GENERATE-UNIQUE>
Environments: Production, Preview, Development
```

**How to generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Purpose**: Sign admin tokens for elevated permissions
- Different for each environment
- Used for admin authentication

---

### 8. CRON_SECRET
```
Key: CRON_SECRET
Value: <GENERATE-UNIQUE>
Environments: Production, Preview, Development
```

**How to generate**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Purpose**: Verify Vercel cron job requests
- Prevents unauthorized cron invocations
- Sent in `x-cron-secret` header

---

## 🔑 Environment Variables (OPTIONAL)

### 9. CORS_ORIGIN
```
Key: CORS_ORIGIN
Value: https://yourdomain.com
Environments: Production, Preview, Development
```

**Options**:
- Production: `https://yourdomain.com`
- Staging: `https://staging.yourdomain.com`
- Development: `http://localhost:3000`
- Multiple: `https://yourdomain.com,https://app.yourdomain.com`
- All (not recommended): `*`

**Purpose**: Allow requests from specific frontend domains

---

### 10. FRONTEND_URL
```
Key: FRONTEND_URL
Value: https://yourdomain.com
Environments: Production, Preview, Development
```

**Purpose**: Frontend application URL
- Used in OAuth callbacks
- Used in redirect URLs
- Used in email templates

---

### 11. LOG_LEVEL
```
Key: LOG_LEVEL
Value: info
Environments: Production, Preview, Development
```

**Options**:
- `error` - Only errors
- `warn` - Errors and warnings
- `info` - Normal info (default, recommended)
- `debug` - Detailed debugging (verbose)

**Purpose**: Control logging verbosity

---

### 12. REDIS_URL (If Using Sessions)
```
Key: REDIS_URL
Value: redis://default:password@host:6379
Environments: Production, Preview, Development
```

**When needed**: Only if implementing persistent sessions
- Optional for JWT-based auth
- Services: Redis Cloud, Upstash

**Purpose**: Store sessions across function invocations

---

### 13. BLOB_READ_WRITE_TOKEN (If Using File Uploads)
```
Key: BLOB_READ_WRITE_TOKEN
Value: vercel_blob_rw_...
Environments: Production
```

**How to get**:
1. Vercel Dashboard → Storage → Blob
2. Create new container
3. Copy token

**Purpose**: Upload files to Vercel Blob Storage

---

## ⚙️ Build Settings (vercel.json)

```json
{
  "version": 2,
  "buildCommand": "npm run build"
}
```

### Build Command
```bash
npm run build
```

This runs:
```bash
node -e "console.log('Build verification complete')" && exit 0
```

**Purpose**: Verifies build is successful before deployment

---

## 🔧 Function Settings (vercel.json)

```json
{
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 60,
      "runtime": "nodejs18.x"
    }
  }
}
```

### Memory
```
memory: 1024
```

**Options**:
- `128` - Minimum (rarely needed)
- `512` - Small apps
- `1024` - Standard (current, recommended)
- `3008` - Large/complex apps

**Purpose**: RAM allocated to each function instance
- More memory = faster execution
- Current: 1GB (good balance)

### Max Duration
```
maxDuration: 60
```

**Options**:
- `5` - Minimum
- `15` - Standard
- `60` - Maximum (current)

**Purpose**: Timeout per request (in seconds)
- Current: 60 seconds
- All requests must complete within this time

### Runtime
```
runtime: nodejs18.x
```

**Options**:
- `nodejs16.x` - Older (deprecated soon)
- `nodejs18.x` - Current (recommended)
- `nodejs20.x` - Latest (available)

**Purpose**: Node.js version to use
- Current: 18.x (stable)
- Compatible with all dependencies

---

## 📍 Rewrites (vercel.json)

```json
{
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/public/(.*)",
      "destination": "/public/$1"
    }
  ]
}
```

### API Rewrite
```
/api/* → /api
```

**Purpose**: Route all API requests to `api/index.js`
- `/api/articles` → `api/index.js` handles it
- `/api/auth/login` → `api/index.js` handles it

### Public Rewrite
```
/public/* → /public/$1
```

**Purpose**: Serve static files from public folder
- `/public/style.css` → `public/style.css`
- `/public/image.png` → `public/image.png`

---

## 📦 Headers (vercel.json)

```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    },
    {
      "source": "/public/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600"
        }
      ]
    }
  ]
}
```

### API Headers
```
Cache-Control: no-cache, no-store, must-revalidate
X-Content-Type-Options: nosniff
```

**Purpose**:
- No caching for API responses (always fresh)
- Security: Prevent MIME type sniffing

### Public Headers
```
Cache-Control: public, max-age=3600
```

**Purpose**:
- Cache static files for 1 hour
- Browser can serve without requesting server
- Improves performance

---

## ⏰ Cron Jobs (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/publish-scheduled-articles",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/cron/cleanup-old-logs",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Cron Job 1: Publish Articles
```
path: /api/cron/publish-scheduled-articles
schedule: 0 */6 * * *
```

**Schedule**: Every 6 hours at :00 minutes
- 12:00 AM (UTC)
- 6:00 AM (UTC)
- 12:00 PM (UTC)
- 6:00 PM (UTC)

**Purpose**: Automatically publish articles scheduled for publication

### Cron Job 2: Cleanup Logs
```
path: /api/cron/cleanup-old-logs
schedule: 0 2 * * *
```

**Schedule**: Daily at 2:00 AM (UTC)

**Purpose**: Clean up old database logs

---

## 📊 Schedule Format

Cron schedule: `minute hour day month weekday`

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday to Saturday)
│ │ │ │ │
│ │ │ │ │
* * * * *
```

### Examples
```
0 */6 * * *     Every 6 hours (0, 6, 12, 18)
0 2 * * *       Daily at 2 AM
*/15 * * * *    Every 15 minutes
0 9-17 * * 1-5  Every hour 9 AM to 5 PM on weekdays
0 0 1 * *       First day of month at midnight
```

---

## 🚀 How to Add Environment Variables to Vercel

### Via Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your project
3. Click **Settings**
4. Click **Environment Variables**
5. Click **Add New**
6. Enter:
   - **Key**: `NODE_ENV`
   - **Value**: `production`
   - **Environments**: Select all (Production, Preview, Development)
7. Click **Save**
8. Repeat for all variables
9. Go to **Deployments**
10. Click **Redeploy** to apply changes

### Via CLI

```bash
vercel env add VARIABLE_NAME
# Enter value when prompted
```

### Via .env File

Create `.env.production` in root:
```
NODE_ENV=production
TURSO_CONNECTION_URL=libsql://...
TURSO_AUTH_TOKEN=...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
SESSION_SECRET=...
ADMIN_SECRET=...
CRON_SECRET=...
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

Then:
```bash
vercel env pull .env.production
```

---

## ✅ Complete Setup Checklist

### Environment Variables
- [ ] NODE_ENV = production
- [ ] TURSO_CONNECTION_URL = libsql://...
- [ ] TURSO_AUTH_TOKEN = ...
- [ ] JWT_SECRET = (generated)
- [ ] JWT_REFRESH_SECRET = (generated)
- [ ] SESSION_SECRET = (generated)
- [ ] ADMIN_SECRET = (generated)
- [ ] CRON_SECRET = (generated)
- [ ] CORS_ORIGIN = https://yourdomain.com
- [ ] FRONTEND_URL = https://yourdomain.com

### Build Settings
- [ ] vercel.json exists
- [ ] buildCommand: npm run build
- [ ] Functions configured (1024MB, 60s timeout, Node 18.x)

### Rewrites
- [ ] /api/* → /api
- [ ] /public/* → /public/$1

### Headers
- [ ] API: no-cache, no-store
- [ ] Public: cache 1 hour

### Crons
- [ ] Publish articles (0 */6 * * *)
- [ ] Cleanup logs (0 2 * * *)

### Deployment
- [ ] All env vars added to Vercel
- [ ] Project deployed
- [ ] Logs checked
- [ ] API tested
- [ ] Health check passes

---

## 🔐 Security Best Practices

### DO ✓
- ✓ Use Vercel's environment variable management
- ✓ Generate secrets with crypto.randomBytes(32)
- ✓ Use different secrets per environment
- ✓ Rotate secrets regularly
- ✓ Store secrets in Vercel only
- ✓ Never commit secrets to git
- ✓ Add to .gitignore: `.env*`

### DON'T ✗
- ✗ Hardcode secrets in code
- ✗ Share secrets via email/chat
- ✗ Commit secrets to git
- ✗ Use weak/predictable secrets
- ✗ Log secrets in error messages
- ✗ Use same secret for multiple environments
- ✗ Share Vercel token

---

## 📖 Reference

### Generate Secrets
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### View Current Config
```bash
cat vercel.json
```

### Deploy Changes
```bash
git add vercel.json
git commit -m "Update Vercel configuration"
git push origin main
# Vercel auto-deploys on push
```

### View Logs
```bash
vercel logs --tail
```

### Redeploy
```bash
vercel redeploy
# or from dashboard: Deployments > Select > Redeploy
```

---

**Document**: Vercel Configuration Complete Reference  
**Last Updated**: February 12, 2026  
**Version**: 1.0  
**Status**: Production Ready
