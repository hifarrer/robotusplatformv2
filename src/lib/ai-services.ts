import axios from 'axios'
import {
  WavespeedTextToImageRequest,
  WavespeedImageToImageRequest,
  WavespeedLipsyncRequest,
  WavespeedUpscaleRequest,
  WavespeedResponse,
  WavespeedResultResponse,
  AspectRatio,
  TextToImageModel,
  ImageToImageModel,
  VideoModel,
} from '@/types'

const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY!
const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3'


// Utility functions
function aspectRatioToSize(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case 'SQUARE':
      return '1024*1024'
    case 'PORTRAIT':
      return '1024*1365'  // Changed from 768*1024 to meet minimum 921600 pixels requirement (3:4 ratio)
    case 'LANDSCAPE':
      return '1152*864'   // Changed from 1024*768 to meet minimum 921600 pixels requirement (4:3 ratio)
    case 'WIDE':
      return '1792*1024'
    case 'ULTRAWIDE':
      return '2048*896'
    default:
      return '1024*1024'
  }
}

function aspectRatioToVideoRatio(aspectRatio: AspectRatio): string {
  switch (aspectRatio) {
    case 'SQUARE':
      return '1:1'
    case 'PORTRAIT':
      return '9:16'  // Changed from 3:4 to 9:16 for video
    case 'LANDSCAPE':
      return '4:3'
    case 'WIDE':
      return '16:9'
    case 'ULTRAWIDE':
      return '16:9'  // Map ultrawide to 16:9 since 21:9 is not supported for video
    default:
      return '16:9'
  }
}

function getTextToImageEndpoint(model: TextToImageModel): string {
  switch (model) {
    case 'SEEDREAM_V4':
      return '/bytedance/seedream-v4'
    case 'FLUX_1_1_PRO':
      return '/flux/flux-1.1-pro'
    case 'FLUX_1_SCHNELL':
      return '/flux/flux-1-schnell'
    case 'NANO_BANANA':
      return '/google/nano-banana/text-to-image'
    default:
      return '/bytedance/seedream-v4'
  }
}

function getImageToImageEndpoint(model: ImageToImageModel): string {
  switch (model) {
    case 'SEEDREAM_V4_EDIT':
      return '/bytedance/seedream-v4/edit'
    case 'FLUX_1_1_PRO_EDIT':
      return '/flux/flux-1.1-pro/edit'
    case 'NANO_BANANA_EDIT':
      return '/google/nano-banana/edit'
    default:
      return '/bytedance/seedream-v4/edit'
  }
}

function getVideoModel(model: VideoModel): string {
  switch (model) {
    case 'WAN_2_5':
      return 'wan-2.5'
    default:
      return 'wan-2.5'
  }
}

