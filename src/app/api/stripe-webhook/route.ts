import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentSucceeded(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  
  if (!userId) {
    console.error('No userId in session metadata')
    return
  }

  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  // Get the price ID to find the corresponding plan
  const priceId = subscription.items.data[0]?.price.id
  
  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  // Find the plan with this price ID
  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { stripeMonthlyPriceId: priceId },
        { stripeYearlyPriceId: priceId },
      ],
    },
  })

  if (!plan) {
    console.error('No plan found for price ID:', priceId)
    return
  }

  // Update user with new plan and add credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    console.error('User not found:', userId)
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      planId: plan.id,
      credits: user.credits + plan.credits,
    },
  })

  // Create credit transaction record
  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: plan.credits,
      balance: user.credits + plan.credits,
      type: 'PURCHASE',
      description: `Subscribed to ${plan.name} plan`,
      metadata: {
        subscriptionId,
        priceId,
        planName: plan.name,
      },
    },
  })

  console.log(`User ${userId} subscribed to ${plan.name} plan`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id
  
  if (!customerId) {
    console.error('No customer ID found in subscription')
    return
  }

  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer.deleted) {
    console.error('Customer was deleted')
    return
  }

  const userId = customer.metadata?.userId
  
  if (!userId) {
    console.error('No userId in customer metadata')
    return
  }

  // Handle subscription changes (upgrade/downgrade)
  const priceId = subscription.items.data[0]?.price.id
  
  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { stripeMonthlyPriceId: priceId },
        { stripeYearlyPriceId: priceId },
      ],
    },
  })

  if (plan) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        planId: plan.id,
      },
    })
    console.log(`User ${userId} subscription updated to ${plan.name}`)
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id
  
  if (!customerId) {
    console.error('No customer ID found in subscription')
    return
  }

  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer.deleted) {
    console.error('Customer was deleted')
    return
  }

  const userId = customer.metadata?.userId
  
  if (!userId) {
    console.error('No userId in customer metadata')
    return
  }

  // Find the Free plan
  const freePlan = await prisma.plan.findFirst({
    where: { name: 'Free' },
  })

  if (freePlan) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        planId: freePlan.id,
      },
    })
    console.log(`User ${userId} subscription cancelled, moved to Free plan`)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  // Check if this invoice is for a subscription
  // For subscription invoices, we need to get the subscription from the line items
  const subscriptionItem = invoice.lines?.data?.find(item => item.type === 'subscription')
  
  if (!subscriptionItem || !subscriptionItem.subscription) {
    // This is not a subscription invoice, skip
    return
  }

  const subscriptionId = typeof subscriptionItem.subscription === 'string' 
    ? subscriptionItem.subscription 
    : subscriptionItem.subscription.id

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const customerId = typeof subscription.customer === 'string' 
    ? subscription.customer 
    : subscription.customer?.id
  
  if (!customerId) {
    console.error('No customer ID found in subscription')
    return
  }

  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer.deleted) {
    return
  }

  const userId = customer.metadata?.userId
  
  if (!userId) {
    return
  }

  const priceId = subscription.items.data[0]?.price.id
  
  if (!priceId) {
    return
  }

  const plan = await prisma.plan.findFirst({
    where: {
      OR: [
        { stripeMonthlyPriceId: priceId },
        { stripeYearlyPriceId: priceId },
      ],
    },
  })

  if (!plan) {
    return
  }

  // Add credits for subscription renewal
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })

  if (!user) {
    return
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      credits: user.credits + plan.credits,
    },
  })

  await prisma.creditTransaction.create({
    data: {
      userId,
      amount: plan.credits,
      balance: user.credits + plan.credits,
      type: 'PURCHASE',
      description: `${plan.name} plan subscription renewal`,
      metadata: {
        subscriptionId,
        priceId,
        planName: plan.name,
        invoiceId: invoice.id,
      },
    },
  })

  console.log(`User ${userId} subscription renewed for ${plan.name} plan`)
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Check if this invoice is for a subscription
  // For subscription invoices, we need to get the subscription from the line items
  const subscriptionItem = invoice.lines?.data?.find(item => item.type === 'subscription')
  
  if (!subscriptionItem || !subscriptionItem.subscription) {
    // This is not a subscription invoice, skip
    return
  }

  const subscriptionId = typeof subscriptionItem.subscription === 'string' 
    ? subscriptionItem.subscription 
    : subscriptionItem.subscription.id

  const customerId = typeof invoice.customer === 'string' 
    ? invoice.customer 
    : invoice.customer?.id
  
  if (!customerId) {
    return
  }

  const customer = await stripe.customers.retrieve(customerId)
  
  if (customer.deleted) {
    return
  }

  const userId = customer.metadata?.userId
  
  if (!userId) {
    return
  }

  console.error(`Payment failed for user ${userId}, invoice ${invoice.id}`)
  // You can add additional logic here like sending an email notification
}

