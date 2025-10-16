export type GenerationType = 'TEXT_TO_IMAGE' | 'IMAGE_TO_IMAGE' | 'TEXT_TO_VIDEO' | 'IMAGE_TO_VIDEO' | 'LIPSYNC' | 'TEXT_TO_AUDIO' | 'IMAGE_UPSCALE' | 'IMAGE_ENHANCEMENT' | 'IMAGE_REIMAGINE'
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
  credits: number
  planId?: string
  plan?: Plan
  createdAt: Date
}

export interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  stripeMonthlyPriceId?: string | null
  stripeYearlyPriceId?: string | null
  credits: number
  description?: string
  features?: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type TransactionType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'PURCHASE'

export interface CreditTransaction {
  id: string
  userId: string
  amount: number
  balance: number
  type: TransactionType
  generationType?: GenerationType
  description: string
  metadata?: any
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

export interface WavespeedReimagineRequest {
  image: string
  prompt: string
  quality: string
  size: string
  strength: number
  style: string
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
    urls: {
      get: string
    }
    error: string
    model: string
    status: string
    outputs: string[]
    timings: {
      inference: number
    }
    created_at: string
    has_nsfw_contents: boolean[]
    executionTime: number
  }
}


// AI Orchestrator Types
export interface AIAnalysisResult {
  action: 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video' | 'lipsync' | 'text_to_audio' | 'image_enhancement' | 'image_reimagine' | 'chat' | 'video_duration_selection'
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
export type AspectRatio = 'SQUARE' | 'PORTRAIT' | 'LANDSCAPE' | 'WIDE'
export type TextToImageModel = 'SEEDREAM_V4' | 'NANO_BANANA'
export type ImageToImageModel = 'SEEDREAM_V4_EDIT' | 'NANO_BANANA_EDIT'
export type VideoModel = 'WAN_2_5' | 'VEO3_FAST'

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
  { value: 'WIDE', label: '16:9 Wide', description: 'Perfect for wallpapers' }
]

export const TEXT_TO_IMAGE_MODEL_OPTIONS: ModelOption[] = [
  { value: 'SEEDREAM_V4', label: 'Seedream V4', description: 'Fast and high quality' },
  { value: 'NANO_BANANA', label: 'Google Nano-Banana', description: 'Google efficient AI model' }
]

export const IMAGE_TO_IMAGE_MODEL_OPTIONS: ModelOption[] = [
  { value: 'SEEDREAM_V4_EDIT', label: 'Seedream V4 Edit', description: 'Best for image editing' },
  { value: 'NANO_BANANA_EDIT', label: 'Google Nano-Banana Edit', description: 'Fast and efficient editing' }
]

export const VIDEO_MODEL_OPTIONS: ModelOption[] = [
  { value: 'WAN_2_5', label: 'Alibaba WAN-2.5', description: 'Image-to-video generation with duration options' },
  { value: 'VEO3_FAST', label: 'Google Veo3-Fast', description: 'Fast video generation with 5s or 8s duration' }
]

// FAL.ai Types
export interface FalEnhanceImageRequest {
  model: string
  upscale_factor: number
  image_url: string
  output_format: string
  subject_detection: string
  face_enhancement: boolean
  face_enhancement_strength: number
}

export interface FalEnhanceImageResponse {
  image: {
    url: string
    content_type: string
    file_name: string
    file_size: number
  }
}