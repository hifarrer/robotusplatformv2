import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const {
      monthlyPrice,
      yearlyPrice,
      stripeMonthlyPriceId,
      stripeYearlyPriceId,
      credits,
      description,
      features,
      isActive
    } = body

    const updateData: any = {}
    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice
    if (stripeMonthlyPriceId !== undefined) updateData.stripeMonthlyPriceId = stripeMonthlyPriceId || null
    if (stripeYearlyPriceId !== undefined) updateData.stripeYearlyPriceId = stripeYearlyPriceId || null
    if (credits !== undefined) updateData.credits = credits
    if (description !== undefined) updateData.description = description
    if (features !== undefined) updateData.features = features
    if (isActive !== undefined) updateData.isActive = isActive

    const plan = await prisma.plan.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error('Error updating plan:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    )
  }
}