// Wavespeed AI Services
export class WavespeedService {
  static async textToImage(
    prompt: string, 
    model: TextToImageModel = 'SEEDREAM_V4',
    aspectRatio: AspectRatio = 'SQUARE'
  ): Promise<string> {
    try {
      const size = aspectRatioToSize(aspectRatio)
      const endpoint = getTextToImageEndpoint(model)
      
      const request: WavespeedTextToImageRequest = {
        enable_base64_output: false,
        enable_sync_mode: false,
        prompt,
        size,
      }

      console.log('Sending text-to-image request to Wavespeed:', { endpoint, request, model, aspectRatio }) // Debug log

      const response = await axios.post<WavespeedResponse>(
        `${WAVESPEED_BASE_URL}${endpoint}`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('Wavespeed text-to-image response:', response.data) // Debug log
      return response.data.data.id
    } catch (error: any) {
      console.error('Wavespeed text-to-image error:', error)
      console.error('Error response:', error.response?.data) // More detailed error
      throw new Error('Failed to start text-to-image generation')
    }
  }

  static async imageToImage(
    prompt: string, 
    imageUrls: string[], 
    model: ImageToImageModel = 'SEEDREAM_V4_EDIT',
    aspectRatio: AspectRatio = 'SQUARE'
  ): Promise<string> {
    try {
      const size = aspectRatioToSize(aspectRatio)
      const endpoint = getImageToImageEndpoint(model)
      
      const request: WavespeedImageToImageRequest = {
        enable_base64_output: false,
        enable_sync_mode: false,
        images: imageUrls,
        prompt,
        size,
      }
      
      console.log('🎨 Wavespeed Image-to-Image Request:', {
        prompt: prompt.substring(0, 100) + '...',
        imageCount: imageUrls.length,
        imageUrls: imageUrls.map(url => ({ url, accessible: 'checking...' })),
        model,
        size
      })

      console.log('Sending image-to-image request to Wavespeed:', { endpoint, request, model, aspectRatio }) // Debug log

      const response = await axios.post<WavespeedResponse>(
        `${WAVESPEED_BASE_URL}${endpoint}`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('Wavespeed image-to-image response:', response.data) // Debug log
      return response.data.data.id
    } catch (error: any) {
      console.error('Wavespeed image-to-image error:', error)
      console.error('Error response:', error.response?.data) // More detailed error
      throw new Error('Failed to start image-to-image generation')
    }
  }

  static async lipsync(
    audioUrl: string,
    imageUrl: string,
    prompt: string = '',
    resolution: string = '480p'
  ): Promise<string> {
    try {
      const request: WavespeedLipsyncRequest = {
        audio: audioUrl,
        image: imageUrl,
        prompt,
        resolution,
        seed: -1,
      }

      console.log('Sending lipsync request to Wavespeed:', { request }) // Debug log

      const response = await axios.post<WavespeedResponse>(
        `${WAVESPEED_BASE_URL}/wavespeed-ai/infinitetalk`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('Wavespeed lipsync response:', response.data) // Debug log
      return response.data.data.id
    } catch (error: any) {
      console.error('Wavespeed lipsync error:', error)
      console.error('Error response:', error.response?.data) // More detailed error
      throw new Error('Failed to start lipsync generation')
    }
  }

  static async upscaleImage(
    imageUrl: string,
    targetResolution: string = '4k',
    creativity: number = 2
  ): Promise<string> {
    try {
      if (!WAVESPEED_API_KEY) {
        throw new Error('WAVESPEED_API_KEY environment variable is not set')
      }
      
      console.log('🔍 Upscaling image:', imageUrl) // Debug log
      console.log('🔍 API Key present:', !!WAVESPEED_API_KEY) // Debug log
      
      const request: WavespeedUpscaleRequest = {
        creativity,
        enable_base64_output: false,
        enable_sync_mode: false,
        image: imageUrl,
        output_format: 'png',
        target_resolution: targetResolution,
      }

      console.log('Sending upscale request to Wavespeed:', { request }) // Debug log

      const response = await axios.post<WavespeedResponse>(
        `${WAVESPEED_BASE_URL}/wavespeed-ai/image-upscaler`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('Wavespeed upscale response:', response.data) // Debug log
      return response.data.data.id
    } catch (error: any) {
      console.error('Wavespeed upscale error:', error)
      console.error('Error response:', error.response?.data) // More detailed error
      throw new Error('Failed to start image upscaling')
    }
  }

  static async getResult(requestId: string): Promise<WavespeedResultResponse> {
    try {
      console.log('🔍 Calling Wavespeed API for requestId:', requestId)
      console.log('🔗 API URL:', `${WAVESPEED_BASE_URL}/predictions/${requestId}/result`)
      
      const response = await axios.get<WavespeedResultResponse>(
        `${WAVESPEED_BASE_URL}/predictions/${requestId}/result`,
        {
          headers: {
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('📊 Wavespeed API response:', JSON.stringify(response.data, null, 2))
      return response.data
    } catch (error) {
      console.error('Wavespeed get result error:', error)
      
      // If it's an axios error, provide more specific error message
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Generation not found - request ID may be invalid')
        } else if (error.response?.status === 401) {
          throw new Error('Unauthorized - check API key')
        } else if (error.response && error.response.status >= 500) {
          throw new Error('Wavespeed service error')
        }
      }
      
      throw new Error('Failed to get generation result')
    }
  }
}


// WAN-2.5 Video Service - Using same pattern as other Wavespeed services
export class WanService {
  static async generateVideo(
    prompt: string,
    imageUrl: string,
    duration: number = 5,
    resolution: string = '720p'
  ): Promise<string> {
    try {
      if (!WAVESPEED_API_KEY) {
        throw new Error('WAVESPEED_API_KEY environment variable is not set')
      }
      
      const request = {
        duration,
        enable_prompt_expansion: false,
        image: imageUrl,
        prompt: prompt,
        resolution,
        seed: -1
      }

      console.log('Sending video generation request to WAN-2.5:', { 
        request, 
        prompt, 
        imageUrl, 
        duration, 
        resolution 
      })

      const response = await axios.post(
        `${WAVESPEED_BASE_URL}/alibaba/wan-2.5/image-to-video`,
        request,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('WAN-2.5 API Response Status:', response.status)
      console.log('WAN-2.5 API Response Data:', response.data)

      if (response.status !== 200) {
        throw new Error('Failed to start video generation')
      }

      // Use the same pattern as other Wavespeed services - return the ID from data
      const taskId = response.data.data?.id || response.data.id || 'unknown'
      console.log('WAN-2.5 Selected taskId:', taskId)
      return taskId
    } catch (error: any) {
      console.error('WAN-2.5 video generation error:', error)
      if (error.response) {
        console.error('WAN-2.5 API Error Response:', error.response.data)
        console.error('WAN-2.5 API Error Status:', error.response.status)
      }
      throw new Error('Failed to start video generation')
    }
  }

  static async getVideoResult(taskId: string): Promise<any> {
    try {
      if (!WAVESPEED_API_KEY) {
        throw new Error('WAVESPEED_API_KEY environment variable is not set')
      }

      // Skip checking if taskId is 'unknown' or invalid
      if (!taskId || taskId === 'unknown' || taskId === '') {
        console.log('WAN-2.5 Skipping result check for invalid taskId:', taskId)
        return { status: 'processing', error: 'Invalid task ID' }
      }

      console.log('WAN-2.5 Checking result for taskId:', taskId)

      // Use the same pattern as other Wavespeed services
      const response = await axios.get(
        `${WAVESPEED_BASE_URL}/predictions/${taskId}/result`,
        {
          headers: {
            'Authorization': `Bearer ${WAVESPEED_API_KEY}`,
          },
        }
      )

      console.log('WAN-2.5 Result response:', response.data)
      return response.data
    } catch (error: any) {
      console.error('WAN-2.5 get video result error:', error)
      if (error.response?.status === 404) {
        console.log('WAN-2.5 Task not found (404), may still be processing')
        return { status: 'processing', error: 'Task not found' }
      }
      throw new Error('Failed to get video result')
    }
  }
}

// Utility function to poll for results
export async function pollForResult<T>(
  pollFunction: () => Promise<T>,
  isComplete: (result: T) => boolean,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<T> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await pollFunction()
      
      if (isComplete(result)) {
        return result
      }
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, interval))
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        throw error
      }
      // Continue polling on error (unless it's the last attempt)
      await new Promise(resolve => setTimeout(resolve, interval))
    }
  }
  
  throw new Error('Polling timeout: operation did not complete in time')
}