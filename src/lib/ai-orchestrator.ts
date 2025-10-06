import OpenAI from 'openai'
import { AIAnalysisResult } from '@/types'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const SYSTEM_PROMPT = `You are an AI orchestrator for a creative AI platform. Your job is to analyze user requests and determine what action should be taken.

Available actions:
1. "text_to_image" - User wants to create an image from text description
2. "image_to_image" - User wants to edit/modify existing images (requires images)
3. "text_to_video" - User wants to create a video from text description
4. "image_to_video" - User wants to create a video from images (requires images)
5. "lipsync" - User wants to make an image speak/talk (requires image and audio)
6. "chat" - General conversation that doesn't require image/video generation

IMPORTANT WORKFLOW RULES:
- If 2+ images are attached: ALWAYS choose "image_to_image" (even if user asks for video)
- If 0-1 images attached: Can choose "text_to_video" for video requests
- Video generation from images is available as a button AFTER image generation
- This ensures image-to-image models get proper reference images for better results
- Generate an image first if the user doesn't specify clearly what they want, only generate a video if the user explicitly asks for a video.

Context-Aware Intelligence:
- IMPORTANT: If the user references "previous image", "that image", "the image", "it", or uses modification language without explicitly uploading new images, they are likely referring to a recently generated image in the conversation
- Look for contextual clues like "change that to", "make it blue", "now add", "modify the", etc.
- If recent messages contain completed image generations and the user uses modification language, choose "image_to_image" even if no new images are uploaded
- The system will automatically use the most recent generated image when the user implies reference to previous content

Keyword Guidelines:
- Look for keywords like "create", "generate", "make", "design" for creation requests
- Look for "edit", "modify", "change", "improve", "now", "also", "make it" for editing requests
- Look for "video", "animation", "motion" for video requests
- Look for "speak", "talk", "lipsync", "voice", "saying", "talking" for lipsync requests
- If 2+ images are provided: ALWAYS choose "image_to_image" (video button will be available after)
- If 1 image and user wants video: choose "image_to_video"
- If 0 images and user wants video: choose "text_to_video"
- If images and audio are provided and user wants talking/speaking: choose "lipsync"
- If no images and user wants image: choose "text_to_image"
- For general questions or conversations: choose "chat"

Return your analysis as JSON with:
{
  "action": "text_to_image|image_to_image|text_to_video|image_to_video|lipsync|chat",
  "prompt": "cleaned and optimized prompt for the AI service",
  "requiresImages": boolean,
  "requiresAudio": boolean (true for lipsync),
  "useRecentImage": boolean (true if should use recent generated image),
  "confidence": number (0-1),
  "reasoning": "explanation of your decision"
}`

