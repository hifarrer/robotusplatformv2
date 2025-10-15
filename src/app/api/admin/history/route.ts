import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get all generations with user info, ordered by creation date descending
    const generations = await prisma.generation.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            chat: {
              include: {
                user: {
                  include: {
                    plan: true,
                  },
                },
              },
            },
          },
        },
        savedImages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        savedVideos: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        savedAudios: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    // Get total count for pagination
    const totalCount = await prisma.generation.count()

    // Transform the data to include user info and thumbnail
    const transformedGenerations = generations.map((generation) => {
      const user = generation.message.chat.user
      let thumbnailUrl = null
      let mediaType = null

      // Get thumbnail from the first saved media
      if (generation.savedImages.length > 0) {
        thumbnailUrl = generation.savedImages[0].localPath
        mediaType = 'image'
      } else if (generation.savedVideos.length > 0) {
        thumbnailUrl = generation.savedVideos[0].localPath
        mediaType = 'video'
      } else if (generation.savedAudios.length > 0) {
        thumbnailUrl = generation.savedAudios[0].localPath
        mediaType = 'audio'
      }

      return {
        id: generation.id,
        type: generation.type,
        status: generation.status,
        prompt: generation.prompt,
        provider: generation.provider,
        model: generation.model,
        createdAt: generation.createdAt,
        updatedAt: generation.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          credits: user.credits,
          plan: user.plan?.name || 'No Plan',
        },
        thumbnailUrl,
        mediaType,
      }
    })

    return NextResponse.json({
      generations: transformedGenerations,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching generations history:', error)
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch generations history' },
      { status: 500 }
    )
  }
}

