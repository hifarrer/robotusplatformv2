export type GenerationType = 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'LIPSYNC' | 'IMAGE_UPSCALE'
export type GenerationStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  images?: string[]
  timestamp: Date
  generations?: Generation[]
}

export interface Generation {
  id: string
  type: GenerationType
  status: GenerationStatus
  prompt: string
  provider: string
  model: string
  requestId?: string
  taskId?: string
  resultUrl?: string
  resultUrls?: string[]
  metadata?: any
  error?: string
  createdAt: Date
  updatedAt: Date
}

export interface Chat {
  id: string
  title?: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface User {
  id: string
  name?: string
  email: string
  image?: string
  createdAt: Date
}

// AI Service Types
export interface WavespeedTextToImageRequest {
  enable_base64_output: boolean
  enable_sync_mode: boolean
  prompt: string
  size: string
}

export interface WavespeedImageToImageRequest {
  enable_base64_output: boolean
  enable_sync_mode: boolean
  images: string[]
  prompt: string
  size: string
}

export interface WavespeedLipsyncRequest {
  audio: string
  image: string
  prompt?: string
  resolution: string
  seed: number
}

export interface WavespeedUpscaleRequest {
  creativity: number
  enable_base64_output: boolean
  enable_sync_mode: boolean
  image: string
  output_format: string
  target_resolution: string
}

export interface WavespeedResponse {
  data: {
    id: string
  }
}

export interface WavespeedResultResponse {
  code: number
  message: string
  data: {
    id: string
    model: string
    outputs: string[]
    urls: {
      get: string
    }
    has_nsfw_contents: boolean[]
    status: string
    created_at: string
    error: string
    executionTime: number
    timings: {
      inference: number
    }
  }
}

export interface KieVideoRequest {
  prompt: string
  imageUrls?: string[]
  model: string
  callBackUrl?: string
  aspectRatio: string
  seeds: number
  enableFallback: boolean
  enableTranslation: boolean
}

export interface KieVideoResponse {
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface KieVideoResultResponse {
  code: number
  msg: string
  data: {
    taskId: string
    paramJson?: string
    completeTime?: string
    response?: {
      taskId: string
      resultUrls: string[]
      originUrls?: string[]
      resolution?: string
    }
    successFlag: number // 1 for success, 0 for failure
    errorCode?: string | null
    errorMessage?: string
    createTime?: string
    fallbackFlag?: boolean
    // Legacy fields for backward compatibility
    status?: string
    videoUrl?: string
    error?: string
  }
}

// AI Orchestrator Types
export interface AIAnalysisResult {
  action: 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video' | 'lipsync' | 'chat'
  prompt: string
  requiresImages: boolean
  requiresAudio?: boolean
  useRecentImage?: boolean
  confidence: number
  reasoning: string
}

export interface FileUpload {
  id: string
  file: File
  preview: string
  type: 'image' | 'video' | 'audio' | 'other'
}

// User Preferences Types
export type AspectRatio = 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE' | 'WIDE' | 'ULTRAWIDE'
export type TextToImageModel = 'SEEDREAM_V4' | 'FLUX_1_1_PRO' | 'FLUX_1_SCHNELL' | 'NANO_BANANA'
export type ImageToImageModel = 'SEEDREAM_V4_EDIT' | 'FLUX_1_1_PRO_EDIT' | 'NANO_BANANA_EDIT'
export type VideoModel = 'VEO3_FAST' | 'VEO3_STANDARD' | 'RUNWAY_ML'

export interface UserPreferences {
  id: string
  userId: string
  aspectRatio: AspectRatio
  textToImageModel: TextToImageModel
  imageToImageModel: ImageToImageModel
  videoModel: VideoModel
  createdAt: Date
  updatedAt: Date
}

export interface PreferencesUpdateRequest {
  aspectRatio?: AspectRatio
  textToImageModel?: TextToImageModel
  imageToImageModel?: ImageToImageModel
  videoModel?: VideoModel
}

// Model Configuration
export interface ModelOption {
  value: string
  label: string
  description?: string
}

export const ASPECT_RATIO_OPTIONS: ModelOption[] = [
  { value: 'SQUARE', label: '1:1 Square', description: 'Perfect for social media posts' },
  { value: 'PORTRAIT', label: '3:4 Portrait', description: 'Great for profile pictures' },
  { value: 'LANDSCAPE', label: '4:3 Landscape', description: 'Classic photo format' },
  { value: 'WIDE', label: '16:9 Wide', description: 'Perfect for wallpapers' },
  { value: 'ULTRAWIDE', label: '21:9 Ultrawide', description: 'Cinematic format' }
]

export const TEXT_TO_IMAGE_MODEL_OPTIONS: ModelOption[] = [
  { value: 'SEEDREAM_V4', label: 'Seedream V4', description: 'Fast and high quality' },
  { value: 'FLUX_1_1_PRO', label: 'Flux 1.1 Pro', description: 'Premium quality' },
  { value: 'FLUX_1_SCHNELL', label: 'Flux Schnell', description: 'Ultra fast generation' },
  { value: 'NANO_BANANA', label: 'Google Nano-Banana', description: 'Google efficient AI model' }
]

export const IMAGE_TO_IMAGE_MODEL_OPTIONS: ModelOption[] = [
  { value: 'SEEDREAM_V4_EDIT', label: 'Seedream V4 Edit', description: 'Best for image editing' },
  { value: 'FLUX_1_1_PRO_EDIT', label: 'Flux 1.1 Pro Edit', description: 'Premium editing quality' },
  { value: 'NANO_BANANA_EDIT', label: 'Google Nano-Banana Edit', description: 'Fast and efficient editing' }
]

export const VIDEO_MODEL_OPTIONS: ModelOption[] = [
  { value: 'VEO3_FAST', label: 'Veo3 Fast', description: 'Quick video generation' },
  { value: 'VEO3_STANDARD', label: 'Veo3 Standard', description: 'Balanced speed and quality' },
  { value: 'RUNWAY_ML', label: 'RunwayML', description: 'High-end video creation' },
  { value: 'WAN_2_5', label: 'Alibaba WAN-2.5', description: 'Image-to-video generation with duration options' }
]