export async function analyzeUserRequest(
  message: string,
  hasImages: boolean = false,
  hasAudio: boolean = false,
  conversationContext?: {
    recentMessages: Array<{
      role: string
      content: string
      hasGenerations?: boolean
      generationTypes?: string[]
    }>
    hasRecentImageGeneration?: boolean
    recentImageUrl?: string
  }
): Promise<AIAnalysisResult> {
  console.log('🌟 === AI ORCHESTRATOR STARTED ===') // Debug log
  try {
    console.log('🔍 Analyzing user request:', { message, hasImages, hasAudio, conversationContext }) // Debug log
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('🚨 OPENAI_API_KEY is not set!') // Debug log
      throw new Error('OpenAI API key not configured')
    }
    
    console.log('🔑 OpenAI API key found:', process.env.OPENAI_API_KEY.substring(0, 10) + '...') // Debug log
    const contextInfo = conversationContext ? `
Conversation Context:
- Recent messages: ${JSON.stringify(conversationContext.recentMessages, null, 2)}
- Has recent image generation: ${conversationContext.hasRecentImageGeneration}
- Recent image available: ${!!conversationContext.recentImageUrl}` : ''

    const userPrompt = `
User message: "${message}"
Has images attached: ${hasImages}
Has audio attached: ${hasAudio}${contextInfo}

Analyze this request and determine the appropriate action. Pay special attention to contextual references to previous images.
`

    console.log('🐤 Calling OpenAI API...') // Debug log
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    })
    
    console.log('🐤 OpenAI API response received') // Debug log
    console.log('🐤 Response choices:', completion.choices?.length || 0) // Debug log

    const response = completion.choices[0]?.message?.content
    
    console.log('🐤 OpenAI raw response:', response) // Debug log
    
    if (!response) {
      console.error('🚨 No response from OpenAI!') // Debug log
      throw new Error('No response from OpenAI')
    }

    console.log('📝 Parsing JSON response...') // Debug log
    // Parse the JSON response
    const analysis = JSON.parse(response) as AIAnalysisResult
    
    console.log('🤖 AI Analysis Result:', analysis) // Debug log
    
    // Validate the response
    const validActions = ['text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'lipsync', 'chat']
    if (!validActions.includes(analysis.action)) {
      throw new Error('Invalid action returned')
    }

    return analysis
  } catch (error: any) {
    console.error('💥 === AI ORCHESTRATOR ERROR ===') // Debug log
    console.error('💥 Error type:', error?.constructor?.name) // Debug log
    console.error('💥 Error message:', error?.message) // Debug log
    console.error('💥 Full error:', error) // Debug log
    
    if (error?.message?.includes('JSON')) {
      console.error('💥 JSON parsing failed - raw response might be malformed') // Debug log
    }
    
    if (error?.code === 'insufficient_quota' || error?.message?.includes('quota')) {
      console.error('💥 OpenAI quota exceeded!') // Debug log
    }
    
    if (error?.code === 'invalid_api_key') {
      console.error('💥 Invalid OpenAI API key!') // Debug log
    }
    
    console.log('🔄 Using fallback analysis...') // Debug log
    
    // Fallback analysis
    const lowerMessage = message.toLowerCase()
    console.log('🔍 Fallback analysis inputs:', {
      lowerMessage: lowerMessage.substring(0, 50) + '...',
      hasImages,
      hasAudio,
      hasRecentImageGeneration: conversationContext?.hasRecentImageGeneration
    }) // Debug log
    
    // Check for lipsync keywords
    const lipsyncKeywords = ['speak', 'talk', 'lipsync', 'voice', 'saying', 'talking']
    const isLipsyncRequest = lipsyncKeywords.some(keyword => lowerMessage.includes(keyword))
    
    // Check for contextual references to previous images
    const hasContextualReference = conversationContext?.hasRecentImageGeneration && (
      lowerMessage.includes('previous') ||
      lowerMessage.includes('that') ||
      lowerMessage.includes('the image') ||
      lowerMessage.includes('it ') ||
      lowerMessage.includes('now ') ||
      lowerMessage.includes('make it') ||
      lowerMessage.includes('change') ||
      lowerMessage.includes('modify')
    )
    
    // Lipsync takes priority if detected
    if (isLipsyncRequest) {
      if (hasImages && hasAudio) {
        return {
          action: 'lipsync',
          prompt: message,
          requiresImages: true,
          requiresAudio: true,
          useRecentImage: false,
          confidence: 0.8,
          reasoning: 'Fallback: detected lipsync request with both image and audio'
        }
      } else if (hasImages && !hasAudio) {
        return {
          action: 'chat',
          prompt: 'To make an image speak, I need both an image and an audio file. Please upload an audio file with your speech or voice.',
          requiresImages: false,
          requiresAudio: false,
          useRecentImage: false,
          confidence: 0.9,
          reasoning: 'Fallback: lipsync requested but missing audio file'
        }
      } else if (!hasImages && hasAudio && hasContextualReference) {
        return {
          action: 'lipsync',
          prompt: message,
          requiresImages: true,
          requiresAudio: true,
          useRecentImage: true,
          confidence: 0.8,
          reasoning: 'Fallback: detected lipsync request with audio and recent image context'
        }
      } else {
        return {
          action: 'chat',
          prompt: 'To make an image speak, I need both an image and an audio file. Please upload an image and an audio file.',
          requiresImages: false,
          requiresAudio: false,
          useRecentImage: false,
          confidence: 0.9,
          reasoning: 'Fallback: lipsync requested but missing required files'
        }
      }
    }
    
    if (hasImages || hasContextualReference) {
      // With 2+ images, always generate an image (image-to-image models work better with reference images)
      // Video generation will be available as a button after image generation
      const fallbackResult = {
        action: 'image_to_image' as const,
        prompt: message,
        requiresImages: true,
        useRecentImage: hasContextualReference && !hasImages,
        confidence: 0.8,
        reasoning: hasContextualReference ? 'Fallback: detected reference to previous image - will generate image first, then video button available' : 'Fallback: detected image editing request with multiple images - will generate image first, then video button available'
      }
      console.log('🎯 Fallback result (image_to_image):', fallbackResult) // Debug log
      return fallbackResult
    } else {
      // With 0-1 images, can generate video directly
      if (lowerMessage.includes('video') || lowerMessage.includes('animation')) {
        return {
          action: 'text_to_video',
          prompt: message,
          requiresImages: false,
          useRecentImage: false,
          confidence: 0.7,
          reasoning: 'Fallback: detected video request without images - can generate video directly'
        }
      } else if (
        lowerMessage.includes('create') || 
        lowerMessage.includes('generate') || 
        lowerMessage.includes('make') ||
        lowerMessage.includes('image') ||
        lowerMessage.includes('picture')
      ) {
        const fallbackResult = {
          action: 'text_to_image' as const,
          prompt: message,
          requiresImages: false,
          useRecentImage: false,
          confidence: 0.7,
          reasoning: 'Fallback: detected image creation request'
        }
        console.log('🎯 Fallback result (text_to_image):', fallbackResult) // Debug log
        return fallbackResult
      } else {
        const fallbackResult = {
          action: 'chat' as const,
          prompt: message,
          requiresImages: false,
          useRecentImage: false,
          confidence: 0.5,
          reasoning: 'Fallback: general conversation'
        }
        console.log('🎯 Fallback result (chat):', fallbackResult) // Debug log
        return fallbackResult
      }
    }
  }
}

