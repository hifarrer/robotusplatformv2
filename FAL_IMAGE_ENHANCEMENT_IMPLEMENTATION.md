# FAL.ai Image Enhancement Implementation

This document outlines the implementation of FAL.ai's image enhancement API for adding skin and face details to images with people.

## Overview

The FAL.ai image enhancement feature uses the `fal-ai/topaz/upscale/image` endpoint to enhance images with face and skin detail improvements. The implementation is fully integrated with the existing credit system and follows the same patterns as other AI services in the platform.

## Implementation Details

### 1. Package Installation

**Package:** `@fal-ai/client`

```bash
npm install @fal-ai/client
```

### 2. Environment Variable

Add the following environment variable to your `.env` file:

```env
FAL_API_KEY=your_fal_api_key_here
```

### 3. Database Schema Updates

**File:** `prisma/schema.prisma`

Added `IMAGE_ENHANCEMENT` to the `GenerationType` enum:

```prisma
enum GenerationType {
  TEXT_TO_IMAGE
  IMAGE_TO_IMAGE
  TEXT_TO_VIDEO
  IMAGE_TO_VIDEO
  LIPSYNC
  TEXT_TO_AUDIO
  IMAGE_UPSCALE
  IMAGE_ENHANCEMENT  // New addition
}
```

**Note:** After updating the schema, run:
```bash
npx prisma generate
```

### 4. Credit System Integration

**File:** `src/lib/credit-costs.ts`

- **Cost:** 8 credits per image enhancement
- Added `IMAGE_ENHANCEMENT` to the credit costs configuration
- Updated `calculateGenerationCost()` function to handle image enhancement
- Updated `getCreditCostDescription()` function to display the cost

### 5. FAL.ai Service Implementation

**File:** `src/lib/ai-services.ts`

Created `FalService` class with the following methods:

#### `enhanceImage(imageUrl: string): Promise<string>`
- Enhances an image using FAL.ai's topaz upscale API
- Uses hardcoded parameters as requested:
  - `model`: "Standard V2"
  - `upscale_factor`: 2
  - `output_format`: "jpeg"
  - `subject_detection`: "All"
  - `face_enhancement`: true
  - `face_enhancement_strength`: 0.8
- Returns the URL of the enhanced image
- Includes progress logging via `onQueueUpdate`

#### `getEnhancementStatus(requestId: string): Promise<any>`
- Checks the status of an enhancement request
- Useful for tracking long-running operations

#### `getEnhancementResult(requestId: string): Promise<any>`
- Retrieves the final result of an enhancement request
- Returns the complete response including image details

### 6. API Endpoint

**File:** `src/app/api/enhance-image/route.ts`

**Endpoint:** `POST /api/enhance-image`

**Request Body:**
```json
{
  "imageUrl": "https://example.com/image.jpg",
  "messageId": "message-id",
  "chatId": "chat-id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "generationId": "gen-123",
  "imageUrl": "https://enhanced-image-url.jpg",
  "localPath": "/uploads/images/enhanced_123456789.jpg",
  "savedImageId": "saved-image-123",
  "creditsUsed": 8,
  "creditsRemaining": 112
}
```

**Response (Insufficient Credits):**
```json
{
  "error": "Insufficient credits",
  "required": 8
}
```

**Features:**
- Authentication check (requires valid session)
- Credit validation before processing
- Automatic credit deduction
- Credit refund on failure
- Saves enhanced image to user's collection
- Downloads and stores the enhanced image locally
- Creates generation record for tracking
- Full error handling with detailed logging

### 7. TypeScript Types

**File:** `src/types/index.ts`

Added:
- `IMAGE_ENHANCEMENT` to `GenerationType` union type
- `image_enhancement` to `AIAnalysisResult` action types
- New FAL.ai specific interfaces:
  - `FalEnhanceImageRequest`
  - `FalEnhanceImageResponse`

