# Render Storage Configuration Fix

## Problem
Images were not being saved correctly on Render because the environment detection was failing. Images were being saved with development paths (`/uploads/images/`) instead of production paths (`/api/serve-file/images/`).

## Solution
Updated the environment detection to check if the `/temp-uploads` directory exists (Render's persistent disk mount) instead of relying solely on environment variables.

## Render Configuration Checklist

### 1. ✅ Persistent Disk Mount
Ensure you have a persistent disk configured in your Render service:
- **Mount Path:** `/temp-uploads`
- **Size:** At least 1GB (recommended: 5GB+)

To add/verify in Render Dashboard:
1. Go to your service
2. Navigate to "Disks" in the sidebar
3. Add a disk with mount path: `/temp-uploads`

### 2. ✅ Environment Variable (Optional but Recommended)
Add this environment variable in Render Dashboard to make detection more reliable:
- **Key:** `RENDER`
- **Value:** `true`

### 3. ✅ Files Changed
- `src/lib/media-storage.ts` - Now checks if `/temp-uploads` exists
- `src/app/api/serve-file/[type]/[filename]/route.ts` - Updated to match

## Verification After Deploy

1. **Check Logs** - Look for this on startup:
```
🔧 Media Storage Config: {
  isRender: true,
  UPLOADS_DIR: '/temp-uploads',
  '/temp-uploads exists': true
}
```

2. **Test Image Generation** - Generate a new image and verify:
   - The image appears in "My Images"
   - The console logs show: `Image saved successfully: /api/serve-file/images/...`
   - The database record has `localPath` starting with `/api/serve-file/images/`

3. **If Still Broken** - Check the logs for:
   - `⚠️ WARNING: Running in production but isRender is false!`
   - If you see this, the `/temp-uploads` mount is not configured correctly

## Migration for Existing Broken Images

Images generated before this fix will have incorrect paths in the database. Options:

### Option 1: Re-generate (Easiest)
Just generate new images - they will work correctly.

### Option 2: Database Migration (If you have important images)
Run this SQL to fix existing paths:
```sql
UPDATE "SavedImage" 
SET "localPath" = REPLACE("localPath", '/uploads/images/', '/api/serve-file/images/')
WHERE "localPath" LIKE '/uploads/images/%';
```

## How It Works Now

1. **Detection Priority:**
   - First: Check if `/temp-uploads` directory exists (most reliable)
   - Second: Check Render environment variables (`RENDER_SERVICE_NAME`, etc.)
   - Third: Check `NODE_ENV` and `RENDER` env var

2. **Path Selection:**
   - If `isRender === true`: Use `/temp-uploads` and `/api/serve-file/` paths
   - If `isRender === false`: Use `public/uploads` (local development)

3. **Debug Logging:**
   - All file save operations log detailed information
   - Warnings if production detection fails

