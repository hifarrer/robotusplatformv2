# Manual Production Fix

## For Windows Systems (Local Development)

Since you're running this locally on Windows, here are the manual steps:

### Step 1: Clean Prisma Client
```bash
# Remove the existing Prisma client
rmdir /s /q node_modules\.prisma

# Remove Next.js cache
rmdir /s /q .next
```

### Step 2: Regenerate Prisma Client
```bash
npx prisma generate
```

### Step 3: Push Schema to Database
```bash
npx prisma db push
```

### Step 4: Test the Fix
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

### Step 5: Restart Development Server
```bash
npm run dev
```

## For Production (Render)

If you need to run this in production, use the Windows-compatible script:

```bash
node scripts/windows-prisma-fix.js
```

## Expected Result

After running these steps:
- ✅ Prisma client will be regenerated with correct enum values
- ✅ Preferences API will work without enum errors
- ✅ Chat API will work without enum errors
- ✅ All database operations will work correctly

## Troubleshooting

If you still get enum errors:
1. Check that the database actually has WAN_2_5 in the enum
2. Verify the Prisma schema file has WAN_2_5 in the VideoModel enum
3. Make sure you restarted the development server after regenerating the client
