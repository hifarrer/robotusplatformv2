import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

    // Get total users
    const totalUsers = await prisma.user.count()

    // Get active users (users who have made at least one generation)
    const activeUsers = await prisma.user.count({
      where: {
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

    // Calculate total revenue (sum of all PURCHASE transactions)
    const purchases = await prisma.creditTransaction.findMany({
      where: {
        type: 'PURCHASE',
      },
      include: {
        user: {
          include: {
            plan: true,
          },
        },
      },
    })

    let totalRevenue = 0
    for (const purchase of purchases) {
      if (purchase.metadata && typeof purchase.metadata === 'object') {
        const metadata = purchase.metadata as any
        totalRevenue += metadata.price || 0
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

    // Get plan distribution
    const users = await prisma.user.findMany({
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
      percentage: (count / totalUsers) * 100,
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

