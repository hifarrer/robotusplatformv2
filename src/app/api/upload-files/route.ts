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
      const apiUrl = `/api/temp-files/${fileName}`
      
      // Save file to disk
      await fs.writeFile(filePath, buffer)
      
      // Verify file was created
      try {
        const stats = await fs.stat(filePath)
        console.log('✅ File created successfully:', {
          fileName,
          filePath,
          size: stats.size,
          exists: true
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('❌ File creation failed:', {
          fileName,
          filePath,
          error: message
        })
      }
      
      const fileType = file.type.startsWith('audio/') ? 'audio' : 'image'
      
      // Construct the full URL properly - use API route for better reliability
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      const fullUrl = baseUrl.startsWith('http') ? `${baseUrl}${apiUrl}` : `https://${baseUrl}${apiUrl}`
      
      // For local development, we need a publicly accessible URL
      // Check if we're in development and need to use a tunnel
      const isLocalDev = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')
      
      // If we're in production, make sure the URL is accessible
      if (!isLocalDev) {
        // Test if the file is accessible via API route
        try {
          const testUrl = `${baseUrl}${apiUrl}`
          console.log('🔍 Testing file accessibility via API:', testUrl)
          
          // Test the URL accessibility
          const response = await fetch(testUrl, { method: 'HEAD' })
          console.log('🌐 File accessibility test result:', {
            url: testUrl,
            status: response.status,
            accessible: response.ok
          })
        } catch (error) {
          console.error('❌ File accessibility test failed:', error)
        }
      }
      
      console.log('📁 Uploaded file:', {
        fileName,
        publicUrl,
        apiUrl,
        baseUrl,
        fullUrl,
        filePath,
        isLocalDev,
        warning: isLocalDev ? 'Local development - external APIs cannot access localhost URLs' : 'Production - URLs should be accessible via API route'
      })
      
      uploadedFiles.push({
        name: file.name,
        size: file.size,
        type: mimeType,
        fileType,
        url: publicUrl, // Public URL for API
        fullUrl: fullUrl
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