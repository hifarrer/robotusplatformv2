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
    console.log('🔧 Getting user preferences...')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.log('❌ No session or user ID found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('👤 User ID:', session.user.id)

    // First, verify the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      console.log('❌ User not found in database')
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('✅ User found in database')

    // Get or create user preferences
    let preferences
    try {
      preferences = await prisma.userPreferences.findUnique({
        where: { userId: session.user.id }
      })
    } catch (dbError) {
      console.error('❌ Database error when fetching preferences:', dbError)
      
      // If the table doesn't exist, return default preferences
      if (dbError instanceof Error && (
        dbError.message.includes('does not exist') || 
        dbError.message.includes('relation') ||
        dbError.message.includes('table')
      )) {
        console.log('📝 Table does not exist, returning default preferences')
        return NextResponse.json({
          id: 'default',
          userId: session.user.id,
          aspectRatio: 'SQUARE',
          textToImageModel: 'SEEDREAM_V4',
          imageToImageModel: 'SEEDREAM_V4_EDIT',
          videoModel: 'VEO3_FAST',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      // If there's an enum value error, return default preferences
      if (dbError instanceof Error && dbError.message.includes('not found in enum')) {
        console.log('📝 Enum value error, returning default preferences')
        return NextResponse.json({
          id: 'default',
          userId: session.user.id,
          aspectRatio: 'SQUARE',
          textToImageModel: 'SEEDREAM_V4',
          imageToImageModel: 'SEEDREAM_V4_EDIT',
          videoModel: 'VEO3_FAST',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      throw dbError
    }

    if (!preferences) {
      console.log('📝 Creating default preferences for user')
      try {
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
        console.log('✅ Default preferences created')
      } catch (createError) {
        console.error('❌ Failed to create preferences:', createError)
        
        // If creation fails due to table issues, return default preferences
        if (createError instanceof Error && (
          createError.message.includes('does not exist') || 
          createError.message.includes('relation') ||
          createError.message.includes('table')
        )) {
          console.log('📝 Table does not exist, returning default preferences')
          return NextResponse.json({
            id: 'default',
            userId: session.user.id,
            aspectRatio: 'SQUARE',
            textToImageModel: 'SEEDREAM_V4',
            imageToImageModel: 'SEEDREAM_V4_EDIT',
            videoModel: 'VEO3_FAST',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
        
        // If creation fails due to enum issues, return default preferences
        if (createError instanceof Error && createError.message.includes('not found in enum')) {
          console.log('📝 Enum value error during creation, returning default preferences')
          return NextResponse.json({
            id: 'default',
            userId: session.user.id,
            aspectRatio: 'SQUARE',
            textToImageModel: 'SEEDREAM_V4',
            imageToImageModel: 'SEEDREAM_V4_EDIT',
            videoModel: 'VEO3_FAST',
            createdAt: new Date(),
            updatedAt: new Date()
          })
        }
        throw createError
      }
    } else {
      console.log('✅ Existing preferences found')
    }

    console.log('📤 Returning preferences:', preferences)
    return NextResponse.json(preferences)
  } catch (error) {
    console.error('❌ Get preferences error:', error)
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
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
    let preferences
    try {
      preferences = await prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        update: {
          ...updateData,
          updatedAt: new Date(),
        } as any,
        create: {
          userId: session.user.id,
          aspectRatio: updateData.aspectRatio || 'SQUARE',
          textToImageModel: updateData.textToImageModel || 'SEEDREAM_V4',
          imageToImageModel: updateData.imageToImageModel || 'SEEDREAM_V4_EDIT',
          videoModel: (updateData.videoModel || 'VEO3_FAST') as any,
        }
      })
    } catch (dbError) {
      console.error('❌ Database error when updating preferences:', dbError)
      
      // If the table doesn't exist, return the updated default preferences
      if (dbError instanceof Error && (
        dbError.message.includes('does not exist') || 
        dbError.message.includes('relation') ||
        dbError.message.includes('table')
      )) {
        console.log('📝 Table does not exist, returning updated default preferences')
        return NextResponse.json({
          id: 'default',
          userId: session.user.id,
          aspectRatio: updateData.aspectRatio || 'SQUARE',
          textToImageModel: updateData.textToImageModel || 'SEEDREAM_V4',
          imageToImageModel: updateData.imageToImageModel || 'SEEDREAM_V4_EDIT',
          videoModel: updateData.videoModel || 'VEO3_FAST',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      
      // If there's an enum value error, return updated default preferences
      if (dbError instanceof Error && dbError.message.includes('not found in enum')) {
        console.log('📝 Enum value error, returning updated default preferences')
        return NextResponse.json({
          id: 'default',
          userId: session.user.id,
          aspectRatio: updateData.aspectRatio || 'SQUARE',
          textToImageModel: updateData.textToImageModel || 'SEEDREAM_V4',
          imageToImageModel: updateData.imageToImageModel || 'SEEDREAM_V4_EDIT',
          videoModel: updateData.videoModel || 'VEO3_FAST',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
      throw dbError
    }

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