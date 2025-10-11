import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { WanService } from '@/lib/ai-services'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { prompt, imageUrls, model, aspectRatio, duration, messageId } = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🎬 Generating video with prompt:', prompt)
    console.log('🎬 Image URLs:', imageUrls)
    console.log('🎬 Model:', model)
    console.log('🎬 Aspect Ratio:', aspectRatio)
    console.log('🎬 Duration:', duration)
    console.log('🎬 Message ID:', messageId)
    
    // Only WAN-2.5 model is supported now
    if (!imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Image URL is required for video generation' },
        { status: 400 }
      )
    }
    
    const taskId = await WanService.generateVideo(
      prompt,
      imageUrls[0],
      duration || 5,
      '720p'
    )
    
    // Create generation record
    let generation
    if (messageId) {
      generation = await prisma.generation.create({
        data: {
          messageId: messageId,
          type: 'IMAGE_TO_VIDEO',
          status: 'PROCESSING',
          prompt: prompt,
          provider: 'wavespeed',
          model: 'wan-2.5',
          requestId: taskId,
        },
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      taskId,
      generation: generation || null
    })
  } catch (error: any) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { error: 'Failed to generate video', details: error?.message },
      { status: 500 }
    )
  }
}
