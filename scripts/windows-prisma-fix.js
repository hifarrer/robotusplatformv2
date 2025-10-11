// Windows-compatible Prisma client fix
// This script works on Windows systems

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

async function windowsPrismaFix() {
  try {
    console.log('🔧 Windows Prisma client fix starting...')
    
    // Step 1: Clean everything (Windows compatible)
    console.log('🧹 Step 1: Cleaning existing Prisma client...')
    try {
      // Remove node_modules/.prisma (Windows compatible)
      const prismaPath = path.join('node_modules', '.prisma')
      if (fs.existsSync(prismaPath)) {
        execSync(`rmdir /s /q "${prismaPath}"`, { stdio: 'inherit' })
        console.log('✅ Removed node_modules/.prisma')
      }
      
      // Remove .next directory (Windows compatible)
      if (fs.existsSync('.next')) {
        execSync(`rmdir /s /q ".next"`, { stdio: 'inherit' })
        console.log('✅ Removed .next directory')
      }
      
    } catch (error) {
      console.log('⚠️ Cleanup warnings (usually fine):', error.message)
    }
    
    // Step 2: Regenerate Prisma client (without --force flag)
    console.log('🔧 Step 2: Regenerating Prisma client...')
    try {
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('✅ Prisma client regenerated')
    } catch (error) {
      console.error('❌ Failed to regenerate Prisma client:', error.message)
      throw error
    }
    
    // Step 3: Push schema to database (without --force-reset)
    console.log('🔧 Step 3: Pushing schema to database...')
    try {
      execSync('npx prisma db push', { stdio: 'inherit' })
      console.log('✅ Database schema pushed')
    } catch (error) {
      console.log('⚠️ Database push failed (might be fine if schema is already correct):', error.message)
    }
    
    // Step 4: Test the fix
    console.log('🧪 Step 4: Testing the fix...')
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
    
    console.log('✅ Windows Prisma fix completed successfully!')
    console.log('🚀 Next steps:')
    console.log('   1. Restart your application')
    console.log('   2. Test the preferences and chat APIs')
    console.log('   3. Check browser console for any remaining errors')
    
    return true
    
  } catch (error) {
    console.error('❌ Windows Prisma fix failed:', error)
    return false
  }
}

// Run the fix
windowsPrismaFix()
  .then((success) => {
    if (success) {
      console.log('✅ Windows Prisma fix completed!')
      process.exit(0)
    } else {
      console.log('❌ Windows Prisma fix failed!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Windows Prisma fix execution failed:', error)
    process.exit(1)
  })
