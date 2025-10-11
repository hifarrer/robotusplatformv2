# Quick Production Fix

## For Render Shell (Production Environment)

Run these commands in order:

### 1. Check Database Schema
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT unnest(enum_range(NULL::\"VideoModel\")) as enum_value\`.then(values => {
  console.log('VideoModel enum values:', values);
  const hasWan25 = values.some(v => v.enum_value === 'WAN_2_5');
  console.log('WAN_2_5 exists:', hasWan25);
  prisma.\$disconnect();
});
"
```

### 2. Fix Prisma Client
```bash
npx prisma generate
```

### 3. Test the Fix
```bash
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.userPreferences.count().then(count => {
  console.log('UserPreferences table exists, count:', count);
  prisma.\$disconnect();
}).catch(err => {
  console.log('UserPreferences table error:', err.message);
  prisma.\$disconnect();
});
"
```

### 4. Restart Application
After running the above commands, restart your application to pick up the new Prisma client.

## Expected Result
- ✅ Database schema will be verified
- ✅ Prisma client will be regenerated with correct enum values
- ✅ Preferences API will work correctly
- ✅ No more "WAN_2_5 not found in enum" errors
