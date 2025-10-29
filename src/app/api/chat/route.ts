import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { VideoModel } from '@prisma/client'
import { analyzeUserRequest } from '@/lib/ai-orchestrator'
import { validateAndMapVideoDuration } from '@/lib/duration-utils'
import { WavespeedService, WanService, FalService } from '@/lib/ai-services'
import { GenerationType } from '@/types'
import { getSafeGenerationType } from '@/lib/generation-utils'
import { checkAndDeductCreditsForGeneration, refundCredits } from '@/lib/credit-manager'
import { downloadAndSaveImage } from '@/lib/media-storage'
import { containsProfanity, getProfanityErrorMessage } from '@/lib/profanity-filter'
import { checkPromptSafety, getSafetyErrorMessage } from '@/lib/safety-checker'
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

const enhanceRequestSchema = z.object({
  action: z.literal('enhance'),
  imageUrl: z.string().min(1, 'Image URL is required'),
  chatId: z.string().optional().nullable(),
})

async function handleUpscaleRequest(session: any, imageUrl: string, chatId?: string | null) {
  try {
    console.log('🔍 Starting upscale process for:', imageUrl) // Debug log
    console.log('🔍 Session user ID:', session.user.id) // Debug log
    console.log('🔍 Chat ID:', chatId) // Debug log
    
    // Check and deduct credits
    const upscaleCredits = await checkAndDeductCreditsForGeneration(
      session.user.id,
      'IMAGE_UPSCALE'
    )
    
    if (!upscaleCredits.success) {
      return NextResponse.json(
        { 
          error: `You don't have enough credits to upscale images. You need ${upscaleCredits.cost} credits. Please upgrade your plan to continue.`,
          required: upscaleCredits.cost,
        },
        { status: 402 }
      )
    }
    
    console.log(`💳 Credits deducted for upscale: ${upscaleCredits.cost}`)
    
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
        content: `I'm upscaling your image to higher resolution. This will take a few moments... (${upscaleCredits.cost} credits used)`,
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
        metadata: { creditsUsed: upscaleCredits.cost }
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

async function handleEnhanceRequest(session: any, imageUrl: string, chatId?: string | null) {
  try {
    console.log('✨ Starting enhance process for:', imageUrl)
    console.log('✨ Session user ID:', session.user.id)
    console.log('✨ Chat ID:', chatId)
    
    // Check and deduct credits
    const enhanceCredits = await checkAndDeductCreditsForGeneration(
      session.user.id,
      'IMAGE_ENHANCEMENT'
    )
    
    if (!enhanceCredits.success) {
      return NextResponse.json(
        { 
          error: `You don't have enough credits to enhance images. You need ${enhanceCredits.cost} credits. Please upgrade your plan to continue.`,
          required: enhanceCredits.cost,
        },
        { status: 402 }
      )
    }
    
    console.log(`💳 Credits deducted for enhance: ${enhanceCredits.cost}`)
    
    // Create or get chat
    let chat
    if (chatId) {
      chat = await prisma.chat.findFirst({
        where: {
          id: chatId,
          userId: session.user.id,
        },
      })
      console.log('✨ Found existing chat:', chat?.id)
    }
    
    if (!chat) {
      console.log('✨ Creating new chat')
      chat = await prisma.chat.create({
        data: {
          userId: session.user.id,
          title: 'Image Enhancement',
        },
      })
      console.log('✨ Created new chat:', chat.id)
    }

    // Create assistant message for the enhance operation
    console.log('✨ Creating assistant message')
    const assistantMessage = await prisma.message.create({
      data: {
        chatId: chat.id,
        role: 'ASSISTANT',
        content: `I'm enhancing your image with face and skin details. This will take a few moments... (${enhanceCredits.cost} credits used)`,
      },
    })
    console.log('✨ Created assistant message:', assistantMessage.id)

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        messageId: assistantMessage.id,
        type: getSafeGenerationType('IMAGE_ENHANCEMENT', 'TEXT_TO_IMAGE') as any,
        status: 'PENDING',
        prompt: `Enhance image with face and skin details: ${imageUrl}`,
        provider: 'fal-ai',
        model: 'topaz/upscale/image',
        metadata: {
          originalImageUrl: imageUrl,
          creditsUsed: enhanceCredits.cost
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
      try {
        await downloadAndSaveImage(
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

      // Update assistant message
      await prisma.message.update({
        where: { id: assistantMessage.id },
        data: {
          content: `✨ I've enhanced your image with face and skin details! (${enhanceCredits.cost} credits used)`
        }
      })

    } catch (enhanceError: any) {
      console.error('Image enhancement error:', enhanceError)
      
      // Update generation status to failed
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: enhanceError.message || 'Image enhancement failed'
        }
      })

      // Refund credits on failure
      await refundCredits(
        session.user.id,
        enhanceCredits.cost,
        `Refund for failed image enhancement: ${imageUrl}`
      )

      throw enhanceError
    }

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
      response: `✨ I've enhanced your image with face and skin details! (${enhanceCredits.cost} credits used)`,
      chatId: chat.id,
      messageId: assistantMessage.id,
      userMessageId: userMessage?.id,
      generations: updatedAssistantMessage?.generations || [],
      isEnhancing: true, // Flag to indicate this is an enhance operation
    })
  } catch (error: any) {
    console.error('❌ Enhance error:', error)
    console.error('❌ Error stack:', error?.stack)
    console.error('❌ Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      response: error?.response?.data
    })
    return NextResponse.json(
      { 
        error: 'Failed to start image enhancement', 
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
    
    // Check if this is an enhance request
    if (body.action === 'enhance') {
      const { imageUrl, chatId } = enhanceRequestSchema.parse(body)
      console.log('✨ Processing enhance request:', { imageUrl, chatId }) // Debug log
      return await handleEnhanceRequest(session, imageUrl, chatId ?? null)
    }
    
    // Handle regular chat request
    const { message, images = [], audio = [], chatId } = chatRequestSchema.parse(body)
    
    console.log('📝 Parsed request:', { message, images: images.length, audio: audio.length, chatId }) // Debug log

    // Check for profanity
    const profanityCheck = containsProfanity(message)
    if (profanityCheck.containsProfanity) {
      console.log('🚫 Profanity detected:', profanityCheck.foundWords)
      return NextResponse.json(
        { 
          error: getProfanityErrorMessage(),
          isProfanity: true,
        },
        { status: 400 }
      )
    }

    // AI-powered safety check (only for typed prompts, not button actions)
    // Skip safety check for very short messages or button-like actions
    const isButtonAction = message.length < 20 && (
      message.toLowerCase().includes('upscale') ||
      message.toLowerCase().includes('enhance') ||
      message.toLowerCase().includes('edit')
    )
    
    if (!isButtonAction) {
      console.log('🛡️ Running AI safety check...')
      const safetyCheck = await checkPromptSafety(message)
      
      if (!safetyCheck.isSafe) {
        console.log('🚫 Safety check failed')
        return NextResponse.json(
          { 
            error: getSafetyErrorMessage(safetyCheck.reason),
            isUnsafe: true,
          },
          { status: 400 }
        )
      }
      console.log('✅ Safety check passed')
    } else {
      console.log('⏭️ Skipping safety check for button action')
    }

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
          textToImageModel: 'WAN_2_5_TEXT_TO_IMAGE' as any,
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
            textToImageModel: 'WAN_2_5_TEXT_TO_IMAGE',
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
            textToImageModel: 'WAN_2_5_TEXT_TO_IMAGE' as any,
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
    
    // Initialize voiceId for potential use in response
    let voiceId = null
    
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
          
          // Check and deduct credits
          const imageCredits = await checkAndDeductCreditsForGeneration(
            session.user.id,
            'TEXT_TO_IMAGE'
          )
          
          if (!imageCredits.success) {
            response = `Sorry, you don't have enough credits to generate an image. You need ${imageCredits.cost} credits but only have ${await prisma.user.findUnique({ where: { id: session.user.id }, select: { credits: true } }).then(u => u?.credits || 0)} credits remaining. Please upgrade your plan to continue.`
            break
          }
          
          console.log(`💳 Credits deducted: ${imageCredits.cost}`)
          
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
              metadata: { creditsUsed: imageCredits.cost }
            },
          })
          
          generations.push(generation)
          response = `I'm creating an image based on your description: "${message}". This will take a few moments... (${imageCredits.cost} credits used)`
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
            
            // Check and deduct credits
            const imageEditCredits = await checkAndDeductCreditsForGeneration(
              session.user.id,
              'IMAGE_TO_IMAGE'
            )
            
            if (!imageEditCredits.success) {
              response = `Sorry, you don't have enough credits to edit images. You need ${imageEditCredits.cost} credits. Please upgrade your plan to continue.`
              break
            }
            
            console.log(`💳 Credits deducted: ${imageEditCredits.cost}`)
            
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
                metadata: { creditsUsed: imageEditCredits.cost }
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'uploaded images' : 'previous image'
            response = `I'm editing your ${imageSource} based on: "${message}". This will take a few moments... (${imageEditCredits.cost} credits used)`
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
        // Generate an image first, then offer to create video from it
        try {
          console.log('🎨 Generating image first for video request:', analysis.prompt)
          
          // Generate image using the user's video prompt
          const imageTaskId = await WavespeedService.textToImage(
            analysis.prompt,
            userPreferences?.textToImageModel || 'WAN_2_5_TEXT_TO_IMAGE',
            userPreferences?.aspectRatio || 'WIDE'
          )
          
          // Create generation record for the image
          const imageGeneration = await prisma.generation.create({
            data: {
              messageId: userMessage.id,
              type: 'TEXT_TO_IMAGE',
              status: 'PROCESSING',
              prompt: analysis.prompt,
              provider: 'wavespeed',
              model: userPreferences?.textToImageModel || 'WAN_2_5_TEXT_TO_IMAGE',
              requestId: imageTaskId,
            },
          })
          
          generations.push(imageGeneration)
          
          response = `For better video results, I will be creating an image first from your request: "${message}". Once the image is ready, you'll be able to generate a video from it.`
        } catch (error: any) {
          console.error('Error generating image for video request:', error)
          response = 'Sorry, I encountered an error while trying to create an image from your video request. Please try again.'
        }
        break

      case 'video_duration_selection':
        // Check user's video model preference to determine available durations
        const videoModel = userPreferences?.videoModel || 'WAN_2_5'
        if (videoModel === 'VEO3_FAST') {
          response = `I'd be happy to create a video with your prompt: "${message}"\n\nPlease choose the duration:\n\n**5 Seconds** | **8 Seconds**\n\nNote: Google VEO3-Fast supports 5-8 second videos.`
        } else {
          // Default to WAN-2.5 options
          response = `I'd be happy to create a video with your prompt: "${message}"\n\nPlease choose the duration:\n\n**5 Seconds** | **10 Seconds**\n\nNote: Alibaba WAN-2.5 supports 5-10 second videos.`
        }
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
            // Extract duration from prompt if specified
            const durationMatch = analysis.prompt.match(/(\d+)\s*(seconds?|s\b)/i)
            const requestedDuration = durationMatch ? parseInt(durationMatch[1]) : 5
            
            // Determine model based on user preferences
            const videoModel = userPreferences?.videoModel || 'WAN_2_5'
            
            // Validate and map duration to supported values
            const durationValidation = validateAndMapVideoDuration(requestedDuration, videoModel)
            const finalDuration = durationValidation.duration
            const durationMessage = durationValidation.message
            
            // Check and deduct credits for video generation
            const videoCredits = await checkAndDeductCreditsForGeneration(
              session.user.id,
              'IMAGE_TO_VIDEO',
              finalDuration
            )
            
            if (!videoCredits.success) {
              response = `Sorry, you don't have enough credits to generate a video. You need ${videoCredits.cost} credits but only have ${await prisma.user.findUnique({ where: { id: session.user.id }, select: { credits: true } }).then(u => u?.credits || 0)} credits remaining. Please upgrade your plan to continue.`
              break
            }
            
            console.log(`💳 Credits deducted for video: ${videoCredits.cost}, New balance: ${videoCredits.newBalance}`)
            
            const taskId = await WanService.generateVideo(
              analysis.prompt,
              videoImagesToUse[0],
              finalDuration,
              '720p',
              videoModel
            )
            
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'IMAGE_TO_VIDEO',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'wavespeed',
                model: videoModel === 'VEO3_FAST' ? 'veo3-fast' : 'wan-2.5',
                requestId: taskId,
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'your images' : 'the previous image'
            const baseResponse = `I'm creating a ${finalDuration}-second video from ${imageSource} based on: "${message}". This will take a few minutes... (${videoCredits.cost} credits used)`
            
            // Add duration adjustment message if needed
            response = durationMessage ? `${durationMessage}\n\n${baseResponse}` : baseResponse
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
            
            // Estimate lipsync duration (assume 10 seconds for now, can be refined with actual audio duration)
            const estimatedDuration = 10
            
            // Check and deduct credits
            const lipsyncCredits = await checkAndDeductCreditsForGeneration(
              session.user.id,
              'LIPSYNC',
              estimatedDuration
            )
            
            if (!lipsyncCredits.success) {
              response = `Sorry, you don't have enough credits to generate a lipsync video. You need ${lipsyncCredits.cost} credits. Please upgrade your plan to continue.`
              break
            }
            
            console.log(`💳 Credits deducted for lipsync: ${lipsyncCredits.cost}`)
            
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
                metadata: { creditsUsed: lipsyncCredits.cost }
              },
            })
            
            generations.push(generation)
            
            const imageSource = images.length > 0 ? 'your image' : 'the previous image'
            response = `I'm creating a lipsync video using ${imageSource} and your audio. This will take a few moments... (${lipsyncCredits.cost} credits used)`
          } catch (error: any) {
            console.error('Lipsync generation error:', error)
            console.error('Error details:', error.response?.data) // More detailed error logging
            response = 'Sorry, I encountered an error while trying to create your lipsync video. Please try again.'
          }
        }
        break

      case 'text_to_audio':
        try {
          // Extract text from quotes in the ORIGINAL MESSAGE (not analysis.prompt)
          const textMatch = message.match(/"([^"]*)"/) || message.match(/'([^']*)'/)
          const textToSpeak = textMatch ? textMatch[1] : analysis.prompt
          
          // Try to match voice description with AI if user provided voice characteristics
          voiceId = 'English_compelling_lady1' // Default fallback
          
          // Check if user provided voice description in the ORIGINAL MESSAGE
          const hasVoiceDescription = message.toLowerCase().includes('female') || 
                                    message.toLowerCase().includes('male') || 
                                    message.toLowerCase().includes('voice') || 
                                    message.toLowerCase().includes('accent') ||
                                    message.toLowerCase().includes('adult') || 
                                    message.toLowerCase().includes('young') ||
                                    message.toLowerCase().includes('old') ||
                                    message.toLowerCase().includes('deep') || 
                                    message.toLowerCase().includes('soft') ||
                                    message.toLowerCase().includes('loud') || 
                                    message.toLowerCase().includes('gentle') ||
                                    message.toLowerCase().includes('strong') || 
                                    message.toLowerCase().includes('smooth')
          
          console.log('🎤 Voice description check:', {
            originalMessage: message,
            extractedPrompt: analysis.prompt,
            hasVoiceDescription,
            containsMale: message.toLowerCase().includes('male'),
            containsOld: message.toLowerCase().includes('old')
          })
          
          if (hasVoiceDescription) {
            try {
              // Extract gender from the ORIGINAL MESSAGE
              const isFemale = message.toLowerCase().includes('female')
              const isMale = message.toLowerCase().includes('male')
              const gender = isFemale ? 'Female' : isMale ? 'Male' : 'Female' // Default to female
              
          console.log('🎤 Voice matching - Gender:', gender, 'Description:', message)
          
          // Use AI to match voice using the ORIGINAL MESSAGE (contains voice description)
          const { matchVoiceWithAI } = await import('@/lib/voice-utils')
          voiceId = await matchVoiceWithAI(message, gender, 'English')
          
          console.log('🎤 ✅ FINAL SELECTED VOICE ID:', voiceId)
          console.log('🎤 ✅ Voice ID being sent to Wavespeed API:', voiceId)
            } catch (error) {
              console.error('Voice matching error:', error)
              
              // Better fallback based on gender from ORIGINAL MESSAGE
              if (message.toLowerCase().includes('male')) {
                voiceId = 'English_magnetic_voiced_man' // Male fallback
                console.log('🎤 Using male fallback voice:', voiceId)
              } else {
                voiceId = 'English_compelling_lady1' // Female fallback
                console.log('🎤 Using female fallback voice:', voiceId)
              }
            }
          }
          
          console.log('🎤 Generating audio with text:', textToSpeak) // Debug log
          console.log('🎤 Final voice ID being used:', voiceId) // Debug log
          
          // Generate audio using Wavespeed API directly
          const requestBody = {
            emotion: 'happy',
            enable_sync_mode: false,
            english_normalization: false,
            pitch: 0,
            speed: 1,
            text: textToSpeak,
            voice_id: voiceId,
            volume: 1
          }
          
          console.log('🎤 Wavespeed API request body:', JSON.stringify(requestBody, null, 2))
          
          const wavespeedResponse = await fetch('https://api.wavespeed.ai/api/v3/minimax/speech-02-hd', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`
            },
            body: JSON.stringify(requestBody)
          })

          if (!wavespeedResponse.ok) {
            const errorText = await wavespeedResponse.text()
            console.error('Wavespeed API error:', errorText)
            throw new Error(`Wavespeed API error: ${errorText}`)
          }

          const wavespeedData = await wavespeedResponse.json()
          console.log('Wavespeed response:', wavespeedData)

          // Extract the request ID from the response
          const requestId = wavespeedData.data?.id || wavespeedData.id
          console.log('Request ID:', requestId)

          // Poll for completion
          let attempts = 0
          const maxAttempts = 120 // 10 minutes max (120 * 5 seconds = 600 seconds = 10 minutes)
          let audioUrl = null

          while (attempts < maxAttempts && !audioUrl) {
            await new Promise(resolve => setTimeout(resolve, 5000)) // Wait 5 seconds
            attempts++

            try {
              console.log(`Status check attempt ${attempts}/${maxAttempts}...`)
              const statusResponse = await fetch(`https://api.wavespeed.ai/api/v3/predictions/${requestId}/result`, {
                headers: {
                  'Authorization': `Bearer ${process.env.WAVESPEED_API_KEY}`
                }
              })

              if (statusResponse.ok) {
                const statusData = await statusResponse.json()
                console.log('Status check response:', statusData)

                // Extract status and outputs from the response (could be nested in data or at root level)
                const status = statusData.data?.status || statusData.status
                const outputs = statusData.data?.outputs || statusData.outputs
                const error = statusData.data?.error || statusData.error

                if (status === 'completed' && outputs && outputs.length > 0) {
                  audioUrl = outputs[0]
                  console.log('Audio generation completed! URL:', audioUrl)
                  break
                } else if (status === 'failed') {
                  console.error('Audio generation failed:', error)
                  throw new Error('Audio generation failed')
                }
              } else {
                console.error('Status check failed:', statusResponse.status, statusResponse.statusText)
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
              type: 'TEXT_TO_AUDIO' as any,
              status: 'COMPLETED',
              prompt: textToSpeak,
              provider: 'wavespeed',
              model: 'minimax/speech-02-hd',
              requestId: requestId,
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
              mimeType: 'audio/mpeg',
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

      case 'image_enhancement':
        // Handle image enhancement - requires images
        const enhancementImageToUse = images.length > 0 
          ? images[0]  // Use first uploaded image
          : (analysis.useRecentImage && conversationContext?.recentImageUrl) 
            ? conversationContext.recentImageUrl 
            : null
            
        if (!enhancementImageToUse) {
          response = 'To enhance an image, I need an image to work with. Please upload an image or select one from your library.'
        } else {
          try {
            console.log('✨ Starting image enhancement for:', enhancementImageToUse)
            
            // Check and deduct credits
            const enhanceCredits = await checkAndDeductCreditsForGeneration(
              session.user.id,
              'IMAGE_ENHANCEMENT'
            )
            
            if (!enhanceCredits.success) {
              response = `Sorry, you don't have enough credits to enhance images. You need ${enhanceCredits.cost} credits. Please upgrade your plan to continue.`
              break
            }
            
            console.log(`💳 Credits deducted for enhancement: ${enhanceCredits.cost}`)
            
            // Create generation record
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'IMAGE_ENHANCEMENT',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'fal',
                model: 'topaz/upscale/image',
                requestId: `enhance_${Date.now()}`,
                metadata: { creditsUsed: enhanceCredits.cost }
              },
            })
            
            generations.push(generation)
            
            // Call FAL.ai service to enhance the image
            console.log('🎨 Starting image enhancement with FAL.ai...')
            const enhancedImageUrl = await FalService.enhanceImage(enhancementImageToUse)
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
            
            // Save enhanced image to user's collection
            try {
              const imageResponse = await fetch(enhancedImageUrl)
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer()
                const fileName = `enhanced_${Date.now()}.jpg`
                const { saveFile } = await import('@/lib/media-storage')
                const localPath = await saveFile(imageBuffer, fileName, 'image')
                
                await prisma.savedImage.create({
                  data: {
                    userId: session.user.id,
                    title: `Enhanced Image`,
                    prompt: analysis.prompt,
                    originalUrl: enhancedImageUrl,
                    localPath: localPath,
                    fileName: fileName,
                    fileSize: imageBuffer.byteLength,
                    mimeType: 'image/jpeg',
                    generationId: generation.id
                  }
                })
              }
            } catch (saveError) {
              console.error('Error saving enhanced image:', saveError)
              // Don't fail the whole request if saving fails
            }
            
            const imageSource = images.length > 0 ? 'your image' : 'the previous image'
            response = `✨ I've enhanced ${imageSource} with improved face and skin details! The enhanced image is ready. (${enhanceCredits.cost} credits used)`
          } catch (error: any) {
            console.error('Image enhancement error:', error)
            console.error('Error details:', error.response?.data)
            
            // Refund credits on error
            try {
              await refundCredits(session.user.id, 8, 'Image enhancement failed')
              console.log('💳 Credits refunded due to enhancement error')
            } catch (refundError) {
              console.error('Error refunding credits:', refundError)
            }
            
            response = 'Sorry, I encountered an error while trying to enhance your image. Please try again.'
          }
        }
        break

      case 'image_reimagine':
        // Handle image reimagining - requires images
        const reimagineImageToUse = images.length > 0 
          ? images[0]  // Use first uploaded image
          : (analysis.useRecentImage && conversationContext?.recentImageUrl) 
            ? conversationContext.recentImageUrl 
            : null
            
        if (!reimagineImageToUse) {
          response = 'To reimagine an image, I need an image to work with. Please upload an image or select one from your library.'
        } else {
          try {
            console.log('🎨 Starting image reimagining for:', reimagineImageToUse)
            
            // Check and deduct credits
            const reimagineCredits = await checkAndDeductCreditsForGeneration(
              session.user.id,
              'IMAGE_REIMAGINE'
            )
            
            if (!reimagineCredits.success) {
              response = `Sorry, you don't have enough credits to reimagine images. You need ${reimagineCredits.cost} credits. Please upgrade your plan to continue.`
              break
            }
            
            console.log(`💳 Credits deducted for reimagining: ${reimagineCredits.cost}`)
            
            // Create generation record
            const generation = await prisma.generation.create({
              data: {
                messageId: userMessage.id,
                type: 'IMAGE_REIMAGINE',
                status: 'PROCESSING',
                prompt: analysis.prompt,
                provider: 'wavespeed',
                model: 'higgsfield/soul/image-to-image',
                requestId: `reimagine_${Date.now()}`,
                metadata: { creditsUsed: reimagineCredits.cost }
              },
            })
            
            generations.push(generation)
            
            // Call WavespeedService to reimagine the image
            console.log('🎨 Starting image reimagining with WAVESPEED.ai...')
            const requestId = await WavespeedService.reimagineImage(reimagineImageToUse)
            console.log('✅ Image reimagining started, request ID:', requestId)
            
            // Update generation with request ID
            await prisma.generation.update({
              where: { id: generation.id },
              data: {
                requestId: requestId
              }
            })
            
            const imageSource = images.length > 0 ? 'your image' : 'the previous image'
            response = `🎨 I'm reimagining ${imageSource} with AI variations! This will take a few moments... (${reimagineCredits.cost} credits used)`
          } catch (error: any) {
            console.error('Image reimagining error:', error)
            console.error('Error details:', error.response?.data)
            
            // Refund credits on error
            try {
              await refundCredits(session.user.id, 5, 'Image reimagining failed')
              console.log('💳 Credits refunded due to reimagining error')
            } catch (refundError) {
              console.error('Error refunding credits:', refundError)
            }
            
            response = 'Sorry, I encountered an error while trying to reimagine your image. Please try again.'
          }
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
      debugInfo: {
        selectedVoiceId: analysis.action === 'text_to_audio' ? voiceId : null
      }
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