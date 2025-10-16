import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createCheckoutSession } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  console.log('\n🎯 [API] === CREATE CHECKOUT SESSION REQUEST ===')
  
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
    const { planId, billingCycle } = await request.json()
    console.log('📋 [API] Request data:', { planId, billingCycle })

    // Step 3: Validate request data
    console.log('✔️  [API] Step 3: Validating request data...')
    if (!planId || !billingCycle) {
      console.error('❌ [API] Validation failed: Missing fields', { planId, billingCycle })
      return NextResponse.json(
        { error: 'Missing required fields: planId, billingCycle' },
        { status: 400 }
      )
    }

    if (billingCycle !== 'monthly' && billingCycle !== 'yearly') {
      console.error('❌ [API] Validation failed: Invalid billing cycle:', billingCycle)
      return NextResponse.json(
        { error: 'Invalid billing cycle. Must be "monthly" or "yearly"' },
        { status: 400 }
      )
    }
    console.log('✅ [API] Request data validated')

    // Step 4: Get the plan from database
    console.log('🗃️  [API] Step 4: Fetching plan from database...')
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      console.error('❌ [API] Plan not found:', planId)
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      )
    }
    console.log('✅ [API] Plan found:', {
      id: plan.id,
      name: plan.name,
      stripeMonthlyPriceId: plan.stripeMonthlyPriceId,
      stripeYearlyPriceId: plan.stripeYearlyPriceId
    })

    // Step 5: Get the appropriate Stripe price ID
    console.log('💰 [API] Step 5: Getting Stripe price ID...')
    const priceId = billingCycle === 'monthly' 
      ? plan.stripeMonthlyPriceId 
      : plan.stripeYearlyPriceId

    console.log('💰 [API] Selected price ID:', priceId)
    
    if (!priceId) {
      console.error(`❌ [API] No Stripe ${billingCycle} price ID configured for plan:`, plan.name)
      return NextResponse.json(
        { error: `No Stripe ${billingCycle} price ID configured for this plan` },
        { status: 400 }
      )
    }
    console.log('✅ [API] Price ID found:', priceId)

    // Step 6: Get user from database
    console.log('👤 [API] Step 6: Fetching user from database...')
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      console.error('❌ [API] User not found:', session.user.email)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    console.log('✅ [API] User found:', { id: user.id, email: user.email })

    // Step 7: Create Stripe checkout session
    console.log('🔥 [API] Step 7: Creating Stripe checkout session...')
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    console.log('🌐 [API] Base URL:', baseUrl)
    
    const checkoutSession = await createCheckoutSession({
      priceId,
      userId: user.id,
      email: user.email,
      successUrl: `${baseUrl}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/pricing?canceled=true`,
    })

    console.log('✅ [API] Checkout session created successfully!')
    console.log('🔗 [API] Session URL:', checkoutSession.url)
    console.log('🆔 [API] Session ID:', checkoutSession.id)
    console.log('✨ [API] === REQUEST COMPLETED SUCCESSFULLY ===\n')

    return NextResponse.json({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id 
    })
  } catch (error) {
    console.error('\n❌ [API] === ERROR IN CREATE CHECKOUT SESSION ===')
    console.error('❌ [API] Error type:', error?.constructor?.name)
    console.error('❌ [API] Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('❌ [API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('❌ [API] Full error object:', error)
    console.error('❌ [API] === END ERROR ===\n')
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

