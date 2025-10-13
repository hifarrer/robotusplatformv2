# Environment Setup Guide

## Issue Identified
The "Failed to upload file" error when creating lipsync videos is caused by **missing environment variables**.

## Required Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/robotus"

# NextAuth Configuration
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
WAVESPEED_API_KEY="your-wavespeed-api-key"

# Stripe (for payments)
STRIPE_SECRET_KEY="your-stripe-secret-key"
STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

## How to Get These Values

### 1. Database URL
- Set up a PostgreSQL database
- Format: `postgresql://username:password@host:port/database`

### 2. NextAuth Secret
- Generate a random secret: `openssl rand -base64 32`
- Or use: `https://generate-secret.vercel.app/32`

### 3. API Keys
- **OpenAI API Key**: Get from https://platform.openai.com/api-keys
- **Wavespeed API Key**: Get from https://wavespeed.ai (if you have an account)

### 4. Stripe Keys (Optional for basic functionality)
- Get from https://dashboard.stripe.com/apikeys

## For Local Development

If you're running locally and want to test with external APIs:

1. **Use ngrok for public URL**:
   ```bash
   npx ngrok http 3000
   ```
   
2. **Update NEXTAUTH_URL**:
   ```bash
   NEXTAUTH_URL="https://your-ngrok-url.ngrok.io"
   ```

## Verification

After setting up the environment variables:

1. Restart your development server
2. Run the diagnostic script:
   ```bash
   node scripts/diagnose-lipsync-issue.js
   ```
3. All environment variables should show as ✅

## Troubleshooting

- **File size limits**: Audio max 25MB, Images max 10MB
- **File formats**: JPEG/PNG/WebP for images, MP3/WAV/M4A for audio
- **URL accessibility**: External APIs need publicly accessible URLs
- **API keys**: Ensure they're valid and have proper permissions