## Usage Example

### From Client-Side Code

```typescript
async function enhanceImage(imageUrl: string, messageId: string, chatId: string) {
  const response = await fetch('/api/enhance-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      imageUrl,
      messageId,
      chatId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const result = await response.json();
  console.log('Enhanced image URL:', result.imageUrl);
  console.log('Credits used:', result.creditsUsed);
  console.log('Credits remaining:', result.creditsRemaining);
  
  return result;
}
```

### From Server-Side Code

```typescript
import { FalService } from '@/lib/ai-services';

// Direct service usage
const enhancedImageUrl = await FalService.enhanceImage('https://example.com/image.jpg');
console.log('Enhanced image:', enhancedImageUrl);
```

## API Configuration

The FAL.ai client is configured in `src/lib/ai-services.ts`:

```typescript
import { fal } from '@fal-ai/client';

const FAL_API_KEY = process.env.FAL_API_KEY!;

if (FAL_API_KEY) {
  fal.config({
    credentials: FAL_API_KEY,
  });
}
```

## Error Handling

The implementation includes comprehensive error handling:

1. **Missing API Key:** Returns error if `FAL_API_KEY` is not set
2. **Authentication:** Returns 401 if user is not authenticated
3. **Insufficient Credits:** Returns 402 with required credit amount
4. **Enhancement Failure:** Returns 500 with error message and refunds credits
5. **Download Failure:** Returns 500 if enhanced image cannot be downloaded

## Credit System Flow

1. **Pre-Check:** Validates user has enough credits (8 credits required)
2. **Deduction:** Deducts credits before processing
3. **Processing:** Calls FAL.ai API to enhance image
4. **Refund on Failure:** Automatically refunds credits if enhancement fails
5. **Transaction Record:** Creates credit transaction record for tracking

## Database Records

The endpoint creates/updates the following database records:

1. **Generation Record:**
   - Type: `IMAGE_ENHANCEMENT`
   - Provider: `fal-ai`
   - Model: `topaz/upscale/image`
   - Status: `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`

2. **Saved Image Record:**
   - Links to the generation record
   - Stores both remote and local paths
   - Includes metadata (file size, dimensions, etc.)

3. **Credit Transaction:**
   - Records credit deduction
   - Includes generation type for reporting

## Testing

To test the implementation:

1. Ensure `FAL_API_KEY` is set in your environment
2. Have a valid user session with sufficient credits
3. Call the endpoint with a valid image URL:

```bash
curl -X POST http://localhost:3000/api/enhance-image \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://example.com/image.jpg",
    "messageId": "msg-123",
    "chatId": "chat-123"
  }'
```

## Logging

The implementation includes detailed logging:

- 🎨 Enhancement start/completion
- 📊 Status checks and results
- 💳 Credit deductions and refunds
- ❌ Errors with full stack traces

All logs are prefixed with emoji indicators for easy filtering.

## ✅ UI Integration Complete

### Enhance Button Integration

The Enhance button has been successfully added to the chat interface for all generated images:

**Location:** `src/components/chat-interface.tsx`

1. **Button Placement:** The Enhance button appears alongside Upscale, Edit, and Generate Video buttons for completed image generations
2. **Icon:** Uses the `Sparkles` icon from lucide-react
3. **Functionality:** Clicking the button calls the `enhanceImage()` function which:
   - Extracts the image URL from the generation
   - Adds a loading message to the chat
   - Calls the `/api/chat` endpoint with action "enhance"
   - Handles success and error responses
   - Refreshes user credits after enhancement

### AI Orchestrator Integration

The AI orchestrator now detects when users type "enhance" in their prompts:

**Location:** `src/lib/ai-orchestrator.ts`

**Detected Keywords:**
- "enhance"
- "enhancement"
- "better quality"
- "face details"
- "skin details"
- "improve face"
- "improve skin"
- "hyperreal"
- "hyper real"
- "hyper realistic"
- "hyperrealistic"

