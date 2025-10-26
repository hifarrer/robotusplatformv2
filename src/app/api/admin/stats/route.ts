import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')

    // Build where clause for filtering
    const whereClause: any = {}
    if (planId && planId !== 'all') {
      whereClause.planId = planId
    }

    // Get total users (filtered by plan if specified)
    const totalUsers = await prisma.user.count({
      where: whereClause,
    })

    // Get active users (users who have made at least one generation, filtered by plan if specified)
    const activeUsers = await prisma.user.count({
      where: {
        ...whereClause,
        isActive: true,
        OR: [
          {
            savedImages: {
              some: {},
            },
          },
          {
            savedVideos: {
              some: {},
            },
          },
          {
            savedAudios: {
              some: {},
            },
          },
        ],
      },
    })

    // Get total credits used (sum of all DEBIT transactions)
    const creditsUsed = await prisma.creditTransaction.aggregate({
      where: {
        type: 'DEBIT',
      },
      _sum: {
        amount: true,
      },
    })

    // Calculate total monthly revenue based on active subscriptions
    const usersWithPlans = await prisma.user.findMany({
      where: whereClause,
      include: {
        plan: true,
      },
    })

    let totalRevenue = 0
    for (const user of usersWithPlans) {
      if (user.plan && user.plan.monthlyPrice > 0) {
        totalRevenue += user.plan.monthlyPrice
      }
    }

    // Get generation counts by type
    const imagesGenerated = await prisma.savedImage.count()
    const videosGenerated = await prisma.savedVideo.count()
    const audiosGenerated = await prisma.savedAudio.count()

    // Get recent users
    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        createdAt: true,
        plan: {
          select: {
            name: true,
          },
        },
      },
    })

    // Get plan distribution (filtered by plan if specified)
    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        plan: true,
      },
    })

    const planCounts: Record<string, number> = {}
    for (const user of users) {
      const planName = user.plan?.name || 'No Plan'
      planCounts[planName] = (planCounts[planName] || 0) + 1
    }

    const planDistribution = Object.entries(planCounts).map(([name, count]) => ({
      name,
      count,
      percentage: totalUsers > 0 ? (count / totalUsers) * 100 : 0,
    }))

    // Get recent transactions
    const recentTransactions = await prisma.creditTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        type: true,
        description: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({
      totalUsers,
      activeUsers,
      totalCreditsUsed: Math.abs(creditsUsed._sum.amount || 0),
      totalRevenue,
      imagesGenerated,
      videosGenerated,
      audiosGenerated,
      recentUsers,
      planDistribution,
      recentTransactions,
    })
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}

