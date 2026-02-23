# Quick Reference: Category Management

## Creating Categories - Admin Panel
1. Open http://localhost:3000/admin
2. Go to **Categories** section
3. Click **Add Category** button
4. Fill in the form:
   - **Name**: Required - e.g., "Sports"
   - **Slug**: Auto-generated from name - e.g., "sports"
   - **Description**: Optional
5. Click **Create** button
6. Category appears in the list immediately

## Creating Categories - API
```bash
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Category Name",
    "slug": "category-slug",
    "description": "Optional description"
  }'
```

## Getting All Categories
```bash
curl http://localhost:3000/api/categories
```

## Updating a Category
```bash
curl -X PUT http://localhost:3000/api/categories/{id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "slug": "updated-slug",
    "display_order": 1,
    "is_enabled": 1
  }'
```

## Deleting a Category
```bash
curl -X DELETE http://localhost:3000/api/categories/{id}
```

**Note**: Cannot delete categories that have articles assigned to them.

## Troubleshooting

### Still Getting 404 Errors?
1. Check server is running: `ps aux | grep "node server"`
2. Check server logs: `tail -50 /home/arcgg/rodb/server/logs/error.log`
3. Verify Turso credentials in `.env`:
   ```bash
   grep TURSO_ /home/arcgg/rodb/.env
   ```
4. Reinitialize database: `node /home/arcgg/rodb/scripts/init-turso-db.js`
5. Restart server: `cd /home/arcgg/rodb && npm start`

### Categories Not Showing in Admin?
1. Clear browser cache: Ctrl+Shift+Delete
2. Refresh page: F5 or Cmd+Shift+R
3. Check browser console for JavaScript errors: F12

### Can't Create Category?
- Check you have proper authentication
- Verify all required fields are filled
- Check server error logs for details
- Ensure category slug is unique

## Default Categories (Auto-Created)
1. Local News
2. National
3. International
4. Politics
5. Business
6. Sports
7. Entertainment
8. Technology
9. Health
10. Education

## Server Startup
```bash
cd /home/arcgg/rodb
npm start
# Server runs on http://localhost:3000
```

## Database Reset (if needed)
```bash
# Delete local cache (if using local SQLite)
rm -f /home/arcgg/rodb/server/data/rodb.db

# Turso database will reset on next server start with schema recreation
npm start
```

---

**Last Fixed**: 2026-02-21
**Status**: ✅ Fully Operational
