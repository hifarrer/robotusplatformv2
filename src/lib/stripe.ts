import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

export const getStripeCustomerId = async (userId: string, email: string): Promise<string> => {
  console.log('👤 [STRIPE] Getting/creating customer for:', { userId, email })
  
  try {
    // Search for existing customer by metadata
    console.log('🔍 [STRIPE] Searching for existing customer...')
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    })

    if (existingCustomers.data.length > 0) {
      console.log('✅ [STRIPE] Found existing customer:', existingCustomers.data[0].id)
      return existingCustomers.data[0].id
    }

    // Create new customer
    console.log('➕ [STRIPE] Creating new customer...')
    const customer = await stripe.customers.create({
      email,
      metadata: {
        userId,
      },
    })
    console.log('✅ [STRIPE] Created new customer:', customer.id)

    return customer.id
  } catch (error) {
    console.error('❌ [STRIPE] Error in getStripeCustomerId:', error)
    throw error
  }
}

export const createCheckoutSession = async ({
  priceId,
  userId,
  email,
  successUrl,
  cancelUrl,
}: {
  priceId: string
  userId: string
  email: string
  successUrl: string
  cancelUrl: string
}) => {
  console.log('\n💳 [STRIPE] === Creating Checkout Session ===')
  console.log('📋 [STRIPE] Parameters:', {
    priceId,
    userId,
    email,
    successUrl,
    cancelUrl
  })

  try {
    // Get or create customer
    const customerId = await getStripeCustomerId(userId, email)
    console.log('✅ [STRIPE] Customer ID obtained:', customerId)

    // Create checkout session
    console.log('🔨 [STRIPE] Creating checkout session with Stripe API...')
    const sessionParams = {
      customer: customerId,
      mode: 'subscription' as const,
      payment_method_types: ['card'] as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: 'auto' as const,
      metadata: {
        userId,
      },
    }
    
    console.log('📤 [STRIPE] Session parameters:', JSON.stringify(sessionParams, null, 2))
    
    const session = await stripe.checkout.sessions.create(sessionParams)
    
    console.log('✅ [STRIPE] Checkout session created successfully!')
    console.log('🆔 [STRIPE] Session ID:', session.id)
    console.log('🔗 [STRIPE] Session URL:', session.url)
    console.log('💰 [STRIPE] Amount:', session.amount_total ? `${session.amount_total / 100} ${session.currency}` : 'N/A')
    console.log('✨ [STRIPE] === Checkout Session Complete ===\n')

    return session
  } catch (error) {
    console.error('\n❌ [STRIPE] === Error Creating Checkout Session ===')
    console.error('❌ [STRIPE] Error type:', error?.constructor?.name)
    console.error('❌ [STRIPE] Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    // Log Stripe-specific error details
    if (error && typeof error === 'object' && 'type' in error) {
      const stripeError = error as any
      console.error('❌ [STRIPE] Stripe error type:', stripeError.type)
      console.error('❌ [STRIPE] Stripe error code:', stripeError.code)
      console.error('❌ [STRIPE] Stripe error param:', stripeError.param)
      console.error('❌ [STRIPE] Stripe error detail:', stripeError.detail)
    }
    
    console.error('❌ [STRIPE] Full error:', error)
    console.error('❌ [STRIPE] === End Error ===\n')
    throw error
  }
}

