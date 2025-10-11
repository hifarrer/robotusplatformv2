import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Checking and fixing database schema...')
    
    // Check if IMAGE_UPSCALE exists in the database
    console.log('🔍 Testing IMAGE_UPSCALE generation type...')
    
    // Create a test chat and message
    const testChat = await prisma.chat.create({
      data: {
        userId: 'schema-test-user',
        title: 'Schema Test Chat'
      }
    })
    
    const testMessage = await prisma.message.create({
      data: {
        chatId: testChat.id,
        role: 'ASSISTANT',
        content: 'Schema test message'
      }
    })
    
    try {
      // Try to create a generation with IMAGE_UPSCALE
      const generation = await prisma.generation.create({
        data: {
          messageId: testMessage.id,
          type: 'IMAGE_UPSCALE',
          status: 'PENDING',
          prompt: 'Test upscale prompt',
          provider: 'wavespeed',
          model: 'image-upscaler'
        }
      })
      
      console.log('✅ IMAGE_UPSCALE type works!')
      
      // Clean up
      await prisma.generation.delete({ where: { id: generation.id } })
      await prisma.message.delete({ where: { id: testMessage.id } })
      await prisma.chat.delete({ where: { id: testChat.id } })
      
    } catch (error: any) {
      console.error('❌ IMAGE_UPSCALE type failed:', error.message)
      
      if (error.message.includes('Invalid value for argument `type`')) {
        console.log('🔧 Database schema is out of sync. You need to run:')
        console.log('   npx prisma db push')
        console.log('   or')
        console.log('   npx prisma migrate deploy')
      }
    }
    
  } catch (error) {
    console.error('Error fixing database schema:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixDatabaseSchema()
