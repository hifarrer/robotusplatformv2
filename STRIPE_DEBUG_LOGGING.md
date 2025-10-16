# Stripe Subscription Debug Logging

## Summary
Added comprehensive logging throughout the Stripe subscription flow to help diagnose issues when clicking the "Subscribe" button on the pricing page.

## What Was Added

### 1. Frontend Logging (`src/app/pricing/page.tsx`)
- ✅ Logs when plans are fetched from the API
- ✅ Logs each plan's details including Stripe price IDs
- ✅ Logs button state (enabled/disabled) and reason for each plan
- ✅ Logs when button is clicked
- ✅ Logs the entire upgrade/checkout session creation flow
- ✅ Logs API responses and any errors

### 2. API Route Logging (`src/app/api/create-checkout-session/route.ts`)
- ✅ Logs each step of the checkout session creation process:
  - Step 1: Authentication check
  - Step 2: Request body parsing
  - Step 3: Request validation
  - Step 4: Plan lookup from database
  - Step 5: Stripe price ID selection
  - Step 6: User lookup from database
  - Step 7: Stripe checkout session creation
- ✅ Detailed error logging with error type, message, and stack trace

### 3. Stripe Library Logging (`src/lib/stripe.ts`)
- ✅ Logs customer lookup/creation process
- ✅ Logs checkout session creation with all parameters
- ✅ Logs Stripe API responses
- ✅ Detailed Stripe-specific error logging (error type, code, param, detail)

## How to Use

### Testing the Subscribe Button

1. **Open your browser's Developer Console** (F12 or right-click → Inspect → Console)

2. **Navigate to the Pricing Page** (`/pricing`)

3. **Watch for logs when the page loads:**
   ```
   📋 [PRICING] Fetching plans...
   ✅ [PRICING] Plans fetched successfully: {...}
   📦 [PRICING] Plan: Basic {...}
   📦 [PRICING] Plan: Premium {...}
   🔘 [PRICING] Rendering plan card: Basic {...}
   🔘 [PRICING] Rendering plan card: Premium {...}
   ```

4. **Check if buttons are disabled:**
   Look for logs showing `isButtonDisabled: true` and the `reason` field:
   - "Current plan" - You're already on this plan
   - "Currently upgrading" - An upgrade is in progress
   - "Missing price IDs" - **This is the likely issue!** The plan doesn't have Stripe price IDs configured
   - "Not disabled" - Button should work

5. **Click the Subscribe button** and watch the console:
   
   **Frontend logs:**
   ```
   🔘 [PRICING] Button clicked for plan: Premium {...}
   ⬆️ [PRICING] Using upgrade flow
   🚀 [PRICING] Starting upgrade process: {...}
   💳 [PRICING] Creating Stripe checkout session for: {...}
   📤 [PRICING] Request body: {...}
   📥 [PRICING] Response status: 200
   📥 [PRICING] Response ok: true
   ✅ [PRICING] Checkout session created: {...}
   🔄 [PRICING] Redirecting to Stripe: https://checkout.stripe.com/...
   ```

   **Server logs (check your terminal):**
   ```
   🎯 [API] === CREATE CHECKOUT SESSION REQUEST ===
   🔐 [API] Step 1: Checking authentication...
   ✅ [API] User authenticated: user@example.com
   📥 [API] Step 2: Parsing request body...
   📋 [API] Request data: { planId: '...', billingCycle: 'monthly' }
   ... (more steps)
   ✅ [API] Checkout session created successfully!
   🔗 [API] Session URL: https://checkout.stripe.com/...
   ✨ [API] === REQUEST COMPLETED SUCCESSFULLY ===
   ```

## Common Issues and Solutions

### Issue 1: Button is Disabled
**Symptom:** Button shows "Subscribe Now" but is disabled (gray/unclickable)

**Check logs for:**
```
🔘 [PRICING] Rendering plan card: Premium {
  ...
  isButtonDisabled: true,
  reason: 'Missing price IDs'
}
```

**Solution:** The plan doesn't have Stripe price IDs configured in the database.
1. Go to Admin Dashboard → Plans Management
2. Find the plan (Basic, Premium, etc.)
3. Click "Edit"
4. Fill in the Stripe Monthly Price ID and/or Yearly Price ID
5. Click "Update Plan"
6. Refresh the pricing page and try again

### Issue 2: No Logs Appear
**Symptom:** Clicking the button does nothing, no logs in console

**Possible causes:**
1. JavaScript error preventing execution - check Console for errors
2. Button is actually disabled - look for `isButtonDisabled: true` in logs
3. Event handler not attached - this would be a code issue

### Issue 3: API Returns Error
**Symptom:** Logs show error response from API

**Check server logs for detailed error:**
```
❌ [API] === ERROR IN CREATE CHECKOUT SESSION ===
❌ [API] Error type: ...
❌ [API] Error message: ...
```

**Common errors:**
- **"No Stripe monthly/yearly price ID configured"** → Add price IDs in admin dashboard
- **"Plan not found"** → Plan was deleted or ID is wrong
- **"Unauthorized"** → User not logged in
- **Stripe errors** → Check STRIPE_SECRET_KEY environment variable

### Issue 4: Stripe API Error
**Symptom:** Logs show Stripe API error

**Check logs for:**
```
❌ [STRIPE] === Error Creating Checkout Session ===
❌ [STRIPE] Stripe error type: ...
❌ [STRIPE] Stripe error code: ...
```

**Common Stripe errors:**
- **"No such price"** → The price ID doesn't exist in your Stripe account
- **"Invalid API key"** → Check your STRIPE_SECRET_KEY environment variable
- **"Test mode vs Live mode mismatch"** → Price ID is for live mode but using test key (or vice versa)

## Environment Variables Check

Make sure these are set in your `.env` or `.env.local`:

```env
STRIPE_SECRET_KEY=sk_test_... or sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXTAUTH_URL=http://localhost:3000 (or your actual domain)
```

## Issue Found and Fixed! ✅

### The Problem
The Stripe checkout session was being created successfully on the backend, but the redirect to Stripe wasn't happening on the frontend. The issue was with the Google Analytics conversion tracking code.

The original code used `gtag_report_conversion()` which only redirected if:
1. Google Analytics (gtag) was loaded
2. The gtag callback executed successfully

If gtag wasn't available or there was a delay, the user would see "Processing..." forever.

### The Solution
Updated the code to:
1. **Track the conversion** (if gtag is available) but don't wait for it
2. **Redirect immediately** using `window.location.href = data.url`
3. Added logging to show when conversion tracking happens vs. when redirect happens

Now the redirect happens regardless of whether Google Analytics is loaded or not!

## Next Steps

1. **Test the subscribe button** - it should now redirect to Stripe checkout immediately
2. **Watch the console logs** to confirm the flow works
3. **Complete a test payment** (use Stripe test cards if in test mode)
4. **Monitor for any new issues** with the detailed logging in place

## Removing Debug Logs (Optional)

Once you've identified and fixed the issue, you can remove or reduce the logging by:
1. Removing `console.log` statements
2. Wrapping them in `if (process.env.NODE_ENV === 'development')` to only log in development
3. Replacing with a proper logging library for production

---

**Note:** All logs use emoji prefixes for easy identification:
- 🚀 = Process starting
- ✅ = Success
- ❌ = Error
- 📋 = Data/info
- 🔘 = Button action
- 💳 = Stripe/payment related
- 🔐 = Authentication
- 👤 = User-related

