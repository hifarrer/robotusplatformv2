import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/resend'
import { z } from 'zod'
import crypto from 'crypto'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = forgotPasswordSchema.parse(body)

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      )
    }

    // Check if user has a password (not OAuth only)
    if (!user.password) {
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent a password reset link.' },
        { status: 200 }
      )
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Delete any existing password reset tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { 
        identifier: email,
        // We'll use a special token format to distinguish password reset from email verification
        token: { startsWith: 'reset_' }
      },
    })

    // Create new password reset token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: `reset_${resetToken}`,
        expires: tokenExpires,
      },
    })

    // Send password reset email
    try {
      await sendPasswordResetEmail(email, resetToken, user.name || 'User')
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send password reset email. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'If an account with that email exists, we have sent a password reset link.' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
