import { promises as fs } from 'fs'
import path from 'path'
import axios from 'axios'
import sharp from 'sharp'
import { prisma } from './prisma'

// Use Render's persistent disk storage in production, fallback to public/uploads in development
const isProduction = process.env.NODE_ENV === 'production'
// Check if /temp-uploads directory exists (Render's persistent disk mount)
let isRender = false
try {
  const fs = require('fs')
  isRender = fs.existsSync('/temp-uploads')
  if (!isRender && isProduction) {
    // Fallback to environment variable checks
    isRender = Boolean(
      process.env.RENDER === 'true' || 
      process.env.RENDER_SERVICE_NAME || 
      process.env.RENDER_INSTANCE_ID ||
      process.env.RENDER_EXTERNAL_URL
    )
  }
} catch (error) {
  // If fs check fails, fall back to environment variables
  isRender = Boolean(
    process.env.RENDER === 'true' || 
    process.env.RENDER_SERVICE_NAME || 
    process.env.RENDER_INSTANCE_ID ||
    process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === 'production' && !process.env.VERCEL)
  )
}
const UPLOADS_DIR = isRender 
  ? '/temp-uploads' 
  : path.join(process.cwd(), 'public', 'uploads')
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images')
const VIDEOS_DIR = path.join(UPLOADS_DIR, 'videos')
const AUDIOS_DIR = path.join(UPLOADS_DIR, 'audios')

// Debug logging
console.log('🔧 Media Storage Config:', {
  NODE_ENV: process.env.NODE_ENV,
  RENDER: process.env.RENDER,
  RENDER_SERVICE_NAME: process.env.RENDER_SERVICE_NAME,
  RENDER_INSTANCE_ID: process.env.RENDER_INSTANCE_ID,
  RENDER_EXTERNAL_URL: process.env.RENDER_EXTERNAL_URL,
  VERCEL: process.env.VERCEL,
  '/temp-uploads exists': (() => { try { return require('fs').existsSync('/temp-uploads') } catch { return 'unknown' } })(),
  isProduction,
  isRender,
  UPLOADS_DIR,
  IMAGES_DIR,
  VIDEOS_DIR,
  AUDIOS_DIR
})

// CRITICAL: Verify we're using Render paths in production
if (isProduction && !isRender) {
  console.error('⚠️ WARNING: Running in production but isRender is false! Images may not be saved correctly.')
  console.error('⚠️ Please ensure RENDER environment variable is set or /temp-uploads mount exists.')
}

// Ensure upload directories exist
async function ensureDirectories() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  await fs.mkdir(IMAGES_DIR, { recursive: true })
  await fs.mkdir(VIDEOS_DIR, { recursive: true })
  await fs.mkdir(AUDIOS_DIR, { recursive: true })
}

export async function downloadAndSaveImage(
  userId: string,
  imageUrl: string,
  prompt: string,
  generationId?: string,
  title?: string
): Promise<string> {
  try {
    await ensureDirectories()

    // Download the image
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 seconds timeout
    })

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const fileName = `${timestamp}_${randomId}.webp`
    const filePath = path.join(IMAGES_DIR, fileName)
    const relativePath = isRender 
      ? `/api/serve-file/images/${fileName}` 
      : `/uploads/images/${fileName}`

    // Convert to WebP and get metadata using Sharp
    const imageBuffer = Buffer.from(response.data)
    const processedImage = await sharp(imageBuffer)
      .webp({ quality: 85 })
      .toBuffer()

    const metadata = await sharp(imageBuffer).metadata()

    // Save the processed image
    await fs.writeFile(filePath, processedImage)

    // Save to database
    const savedImage = await prisma.savedImage.create({
      data: {
        userId,
        title: title || `Generated Image - ${new Date().toLocaleDateString()}`,
        prompt,
        originalUrl: imageUrl,
        localPath: relativePath,
        fileName,
        fileSize: processedImage.length,
        width: metadata.width,
        height: metadata.height,
        mimeType: 'image/webp',
        generationId,
      },
    })

    console.log(`Image saved successfully: ${relativePath}`)
    return savedImage.id
  } catch (error) {
    console.error('Error downloading and saving image:', error)
    throw new Error('Failed to save image')
  }
}

