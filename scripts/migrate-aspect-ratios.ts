// Migration script to update ULTRAWIDE aspect ratios to WIDE
// NOTE: This script is no longer needed as ULTRAWIDE has been removed from the system
// This script was used to migrate existing ULTRAWIDE users to WIDE before removal

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAspectRatios() {
  try {
    console.log('Starting migration of ULTRAWIDE aspect ratios...')
    
    // Update all ULTRAWIDE preferences to WIDE
    const result = await prisma.$executeRaw`
      UPDATE "UserPreferences" 
      SET "aspectRatio" = 'WIDE' 
      WHERE "aspectRatio" = 'ULTRAWIDE'
    `
    
    console.log(`Migration completed. Updated ${result} records.`)
  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateAspectRatios()
    .then(() => {
      console.log('Migration successful!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Migration failed:', error)
      process.exit(1)
    })
}

export { migrateAspectRatios }