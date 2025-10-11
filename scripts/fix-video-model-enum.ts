// Migration script to fix VideoModel enum
// This script adds the missing WAN_2_5 value to the VideoModel enum in production

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixVideoModelEnum() {
  try {
    console.log('🔧 Fixing VideoModel enum in production database...')
    
    // First, check if the enum already has WAN_2_5
    try {
      const testQuery = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
      `
      console.log('📋 Current VideoModel enum values:', testQuery)
      
      const hasWan25 = (testQuery as any[]).some((item: any) => item.enum_value === 'WAN_2_5')
      
      if (hasWan25) {
        console.log('✅ WAN_2_5 already exists in VideoModel enum')
        return
      }
    } catch (error) {
      console.log('⚠️ Could not check enum values, proceeding with fix...')
    }
    
    // Add WAN_2_5 to the VideoModel enum
    console.log('🔧 Adding WAN_2_5 to VideoModel enum...')
    await prisma.$executeRaw`
      ALTER TYPE "VideoModel" ADD VALUE 'WAN_2_5'
    `
    
    console.log('✅ Successfully added WAN_2_5 to VideoModel enum')
    
    // Verify the fix
    const updatedEnum = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
    `
    console.log('📋 Updated VideoModel enum values:', updatedEnum)
    
  } catch (error) {
    console.error('❌ Failed to fix VideoModel enum:', error)
    
    // Check if the error is because the value already exists
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('✅ WAN_2_5 already exists in VideoModel enum')
      return
    }
    
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixVideoModelEnum()
    .then(() => {
      console.log('✅ VideoModel enum fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ VideoModel enum fix failed:', error)
      process.exit(1)
    })
}

export { fixVideoModelEnum }
