'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'An error occurred')
        return
      }

      setIsSubmitted(true)
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Check Your Email</h1>
            <p className="text-gray-400">
              We've sent a password reset link to your email address.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <p className="text-green-400 text-sm">
                If an account with that email exists, we have sent a password reset link.
              </p>
            </div>
          </div>

          <div className="text-center">
            <Button
              onClick={() => router.push('/auth/signin')}
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>

          <div className="text-center">
            <p className="text-gray-400 text-sm">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setIsSubmitted(false)}
                className="text-pink-500 hover:text-pink-400 transition-colors"
              >
                try again
              </button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Forgot Password?</h1>
          <p className="text-gray-400">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Input
              {...register('email')}
              type="email"
              placeholder="Email address"
              className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
            />
            {errors.email && (
              <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="spinner"></div>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-pink-500 hover:text-pink-400 transition-colors text-sm inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
