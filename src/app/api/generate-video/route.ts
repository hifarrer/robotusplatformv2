import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { KieService } from '@/lib/ai-services'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { prompt, imageUrls, model, aspectRatio } = await request.json()
    
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
    
    // KIE API only accepts one image, so take the first one
    const singleImageUrl = imageUrls && imageUrls.length > 0 ? [imageUrls[0]] : undefined
    console.log('🎬 Using single image for KIE:', singleImageUrl)
    
    const taskId = await KieService.generateVideo(
      prompt,
      singleImageUrl,
      model || 'VEO3_FAST',
      aspectRatio || 'WIDE'
    )
    
    return NextResponse.json({ 
      success: true, 
      taskId 
    })
  } catch (error: any) {
    console.error('Error generating video:', error)
    return NextResponse.json(
      { error: 'Failed to generate video', details: error?.message },
      { status: 500 }
    )
  }
}
