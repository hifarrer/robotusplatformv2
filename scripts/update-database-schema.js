const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function updateDatabaseSchema() {
  try {
    console.log('🔧 Updating database schema to include IMAGE_UPSCALE...')
    
    // This script will help identify and fix the schema issue
    console.log('📋 Current GenerationType enum values in schema:')
    console.log('- TEXT_TO_IMAGE')
    console.log('- IMAGE_TO_IMAGE') 
    console.log('- TEXT_TO_VIDEO')
    console.log('- IMAGE_TO_VIDEO')
    console.log('- LIPSYNC')
    console.log('- IMAGE_UPSCALE')
    
    console.log('\n🔍 Testing database connection...')
    
    // Test if we can create a generation with IMAGE_UPSCALE
    try {
      const testChat = await prisma.chat.create({
        data: {
          userId: 'test-schema-user',
          title: 'Schema Test'
        }
      })
      
      const testMessage = await prisma.message.create({
        data: {
          chatId: testChat.id,
          role: 'ASSISTANT',
          content: 'Test'
        }
      })
      
      const generation = await prisma.generation.create({
        data: {
          messageId: testMessage.id,
          type: 'IMAGE_UPSCALE',
          status: 'PENDING',
          prompt: 'Test',
          provider: 'test',
          model: 'test'
        }
      })
      
      console.log('✅ IMAGE_UPSCALE works in database!')
      
      // Clean up
      await prisma.generation.delete({ where: { id: generation.id } })
      await prisma.message.delete({ where: { id: testMessage.id } })
      await prisma.chat.delete({ where: { id: testChat.id } })
      
    } catch (error) {
      console.error('❌ IMAGE_UPSCALE not available in database:', error.message)
      console.log('\n🔧 To fix this, run one of these commands:')
      console.log('   npx prisma db push')
      console.log('   or')
      console.log('   npx prisma migrate dev')
      console.log('   or')
      console.log('   npx prisma migrate deploy')
    }
    
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

updateDatabaseSchema()
