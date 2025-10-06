import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { KieService, WanService } from '@/lib/ai-services'
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
    
    let taskId: string
    let generation
    
    if (model === 'WAN_2_5') {
      // Use WAN-2.5 service for Alibaba model
      if (!imageUrls || imageUrls.length === 0) {
        return NextResponse.json(
          { error: 'Image URL is required for WAN-2.5 model' },
          { status: 400 }
        )
      }
      
      taskId = await WanService.generateVideo(
        prompt,
        imageUrls[0],
        duration || 5,
        '720p'
      )
      
      // Create generation record for WAN-2.5
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
    } else {
      // Use KIE service for other models
      const singleImageUrl = imageUrls && imageUrls.length > 0 ? [imageUrls[0]] : undefined
      console.log('🎬 Using single image for KIE:', singleImageUrl)
      
      taskId = await KieService.generateVideo(
        prompt,
        singleImageUrl,
        model || 'VEO3_FAST',
        aspectRatio || 'WIDE'
      )
      
      // Create generation record for KIE
      if (messageId) {
        generation = await prisma.generation.create({
          data: {
            messageId: messageId,
            type: 'IMAGE_TO_VIDEO',
            status: 'PROCESSING',
            prompt: prompt,
            provider: 'kie',
            model: model || 'VEO3_FAST',
            requestId: taskId,
          },
        })
      }
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
