# AI-Powered Safety Compliance Checker

## Overview

An AI-powered content moderation system that uses OpenAI to analyze user prompts for unsafe content **before** any generation occurs. This ensures the platform remains safe and compliant with content policies.

## Implementation Date
October 16, 2025

## How It Works

### 1. Validation Flow

```
User submits prompt
    ↓
Profanity filter (keyword-based)
    ↓
AI Safety Check (OpenAI-powered)
    ↓
If SAFE → Continue with generation
If UNSAFE → Block and show error
```

### 2. What Gets Checked

The AI analyzes prompts for:
- ✅ Violence, gore, or brutal content
- ✅ Minor abuse or exploitation (anyone under 18)
- ✅ Pedophilia or CSAM
- ✅ Zoophilia or bestiality
- ✅ Self-harm or suicide content
- ✅ Illegal activities
- ✅ Hate speech or discrimination
- ✅ Sexual violence or non-consensual acts
- ✅ Extreme or graphic violence
- ✅ Terrorism or extremism

### 3. When It Runs

**✅ Runs for:**
- User-typed prompts for image generation
- User-typed prompts for video generation
- User-typed prompts for audio generation
- Any typed message in chat

**❌ Skips for:**
- Button clicks (Enhance, Upscale, Edit)
- Very short messages (< 20 characters that look like button actions)
- System messages

## Technical Implementation

### File: `src/lib/safety-checker.ts`

**Core Function:** `checkPromptSafety(prompt: string)`

```typescript
const result = await checkPromptSafety("Create a violent scene")
// Returns: { isSafe: false, reason: "..." }
```

**Features:**
- Uses `gpt-4o-mini` model (fast and cost-effective)
- Temperature = 0 (deterministic responses)
- Returns ONLY "SAFE" or "UNSAFE"
- Fail-safe: On API errors, allows request (doesn't block legitimate users)
- Comprehensive system prompt with examples

### Integration Points

**1. Chat API (`src/app/api/chat/route.ts`)**
```typescript
// After profanity check, before AI orchestration
const safetyCheck = await checkPromptSafety(message)
if (!safetyCheck.isSafe) {
  return 400 error with isUnsafe flag
}
```

**2. Client UI (`src/components/chat-interface.tsx`)**
```typescript
// Special handling for safety errors
if (errorData.isUnsafe) {
  Show: 🛡️ "Your prompt did not pass our safety guidelines..."
  Clear input and files
}
```

## User Experience

### Example 1: Safe Prompt
```
User: "Create a beautiful sunset over mountains"
🛡️ Safety check: SAFE
✅ Proceeds with generation
```

### Example 2: Unsafe Prompt
```
User: "Create an image with violence and blood"
🛡️ Safety check: UNSAFE
❌ Blocked with message:
"🛡️ Your prompt did not pass our safety guidelines. 
Please ensure your prompt does not contain violent, 
illegal, or inappropriate content."
```

### Example 3: Button Action
```
User clicks: [Enhance]
⏭️ Skips safety check (button action)
✅ Proceeds with enhancement
```

## Response Format

### Safe Response
```json
{
  "isSafe": true
}
```

### Unsafe Response
```json
{
  "isSafe": false,
  "reason": "Your prompt contains content that violates our safety guidelines..."
}
```

## Error Handling

### API Failure (Graceful Degradation)
If OpenAI API fails:
- ✅ Logs the error
- ✅ Allows request to proceed
- ✅ Doesn't block legitimate users
- ⚠️ Monitored for investigation

### Unexpected Response
If AI returns something other than "SAFE" or "UNSAFE":
- ❌ Blocks request (fail-safe)
- 📝 Logs warning
- 🛡️ Shows generic safety message

## Performance

- **Model:** gpt-4o-mini (fast, cheap)
- **Latency:** ~500-1000ms
- **Cost:** ~$0.0001 per check
- **Max tokens:** 10 (only need one word)
- **Temperature:** 0 (consistent)

## Security Features

1. **Two-Layer Protection:**
   - Layer 1: Keyword-based profanity filter (instant)
   - Layer 2: AI safety check (intelligent)

2. **Pre-Credit Validation:**
   - Runs BEFORE credit deduction
   - No cost to user for blocked prompts

3. **Smart Skipping:**
   - Button actions skip check
   - Short messages analyzed contextually

4. **Clear Feedback:**
   - User knows why prompt was blocked
   - Input cleared automatically
   - Can immediately try again with revised prompt

## Monitoring

All safety checks are logged:
```
🛡️ Safety check: Analyzing prompt...
🛡️ Safety check result: SAFE
✅ Safety check passed
```

Or:
```
🛡️ Safety check: Analyzing prompt...
🛡️ Safety check result: UNSAFE
🚫 Safety check failed
```

## Files Modified

1. **`src/lib/safety-checker.ts`** - New file (AI safety checker)
2. **`src/app/api/chat/route.ts`** - Added safety check integration
3. **`src/components/chat-interface.tsx`** - Added safety error handling

## Configuration

### Environment Variables
- `OPENAI_API_KEY` - Required (already configured for AI orchestrator)

### Adjustable Parameters

**In `safety-checker.ts`:**
- `model`: Change from gpt-4o-mini to gpt-4 for better accuracy
- `temperature`: Currently 0 for deterministic results
- `max_tokens`: Currently 10 (sufficient for "SAFE"/"UNSAFE")

**In `chat/route.ts`:**
- `isButtonAction` logic: Adjust message length threshold
- Skip conditions: Add more button keywords if needed

## Future Enhancements

1. **Analytics Dashboard:**
   - Track blocked prompts
   - Identify trends
   - Improve filters

2. **Custom Moderation Rules:**
   - Industry-specific content policies
   - Age-gated content
   - Regional compliance

3. **User Appeals:**
   - Allow users to appeal false positives
   - Manual review system

4. **Rate Limiting:**
   - Throttle repeated unsafe attempts
   - Temporary blocks for persistent violators

## Testing

### Test Cases

**Safe Prompts:**
- "Create a portrait of a woman"
- "Generate a landscape with mountains"
- "Make a video of a sunset"

**Unsafe Prompts:**
- Anything with violence
- Content involving minors inappropriately
- Illegal activities
- Hate speech

**Edge Cases:**
- Very short messages: "hi" → skips check
- Button actions: "enhance" → skips check
- API errors → allows request (fail-safe)

## Compliance

This system helps maintain compliance with:
- ✅ Platform Terms of Service
- ✅ AI Generation API policies (Wavespeed, FAL.ai)
- ✅ Content Safety Standards
- ✅ Legal requirements (CSAM prevention, etc.)

---

**Status:** ✅ Production Ready
**Last Updated:** October 16, 2025

