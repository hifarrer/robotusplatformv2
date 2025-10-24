import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getCreditBalance, getCreditTransactions } from '@/lib/credit-manager'

/**
 * GET /api/credits
 * Get user's credit balance and transaction history
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

    // Get transaction history
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')
    const transactions = await getCreditTransactions(user.id, limit)

    return NextResponse.json({
      balance: user.credits,
      plan: user.plan || {
        id: 'free',
        name: 'Free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        credits: 60,
        description: 'Free plan with basic features',
        features: ['Basic AI generation', 'Limited credits'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        users: []
      },
      transactions,
    })
  } catch (error) {
    console.error('Error fetching credits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

