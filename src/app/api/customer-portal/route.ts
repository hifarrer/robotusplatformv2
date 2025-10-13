import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/customer-portal
 * Create Stripe customer portal session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is on a paid plan
    if (!user.plan || user.plan.name === 'Free') {
      return NextResponse.json(
        { error: 'No active subscription to manage' },
        { status: 400 }
      )
    }

    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXTAUTH_URL}/pricing`,
    })

    return NextResponse.json({
      success: true,
      url: portalSession.url,
    })
  } catch (error) {
    console.error('Error creating customer portal session:', error)
    return NextResponse.json(
      { error: 'Failed to create customer portal session' },
      { status: 500 }
    )
  }
}

async function getStripeCustomerId(userId: string, email: string): Promise<string> {
  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email: email,
    limit: 1,
  })

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id
  }

  // Create new customer if not found
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  })

  return customer.id
}
