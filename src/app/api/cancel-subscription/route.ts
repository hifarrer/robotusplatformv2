import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/cancel-subscription
 * Cancel user's subscription
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
        { error: 'No active subscription to cancel' },
        { status: 400 }
      )
    }

    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    // Cancel the subscription
    const subscription = subscriptions.data[0]
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription will be cancelled at the end of the current billing period',
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cancel-subscription
 * Get subscription status and cancellation info
 */
export async function GET(request: NextRequest) {
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
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
      })
    }

    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    })

    if (subscriptions.data.length === 0) {
      return NextResponse.json({
        hasActiveSubscription: false,
        subscription: null,
      })
    }

    const subscription = subscriptions.data[0]
    
    return NextResponse.json({
      hasActiveSubscription: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end,
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end,
        cancelAt: (subscription as any).canceled_at,
      },
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
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