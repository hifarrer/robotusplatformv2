import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserImages, deleteUserImage } from '@/lib/media-storage'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')

    const result = await getUserImages(session.user.id, page, limit)

    return NextResponse.json(result)
  } catch (error) {
    console.error('My Images API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE request received')
    
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      console.error('❌ Unauthorized delete request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const imageId = url.searchParams.get('id')
    
    console.log('🔍 Delete request params:', { userId: session.user.id, imageId })

    if (!imageId) {
      console.error('❌ No image ID provided')
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      )
    }

    console.log('🔄 Calling deleteUserImage...')
    const success = await deleteUserImage(session.user.id, imageId)
    console.log('📊 Delete result:', success)

    if (!success) {
      console.error('❌ Delete failed')
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 400 }
      )
    }

    console.log('✅ Delete successful')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Delete image error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}