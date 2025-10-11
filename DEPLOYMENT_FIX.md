# Production Preferences Fix

## Issue
The preferences are not loading in production with error: "Error loading preferences: Error: Failed to load preferences"

## Root Cause
The `UserPreferences` table likely doesn't exist in the production database, causing the API to fail.

## Solution

### 1. Database Migration (Run in Production)

First, check if the UserPreferences table exists:

```bash
# Connect to your production database and run:
npx prisma db push
```

Or manually create the table:

```sql
CREATE TABLE IF NOT EXISTS "UserPreferences" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "aspectRatio" TEXT NOT NULL DEFAULT 'SQUARE',
  "textToImageModel" TEXT NOT NULL DEFAULT 'SEEDREAM_V4',
  "imageToImageModel" TEXT NOT NULL DEFAULT 'SEEDREAM_V4_EDIT',
  "videoModel" TEXT NOT NULL DEFAULT 'VEO3_FAST',
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);
```

### 2. Run Database Schema Check

```bash
# Run the database schema check script
npx tsx scripts/check-database-schema.ts
```

### 3. Deploy Updated Code

The updated code now includes:
- ✅ Better error handling and logging
- ✅ Fallback mechanism when table doesn't exist
- ✅ Detailed console logging for debugging
- ✅ Graceful degradation with default preferences

### 4. Verify Fix

After deployment, check the browser console for detailed logs:
- Look for "🔧 Getting user preferences..." 
- Check for any database errors
- Verify preferences are loading correctly

### 5. Alternative: Manual Database Setup

If the automatic migration doesn't work, you can manually run:

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

## Testing

1. Open the production app
2. Check browser console for detailed logs
3. Try changing preferences to verify they save
4. Refresh the page to verify they persist

## Expected Behavior After Fix

- ✅ Preferences load without errors
- ✅ Default preferences are created for new users
- ✅ Preferences can be updated and saved
- ✅ Detailed logging helps with future debugging

## Files Modified

- `src/app/api/user-preferences/route.ts` - Added fallback handling
- `src/components/preferences-menu.tsx` - Added detailed logging
- `scripts/check-database-schema.ts` - New database check script
