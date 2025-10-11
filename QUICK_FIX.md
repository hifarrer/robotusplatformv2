# Quick Production Fix

## For Render Shell (Production Environment)

### Option 1: Aggressive Fix (Recommended)
```bash
# Run the aggressive fix script
node scripts/aggressive-prisma-fix.js
```

### Option 2: Manual Commands
```bash
# 1. Clean everything
rm -rf node_modules/.prisma .next

# 2. Regenerate Prisma client
npx prisma generate --force

# 3. Push schema to database
npx prisma db push --force-reset

# 4. Test the fix
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

### 5. Restart Application
After running the above commands, restart your application to pick up the new Prisma client.

## Expected Result
- ✅ Database schema will be verified
- ✅ Prisma client will be regenerated with correct enum values
- ✅ Preferences API will work correctly
- ✅ No more "WAN_2_5 not found in enum" errors
