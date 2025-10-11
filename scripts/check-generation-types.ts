import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkGenerationTypes() {
  try {
    console.log('🔍 Checking GenerationType enum values...')
    
    // Try to create a test generation with each type
    const types = [
      'TEXT_TO_IMAGE',
      'IMAGE_TO_IMAGE', 
      'TEXT_TO_VIDEO',
      'IMAGE_TO_VIDEO',
      'LIPSYNC',
      'IMAGE_UPSCALE'
    ]
    
    for (const type of types) {
      try {
        console.log(`Testing ${type}...`)
        
        // Create a test chat and message first
        const testChat = await prisma.chat.create({
          data: {
            userId: 'test-user',
            title: 'Test Chat'
          }
        })
        
        const testMessage = await prisma.message.create({
          data: {
            chatId: testChat.id,
            role: 'ASSISTANT',
            content: 'Test message'
          }
        })
        
        // Try to create a generation with this type
        const generation = await prisma.generation.create({
          data: {
            messageId: testMessage.id,
            type: type as any,
            status: 'PENDING',
            prompt: 'Test prompt',
            provider: 'test',
            model: 'test-model'
          }
        })
        
        console.log(`✅ ${type} works!`)
        
        // Clean up
        await prisma.generation.delete({ where: { id: generation.id } })
        await prisma.message.delete({ where: { id: testMessage.id } })
        await prisma.chat.delete({ where: { id: testChat.id } })
        
      } catch (error: any) {
        console.error(`❌ ${type} failed:`, error.message)
      }
    }
    
  } catch (error) {
    console.error('Error checking generation types:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkGenerationTypes()
