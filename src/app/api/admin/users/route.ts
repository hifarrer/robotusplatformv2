import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const planId = searchParams.get('planId')

    // Build where clause for filtering
    const whereClause: any = {}
    if (planId && planId !== 'all') {
      whereClause.planId = planId
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        role: true,
        isActive: true,
        createdAt: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