export async function analyzeImageForVideoPrompt(imageUrl: string): Promise<string> {
  console.log('🎬 === IMAGE TO VIDEO ANALYSIS STARTED ===')
  try {
    console.log('🔍 Analyzing image for video prompt:', imageUrl)
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    const systemPrompt = `You are an expert at analyzing images and creating compelling video prompts. Your job is to:

1. Describe what you see in the image in detail
2. Create a dynamic video prompt that would bring this image to life with motion, camera movement, and visual effects
3. Focus on cinematic elements like camera angles, lighting changes, particle effects, or environmental dynamics
4. Make the prompt engaging and suitable for AI video generation

Return ONLY the video prompt, nothing else. Make it 1-2 sentences maximum.`

    const userPrompt = `Analyze this image and create a video prompt that would animate it: ${imageUrl}`

    console.log('🐤 Calling OpenAI Vision API...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: userPrompt },
            { 
              type: 'image_url', 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ],
      temperature: 0.7,
      max_tokens: 200,
    })

    const response = completion.choices[0]?.message?.content
    
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    console.log('🎬 Generated video prompt:', response)
    return response.trim()
  } catch (error: any) {
    console.error('💥 === IMAGE TO VIDEO ANALYSIS ERROR ===')
    console.error('💥 Error:', error?.message)
    
    // Fallback prompt
    const fallbackPrompt = "Cinematic camera movement with dynamic lighting and atmospheric effects"
    console.log('🔄 Using fallback video prompt:', fallbackPrompt)
    return fallbackPrompt
  }
}