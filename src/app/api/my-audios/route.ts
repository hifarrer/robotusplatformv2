import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const [audios, total] = await Promise.all([
      prisma.savedAudio.findMany({
        where: {
          userId: session.user.id
        },
        include: {
          generation: {
            select: {
              type: true,
              provider: true,
              model: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      }),
      prisma.savedAudio.count({
        where: {
          userId: session.user.id
        }
      })
    ])

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      audios,
      total,
      page,
      totalPages,
      hasMore: page < totalPages
    })

  } catch (error: any) {
    console.error('Error fetching audios:', error)
    return NextResponse.json({ error: 'Failed to fetch audios' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const audioId = searchParams.get('id')

    if (!audioId) {
      return NextResponse.json({ error: 'Audio ID is required' }, { status: 400 })
    }

    // Verify the audio belongs to the user
    const audio = await prisma.savedAudio.findFirst({
      where: {
        id: audioId,
        userId: session.user.id
      }
    })

    if (!audio) {
      return NextResponse.json({ error: 'Audio not found' }, { status: 404 })
    }

    // Delete the audio
    await prisma.savedAudio.delete({
      where: {
        id: audioId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Error deleting audio:', error)
    return NextResponse.json({ error: 'Failed to delete audio' }, { status: 500 })
  }
}
