import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // In a real implementation, you might want to:
    // 1. Invalidate the session in the database
    // 2. Clear any server-side session data
    // 3. Log the logout event
    
    return NextResponse.json({ 
      message: 'Logged out successfully',
      redirect: '/auth/signin'
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Handle GET requests for logout (redirect to signin)
  return NextResponse.redirect(new URL('/auth/signin', request.url))
}
