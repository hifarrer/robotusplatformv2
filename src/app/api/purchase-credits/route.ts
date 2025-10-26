import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStripeCustomerId } from '@/lib/stripe'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

// Credit packages configuration
const CREDIT_PACKAGES = {
  'price_1SMKAwFWpOHustkzTtdXKQU0': {
    credits: 250,
    price: 10,
    name: '250 Credits'
  },
  'price_1SMKBVFWpOHustkzvK0oLF2G': {
    credits: 500,
    price: 20,
    name: '500 Credits'
  }
} as const

export async function POST(request: NextRequest) {
  console.log('\n💳 [API] === PURCHASE CREDITS REQUEST ===')
  
  try {
    // Step 1: Check authentication
    console.log('🔐 [API] Step 1: Checking authentication...')
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      console.error('❌ [API] Authentication failed: No user session')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    console.log('✅ [API] User authenticated:', session.user.email)

    // Step 2: Parse request body
    console.log('📥 [API] Step 2: Parsing request body...')
    const { priceId } = await request.json()
    console.log('📋 [API] Request data:', { priceId })

    // Step 3: Validate request data
    console.log('✔️  [API] Step 3: Validating request data...')
    if (!priceId) {
      console.error('❌ [API] Validation failed: Missing priceId')
      return NextResponse.json(
        { error: 'Missing required field: priceId' },
        { status: 400 }
      )
    }

    // Validate priceId is one of our credit packages
    if (!CREDIT_PACKAGES[priceId as keyof typeof CREDIT_PACKAGES]) {
      console.error('❌ [API] Invalid priceId:', priceId)
      return NextResponse.json(
        { error: 'Invalid credit package' },
        { status: 400 }
      )
    }
    console.log('✅ [API] Request data validated')

    // Step 4: Get user from database
    console.log('👤 [API] Step 4: Fetching user from database...')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true }
    })

    if (!user) {
      console.error('❌ [API] User not found:', session.user.email)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has a paid plan (not Free)
    if (!user.plan || user.plan.name === 'Free') {
      console.error('❌ [API] User must have a paid plan to purchase additional credits')
      return NextResponse.json(
        { error: 'Additional credits are only available for paid plan users' },
        { status: 403 }
      )
    }

    console.log('✅ [API] User found:', { 
      id: user.id, 
      email: user.email, 
      plan: user.plan.name,
      currentCredits: user.credits 
    })

    // Step 5: Create Stripe checkout session for one-time payment
    console.log('🔥 [API] Step 5: Creating Stripe checkout session for one-time payment...')
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    console.log('🌐 [API] Base URL:', baseUrl)
    
    const customerId = await getStripeCustomerId(user.id, user.email)
    console.log('✅ [API] Customer ID obtained:', customerId)

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'payment', // One-time payment, not subscription
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/pricing?success=true&type=credits`,
      cancel_url: `${baseUrl}/pricing?canceled=true`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        userId: user.id,
        type: 'credits_purchase',
        priceId,
      },
    }
    
    console.log('📤 [API] Session parameters:', JSON.stringify(sessionParams, null, 2))
    
    const checkoutSession = await stripe.checkout.sessions.create(sessionParams)
    
    console.log('✅ [API] Checkout session created successfully!')
    console.log('🆔 [API] Session ID:', checkoutSession.id)
    console.log('🔗 [API] Session URL:', checkoutSession.url)
    console.log('💰 [API] Amount:', checkoutSession.amount_total ? `${checkoutSession.amount_total / 100} ${checkoutSession.currency}` : 'N/A')
    console.log('✨ [API] === Checkout Session Complete ===\n')

    return NextResponse.json({
      success: true,
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })

  } catch (error) {
    console.error('\n❌ [API] === Error Creating Checkout Session ===')
    console.error('Error details:', error)
    console.error('❌ [API] === End Error ===\n')
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
