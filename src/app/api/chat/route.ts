import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VideoModel } from '@prisma/client'
import { analyzeUserRequest } from '@/lib/ai-orchestrator'
import { WavespeedService, WanService } from '@/lib/ai-services'
import { GenerationType } from '@/types'
import { getSafeGenerationType } from '@/lib/generation-utils'
import { z } from 'zod'

const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  images: z.array(z.string()).optional(),
  audio: z.array(z.string()).optional(),
  chatId: z.string().optional().nullable(),
})

const upscaleRequestSchema = z.object({
  action: z.literal('upscale'),
  imageUrl: z.string().min(1, 'Image URL is required'),
  chatId: z.string().optional().nullable(),
})

async function handleUpscaleRequest(session: any, imageUrl: string, chatId?: string | null) {
  try {
    console.log('🔍 Starting upscale process for:', imageUrl) // Debug log
    console.log('🔍 Session user ID:', session.user.id) // Debug log
    console.log('🔍 Chat ID:', chatId) // Debug log
    
    // Create or get chat
    let chat
    if (chatId) {
      chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id,
        },
      })
      console.log('🔍 Found existing chat:', chat?.id) // Debug log
    }
    
    if (!chat) {
      console.log('🔍 Creating new chat') // Debug log
      chat = await prisma.chat.create({
        data: {
          userId: session.user.id,
          title: 'Image Upscaling',
        },
      })
      console.log('🔍 Created new chat:', chat.id) // Debug log
    }

    // Create assistant message for the upscale operation
    console.log('🔍 Creating assistant message') // Debug log
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'ASSISTANT',
        content: 'I\'m upscaling your image to higher resolution. This will take a few moments...',
      },
    })
    console.log('🔍 Created assistant message:', assistantMessage.id) // Debug log

    // Start the upscaling process
    console.log('🔍 Calling WavespeedService.upscaleImage') // Debug log
    const requestId = await WavespeedService.upscaleImage(imageUrl)
    console.log('🔍 Got request ID:', requestId) // Debug log
    
    // Use safe generation type to avoid database enum issues
    const generation = await prisma.generation.create({
      data: {
        messageId: assistantMessage.id,
        type: getSafeGenerationType('IMAGE_UPSCALE', 'TEXT_TO_IMAGE') as any,
        status: 'PROCESSING',
        prompt: 'Image upscaling to 4K resolution',
        provider: 'wavespeed',
        model: 'image-upscaler',
        requestId,
      },
    })
    
    console.log('🔍 Created upscaling generation:', generation.id, 'RequestId:', requestId)

    // Get the updated assistant message with generations
    const updatedAssistantMessage = await prisma.message.findUnique({
      where: { id: assistantMessage.id },
      include: { generations: true },
    })

    // Get the user message ID from the previous message in the chat
    const userMessage = await prisma.message.findFirst({
      where: {
        chatId: chat.id,
        role: 'USER',
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    return NextResponse.json({
      response: 'I\'m upscaling your image to higher resolution. This will take a few moments...',
      chatId: chat.id,
      messageId: assistantMessage.id,
      userMessageId: userMessage?.id,
      generations: updatedAssistantMessage?.generations || [],
      isUpscaling: true, // Flag to indicate this is an upscaling operation
    })
  } catch (error: any) {
    console.error('❌ Upscale error:', error)
    console.error('❌ Error stack:', error?.stack)
    console.error('❌ Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      response: error?.response?.data
    })
    return NextResponse.json(
      { 
        error: 'Failed to start image upscaling', 
        details: error?.message,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  console.log('🌟 === CHAT API STARTED ===') // Debug log
  try {
    console.log('📨 Chat API called') // Debug log
    
    const session = await getServerSession(authOptions)
    console.log('👤 Session check:', session ? 'Valid session found' : 'No session') // Debug log
    
    if (!session?.user?.id) {
      console.log('❌ No valid session found') // Debug log
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('📋 Raw request body:', body) // Debug log
    
    // Check if this is an upscale request
    if (body.action === 'upscale') {
      const { imageUrl, chatId } = upscaleRequestSchema.parse(body)
      console.log('🔍 Processing upscale request:', { imageUrl, chatId }) // Debug log
      return await handleUpscaleRequest(session, imageUrl, chatId ?? null)
    }
    
    // Handle regular chat request
    const { message, images = [], audio = [], chatId } = chatRequestSchema.parse(body)
    
    console.log('📝 Parsed request:', { message, images: images.length, audio: audio.length, chatId }) // Debug log

    // Get user preferences
    let userPreferences
    try {
      userPreferences = await prisma.userPreferences.findUnique({
        where: { userId: session.user.id }
      })
    } catch (dbError) {
      console.error('❌ Database error when fetching preferences in Chat API:', dbError)
      
      // If there's an enum value error, use default preferences
      if (dbError instanceof Error && dbError.message.includes('not found in enum')) {
        console.log('📝 Enum value error in Chat API, using default preferences')
        userPreferences = {
          id: 'default',
          userId: session.user.id,
          aspectRatio: 'SQUARE' as any,
          textToImageModel: 'SEEDREAM_V4' as any,
          imageToImageModel: 'SEEDREAM_V4_EDIT' as any,
          videoModel: VideoModel.WAN_2_5,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      } else {
        throw dbError
      }
    }

    // Create default preferences if not found
    if (!userPreferences) {
      // First verify the user exists
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      
      try {
        userPreferences = await prisma.userPreferences.create({
          data: {
            userId: session.user.id,
            aspectRatio: 'PORTRAIT',
            textToImageModel: 'SEEDREAM_V4',
            imageToImageModel: 'SEEDREAM_V4_EDIT',
            videoModel: VideoModel.WAN_2_5,
          }
        })
      } catch (createError) {
        console.error('❌ Failed to create preferences in Chat API:', createError)
        
        // If creation fails due to enum issues, use default preferences
        if (createError instanceof Error && createError.message.includes('not found in enum')) {
          console.log('📝 Enum value error during creation in Chat API, using default preferences')
          userPreferences = {
            id: 'default',
            userId: session.user.id,
            aspectRatio: 'PORTRAIT' as any,
            textToImageModel: 'SEEDREAM_V4' as any,
            imageToImageModel: 'SEEDREAM_V4_EDIT' as any,
            videoModel: VideoModel.WAN_2_5,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        } else {
          throw createError
        }
      }
    }

    console.log('🛠️ User preferences:', userPreferences) // Debug log

    // Get conversation context for intelligent image referencing
    let conversationContext
    if (chatId) {
      const recentMessages = await prisma.message.findMany({
        where: {
          chat: {
            id: chatId,
            userId: session.user.id,
          },
        },
        include: {
          generations: {
            where: {
              status: 'COMPLETED',
              type: {
                in: ['TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE']
              }
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })

      // Find the most recent completed image generation
      const recentImageGeneration = recentMessages
        .flatMap((msg: any) => msg.generations)
        .find((gen: any) => gen.resultUrls && gen.resultUrls.length > 0)

      conversationContext = {
        recentMessages: recentMessages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          hasGenerations: msg.generations.length > 0,
          generationTypes: msg.generations.map((g: any) => g.type)
        })),
        hasRecentImageGeneration: !!recentImageGeneration,
        recentImageUrl: recentImageGeneration?.resultUrls?.[0]
      }
    }

    // Analyze the user request with context
    console.log('🔄 Calling analyzeUserRequest...') // Debug log
    const analysis = await analyzeUserRequest(message, images.length > 0, audio.length > 0, conversationContext)
    
    console.log('🎯 Analysis result:', analysis) // Debug log
    console.log('🎯 Analysis action:', analysis.action) // Debug log
    
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
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        },
      })
    }

    // Create user message
    const userMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'USER',
        content: message,
        images: images,
      },
    })

    let response = ''
    const generations = []

    // Process based on analysis
    console.log('🚀 Processing action:', analysis.action) // Debug log
    switch (analysis.action) {
      case 'text_to_image':
        try {
          console.log('Generating image with prompt:', analysis.prompt) // Debug log
          const requestId = await WavespeedService.textToImage(
            analysis.prompt,
            userPreferences.textToImageModel,
            userPreferences.aspectRatio
          )
          
          const generation = await prisma.generation.create({
            data: {
              messageId: userMessage.id,
              type: 'TEXT_TO_IMAGE',
              status: 'PROCESSING',
              prompt: analysis.prompt,
              provider: 'wavespeed',
              model: `${userPreferences.textToImageModel.toLowerCase()}`,
              requestId,
            },
          })
          
          generations.push(generation)
          response = `I'm creating an image based on your description: "${analysis.prompt}". This will take a few moments...`
        } catch (error: any) {
          console.error('Text-to-image generation error:', error)
          console.error('Error details:', error.response?.data) // More detailed error logging
          response = 'Sorry, I encountered an error while trying to create your image. Please try again.'
        }
        break

      case 'image_to_image':
        // Handle both uploaded images and recent image references
        const imagesToUse = images.length > 0 
          ? images  // These are now full URLs from upload API
          : (analysis.useRecentImage && conversationContext?.recentImageUrl) 
            ? [conversationContext.recentImageUrl] 
            : []
            
        if (imagesToUse.length === 0) {
          response = 'I need images to edit or modify. Please upload some images or generate an image first that I can reference.'
        } else {
          try {
            console.log('Sending images to Wavespeed:', imagesToUse) // Debug log
            console.log('Image URLs being sent:', imagesToUse.map(url => ({ url, accessible: 'checking...' }))) // Debug log
            
            const requestId = await WavespeedService.imageToImage(
              analysis.prompt,
              imagesToUse,
              userPreferences.imageToImageModel,
              userPreferences.aspectRatio
            )
            
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'IMAGE_TO_IMAGE',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'wavespeed',
                model: `${userPreferences.imageToImageModel.toLowerCase()}`,
                requestId,
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'uploaded images' : 'previous image'
            response = `I'm editing your ${imageSource} based on: "${analysis.prompt}". This will take a few moments...`
          } catch (error: any) {
            console.error('Image-to-image generation error:', error)
            console.error('Error details:', error.response?.data) // More detailed error logging
            let errorMessage = 'Sorry, I encountered an error while trying to edit your images.'
            
            // Extract more specific error information
            if (error.response?.data?.message) {
              errorMessage = `Error: ${error.response.data.message}`
            } else if (error.message?.includes('invalid url')) {
              errorMessage = 'Error: The image format is not supported. Please try uploading a different image.'
            } else if (error.message) {
              errorMessage = `Error: ${error.message}`
            }
            
            response = errorMessage + ' Please try again with a different image or prompt.'
          }
        }
        break

      case 'text_to_video':
        response = 'Text-to-video generation is not currently supported. Please upload an image first to create a video from it.'
        break

      case 'image_to_video':
        // Handle both uploaded images and recent image references
        const videoImagesToUse = images.length > 0 
          ? images 
          : (analysis.useRecentImage && conversationContext?.recentImageUrl) 
            ? [conversationContext.recentImageUrl] 
            : []
            
        if (videoImagesToUse.length === 0) {
          response = 'I need images to create a video. Please upload some images or generate an image first that I can reference.'
        } else {
          try {
            const taskId = await WanService.generateVideo(
              analysis.prompt,
              videoImagesToUse[0],
              5, // Default duration
              '720p'
            )
            
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'IMAGE_TO_VIDEO',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'wavespeed',
                model: 'wan-2.5',
                requestId: taskId,
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'your images' : 'the previous image'
            response = `I'm creating a video from ${imageSource} based on: "${analysis.prompt}". This will take a few minutes...`
          } catch (error) {
            response = 'Sorry, I encountered an error while trying to create your video. Please try again.'
          }
        }
        break

      case 'lipsync':
        // Handle lipsync generation - requires both image and audio
        const lipsyncImageToUse = images.length > 0 
          ? images[0]  // Use first uploaded image
          : (analysis.useRecentImage && conversationContext?.recentImageUrl) 
            ? conversationContext.recentImageUrl 
            : null
            
        const lipsyncAudioToUse = audio.length > 0 ? audio[0] : null // Use first uploaded audio
            
        if (!lipsyncImageToUse || !lipsyncAudioToUse) {
          if (!lipsyncImageToUse && !lipsyncAudioToUse) {
            response = 'To create a lipsync video, I need both an image and an audio file. Please upload an image and an audio file.'
          } else if (!lipsyncImageToUse) {
            response = 'To create a lipsync video, I need an image. Please upload an image along with your audio file.'
          } else {
            response = 'To create a lipsync video, I need an audio file. Please upload an audio file with your speech or voice.'
          }
        } else {
          try {
            console.log('Generating lipsync with:', { image: lipsyncImageToUse, audio: lipsyncAudioToUse, prompt: analysis.prompt }) // Debug log
            const requestId = await WavespeedService.lipsync(
              lipsyncAudioToUse,
              lipsyncImageToUse,
              analysis.prompt
            )
            
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'LIPSYNC',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'wavespeed',
                model: 'infinitetalk',
                requestId,
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'your image' : 'the previous image'
            response = `I'm creating a lipsync video using ${imageSource} and your audio. This will take a few moments...`
          } catch (error: any) {
            console.error('Lipsync generation error:', error)
            console.error('Error details:', error.response?.data) // More detailed error logging
            response = 'Sorry, I encountered an error while trying to create your lipsync video. Please try again.'
          }
        }
        break

      case 'text_to_audio':
        try {
          // Extract text from quotes in the prompt
          const textMatch = analysis.prompt.match(/"([^"]*)"/) || analysis.prompt.match(/'([^']*)'/)
          const textToSpeak = textMatch ? textMatch[1] : analysis.prompt
          
          // Try to match voice description with AI if user provided voice characteristics
          let voiceId = 'English_compelling_lady1' // Default fallback
          
          // Check if user provided voice description
          const hasVoiceDescription = analysis.prompt.toLowerCase().includes('female') || 
                                    analysis.prompt.toLowerCase().includes('male') || 
                                    analysis.prompt.toLowerCase().includes('voice') || 
                                    analysis.prompt.toLowerCase().includes('accent') ||
                                    analysis.prompt.toLowerCase().includes('adult') || 
                                    analysis.prompt.toLowerCase().includes('young') ||
                                    analysis.prompt.toLowerCase().includes('deep') || 
                                    analysis.prompt.toLowerCase().includes('soft') ||
                                    analysis.prompt.toLowerCase().includes('loud') || 
                                    analysis.prompt.toLowerCase().includes('gentle') ||
                                    analysis.prompt.toLowerCase().includes('strong') || 
                                    analysis.prompt.toLowerCase().includes('smooth')
          
          if (hasVoiceDescription) {
            try {
              // Extract gender from the prompt
              const isFemale = analysis.prompt.toLowerCase().includes('female')
              const isMale = analysis.prompt.toLowerCase().includes('male')
              const gender = isFemale ? 'Female' : isMale ? 'Male' : 'Female' // Default to female
              
              // Use AI to match voice
              const { matchVoiceWithAI } = await import('@/lib/voice-utils')
              voiceId = await matchVoiceWithAI(analysis.prompt, gender, 'English')
            } catch (error) {
              console.error('Voice matching error:', error)
              // Fall back to default voice
            }
          }
          
          console.log('Generating audio with text:', textToSpeak) // Debug log
          
          // Generate audio using Wavespeed API directly
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
              text: textToSpeak,
              voice_id: voiceId,
              volume: 1
            })
          })

          if (!wavespeedResponse.ok) {
            const errorText = await wavespeedResponse.text()
            console.error('Wavespeed API error:', errorText)
            throw new Error(`Wavespeed API error: ${errorText}`)
          }

          const wavespeedData = await wavespeedResponse.json()
          console.log('Wavespeed response:', wavespeedData)

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

                if (statusData.status === 'completed' && statusData.outputs && statusData.outputs.length > 0) {
                  audioUrl = statusData.outputs[0]
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
            throw new Error('Audio generation timed out')
          }

          // Download and save the audio file
          const audioResponse = await fetch(audioUrl)
          if (!audioResponse.ok) {
            throw new Error('Failed to download audio')
          }

          const audioBuffer = await audioResponse.arrayBuffer()
          const fileName = `audio_${Date.now()}.mp3`
          const { saveFile } = await import('@/lib/media-storage')
          const localPath = await saveFile(audioBuffer, fileName, 'audio')

          // Create generation record with COMPLETED status since we already have the result
          const generation = await prisma.generation.create({
            data: {
              messageId: userMessage.id,
              type: 'TEXT_TO_AUDIO',
              status: 'COMPLETED',
              prompt: textToSpeak,
              provider: 'wavespeed',
              model: 'minimax/speech-02-hd',
              requestId: wavespeedData.request_id || wavespeedData.id,
              resultUrl: localPath,
              resultUrls: [localPath],
            },
          })

          // Save audio to user's collection
          await prisma.savedAudio.create({
            data: {
              userId: session.user.id,
              title: `Audio: ${textToSpeak.substring(0, 50)}...`,
              prompt: textToSpeak,
              originalUrl: audioUrl,
              localPath: localPath,
              fileName: fileName,
              fileSize: audioBuffer.byteLength,
              voiceId: voiceId,
              language: 'English',
              generationId: generation.id
            }
          })
          
          generations.push(generation)
          response = `I've created an audio file with the text: "${textToSpeak}". The audio is ready to play!`
        } catch (error: any) {
          console.error('Text-to-audio generation error:', error)
          response = 'Sorry, I encountered an error while trying to create your audio. Please try again.'
        }
        break

      case 'chat':
      default:
        // Use the specific prompt from AI orchestrator if it's a detailed response
        if (analysis.prompt && analysis.prompt.length > 100) {
          response = analysis.prompt
        } else {
          response = `I understand you want to ${analysis.prompt}. I'm an AI assistant specialized in creating and editing images, videos, and audio. Here's what I can help you with:

🖼️ **Create Images**: Describe any image you want me to generate
🎨 **Edit Images**: Upload images and tell me how to modify them
🎥 **Create Videos**: Describe a video or upload images to animate
🎵 **Create Audio**: Ask me to create audio with text in quotes like "Hello world"
💬 **Ask Questions**: I'm here to help with your creative projects!

What would you like to create today?`
        }
        break
    }

    // Create assistant message first
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'ASSISTANT',
        content: response,
      },
    })

    // Move generations from user message to assistant message if any were created
    if (generations.length > 0) {
      await prisma.generation.updateMany({
        where: {
          messageId: userMessage.id,
        },
        data: {
          messageId: assistantMessage.id,
        },
      })
    }

    // Get the updated assistant message with generations
    const updatedAssistantMessage = await prisma.message.findUnique({
      where: { id: assistantMessage.id },
      include: { generations: true },
    })

    return NextResponse.json({
      response,
      chatId: chat.id,
      messageId: assistantMessage.id,
      userMessageId: userMessage.id,
      analysis,
      generations: updatedAssistantMessage?.generations || [],
    })

  } catch (error: any) {
    console.error('💥 === CHAT API ERROR ===') // Debug log
    console.error('💥 Error type:', error?.constructor?.name) // Debug log
    console.error('💥 Error message:', error?.message) // Debug log
    console.error('💥 Full error:', error) // Debug log
    console.error('💥 Stack trace:', error?.stack) // Debug log
    
    if (error instanceof z.ZodError) {
      console.error('💥 Zod validation error:', error.errors) // Debug log
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('💥 Returning 500 error to client') // Debug log
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    )
  }
}