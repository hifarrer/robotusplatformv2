# Stripe Integration Setup Guide

## Environment Variables Required

Add the following environment variables to your `.env` file:

```env
# Stripe Secret Key (from Stripe Dashboard -> Developers -> API keys)
STRIPE_SECRET_KEY=sk_test_...

# Stripe Webhook Secret (from Stripe Dashboard -> Developers -> Webhooks)
# This will be generated after you create the webhook endpoint
STRIPE_WEBHOOK_SECRET=whsec_...

# Your application URL (for redirects)
NEXTAUTH_URL=http://localhost:3000
```

## Setup Instructions

### 1. Get Your Stripe API Keys

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/)
2. Navigate to **Developers** → **API keys**
3. Copy your **Secret key** (starts with `sk_test_` for test mode or `sk_live_` for production)
4. Add it to your `.env` file as `STRIPE_SECRET_KEY`

### 2. Create Products and Prices in Stripe

For each plan (Basic, Premium, etc.):

1. Go to **Products** → **Add Product**
2. Fill in product details:
   - **Name**: e.g., "Basic Plan", "Premium Plan"
   - **Description**: Plan description
3. Create two prices for each product:
   - **Monthly Price**: Recurring, billed monthly
   - **Yearly Price**: Recurring, billed annually
4. Copy the **Price ID** for each (starts with `price_...`)
5. Add these Price IDs to your plans in the Admin Dashboard:
   - Monthly Price ID → `stripeMonthlyPriceId`
   - Yearly Price ID → `stripeYearlyPriceId`

### 3. Set Up Webhook Endpoint

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set endpoint URL to: `https://your-domain.com/api/stripe-webhook`
   - For local testing, use a tool like [ngrok](https://ngrok.com/) or [Stripe CLI](https://stripe.com/docs/stripe-cli)
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_...`)
6. Add it to your `.env` file as `STRIPE_WEBHOOK_SECRET`

### 4. Testing Locally with Stripe CLI (Optional)

For local development, you can use the Stripe CLI:

```bash
# Install Stripe CLI
# On Windows: Download from https://github.com/stripe/stripe-cli/releases
# On Mac: brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe-webhook
```

The CLI will output a webhook signing secret that you can use for `STRIPE_WEBHOOK_SECRET`.

## How It Works

### Payment Flow

1. User clicks "Subscribe Now" on a plan
2. System creates a Stripe Checkout session
3. User is redirected to Stripe's hosted checkout page
4. User enters payment details and completes payment
5. Stripe redirects back to your app with success/cancel status
6. Webhook receives `checkout.session.completed` event
7. System updates user's plan and adds credits

### Webhook Events Handled

- **checkout.session.completed**: Initial subscription purchase - updates plan and adds credits
- **invoice.payment_succeeded**: Subscription renewal - adds credits for new billing period
- **customer.subscription.updated**: Plan changes (upgrade/downgrade)
- **customer.subscription.deleted**: Subscription cancellation - moves user to Free plan
- **invoice.payment_failed**: Payment failure notification

### Security

- Webhook signatures are verified using `STRIPE_WEBHOOK_SECRET`
- All requests require authentication via NextAuth
- User IDs are stored in Stripe customer metadata for tracking

## Testing

### Test Cards

Use Stripe test cards for testing:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Authentication Required**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work.

## Production Checklist

Before going live:

- [ ] Switch from test keys to live keys
- [ ] Update webhook endpoint to production URL
- [ ] Set `NEXTAUTH_URL` to your production domain
- [ ] Test complete payment flow
- [ ] Verify webhook events are being received
- [ ] Enable Stripe radar for fraud prevention
- [ ] Set up proper error alerting/monitoring

## Troubleshooting

### Webhooks Not Working

1. Check webhook URL is accessible from the internet
2. Verify `STRIPE_WEBHOOK_SECRET` is correct
3. Check webhook event logs in Stripe Dashboard
4. Ensure your server is not blocking Stripe IPs

### Payments Not Updating User Plan

1. Check webhook is receiving `checkout.session.completed` event
2. Verify user ID is in session metadata
3. Check database for plan with matching Stripe Price IDs
4. Review server logs for errors

## Support

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe Webhook Testing](https://stripe.com/docs/webhooks/test)