**Behavior:**
- With image attached/selected: Triggers `image_enhancement` action
- Without image: Returns helpful message asking user to provide an image
- Works with recent image context (e.g., "enhance the previous image")

### Chat API Integration

The chat API now handles enhance requests alongside upscale requests:

**Location:** `src/app/api/chat/route.ts`

**Handler:** `handleEnhanceRequest()`

**Process:**
1. Validates session and credits
2. Creates/retrieves chat conversation
3. Creates assistant message with status update
4. Calls `/api/enhance-image` endpoint internally
5. Returns response with generation results
6. Handles errors gracefully with credit refunds

## Usage Examples

### Via Button

1. Generate an image using text-to-image
2. Click the **Enhance** button below the generated image
3. Wait for processing (typically 10-30 seconds)
4. Enhanced image appears in chat with improved face and skin details

### Via Chat Prompt

**With attached image:**
```
User: [uploads image] Enhance this image
AI: ✨ I'm enhancing your image with face and skin details...
```

**With recent generation:**
```
User: Create a portrait of a woman
AI: [generates image]
User: Enhance
AI: ✨ I'm enhancing your image with face and skin details...

# Or use alternative keywords:
User: make it hyperreal
AI: ✨ I'm enhancing your image with face and skin details...

User: make it hyper realistic
AI: ✨ I'm enhancing your image with face and skin details...
```

**With library selection:**
```
User: [selects image from library] enhance it
AI: ✨ I'm enhancing your image with face and skin details...
```

## Next Steps (Optional Future Enhancements)

1. **Batch Processing:** Support enhancing multiple images at once
2. **Progress Tracking:** Add real-time progress updates via WebSockets
3. **Quality Options:** Allow users to choose enhancement strength
4. **Preview:** Show before/after comparison
5. **Auto-Enhance:** Option to automatically enhance all generated portraits

## Files Modified

1. `package.json` - Added `@fal-ai/client` dependency
2. `prisma/schema.prisma` - Added `IMAGE_ENHANCEMENT` to enum
3. `src/lib/credit-costs.ts` - Added credit costs and calculations
4. `src/lib/ai-services.ts` - Added `FalService` class
5. `src/types/index.ts` - Added TypeScript types
6. `src/app/api/enhance-image/route.ts` - New API endpoint (created)
7. `src/components/chat-interface.tsx` - Added Enhance button and `enhanceImage()` function
8. `src/lib/ai-orchestrator.ts` - Added enhancement keyword detection
9. `src/app/api/chat/route.ts` - Added `handleEnhanceRequest()` function

## Cost Summary

- **Per Enhancement:** 8 credits
- **Processing Time:** Typically 10-30 seconds (handled synchronously via `fal.subscribe`)
- **Output:** JPEG format at 2x upscale factor

## Notes

- The FAL.ai service uses the `subscribe` method which handles the queuing and waiting automatically
- All parameters except `image_url` are hardcoded as requested
- The service includes comprehensive error handling and credit refunding
- Enhanced images are automatically saved to the user's collection
- Local copies are stored for faster access and backup

---

**Implementation Date:** October 16, 2025  
**Status:** ✅ Complete and Ready to Use

## Summary

The FAL.ai image enhancement feature is now fully integrated into the Robotus platform with:

✅ Backend API integration with FAL.ai  
✅ Credit system (8 credits per enhancement)  
✅ UI button on all generated images  
✅ AI orchestrator keyword detection  
✅ Chat API handler for seamless integration  
✅ Error handling and automatic refunds  
✅ Database tracking and storage  

Users can enhance images by:
- Clicking the Enhance button on generated images
- Typing "enhance" with an attached or selected image
- Referencing previous images ("enhance the previous image")

The feature uses FAL.ai's topaz upscale model with optimized parameters for face and skin detail enhancement at 2x upscale factor.

