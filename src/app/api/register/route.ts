import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendVerificationEmail } from '@/lib/resend'
import crypto from 'crypto'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user (without email verification initially)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        emailVerified: null, // Email not verified yet
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      }
    })

    // Create verification token
    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token: verificationToken,
        expires: tokenExpires,
      },
    })

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken, name)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email sending fails
    }

    return NextResponse.json(
      { 
        message: 'User created successfully. Please check your email to verify your account.', 
        user,
        requiresVerification: true
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}