# Credits System Documentation

## Overview

The Robotus AI Platform uses a credit-based system for AI generation operations. Each user is assigned to a plan that determines their credit allocation and pricing.

## Plans

### Free Plan - $0
- **60 Credits** included
- Perfect for getting started with AI content generation

### Basic Plan - $15/month or $210/year
- **500 Credits** per billing cycle
- Ideal for regular content creators
- Save 2 months with annual billing

### Premium Plan - $29/month or $290/year
- **1200 Credits** per billing cycle
- Best for power users and professionals
- Save 2 months with annual billing

## Credit Costs

### Image Generation - 5 Credits
- Text-to-Image
- Image-to-Image (editing)
- Image Upscaling

### Video Generation
- **5 seconds**: 25 credits
- **8-10 seconds**: 50 credits

Applies to:
- Text-to-Video
- Image-to-Video

### Audio Generation - 1 Credit per 15 seconds
- Text-to-Audio (Voice synthesis)
- Calculated based on estimated or actual duration

### Lipsync Generation - 20 Credits per 10 seconds
- Lip-sync video creation from image and audio

## API Endpoints

### GET /api/plans
Get all available plans and user's current plan.

**Response:**
```json
{
  "plans": [
    {
      "id": "plan_id",
      "name": "Free",
      "monthlyPrice": 0,
      "yearlyPrice": 0,
      "credits": 60,
      "description": "Perfect for getting started",
      "isActive": true
    }
  ],
  "currentPlan": { ... },
  "currentCredits": 60
}
```

### GET /api/credits
Get user's credit balance and transaction history.

**Query Parameters:**
- `limit` (optional): Number of transactions to return (default: 50)

**Response:**
```json
{
  "balance": 95,
  "plan": { ... },
  "transactions": [
    {
      "id": "transaction_id",
      "amount": -5,
      "balance": 95,
      "type": "DEBIT",
      "generationType": "TEXT_TO_IMAGE",
      "description": "Image generation",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### GET /api/credit-costs
Get credit costs for all generation types.

**Response:**
```json
{
  "IMAGE_GENERATION": {
    "cost": 5,
    "description": "5 credits per image"
  },
  "VIDEO_GENERATION": {
    "costs": { "5": 25, "8": 50, "10": 50 },
    "description": "25 credits (5s) or 50 credits (8-10s)"
  },
  "AUDIO_GENERATION": {
    "cost": { "base": 1, "per_seconds": 15 },
    "description": "1 credit per 15 seconds"
  },
  "LIPSYNC_GENERATION": {
    "cost": { "base": 20, "per_seconds": 10 },
    "description": "20 credits per 10 seconds"
  }
}
```

### POST /api/upgrade-plan
Upgrade user's plan.

**Request Body:**
```json
{
  "planName": "Basic",
  "billingCycle": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "plan": { ... },
  "credits": 620
}
```

## Database Schema

### Plan Model
```prisma
model Plan {
  id              String   @id @default(cuid())
  name            String   @unique
  monthlyPrice    Float
  yearlyPrice     Float
  credits         Int
  description     String?
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  users           User[]
}
```

### User Model (Credits Fields)
```prisma
model User {
  credits       Int              @default(120)
  planId        String?
  plan          Plan?            @relation(fields: [planId], references: [id])
  transactions  CreditTransaction[]
}
```

### CreditTransaction Model
```prisma
model CreditTransaction {
  id              String           @id @default(cuid())
  userId          String
  amount          Int
  balance         Int
  type            TransactionType
  generationType  GenerationType?
  description     String
  metadata        Json?
  createdAt       DateTime         @default(now())
  user            User             @relation(fields: [userId], references: [id])
}
```

## Credit Management Functions

### `checkAndDeductCreditsForGeneration()`
Check if user has enough credits and deduct them for a generation.

```typescript
const result = await checkAndDeductCreditsForGeneration(
  userId,
  'TEXT_TO_IMAGE'
)

if (!result.success) {
  // Handle insufficient credits
  console.log(result.error)
  console.log(`Required: ${result.cost}`)
}
```

### `refundCredits()`
Refund credits to user (e.g., on generation failure).

```typescript
await refundCredits(
  userId,
  cost,
  'Refund for failed generation'
)
```

### `upgradePlan()`
Upgrade user to a new plan and add credits.

```typescript
const result = await upgradePlan(
  userId,
  'Premium',
  'yearly'
)
```

## Error Handling

### Insufficient Credits (402)
When a user doesn't have enough credits, APIs return a 402 status code:

```json
{
  "error": "Insufficient credits. Required: 5",
  "required": 5
}
```

### Handling in UI
Display clear messages to users about credit requirements and provide upgrade options.

## Seeding Plans

To seed the database with plans:

```bash
npm run seed:plans
```

This will:
1. Create/update all three plans
2. Assign all existing users to the Free plan
3. Set their credits to 120

## Future Enhancements

- [ ] Credit purchase without plan upgrade
- [ ] Credit expiration dates
- [ ] Credit rollover policies
- [ ] Referral credits
- [ ] Promotional credits
- [ ] Usage analytics dashboard

