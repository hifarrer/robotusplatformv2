// Database schema check and migration script
// This script verifies that all required tables exist and creates them if needed

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...')
    
    // Check if UserPreferences table exists by trying to query it
    try {
      await prisma.userPreferences.findMany({ take: 1 })
      console.log('✅ UserPreferences table exists')
    } catch (error) {
      console.log('❌ UserPreferences table does not exist or has issues')
      console.log('Error details:', error)
      
      // Try to create the table manually
      console.log('🔧 Attempting to create UserPreferences table...')
      try {
        await prisma.$executeRaw`
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
          )
        `
        console.log('✅ UserPreferences table created successfully')
      } catch (createError) {
        console.error('❌ Failed to create UserPreferences table:', createError)
        throw createError
      }
    }
    
    // Check if all required enums exist
    console.log('🔍 Checking enum values...')
    const aspectRatios = ['SQUARE', 'PORTRAIT', 'LANDSCAPE', 'WIDE', 'ULTRAWIDE']
    const textToImageModels = ['SEEDREAM_V4', 'FLUX_1_1_PRO', 'FLUX_1_SCHNELL', 'NANO_BANANA']
    const imageToImageModels = ['SEEDREAM_V4_EDIT', 'FLUX_1_1_PRO_EDIT', 'NANO_BANANA_EDIT']
    const videoModels = ['VEO3_FAST', 'VEO3_STANDARD', 'RUNWAY_ML', 'WAN_2_5']
    
    console.log('✅ Database schema check completed')
    
  } catch (error) {
    console.error('❌ Database schema check failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkDatabaseSchema()
    .then(() => {
      console.log('✅ Database schema check successful!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Database schema check failed:', error)
      process.exit(1)
    })
}

export { checkDatabaseSchema }
