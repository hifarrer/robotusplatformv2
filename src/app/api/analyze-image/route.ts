import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { analyzeImageForVideoPrompt } from '@/lib/ai-orchestrator'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { imageUrl } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      )
    }

    console.log('🎬 Analyzing image for video prompt:', imageUrl)
    
    const videoPrompt = await analyzeImageForVideoPrompt(imageUrl)
    
    return NextResponse.json({ 
      success: true, 
      videoPrompt 
    })
  } catch (error: any) {
    console.error('Error analyzing image:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image', details: error?.message },
      { status: 500 }
    )
  }
}
