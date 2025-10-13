#!/usr/bin/env node

/**
 * Diagnostic script to identify lipsync upload issues
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 === LIPSYNC DIAGNOSTIC SCRIPT ===\n');

// Check environment variables
console.log('1. Checking Environment Variables:');
const requiredEnvVars = [
  'WAVESPEED_API_KEY',
  'NEXTAUTH_URL',
  'DATABASE_URL',
  'NEXTAUTH_SECRET'
];

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${value.substring(0, 10)}...`);
  } else {
    console.log(`❌ ${envVar}: NOT SET`);
  }
});

// Check temp uploads directory
console.log('\n2. Checking Temp Uploads Directory:');
const tempDir = path.join(process.cwd(), 'public', 'temp-uploads');
try {
  if (fs.existsSync(tempDir)) {
    console.log(`✅ Temp directory exists: ${tempDir}`);
    const files = fs.readdirSync(tempDir);
    console.log(`📁 Files in temp directory: ${files.length}`);
    if (files.length > 0) {
      console.log(`   Recent files: ${files.slice(-3).join(', ')}`);
    }
  } else {
    console.log(`❌ Temp directory missing: ${tempDir}`);
    console.log('   Creating directory...');
    fs.mkdirSync(tempDir, { recursive: true });
    console.log('✅ Directory created');
  }
} catch (error) {
  console.log(`❌ Error accessing temp directory: ${error.message}`);
}

// Check API routes
console.log('\n3. Checking API Routes:');
const apiRoutes = [
  'src/app/api/upload-files/route.ts',
  'src/app/api/temp-files/[filename]/route.ts',
  'src/app/api/chat/route.ts'
];

apiRoutes.forEach(route => {
  const routePath = path.join(process.cwd(), route);
  if (fs.existsSync(routePath)) {
    console.log(`✅ ${route}: EXISTS`);
  } else {
    console.log(`❌ ${route}: MISSING`);
  }
});

// Check Wavespeed configuration
console.log('\n4. Checking Wavespeed Configuration:');
const aiServicesPath = path.join(process.cwd(), 'src/lib/ai-services.ts');
try {
  const aiServicesContent = fs.readFileSync(aiServicesPath, 'utf8');
  if (aiServicesContent.includes('WAVESPEED_BASE_URL')) {
    console.log('✅ Wavespeed base URL configured');
  }
  if (aiServicesContent.includes('lipsync')) {
    console.log('✅ Lipsync method found');
  }
} catch (error) {
  console.log(`❌ Error reading ai-services.ts: ${error.message}`);
}

// Check for common issues
console.log('\n5. Common Issues Check:');
console.log('🔍 Checking for localhost URL issues...');
const nextAuthUrl = process.env.NEXTAUTH_URL;
if (nextAuthUrl && (nextAuthUrl.includes('localhost') || nextAuthUrl.includes('127.0.0.1'))) {
  console.log('⚠️  WARNING: NEXTAUTH_URL contains localhost');
  console.log('   External APIs (Wavespeed) cannot access localhost URLs');
  console.log('   Solution: Use ngrok or deploy to a public URL');
  console.log('   Command: npx ngrok http 3000');
}

console.log('\n6. Recommendations:');
console.log('📋 If you\'re getting "Failed to upload file" errors:');
console.log('   1. Check file size (max 25MB for audio, 10MB for images)');
console.log('   2. Check file format (JPEG, PNG, WebP for images; MP3, WAV, M4A for audio)');
console.log('   3. Ensure NEXTAUTH_URL is publicly accessible');
console.log('   4. Check server logs for detailed error messages');
console.log('   5. Verify WAVESPEED_API_KEY is valid');

console.log('\n✅ Diagnostic complete!');
