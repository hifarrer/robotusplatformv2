// Simple test script to verify preferences API without TypeScript compilation issues
// This script uses raw SQL to test the database directly

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function simpleTestPreferences() {
  try {
    console.log('🧪 Simple preferences API test...')
    
    // Test 1: Check if UserPreferences table exists
    console.log('📋 Test 1: Checking UserPreferences table...')
    try {
      const count = await prisma.userPreferences.count()
      console.log('✅ UserPreferences table exists')
      console.log(`📊 Found ${count} preference records`)
    } catch (error) {
      console.error('❌ UserPreferences table does not exist or has issues:', error)
      return false
    }
    
    // Test 2: Check VideoModel enum values using raw SQL
    console.log('📋 Test 2: Checking VideoModel enum...')
    try {
      const enumValues = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
      `
      console.log('📋 VideoModel enum values:', enumValues)
      
      const hasWan25 = (enumValues as any[]).some((item: any) => item.enum_value === 'WAN_2_5')
      if (hasWan25) {
        console.log('✅ WAN_2_5 exists in VideoModel enum')
      } else {
        console.log('❌ WAN_2_5 missing from VideoModel enum')
        return false
      }
    } catch (error) {
      console.error('❌ Could not check VideoModel enum:', error)
      return false
    }
    
    // Test 3: Test creating a preference record using raw SQL
    console.log('📋 Test 3: Testing preference creation with raw SQL...')
    try {
      // Create a test user if it doesn't exist
      const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {},
        create: {
          email: 'test@example.com',
          name: 'Test User',
        }
      })
      
      // Test creating preferences with WAN_2_5 using raw SQL
      const result = await prisma.$executeRaw`
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
        RETURNING *
      `
      
      console.log('✅ Successfully created/updated preferences with WAN_2_5 using raw SQL')
      
      // Clean up test data
      await prisma.$executeRaw`
        DELETE FROM "UserPreferences" WHERE "userId" = ${testUser.id}
      `
      await prisma.user.deleteMany({
        where: { email: 'test@example.com' }
      })
      
      console.log('🧹 Cleaned up test data')
      
    } catch (error) {
      console.error('❌ Failed to create preferences with WAN_2_5:', error)
      return false
    }
    
    console.log('✅ All tests passed! Database schema is correct.')
    console.log('💡 The issue is likely that the Prisma client needs to be regenerated.')
    return true
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    return false
  } finally {
    await prisma.$disconnect()
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  simpleTestPreferences()
    .then((success) => {
      if (success) {
        console.log('✅ Simple preferences test completed successfully!')
        console.log('🔧 Next step: Run "npx prisma generate" to fix the Prisma client')
        process.exit(0)
      } else {
        console.log('❌ Simple preferences test failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error)
      process.exit(1)
    })
}

export { simpleTestPreferences }
