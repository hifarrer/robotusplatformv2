import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateImagePaths() {
  console.log('🔄 Starting image path migration...')
  
  try {
    // Get all images with old paths
    const imagesWithOldPaths = await prisma.savedImage.findMany({
      where: {
        localPath: {
          startsWith: '/uploads/'
        }
      }
    })
    
    console.log(`📊 Found ${imagesWithOldPaths.length} images with old paths`)
    
    if (imagesWithOldPaths.length === 0) {
      console.log('✅ No images need migration')
      return
    }
    
    // Update each image path
    for (const image of imagesWithOldPaths) {
      const oldPath = image.localPath
      const fileName = image.fileName
      
      // Convert old path to new API path
      const newPath = `/api/serve-file/images/${fileName}`
      
      console.log(`🔄 Migrating: ${oldPath} -> ${newPath}`)
      
      await prisma.savedImage.update({
        where: { id: image.id },
        data: { localPath: newPath }
      })
    }
    
    console.log('✅ Image path migration completed successfully')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function migrateVideoPaths() {
  console.log('🔄 Starting video path migration...')
  
  try {
    // Get all videos with old paths
    const videosWithOldPaths = await prisma.savedVideo.findMany({
      where: {
        localPath: {
          startsWith: '/uploads/'
        }
      }
    })
    
    console.log(`📊 Found ${videosWithOldPaths.length} videos with old paths`)
    
    if (videosWithOldPaths.length === 0) {
      console.log('✅ No videos need migration')
      return
    }
    
    // Update each video path
    for (const video of videosWithOldPaths) {
      const oldPath = video.localPath
      const fileName = video.fileName
      
      // Convert old path to new API path
      const newPath = `/api/serve-file/videos/${fileName}`
      
      console.log(`🔄 Migrating: ${oldPath} -> ${newPath}`)
      
      await prisma.savedVideo.update({
        where: { id: video.id },
        data: { localPath: newPath }
      })
    }
    
    console.log('✅ Video path migration completed successfully')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migrations
async function main() {
  console.log('🚀 Starting media path migration...')
  
  await migrateImagePaths()
  await migrateVideoPaths()
  
  console.log('🎉 All migrations completed!')
}

main().catch(console.error)
