import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/plans
 * Get all available plans
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active plans
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { monthlyPrice: 'asc' },
      select: {
        id: true,
        name: true,
        monthlyPrice: true,
        yearlyPrice: true,
        stripeMonthlyPriceId: true,
        stripeYearlyPriceId: true,
        credits: true,
        description: true,
        features: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Get user's current plan
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { 
        plan: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
            yearlyPrice: true,
            credits: true,
            description: true,
            features: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({
      plans,
      currentPlan: user?.plan,
      currentCredits: user?.credits || 0,
    })
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

