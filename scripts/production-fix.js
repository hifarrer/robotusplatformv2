// Production fix script - JavaScript version to avoid module resolution issues
// This script can be run directly in production without TypeScript compilation

const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

const prisma = new PrismaClient()

async function productionFix() {
  try {
    console.log('🔧 Production preferences fix starting...')
    
    // Step 1: Check current database schema
    console.log('📋 Step 1: Checking database schema...')
    try {
      const enumValues = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
      `
      console.log('📋 Current VideoModel enum values:', enumValues)
      
      const hasWan25 = enumValues.some(item => item.enum_value === 'WAN_2_5')
      if (hasWan25) {
        console.log('✅ WAN_2_5 exists in VideoModel enum')
      } else {
        console.log('❌ WAN_2_5 missing from VideoModel enum')
        console.log('🔧 Adding WAN_2_5 to VideoModel enum...')
        await prisma.$executeRaw`ALTER TYPE "VideoModel" ADD VALUE 'WAN_2_5'`
        console.log('✅ WAN_2_5 added to VideoModel enum')
      }
    } catch (error) {
      console.log('⚠️ Could not check enum values:', error.message)
    }
    
    // Step 2: Test UserPreferences table
    console.log('📋 Step 2: Checking UserPreferences table...')
    try {
      const count = await prisma.userPreferences.count()
      console.log('✅ UserPreferences table exists')
      console.log(`📊 Found ${count} preference records`)
    } catch (error) {
      console.log('❌ UserPreferences table issues:', error.message)
    }
    
    // Step 3: Test creating preferences with WAN_2_5 using raw SQL
    console.log('📋 Step 3: Testing WAN_2_5 with raw SQL...')
    try {
      // Create a test user
      const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          name: 'Test User',
        }
      })
      
      // Test with raw SQL to avoid TypeScript issues
      await prisma.$executeRaw`
        INSERT INTO "UserPreferences" (
          "id", "userId", "aspectRatio", "textToImageModel", "imageToImageModel", "videoModel", "createdAt", "updatedAt"
        ) VALUES (
          gen_random_uuid()::text,
          ${testUser.id},
          'SQUARE',
          'SEEDREAM_V4',
          'SEEDREAM_V4_EDIT',
          'WAN_2_5',
          NOW(),
          NOW()
        )
        ON CONFLICT ("userId") DO UPDATE SET
          "videoModel" = 'WAN_2_5',
          "updatedAt" = NOW()
      `
      
      console.log('✅ Successfully created preferences with WAN_2_5')
      
      // Clean up
      await prisma.$executeRaw`DELETE FROM "UserPreferences" WHERE "userId" = ${testUser.id}`
      await prisma.user.deleteMany({ where: { email: 'test@example.com' } })
      console.log('🧹 Cleaned up test data')
      
    } catch (error) {
      console.error('❌ Failed to test WAN_2_5:', error.message)
      return false
    }
    
    console.log('✅ Database schema is correct!')
    console.log('💡 The issue is that the Prisma client needs to be regenerated.')
    console.log('🔧 Next steps:')
    console.log('   1. Run: npx prisma generate')
    console.log('   2. Restart the application')
    console.log('   3. Test the preferences API')
    
    return true
    
  } catch (error) {
    console.error('❌ Production fix failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
productionFix()
  .then((success) => {
    if (success) {
      console.log('✅ Production fix completed successfully!')
      process.exit(0)
    } else {
      console.log('❌ Production fix failed!')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('❌ Production fix execution failed:', error)
    process.exit(1)
  })
