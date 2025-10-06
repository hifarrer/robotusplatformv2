import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const preferencesUpdateSchema = z.object({
  aspectRatio: z.enum(['SQUARE', 'PORTRAIT', 'LANDSCAPE', 'WIDE']).optional(),
  textToImageModel: z.enum(['SEEDREAM_V4', 'FLUX_1_1_PRO', 'FLUX_1_SCHNELL', 'NANO_BANANA']).optional(),
  imageToImageModel: z.enum(['SEEDREAM_V4_EDIT', 'FLUX_1_1_PRO_EDIT', 'NANO_BANANA_EDIT']).optional(),
  videoModel: z.enum(['VEO3_FAST', 'VEO3_STANDARD', 'RUNWAY_ML', 'WAN_2_5']).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create user preferences
    let preferences = await prisma.userPreferences.findUnique({
      where: { userId: session.user.id }
    })

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.userPreferences.create({
        data: {
          userId: session.user.id,
          aspectRatio: 'SQUARE',
          textToImageModel: 'SEEDREAM_V4',
          imageToImageModel: 'SEEDREAM_V4_EDIT',
          videoModel: 'VEO3_FAST',
        }
      })
    }

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Get preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const updateData = preferencesUpdateSchema.parse(body)

    // Update or create user preferences
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        ...updateData,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        aspectRatio: updateData.aspectRatio || 'SQUARE',
        textToImageModel: updateData.textToImageModel || 'SEEDREAM_V4',
        imageToImageModel: updateData.imageToImageModel || 'SEEDREAM_V4_EDIT',
        videoModel: updateData.videoModel || 'VEO3_FAST',
      }
    })

    return NextResponse.json(preferences)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update preferences error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}