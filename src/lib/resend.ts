import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

export const sendVerificationEmail = async (email: string, token: string, name: string) => {
  const verificationUrl = `https://app.robotus.ai/auth/verify-email?token=${token}`
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@notifications.robotus.ai',
      to: [email],
      subject: 'Verify your email address - Robotus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify your email address</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-bottom: 10px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #000;
              margin-bottom: 20px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #000;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background-color: #333;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Robotus</div>
              <h1 class="title">Verify your email address</h1>
              <p class="subtitle">Hi ${name}, welcome to Robotus! Please verify your email address to complete your registration.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This verification link will expire in 24 hours. If you didn't create an account with Robotus, please ignore this email.
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${verificationUrl}</p>
            
            <div class="footer">
              <p>This email was sent by Robotus. If you have any questions, please contact our support team.</p>
              <p>&copy; 2024 Robotus. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending verification email:', error)
      throw new Error('Failed to send verification email')
    }

    return data
  } catch (error) {
    console.error('Error in sendVerificationEmail:', error)
    throw error
  }
}

export const sendPasswordResetEmail = async (email: string, token: string, name: string) => {
  const resetUrl = `https://app.robotus.ai/auth/reset-password?token=${token}`
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'noreply@notifications.robotus.ai',
      to: [email],
      subject: 'Reset your password - Robotus',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8f9fa;
            }
            .container {
              background: white;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-bottom: 10px;
            }
            .title {
              font-size: 28px;
              font-weight: bold;
              color: #000;
              margin-bottom: 20px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background-color: #000;
              color: white;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .button:hover {
              background-color: #333;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            .warning {
              background-color: #fff3cd;
              border: 1px solid #ffeaa7;
              color: #856404;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
            }
            .security {
              background-color: #f8d7da;
              border: 1px solid #f5c6cb;
              color: #721c24;
              padding: 15px;
              border-radius: 6px;
              margin: 20px 0;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Robotus</div>
              <h1 class="title">Reset your password</h1>
              <p class="subtitle">Hi ${name}, we received a request to reset your password for your Robotus account.</p>
            </div>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
            </div>
            
            <div class="security">
              <strong>Security Notice:</strong> If you didn't request this password reset, please contact our support team immediately. Your account may be at risk.
            </div>
            
            <p>If the button above doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">${resetUrl}</p>
            
            <div class="footer">
              <p>This email was sent by Robotus. If you have any questions, please contact our support team.</p>
              <p>&copy; 2024 Robotus. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    if (error) {
      console.error('Error sending password reset email:', error)
      throw new Error('Failed to send password reset email')
    }

    return data
  } catch (error) {
    console.error('Error in sendPasswordResetEmail:', error)
    throw error
  }
}
