# Promo Banner Implementation

## Overview

A flashy promotional banner modal that appears when users have 30 or less credits, offering a 50% discount with the code "WELCOME" for their first month subscription.

## Features

### 🎯 Smart Credit Detection
- Automatically detects when user has ≤30 credits
- Only shows for users who need more credits
- Integrates with existing credits system

### ⏰ 15-Minute Timer Logic
- Modal reappears every 15 minutes if user still has ≤30 credits
- Uses localStorage to track dismissal time
- Respects user's choice to close modal

### 🎨 Flashy Design
- Gradient backgrounds with animated sparkles
- Eye-catching colors and animations
- Mobile-responsive design
- Professional yet attention-grabbing

### 💳 Discount Integration
- Seamlessly integrates with Stripe checkout
- Automatically applies WELCOME discount code
- Visual confirmation on pricing page
- Works with existing subscription system

## Components

### `src/components/promo-banner.tsx`
The main modal component with:
- Animated sparkles and gradients
- Credit balance display
- Upgrade and close buttons
- Mobile-responsive design

### `src/hooks/use-promo-banner.ts`
Custom hook managing:
- Credit threshold checking (≤30 credits)
- 15-minute timer logic
- LocalStorage for dismissal tracking
- Automatic modal triggering

### Integration Points
- **Chat Interface**: Modal appears in main chatbot window
- **Pricing Page**: Discount banner when WELCOME code is active
- **Stripe Checkout**: Automatic discount code application

## Technical Implementation

### Credit Monitoring
```typescript
const CREDIT_THRESHOLD = 30
const TIMER_INTERVAL = 15 * 60 * 1000 // 15 minutes
```

### Timer Logic
- Checks every 15 minutes if user still has ≤30 credits
- Only shows if 15+ minutes have passed since last dismissal
- Uses localStorage to persist dismissal state

### Discount Code Flow
1. User clicks "Upgrade Now" in modal
2. Redirects to `/pricing?discount=WELCOME`
3. Pricing page detects discount parameter
4. Shows discount banner and applies code to checkout
5. Stripe checkout session includes discount

## Usage

The promo banner will automatically appear when:
- User has ≤30 credits
- 15+ minutes have passed since last dismissal
- User is on the main chat interface

## Customization

### Change Credit Threshold
```typescript
// In src/hooks/use-promo-banner.ts
const CREDIT_THRESHOLD = 30 // Change this value
```

### Change Timer Interval
```typescript
// In src/hooks/use-promo-banner.ts
const TIMER_INTERVAL = 15 * 60 * 1000 // Change to desired minutes
```

### Modify Discount Code
```typescript
// In src/hooks/use-promo-banner.ts
const pricingUrl = '/pricing?discount=WELCOME' // Change code here
```

## Testing

To test the promo banner:
1. Set user credits to ≤30
2. Visit the chat interface
3. Modal should appear immediately
4. Close modal and wait 15 minutes (or modify timer for testing)
5. Modal should reappear if credits still ≤30

## Files Modified

- `src/components/chat-interface.tsx` - Added promo banner integration
- `src/app/pricing/page.tsx` - Added discount code handling
- `src/lib/stripe.ts` - Added discount code support
- `src/app/api/create-checkout-session/route.ts` - Pass discount code to Stripe

## Files Created

- `src/components/promo-banner.tsx` - Main modal component
- `src/hooks/use-promo-banner.ts` - Timer and credit logic
- `PROMO_BANNER_IMPLEMENTATION.md` - This documentation

## Future Enhancements

- A/B testing for different discount codes
- Analytics tracking for modal interactions
- Personalized discount codes based on user behavior
- Integration with email marketing campaigns
