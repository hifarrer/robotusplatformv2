import { NextRequest, NextResponse } from 'next/server'
import { promises as fs, existsSync } from 'fs'
import path from 'path'

// Check if /temp-uploads directory exists (Render's persistent disk mount)
let isRender = false
try {
  isRender = existsSync('/temp-uploads')
  if (!isRender && process.env.NODE_ENV === 'production') {
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
const UPLOADS_DIR = isRender ? '/temp-uploads' : path.join(process.cwd(), 'public', 'uploads')

console.log('🔧 Serve File Config:', {
  isRender,
  UPLOADS_DIR,
  '/temp-uploads exists': (() => { try { return existsSync('/temp-uploads') } catch { return 'unknown' } })()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; filename: string }> }
) {
  try {
    const { type, filename } = await params

    // Validate file type
    if (!['images', 'videos', 'audios'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid file type' },
        { status: 400 }
      )
    }

    // Construct file path
    const filePath = path.join(UPLOADS_DIR, type, filename)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch (error) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileBuffer = await fs.readFile(filePath)
    
    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase()
    let contentType = 'application/octet-stream'
    
    if (ext === '.webp') {
      contentType = 'image/webp'
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg'
    } else if (ext === '.png') {
      contentType = 'image/png'
    } else if (ext === '.mp4') {
      contentType = 'video/mp4'
    } else if (ext === '.webm') {
      contentType = 'video/webm'
    } else if (ext === '.mp3') {
      contentType = 'audio/mpeg'
    } else if (ext === '.wav') {
      contentType = 'audio/wav'
    } else if (ext === '.ogg') {
      contentType = 'audio/ogg'
    }

    // Return file with appropriate headers
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