export async function downloadAndSaveVideo(
  userId: string,
  videoUrl: string,
  prompt: string,
  generationId?: string,
  title?: string
): Promise<string> {
  try {
    await ensureDirectories()

    // Download the video
    const response = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 60000, // 60 seconds timeout for videos
    })

    // Generate unique filename
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const fileName = `${timestamp}_${randomId}.mp4`
    const filePath = path.join(VIDEOS_DIR, fileName)
    const relativePath = isRender 
      ? `/api/serve-file/videos/${fileName}` 
      : `/uploads/videos/${fileName}`

    // Save the video stream
    const writer = await fs.open(filePath, 'w')
    const stream = response.data

    await new Promise((resolve, reject) => {
      stream.on('data', async (chunk: Buffer) => {
        await writer.write(chunk)
      })
      stream.on('end', resolve)
      stream.on('error', reject)
    })

    await writer.close()

    // Get file stats
    const stats = await fs.stat(filePath)

    // Save to database
    const savedVideo = await prisma.savedVideo.create({
      data: {
        userId,
        title: title || `Generated Video - ${new Date().toLocaleDateString()}`,
        prompt,
        originalUrl: videoUrl,
        localPath: relativePath,
        fileName,
        fileSize: stats.size,
        mimeType: 'video/mp4',
        generationId,
      },
    })

    console.log(`Video saved successfully: ${relativePath}`)
    return savedVideo.id
  } catch (error) {
    console.error('Error downloading and saving video:', error)
    throw new Error('Failed to save video')
  }
}

export async function getUserImages(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit

  const [images, total] = await Promise.all([
    prisma.savedImage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        generation: {
          select: {
            type: true,
            provider: true,
            model: true,
          },
          // Filter out generations with invalid types
          where: {
            type: {
              in: ['TEXT_TO_IMAGE', 'IMAGE_TO_IMAGE', 'TEXT_TO_VIDEO', 'IMAGE_TO_VIDEO', 'LIPSYNC']
            }
          }
        },
      },
    }),
    prisma.savedImage.count({
      where: { userId },
    }),
  ])

  return {
    images,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + images.length < total,
  }
}

export async function getUserVideos(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit

  const [videos, total] = await Promise.all([
    prisma.savedVideo.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        generation: {
          select: {
            type: true,
            provider: true,
            model: true,
          },
        },
      },
    }),
    prisma.savedVideo.count({
      where: { userId },
    }),
  ])

  return {
    videos,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + videos.length < total,
  }
}

export async function deleteUserImage(userId: string, imageId: string): Promise<boolean> {
  try {
    console.log('🗑️ Deleting image:', { userId, imageId })
    
    const image = await prisma.savedImage.findFirst({
      where: { id: imageId, userId },
    })

    if (!image) {
      console.error('❌ Image not found:', { imageId, userId })
      throw new Error('Image not found')
    }

    console.log('📁 Found image:', { fileName: image.fileName, localPath: image.localPath })

    // Delete file from filesystem
    const fileName = image.fileName
    const fullPath = path.join(IMAGES_DIR, fileName)
    try {
      await fs.unlink(fullPath)
      console.log('✅ File deleted from filesystem:', fullPath)
    } catch (error) {
      console.warn('⚠️ Could not delete file:', fullPath, error)
    }

    // Delete from database
    await prisma.savedImage.delete({
      where: { id: imageId },
    })
    console.log('✅ Image deleted from database:', imageId)

    return true
  } catch (error) {
    console.error('❌ Error deleting image:', error)
    return false
  }
}

export async function deleteUserVideo(userId: string, videoId: string): Promise<boolean> {
  try {
    const video = await prisma.savedVideo.findFirst({
      where: { id: videoId, userId },
    })

    if (!video) {
      throw new Error('Video not found')
    }

    // Delete file from filesystem
    const fileName = video.fileName
    const fullPath = path.join(VIDEOS_DIR, fileName)
    try {
      await fs.unlink(fullPath)
    } catch (error) {
      console.warn('Could not delete file:', fullPath, error)
    }

    // Delete from database
    await prisma.savedVideo.delete({
      where: { id: videoId },
    })

    return true
  } catch (error) {
    console.error('Error deleting video:', error)
    return false
  }
}

export async function saveFile(
  buffer: ArrayBuffer,
  fileName: string,
  type: 'image' | 'video' | 'audio'
): Promise<string> {
  try {
    await ensureDirectories()

    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const finalFileName = `${timestamp}_${randomId}_${fileName}`
    
    let filePath: string
    let relativePath: string
    
    if (type === 'image') {
      filePath = path.join(IMAGES_DIR, finalFileName)
      relativePath = isRender 
        ? `/api/serve-file/images/${finalFileName}` 
        : `/uploads/images/${finalFileName}`
    } else if (type === 'video') {
      filePath = path.join(VIDEOS_DIR, finalFileName)
      relativePath = isRender 
        ? `/api/serve-file/videos/${finalFileName}` 
        : `/uploads/videos/${finalFileName}`
    } else if (type === 'audio') {
      filePath = path.join(AUDIOS_DIR, finalFileName)
      relativePath = isRender 
        ? `/api/serve-file/audios/${finalFileName}` 
        : `/uploads/audios/${finalFileName}`
    } else {
      throw new Error('Invalid file type')
    }

    // Save the file
    await fs.writeFile(filePath, Buffer.from(buffer))

    console.log(`File saved successfully: ${relativePath}`)
    return relativePath
  } catch (error) {
    console.error('Error saving file:', error)
    throw new Error('Failed to save file')
  }
}