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
    const uploadedImages = []

    for (const file of files) {
      // Validate file type - only common image formats
      const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!supportedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} format not supported. Please use JPEG, PNG, or WebP.` },
          { status: 400 }
        )
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large (max 10MB)` },
          { status: 400 }
        )
      }

      // Convert to base64
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const mimeType = file.type
      
      // Generate unique filename
      const timestamp = Date.now()
      const randomId = Math.random().toString(36).substring(2)
      const extension = file.name.split('.').pop() || 'jpg'
      const fileName = `temp_${timestamp}_${randomId}.${extension}`
      const filePath = path.join(TEMP_UPLOADS_DIR, fileName)
      const publicUrl = `/temp-uploads/${fileName}`
      
      // Save file to disk
      await fs.writeFile(filePath, buffer)
      
      // Construct the full URL properly
      const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
      const fullUrl = baseUrl.startsWith('http') ? `${baseUrl}${publicUrl}` : `https://${baseUrl}${publicUrl}`
      
      uploadedImages.push({
        name: file.name,
        size: file.size,
        type: mimeType,
        url: publicUrl, // Public URL for Wavespeed API
        fullUrl: fullUrl
      })
    }

    return NextResponse.json({
      success: true,
      images: uploadedImages,
    })

  } catch (error) {
    console.error('Upload images error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}