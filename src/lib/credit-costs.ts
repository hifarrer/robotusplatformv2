import { GenerationType } from '@prisma/client'

/**
 * Credit costs for different generation types
 */
export const CREDIT_COSTS = {
  // Image generation: 5 credits
  TEXT_TO_IMAGE: 5,
  IMAGE_TO_IMAGE: 5,
  IMAGE_UPSCALE: 5,

  // Audio generation: 1 credit per 15 seconds
  TEXT_TO_AUDIO: {
    base: 1,
    per_seconds: 15,
  },

  // Video generation: 50 credits for 8-10 sec, 25 credits for 5 sec
  TEXT_TO_VIDEO: {
    5: 25,   // 5 seconds
    8: 50,   // 8 seconds
    10: 50,  // 10 seconds
  },
  IMAGE_TO_VIDEO: {
    5: 25,   // 5 seconds
    8: 50,   // 8 seconds
    10: 50,  // 10 seconds
  },

  // Lipsync generation: 20 credits per 10 seconds
  LIPSYNC: {
    base: 20,
    per_seconds: 10,
  },
} as const

/**
 * Calculate credit cost for image generation
 */
export function calculateImageCost(): number {
  return CREDIT_COSTS.TEXT_TO_IMAGE
}

/**
 * Calculate credit cost for audio generation based on duration
 * @param durationSeconds - Duration in seconds
 */
export function calculateAudioCost(durationSeconds: number): number {
  const { base, per_seconds } = CREDIT_COSTS.TEXT_TO_AUDIO
  return Math.ceil(durationSeconds / per_seconds) * base
}

/**
 * Calculate credit cost for video generation based on duration
 * @param durationSeconds - Duration in seconds (5, 8, or 10)
 */
export function calculateVideoCost(durationSeconds: number): number {
  // Round to nearest supported duration
  if (durationSeconds <= 5) return CREDIT_COSTS.TEXT_TO_VIDEO[5]
  if (durationSeconds <= 8) return CREDIT_COSTS.TEXT_TO_VIDEO[8]
  return CREDIT_COSTS.TEXT_TO_VIDEO[10]
}

/**
 * Calculate credit cost for lipsync generation based on duration
 * @param durationSeconds - Duration in seconds
 */
export function calculateLipsyncCost(durationSeconds: number): number {
  const { base, per_seconds } = CREDIT_COSTS.LIPSYNC
  return Math.ceil(durationSeconds / per_seconds) * base
}

/**
 * Calculate credit cost for any generation type
 * @param type - Generation type
 * @param durationSeconds - Duration in seconds (for audio, video, lipsync)
 */
export function calculateGenerationCost(
  type: GenerationType,
  durationSeconds?: number
): number {
  switch (type) {
    case 'TEXT_TO_IMAGE':
    case 'IMAGE_TO_IMAGE':
    case 'IMAGE_UPSCALE':
      return calculateImageCost()

    case 'TEXT_TO_AUDIO':
      if (!durationSeconds) {
        throw new Error('Duration required for audio generation')
      }
      return calculateAudioCost(durationSeconds)

    case 'TEXT_TO_VIDEO':
    case 'IMAGE_TO_VIDEO':
      if (!durationSeconds) {
        throw new Error('Duration required for video generation')
      }
      return calculateVideoCost(durationSeconds)

    case 'LIPSYNC':
      if (!durationSeconds) {
        throw new Error('Duration required for lipsync generation')
      }
      return calculateLipsyncCost(durationSeconds)

    default:
      throw new Error(`Unknown generation type: ${type}`)
  }
}

/**
 * Format credit cost as a readable string
 */
export function formatCreditCost(cost: number): string {
  return `${cost} credit${cost !== 1 ? 's' : ''}`
}

/**
 * Get credit cost description for a generation type
 */
export function getCreditCostDescription(type: GenerationType): string {
  switch (type) {
    case 'TEXT_TO_IMAGE':
    case 'IMAGE_TO_IMAGE':
    case 'IMAGE_UPSCALE':
      return '5 credits per image'

    case 'TEXT_TO_AUDIO':
      return '1 credit per 15 seconds'

    case 'TEXT_TO_VIDEO':
    case 'IMAGE_TO_VIDEO':
      return '25 credits (5s) or 50 credits (8-10s)'

    case 'LIPSYNC':
      return '20 credits per 10 seconds'

    default:
      return 'Cost varies'
  }
}

