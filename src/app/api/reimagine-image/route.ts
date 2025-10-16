import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { downloadAndSaveImage } from '@/lib/media-storage'
import { checkAndDeductCreditsForGeneration, refundCredits } from '@/lib/credit-manager'
import { WavespeedService } from '@/lib/ai-services'
import { pollForResult } from '@/lib/ai-services'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, chatId } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Check and deduct credits before generation
    const creditResult = await checkAndDeductCreditsForGeneration(
      session.user.id,
      'IMAGE_REIMAGINE'
    )

    if (!creditResult.success) {
      return NextResponse.json(
        { 
          error: creditResult.error || 'Insufficient credits',
          required: creditResult.cost,
        },
        { status: 402 }
      )
    }

    console.log(`💳 Credits deducted: ${creditResult.cost}, New balance: ${creditResult.newBalance}`)

    // Create or get chat
    let chat
    if (chatId) {
      chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id,
        },
      })
    }
    
    if (!chat) {
      chat = await prisma.chat.create({
        data: {
          userId: session.user.id,
          title: 'Image Reimagining',
        },
      })
    }

    // Create assistant message for the reimagine operation
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'ASSISTANT',
        content: `I'm reimagining your image with creative AI variations. This will take a few moments... (${creditResult.cost} credits used)`,
      },
    })

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        messageId: assistantMessage.id,
        type: 'IMAGE_REIMAGINE',
        status: 'PENDING',
        prompt: 'reimagine this picture',
        provider: 'wavespeed',
        model: 'higgsfield/soul/image-to-image',
        metadata: {
          originalImageUrl: imageUrl,
          creditsUsed: creditResult.cost
        }
      }
    })

    try {
      // Update status to processing
      await prisma.generation.update({
        where: { id: generation.id },
        data: { status: 'PROCESSING' }
      })

      // Call WAVESPEED.ai service to reimagine the image
      console.log('🎨 Starting image reimagining with WAVESPEED.ai...')
      const requestId = await WavespeedService.reimagineImage(imageUrl)
      console.log('🎨 Reimagine request started with ID:', requestId)

      // Update generation with requestId
      await prisma.generation.update({
        where: { id: generation.id },
        data: { requestId }
      })

      // Poll for result
      console.log('🔄 Polling for reimagine result...')
      const result = await pollForResult(
        () => WavespeedService.getResult(requestId),
        (response) => response.data.status === 'completed',
        120, // 120 attempts * 2 seconds = 4 minutes max
        2000 // 2 seconds interval
      )

      if (result.data.status !== 'completed' || !result.data.outputs || result.data.outputs.length === 0) {
        throw new Error('Image reimagining failed or no output received')
      }

      const reimaginedImageUrl = result.data.outputs[0]
      console.log('✅ Image reimagined successfully:', reimaginedImageUrl)

      // Update generation with result
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          resultUrl: reimaginedImageUrl,
          resultUrls: [reimaginedImageUrl]
        }
      })

      // Download and save the reimagined image
      let savedImageId: string | undefined
      try {
        savedImageId = await downloadAndSaveImage(
          session.user.id,
          reimaginedImageUrl,
          `Reimagined Image - ${new Date().toLocaleDateString()}`,
          generation.id,
          'Reimagined Image'
        )
        console.log('✅ Reimagined image saved successfully')
      } catch (saveError) {
        console.error('Error saving reimagined image:', saveError)
        // Don't throw - the reimagining succeeded, just saving failed
      }

      // Get the updated assistant message with generations
      const updatedAssistantMessage = await prisma.message.findUnique({
        where: { id: assistantMessage.id },
        include: { generations: true },
      })

      return NextResponse.json({
        success: true,
        chatId: chat.id,
        messageId: assistantMessage.id,
        generationId: generation.id,
        imageUrl: reimaginedImageUrl,
        savedImageId: savedImageId,
        creditsUsed: creditResult.cost,
        creditsRemaining: creditResult.newBalance,
        generations: updatedAssistantMessage?.generations || [],
        isReimagining: true,
        response: 'Here\'s your reimagined image! I\'ve created a new creative variation of your original image.'
      })

    } catch (error: any) {
      console.error('Image reimagining error:', error)
      
      // Update generation status to failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Image reimagining failed'
        }
      })

      // Refund credits on failure
      await refundCredits(
        session.user.id,
        creditResult.cost,
        `Refund for failed image reimagining: ${imageUrl}`
      )

      return NextResponse.json({ 
        error: error.message || 'Failed to reimagine image' 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Image reimagining error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to reimagine image' 
    }, { status: 500 })
  }
}

