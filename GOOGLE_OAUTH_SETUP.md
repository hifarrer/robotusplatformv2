# Google OAuth Setup Guide

This guide will help you set up Google OAuth for your Robotus AI platform.

## Prerequisites

- A Google Cloud Console account
- Your application deployed or running locally

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (if not already enabled)

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type (unless you have a Google Workspace)
3. Fill in the required information:
   - App name: "Robotus AI Platform"
   - User support email: Your email
   - Developer contact information: Your email
4. Add your domain to authorized domains (e.g., `yourdomain.com`)
5. Save and continue

## Step 3: Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application" as the application type
4. Add authorized redirect URIs:
   - For development: `http://localhost:3000/api/auth/callback/google`
   - For production: `https://yourdomain.com/api/auth/callback/google`
5. Click "Create"
6. Copy the Client ID and Client Secret

## Step 4: Environment Variables

Add the following environment variables to your `.env.local` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

## Step 5: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to `/auth/signin` or `/auth/signup`
3. Click the "Continue with Google" button
4. Complete the Google OAuth flow

## Account Linking

The system automatically handles account linking:

- If a user signs in with Google and their email already exists in the database, the Google account will be linked to the existing user account
- If the email doesn't exist, a new user account will be created
- Users can sign in with either their password or Google OAuth after linking

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**: Make sure your redirect URI in Google Console matches exactly with your application URL
2. **"invalid_client" error**: Check that your Client ID and Secret are correct
3. **"access_denied" error**: The user may have denied permission or the OAuth consent screen needs approval

### Development vs Production:

- For development, use `http://localhost:3000`
- For production, use your actual domain with HTTPS
- Make sure to update the redirect URIs in Google Console when deploying

## Security Notes

- Never commit your Google Client Secret to version control
- Use environment variables for all sensitive credentials
- Regularly rotate your OAuth credentials
- Monitor your OAuth usage in Google Cloud Console

## Next Steps

After setting up Google OAuth:

1. Test the sign-in flow thoroughly
2. Verify account linking works correctly
3. Test with both new and existing users
4. Deploy to production with the correct redirect URIs
