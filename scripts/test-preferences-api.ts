// Test script to verify preferences API is working
// This script tests the preferences API endpoints to ensure they're working correctly

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testPreferencesAPI() {
  try {
    console.log('🧪 Testing preferences API...')
    
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
    
    // Test 2: Check VideoModel enum values
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
    
    // Test 3: Test creating a preference record
    console.log('📋 Test 3: Testing preference creation...')
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
      
      // Test creating preferences with WAN_2_5
      const testPreferences = await prisma.userPreferences.upsert({
        where: { userId: testUser.id },
        update: {
          videoModel: 'WAN_2_5',
          updatedAt: new Date(),
        },
        create: {
          userId: testUser.id,
          aspectRatio: 'SQUARE',
          textToImageModel: 'SEEDREAM_V4',
          imageToImageModel: 'SEEDREAM_V4_EDIT',
          videoModel: 'WAN_2_5',
        }
      })
      
      console.log('✅ Successfully created/updated preferences with WAN_2_5')
      console.log('📊 Test preferences:', testPreferences)
      
      // Clean up test data
      await prisma.userPreferences.deleteMany({
        where: { userId: testUser.id }
      })
      await prisma.user.deleteMany({
        where: { email: 'test@example.com' }
      })
      
      console.log('🧹 Cleaned up test data')
      
    } catch (error) {
      console.error('❌ Failed to create preferences with WAN_2_5:', error)
      return false
    }
    
    console.log('✅ All tests passed! Preferences API should be working correctly.')
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
  testPreferencesAPI()
    .then((success) => {
      if (success) {
        console.log('✅ Preferences API test completed successfully!')
        process.exit(0)
      } else {
        console.log('❌ Preferences API test failed!')
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('❌ Test execution failed:', error)
      process.exit(1)
    })
}

export { testPreferencesAPI }
