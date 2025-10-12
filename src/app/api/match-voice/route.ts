import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { matchVoiceWithAI } from '@/lib/voice-utils'

interface Voice {
  language: string
  voice_id: string
  gender: string
  age: string
  description: string
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { description, gender, language = 'English' } = await request.json()

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 })
    }

    const voiceId = await matchVoiceWithAI(description, gender, language)

    return NextResponse.json({ 
      voiceId,
      language
    })

  } catch (error: any) {
    console.error('Voice matching error:', error)
    
    // Fallback to default voice
    return NextResponse.json({ 
      voiceId: 'English_compelling_lady1',
      language: 'English'
    })
  }
}
