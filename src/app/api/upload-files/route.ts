import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { promises as fs } from 'fs'
import path from 'path'

const TEMP_UPLOADS_DIR = path.join(process.cwd(), 'public', 'temp-uploads')

// Ensure temp upload directory exists
async function ensureTempDirectory() {
  await fs.mkdir(TEMP_UPLOADS_DIR, { recursive: true })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    await ensureTempDirectory()
    const uploadedFiles = []

    for (const file of files) {
      // Validate file type - images and audio
      const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      const supportedAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
      const allSupportedTypes = [...supportedImageTypes, ...supportedAudioTypes]
      
      if (!allSupportedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} format not supported. Please use JPEG, PNG, WebP for images or MP3, WAV, M4A for audio.` },
          { status: 400 }
        )
      }

      // Validate file size (max 25MB for audio, 10MB for images)
      const maxSize = file.type.startsWith('audio/') ? 25 * 1024 * 1024 : 10 * 1024 * 1024
      if (file.size > maxSize) {
        const maxSizeText = file.type.startsWith('audio/') ? '25MB' : '10MB'
        return NextResponse.json(
          { error: `File ${file.name} is too large (max ${maxSizeText})` },
          { status: 400 }
        )
      }

      // Convert to buffer
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = file.type
      
      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const extension = file.name.split('.').pop() || (file.type.startsWith('audio/') ? 'mp3' : 'jpg')
      const fileName = `temp_${timestamp}_${randomId}.${extension}`
      const filePath = path.join(TEMP_UPLOADS_DIR, fileName)
      const publicUrl = `/temp-uploads/${fileName}`
      
      // Save file to disk
      await fs.writeFile(filePath, buffer)
      
      const fileType = file.type.startsWith('audio/') ? 'audio' : 'image'
      
      uploadedFiles.push({
        name: file.name,
        size: file.size,
        type: mimeType,
        fileType,
        url: publicUrl, // Public URL for API
        fullUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3002'}${publicUrl}`
      })
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    })

  } catch (error) {
    console.error('Upload files error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}