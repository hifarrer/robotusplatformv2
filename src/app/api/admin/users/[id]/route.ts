import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { name, credits, planId, isActive } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (credits !== undefined) updateData.credits = credits
    if (planId !== undefined) updateData.planId = planId || null
    if (isActive !== undefined) updateData.isActive = isActive

    const resolvedParams = await params
    const user = await prisma.user.update({
      where: { id: resolvedParams.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        credits: true,
        role: true,
        isActive: true,
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    // Prevent deleting admin user
    const resolvedParams = await params
    const user = await prisma.user.findUnique({
      where: { id: resolvedParams.id },
      select: { email: true, role: true },
    })

    if (user?.email === 'admin@robotus.ai' || user?.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete admin user' },
        { status: 400 }
      )
    }

    await prisma.user.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}

