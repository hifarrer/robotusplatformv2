import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { upgradePlan } from '@/lib/credit-manager'

/**
 * POST /api/upgrade-plan
 * Upgrade user's plan
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { planName, billingCycle } = body

    if (!planName || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan name and billing cycle are required' },
        { status: 400 }
      )
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // Upgrade the plan
    const result = await upgradePlan(user.id, planName, billingCycle)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to upgrade plan' },
        { status: 400 }
      )
    }

    // Get updated user info
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { plan: true },
    })

    return NextResponse.json({
      success: true,
      plan: updatedUser?.plan,
      credits: updatedUser?.credits,
    })
  } catch (error) {
    console.error('Error upgrading plan:', error)
    return NextResponse.json(
      { error: 'Failed to upgrade plan' },
      { status: 500 }
    )
  }
}

