import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { saveFile } from '@/lib/media-storage'
import { matchVoiceWithAI } from '@/lib/voice-utils'
import { checkAndDeductCreditsForGeneration, refundCredits } from '@/lib/credit-manager'

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

    const { text, voiceId, language = 'English', chatId, messageId } = await request.json()

    if (!text || !voiceId) {
      return NextResponse.json({ error: 'Text and voiceId are required' }, { status: 400 })
    }

    // Estimate audio duration (rough estimate: ~150 words per minute for speech)
    const words = text.split(' ').length
    const estimatedDuration = Math.ceil((words / 150) * 60)

    // Check and deduct credits before generation
    const creditResult = await checkAndDeductCreditsForGeneration(
      session.user.id,
      'TEXT_TO_AUDIO',
      estimatedDuration
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
        type: 'TEXT_TO_AUDIO',
        status: 'PENDING',
        prompt: text,
        provider: 'wavespeed',
        model: 'minimax/speech-02-hd',
        metadata: {
          voiceId,
          language,
          text,
          creditsUsed: creditResult.cost
        }
      }
    })

    // Generate audio using Wavespeed API
    const wavespeedResponse = await fetch('https://api.wavespeed.ai/api/v3/minimax/speech-02-hd', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`
      },
      body: JSON.stringify({
        emotion: 'happy',
        enable_sync_mode: false,
        english_normalization: false,
        pitch: 0,
        speed: 1,
        text: text,
        voice_id: voiceId,
        volume: 1
      })
    })

    if (!wavespeedResponse.ok) {
      const errorText = await wavespeedResponse.text()
      console.error('Wavespeed API error:', errorText)
      
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: `Wavespeed API error: ${errorText}`
        }
      })

      return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 })
    }

    const wavespeedData = await wavespeedResponse.json()
    console.log('Wavespeed response:', wavespeedData)

    // Update generation with request ID
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        requestId: wavespeedData.request_id || wavespeedData.id,
        status: 'PROCESSING'
      }
    })

    // Poll for completion
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max
    let audioUrl = null

    while (attempts < maxAttempts && !audioUrl) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
      attempts++

      try {
        const statusResponse = await fetch(`https://api.wavespeed.ai/api/v3/minimax/speech-02-hd/${wavespeedData.request_id || wavespeedData.id}`, {
          headers: {
            'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`
          }
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()
          console.log('Status check:', statusData)

          if (statusData.status === 'completed' && statusData.result_url) {
            audioUrl = statusData.result_url
            break
          } else if (statusData.status === 'failed') {
            throw new Error('Audio generation failed')
          }
        }
      } catch (error) {
        console.error('Status check error:', error)
        if (attempts >= maxAttempts) {
          throw error
        }
      }
    }

    if (!audioUrl) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: 'Audio generation timed out'
        }
      })
      
      // Refund credits on failure
      await refundCredits(
        session.user.id,
        creditResult.cost,
        `Refund for failed audio generation: ${text.substring(0, 50)}...`
      )
      
      return NextResponse.json({ error: 'Audio generation timed out' }, { status: 500 })
    }

    // Download and save the audio file
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio')
    }

    const audioBuffer = await audioResponse.arrayBuffer()
    const fileName = `audio_${Date.now()}.mp3`
    const localPath = await saveFile(audioBuffer, fileName, 'audio')

    // Update generation with result
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: 'COMPLETED',
        resultUrl: audioUrl,
        resultUrls: [audioUrl]
      }
    })

    // Save audio to user's collection
    const savedAudio = await prisma.savedAudio.create({
      data: {
        userId: session.user.id,
        title: `Audio: ${text.substring(0, 50)}...`,
        prompt: text,
        originalUrl: audioUrl,
        localPath: localPath,
        fileName: fileName,
        fileSize: audioBuffer.byteLength,
        voiceId: voiceId,
        language: language,
        mimeType: 'audio/mpeg',
        generationId: generation.id
      }
    })

    return NextResponse.json({
      success: true,
      generationId: generation.id,
      audioUrl: audioUrl,
      localPath: localPath,
      savedAudioId: savedAudio.id,
      creditsUsed: creditResult.cost,
      creditsRemaining: creditResult.newBalance
    })

  } catch (error: any) {
    console.error('Audio generation error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate audio' }, { status: 500 })
  }
}

