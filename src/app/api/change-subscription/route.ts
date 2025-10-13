import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

/**
 * POST /api/change-subscription
 * Change user's subscription (upgrade/downgrade)
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

    const body = await request.json()
    const { planId, billingCycle } = body

    if (!planId || !billingCycle) {
      return NextResponse.json(
        { error: 'Plan ID and billing cycle are required' },
        { status: 400 }
      )
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }

    // Get the target plan
    const targetPlan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!targetPlan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }

    // Check if user is trying to change to the same plan
    if (user.planId === planId) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      )
    }

    // If switching to Free plan, cancel subscription
    if (targetPlan.name === 'Free') {
      return await handleDowngradeToFree(user)
    }

    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    })

    if (subscriptions.data.length === 0) {
      // No active subscription, create new one
      return await createNewSubscription(user, targetPlan, billingCycle)
    }

    // Update existing subscription
    return await updateExistingSubscription(user, targetPlan, billingCycle, subscriptions.data[0])
  } catch (error) {
    console.error('Error changing subscription:', error)
    return NextResponse.json(
      { error: 'Failed to change subscription' },
      { status: 500 }
    )
  }
}

async function handleDowngradeToFree(user: any) {
  try {
    // Get Stripe customer ID
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    })

    if (subscriptions.data.length > 0) {
      // Cancel the subscription
      await stripe.subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true,
      })
    }

    // Find the Free plan
    const freePlan = await prisma.plan.findFirst({
      where: { name: 'Free' },
    })

    if (freePlan) {
      // Update user to Free plan
      await prisma.user.update({
        where: { id: user.id },
        data: {
          planId: freePlan.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully downgraded to Free plan. Your subscription will be cancelled at the end of the current billing period.',
    })
  } catch (error) {
    console.error('Error downgrading to free:', error)
    return NextResponse.json(
      { error: 'Failed to downgrade to free plan' },
      { status: 500 }
    )
  }
}

async function createNewSubscription(user: any, targetPlan: any, billingCycle: string) {
  try {
    const priceId = billingCycle === 'monthly' 
      ? targetPlan.stripeMonthlyPriceId 
      : targetPlan.stripeYearlyPriceId

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not found for this plan and billing cycle' },
        { status: 400 }
      )
    }

    // Create checkout session for new subscription
    const customerId = await getStripeCustomerId(user.id, user.email)
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXTAUTH_URL}/pricing?success=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId: user.id,
      },
    })

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    })
  } catch (error) {
    console.error('Error creating new subscription:', error)
    return NextResponse.json(
      { error: 'Failed to create new subscription' },
      { status: 500 }
    )
  }
}

async function updateExistingSubscription(user: any, targetPlan: any, billingCycle: string, subscription: any) {
  try {
    const priceId = billingCycle === 'monthly' 
      ? targetPlan.stripeMonthlyPriceId 
      : targetPlan.stripeYearlyPriceId

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not found for this plan and billing cycle' },
        { status: 400 }
      )
    }

    // Update the subscription
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: priceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription updated successfully',
    })
  } catch (error) {
    console.error('Error updating subscription:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription' },
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
