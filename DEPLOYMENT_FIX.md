# Production Preferences Fix

## Issue
The preferences are not loading in production with error: "Error loading preferences: Error: Failed to load preferences"

## Root Cause
The production database already has the `WAN_2_5` value in the `VideoModel` enum, but the Prisma client is out of sync with the database schema, causing the query to fail with: `Value 'WAN_2_5' not found in enum 'VideoModel'`

**Note**: The TypeScript compilation error confirms this - the Prisma client doesn't recognize `WAN_2_5` as a valid enum value, even though it exists in the database.

## Solution

### 1. Fix Prisma Client Sync (Run in Production)

The main issue is that the Prisma client needs to be regenerated to match the database schema. Run this script:

**For Windows Systems:**
```bash
# Windows-safe fix (handles file locking issues)
node scripts/windows-safe-prisma-fix.js
```

**For Unix/Linux Systems:**
```bash
# Aggressive Prisma client fix
node scripts/aggressive-prisma-fix.js
```

**Manual Commands (Windows):**
```bash
# Clean everything
rmdir /s /q node_modules\.prisma
rmdir /s /q .next

# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

**Manual Commands (Unix/Linux):**
```bash
# Clean everything
rm -rf node_modules/.prisma .next

# Regenerate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push
```

### 2. Database Migration (If Needed)

If the UserPreferences table doesn't exist:

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

### 3. Test the Fix

```bash
# Test that the database schema is correct (JavaScript version)
node scripts/production-fix.js
```

### 4. Run Database Schema Check

```bash
# Run the database schema check script
npx tsx scripts/check-database-schema.ts
```

### 5. Deploy Updated Code

The updated code now includes:
- ✅ Better error handling and logging
- ✅ Fallback mechanism for enum value errors
- ✅ Fallback mechanism when table doesn't exist
- ✅ Detailed console logging for debugging
- ✅ Graceful degradation with default preferences

### 6. Verify Fix

After deployment, check the browser console for detailed logs:
- Look for "🔧 Getting user preferences..." 
- Check for any database errors
- Verify preferences are loading correctly

### 7. Alternative: Manual Database Setup

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
