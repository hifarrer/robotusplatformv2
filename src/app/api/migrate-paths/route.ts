import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔄 Starting image path migration...')
    
    // Get all images with old paths
    const imagesWithOldPaths = await prisma.savedImage.findMany({
      where: {
        localPath: {
          startsWith: '/uploads/'
        }
      }
    })
    
    console.log(`📊 Found ${imagesWithOldPaths.length} images with old paths`)
    
    let migratedImages = 0
    let migratedVideos = 0
    
    // Update each image path
    for (const image of imagesWithOldPaths) {
      const oldPath = image.localPath
      const fileName = image.fileName
      
      // Convert old path to new API path
      const newPath = `/api/serve-file/images/${fileName}`
      
      console.log(`🔄 Migrating image: ${oldPath} -> ${newPath}`)
      
      await prisma.savedImage.update({
        where: { id: image.id },
        data: { localPath: newPath }
      })
      
      migratedImages++
    }
    
    // Get all videos with old paths
    const videosWithOldPaths = await prisma.savedVideo.findMany({
      where: {
        localPath: {
          startsWith: '/uploads/'
        }
      }
    })
    
    console.log(`📊 Found ${videosWithOldPaths.length} videos with old paths`)
    
    // Update each video path
    for (const video of videosWithOldPaths) {
      const oldPath = video.localPath
      const fileName = video.fileName
      
      // Convert old path to new API path
      const newPath = `/api/serve-file/videos/${fileName}`
      
      console.log(`🔄 Migrating video: ${oldPath} -> ${newPath}`)
      
      await prisma.savedVideo.update({
        where: { id: video.id },
        data: { localPath: newPath }
      })
      
      migratedVideos++
    }
    
    console.log(`✅ Migration completed: ${migratedImages} images, ${migratedVideos} videos`)
    
    return NextResponse.json({
      success: true,
      migratedImages,
      migratedVideos,
      message: `Successfully migrated ${migratedImages} images and ${migratedVideos} videos`
    })
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
