// Script to fix Prisma client sync issues
// This script regenerates the Prisma client and pushes schema changes

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixPrismaClient() {
  try {
    console.log('🔧 Fixing Prisma client sync issues...')
    
    // Step 1: Check current database schema
    console.log('📋 Checking current database schema...')
    try {
      const enumValues = await prisma.$queryRaw`
        SELECT unnest(enum_range(NULL::"VideoModel")) as enum_value
      `
      console.log('📋 Current VideoModel enum values:', enumValues)
    } catch (error) {
      console.log('⚠️ Could not check enum values:', error)
    }
    
    // Step 2: Generate Prisma client
    console.log('🔧 Generating Prisma client...')
    try {
      // First, clean the generated client
      console.log('🧹 Cleaning existing Prisma client...')
      try {
        execSync('rm -rf node_modules/.prisma', { stdio: 'inherit' })
      } catch (cleanError) {
        console.log('⚠️ Could not clean existing client (this is usually fine)')
      }
      
      // Generate new client
      execSync('npx prisma generate', { stdio: 'inherit' })
      console.log('✅ Prisma client generated successfully')
    } catch (error) {
      console.error('❌ Failed to generate Prisma client:', error)
      throw error
    }
    
    // Step 3: Push schema to database (if needed)
    console.log('🔧 Pushing schema to database...')
    try {
      execSync('npx prisma db push', { stdio: 'inherit' })
      console.log('✅ Database schema pushed successfully')
    } catch (error) {
      console.error('❌ Failed to push schema:', error)
      // Don't throw here as the schema might already be correct
    }
    
    // Step 4: Test the connection
    console.log('🧪 Testing Prisma connection...')
    try {
      await prisma.$connect()
      console.log('✅ Prisma connection successful')
      
      // Test a simple query
      const userCount = await prisma.user.count()
      console.log(`📊 Found ${userCount} users in database`)
      
    } catch (error) {
      console.error('❌ Prisma connection failed:', error)
      throw error
    }
    
    console.log('✅ Prisma client fix completed successfully!')
    
  } catch (error) {
    console.error('❌ Failed to fix Prisma client:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix if this script is executed directly
if (require.main === module) {
  fixPrismaClient()
    .then(() => {
      console.log('✅ Prisma client fix completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Prisma client fix failed:', error)
      process.exit(1)
    })
}

export { fixPrismaClient }
