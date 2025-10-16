import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { downloadAndSaveImage } from '@/lib/media-storage'
import { checkAndDeductCreditsForGeneration, refundCredits } from '@/lib/credit-manager'
import { FalService } from '@/lib/ai-services'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, chatId, messageId } = await request.json()

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Check and deduct credits before generation
    const creditResult = await checkAndDeductCreditsForGeneration(
      session.user.id,
      'IMAGE_ENHANCEMENT'
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

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        messageId,
        type: 'IMAGE_ENHANCEMENT',
        status: 'PENDING',
        prompt: `Enhance image with face and skin details: ${imageUrl}`,
        provider: 'fal-ai',
        model: 'topaz/upscale/image',
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

      // Call FAL.ai service to enhance the image
      console.log('🎨 Starting image enhancement with FAL.ai...')
      const enhancedImageUrl = await FalService.enhanceImage(imageUrl)
      console.log('✅ Image enhanced successfully:', enhancedImageUrl)

      // Update generation with result
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          resultUrl: enhancedImageUrl,
          resultUrls: [enhancedImageUrl]
        }
      })

      // Download and save the enhanced image using the same method as other endpoints
      let savedImageId: string | undefined
      try {
        savedImageId = await downloadAndSaveImage(
          session.user.id,
          enhancedImageUrl,
          `Enhanced Image - ${new Date().toLocaleDateString()}`,
          generation.id,
          'Enhanced Image'
        )
        console.log('✅ Enhanced image saved successfully')
      } catch (saveError) {
        console.error('Error saving enhanced image:', saveError)
        // Don't throw - the enhancement succeeded, just saving failed
      }

      return NextResponse.json({
        success: true,
        generationId: generation.id,
        imageUrl: enhancedImageUrl,
        savedImageId: savedImageId,
        creditsUsed: creditResult.cost,
        creditsRemaining: creditResult.newBalance
      })

    } catch (error: any) {
      console.error('Image enhancement error:', error)
      
      // Update generation status to failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: error.message || 'Image enhancement failed'
        }
      })

      // Refund credits on failure
      await refundCredits(
        session.user.id,
        creditResult.cost,
        `Refund for failed image enhancement: ${imageUrl}`
      )

      return NextResponse.json({ 
        error: error.message || 'Failed to enhance image' 
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Image enhancement error:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to enhance image' 
    }, { status: 500 })
  }
}

