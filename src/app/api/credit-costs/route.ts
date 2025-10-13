import { NextRequest, NextResponse } from 'next/server'
import { GenerationType } from '@prisma/client'
import { CREDIT_COSTS, getCreditCostDescription } from '@/lib/credit-costs'

/**
 * GET /api/credit-costs
 * Get credit costs for all generation types
 */
export async function GET(request: NextRequest) {
  try {
    const costs = {
      IMAGE_GENERATION: {
        cost: CREDIT_COSTS.TEXT_TO_IMAGE,
        description: getCreditCostDescription('TEXT_TO_IMAGE'),
      },
      VIDEO_GENERATION: {
        costs: CREDIT_COSTS.TEXT_TO_VIDEO,
        description: getCreditCostDescription('TEXT_TO_VIDEO'),
      },
      AUDIO_GENERATION: {
        cost: CREDIT_COSTS.TEXT_TO_AUDIO,
        description: getCreditCostDescription('TEXT_TO_AUDIO'),
      },
      LIPSYNC_GENERATION: {
        cost: CREDIT_COSTS.LIPSYNC,
        description: getCreditCostDescription('LIPSYNC'),
      },
    }

    return NextResponse.json(costs)
  } catch (error) {
    console.error('Error fetching credit costs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit costs' },
      { status: 500 }
    )
  }
}

