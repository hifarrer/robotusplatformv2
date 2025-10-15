'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react'

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [email, setEmail] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const emailParam = searchParams.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleVerifyEmail = async (token: string) => {
    setIsLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Verification failed')
        return
      }

      setIsVerified(true)
      setMessage('Your email has been verified successfully!')
      
      // Redirect to sign in page after a short delay
      setTimeout(() => {
        router.push('/auth/signin?verified=true')
      }, 2000)
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email address is required')
      return
    }

    setIsResending(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Failed to resend verification email')
        return
      }

      setMessage('Verification email sent successfully! Please check your inbox.')
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  // Handle token from URL (if user clicked email link)
  useEffect(() => {
    const token = searchParams.get('token')
    if (token) {
      handleVerifyEmail(token)
    }
  }, [searchParams])

  if (isVerified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-white">Email Verified!</CardTitle>
            <CardDescription className="text-gray-400">
              Your email has been successfully verified.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                You can now sign in to your account.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Continue to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-blue-500" />
          </div>
          <CardTitle className="text-2xl text-white">Verify Your Email</CardTitle>
          <CardDescription className="text-gray-400">
            We've sent a verification link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="bg-gray-800 border-gray-600 text-white"
                disabled={isLoading || isResending}
              />
            </div>

            <Button
              onClick={handleResendVerification}
              disabled={isLoading || isResending || !email}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Resend Verification Email'
              )}
            </Button>

            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => router.push('/auth/signin')}
                className="w-full"
              >
                Back to Sign In
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-400 text-center">
            <p>Didn't receive the email? Check your spam folder or try resending.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
