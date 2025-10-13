import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

    const plans = await prisma.plan.findMany({
      orderBy: { monthlyPrice: 'asc' },
      include: {
        _count: {
          select: { users: true },
        },
      },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error('Error fetching plans:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

