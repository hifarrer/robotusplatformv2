import { NextRequest, NextResponse } from 'next/server'
import { resend } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const { reason, name, email, message } = await request.json()

    // Validate required fields
    if (!reason || !name || !email || !message) {
      return NextResponse.json(
        { message: 'All fields are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: 'noreply@notifications.robotus.ai',
      to: ['info@robotus.ai'],
      subject: `Contact Form: ${reason.charAt(0).toUpperCase() + reason.slice(1)} - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contact Form Submission</title>
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
              font-size: 24px;
              font-weight: bold;
              color: #000;
              margin-bottom: 20px;
            }
            .field {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 6px;
              border-left: 4px solid #000;
            }
            .field-label {
              font-weight: bold;
              color: #000;
              margin-bottom: 5px;
              text-transform: uppercase;
              font-size: 12px;
              letter-spacing: 0.5px;
            }
            .field-value {
              color: #333;
              font-size: 16px;
            }
            .message-content {
              white-space: pre-wrap;
              background-color: #fff;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #e9ecef;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">Robotus</div>
              <h1 class="title">New Contact Form Submission</h1>
            </div>
            
            <div class="field">
              <div class="field-label">Reason for Contact</div>
              <div class="field-value">${reason.charAt(0).toUpperCase() + reason.slice(1)}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Name</div>
              <div class="field-value">${name}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value">${email}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Message</div>
              <div class="message-content">${message}</div>
            </div>
            
            <div class="footer">
              <p>This message was sent through the Robotus contact form.</p>
              <p>Reply directly to this email to respond to the user.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      replyTo: email,
    })

    if (error) {
      console.error('Error sending contact email:', error)
      return NextResponse.json(
        { message: 'Failed to send message' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    )

  } catch (error) {
    console.error('Error in contact API:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
