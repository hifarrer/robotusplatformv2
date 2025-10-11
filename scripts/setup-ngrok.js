#!/usr/bin/env node

/**
 * Setup script for ngrok tunnel for local development
 * This script helps set up a public URL for local development
 * so that external APIs can access your local server
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok tunnel for local development...\n');

// Check if ngrok is installed
try {
  execSync('ngrok version', { stdio: 'ignore' });
  console.log('✅ ngrok is already installed');
} catch (error) {
  console.log('📦 Installing ngrok...');
  try {
    execSync('npm install -g ngrok', { stdio: 'inherit' });
    console.log('✅ ngrok installed successfully');
  } catch (installError) {
    console.error('❌ Failed to install ngrok. Please install it manually:');
    console.error('   npm install -g ngrok');
    console.error('   or visit: https://ngrok.com/download');
    process.exit(1);
  }
}

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  fs.writeFileSync(envPath, '# Local development environment variables\n');
}

// Read current .env.local
let envContent = fs.readFileSync(envPath, 'utf8');

// Check if NEXTAUTH_URL is already set
if (envContent.includes('NEXTAUTH_URL=')) {
  console.log('⚠️  NEXTAUTH_URL is already set in .env.local');
  console.log('   Current value:', envContent.match(/NEXTAUTH_URL=(.+)/)?.[1]);
  console.log('   You may need to update it manually with your ngrok URL');
} else {
  console.log('📝 Adding NEXTAUTH_URL placeholder to .env.local...');
  envContent += '\n# Set this to your ngrok URL (e.g., https://abc123.ngrok.io)\n';
  envContent += 'NEXTAUTH_URL=http://localhost:3000\n';
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Added NEXTAUTH_URL to .env.local');
}

console.log('\n🎯 Next steps:');
console.log('1. Start your Next.js app: npm run dev');
console.log('2. In a new terminal, run: npx ngrok http 3000');
console.log('3. Copy the ngrok URL (e.g., https://abc123.ngrok.io)');
console.log('4. Update NEXTAUTH_URL in .env.local with your ngrok URL');
console.log('5. Restart your Next.js app');
console.log('\n💡 Your app will then be accessible to external APIs!');
