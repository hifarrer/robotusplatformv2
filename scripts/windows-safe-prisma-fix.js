// Windows-safe Prisma client fix
// This script handles file locking issues on Windows

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function windowsSafePrismaFix() {
  try {
    console.log('🔧 Windows-safe Prisma client fix starting...')
    
    // Step 1: Check if development server is running
    console.log('📋 Step 1: Checking for running processes...')
    try {
      execSync('tasklist /FI "IMAGENAME eq node.exe"', { stdio: 'pipe' })
      console.log('⚠️ Node.js processes detected. Please stop your development server first.')
      console.log('💡 Run: Ctrl+C to stop the dev server, then run this script again.')
      return false
    } catch (error) {
      console.log('✅ No Node.js processes detected')
    }
    
    // Step 2: Clean everything with retries
    console.log('🧹 Step 2: Cleaning existing Prisma client...')
    let retries = 3
    while (retries > 0) {
      try {
        // Remove node_modules/.prisma with retry
        const prismaPath = path.join('node_modules', '.prisma')
        if (fs.existsSync(prismaPath)) {
          execSync(`rmdir /s /q "${prismaPath}"`, { stdio: 'inherit' })
          console.log('✅ Removed node_modules/.prisma')
        }
        
        // Remove .next directory
        if (fs.existsSync('.next')) {
          execSync(`rmdir /s /q ".next"`, { stdio: 'inherit' })
          console.log('✅ Removed .next directory')
        }
        
        break
      } catch (error) {
        retries--
        if (retries > 0) {
          console.log(`⚠️ Cleanup failed, retrying... (${retries} retries left)`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
        } else {
          console.log('⚠️ Cleanup failed after retries, continuing anyway...')
        }
      }
    }
    
    // Step 3: Wait a moment for file system to settle
    console.log('⏳ Step 3: Waiting for file system to settle...')
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Step 4: Regenerate Prisma client with retries
    console.log('🔧 Step 4: Regenerating Prisma client...')
    retries = 3
    while (retries > 0) {
      try {
        execSync('npx prisma generate', { stdio: 'inherit' })
        console.log('✅ Prisma client regenerated')
        break
      } catch (error) {
        retries--
        if (retries > 0) {
          console.log(`⚠️ Prisma generate failed, retrying... (${retries} retries left)`)
          console.log('💡 If this keeps failing, try:')
          console.log('   1. Close all terminals and editors')
          console.log('   2. Restart your computer')
          console.log('   3. Run this script again')
          await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
        } else {
          console.error('❌ Failed to regenerate Prisma client after retries')
          throw error
        }
      }
    }
    
    // Step 5: Push schema to database
    console.log('🔧 Step 5: Pushing schema to database...')
    try {
      execSync('npx prisma db push', { stdio: 'inherit' })
      console.log('✅ Database schema pushed')
    } catch (error) {
      console.log('⚠️ Database push failed (might be fine if schema is already correct):', error.message)
    }
    
    // Step 6: Test the fix
    console.log('🧪 Step 6: Testing the fix...')
    try {
      const { PrismaClient } = require('@prisma/client')
      const prisma = new PrismaClient()
      
      // Test enum values
      const enumValues = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
      `
      console.log('📋 VideoModel enum values:', enumValues)
      
      const hasWan25 = enumValues.some(item => item.enum_value === 'WAN_2_5')
      if (hasWan25) {
        console.log('✅ WAN_2_5 exists in VideoModel enum')
      } else {
        console.log('❌ WAN_2_5 still missing from VideoModel enum')
        return false
      }
      
      // Test UserPreferences table
      const count = await prisma.userPreferences.count()
      console.log('✅ UserPreferences table accessible, count:', count)
      
      await prisma.$disconnect()
      
    } catch (error) {
      console.error('❌ Test failed:', error.message)
      return false
    }
    
    console.log('✅ Windows-safe Prisma fix completed successfully!')
    console.log('🚀 Next steps:')
    console.log('   1. Start your development server: npm run dev')
    console.log('   2. Test the preferences and chat APIs')
    console.log('   3. Check browser console for any remaining errors')
    
    return true
    
  } catch (error) {
    console.error('❌ Windows-safe Prisma fix failed:', error)
    console.log('💡 If you continue to have issues, try:')
    console.log('   1. Close all terminals and editors')
    console.log('   2. Delete node_modules folder: rmdir /s /q node_modules')
    console.log('   3. Run: npm install')
    console.log('   4. Run: npx prisma generate')
    console.log('   5. Run: npx prisma db push')
    return false
  }
}

// Run the fix
windowsSafePrismaFix()
  .then((success) => {
    if (success) {
      console.log('✅ Windows-safe Prisma fix completed!')
      process.exit(0)
    } else {
      console.log('❌ Windows-safe Prisma fix failed!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Windows-safe Prisma fix execution failed:', error)
    process.exit(1)
  })
