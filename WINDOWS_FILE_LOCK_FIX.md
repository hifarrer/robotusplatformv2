# Windows File Lock Fix

## The Problem
You're getting `EPERM: operation not permitted` because Windows has file locking issues with Prisma. This happens when:
- Development server is still running
- Another process is using the Prisma client
- Windows hasn't released file handles

## Solution

### Step 1: Stop All Node Processes
```bash
# Stop your development server (Ctrl+C)
# Close all terminals and editors
# Make sure no Node.js processes are running
```

### Step 2: Use the Safe Fix Script
```bash
node scripts/windows-safe-prisma-fix.js
```

### Step 3: If That Still Fails, Manual Fix
```bash
# 1. Close everything (terminals, editors, etc.)
# 2. Delete node_modules completely
rmdir /s /q node_modules

# 3. Reinstall everything
npm install

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Start development server
npm run dev
```

### Step 4: Alternative - Restart Computer
If the above doesn't work:
1. Save your work
2. Restart your computer
3. Run: `npx prisma generate`
4. Run: `npx prisma db push`
5. Run: `npm run dev`

## Why This Happens
Windows has strict file locking that prevents:
- Deleting files that are in use
- Renaming files that are locked
- Modifying files that are open

The Prisma client files get locked when:
- Development server is running
- VS Code or other editors have the files open
- Windows hasn't released file handles

## Prevention
- Always stop your dev server before running Prisma commands
- Close editors before regenerating Prisma client
- Use the safe fix script which handles retries
