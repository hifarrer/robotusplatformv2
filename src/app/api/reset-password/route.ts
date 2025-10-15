import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Find the password reset token
    const resetToken = await prisma.verificationToken.findUnique({
      where: { token: `reset_${token}` },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired password reset token' },
        { status: 400 }
      )
    }

    // Check if token is expired
    if (resetToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { token: `reset_${token}` },
      })
      
      return NextResponse.json(
        { error: 'Password reset token has expired' },
        { status: 400 }
      )
    }

    // Find user by email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: resetToken.identifier },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Update user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    // Clean up the password reset token
    await prisma.verificationToken.delete({
      where: { token: `reset_${token}` },
    })

    return NextResponse.json(
      { message: 'Password reset successfully' },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
