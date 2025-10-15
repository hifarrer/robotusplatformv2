'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

function ResetPasswordContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')
  const [token, setToken] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
  })

  useEffect(() => {
    const tokenParam = searchParams.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setError('Invalid or missing reset token')
    }
  }, [searchParams])

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError('Invalid reset token')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: data.password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'An error occurred')
        return
      }

      setIsSuccess(true)
      
      // Redirect to sign in page after a short delay
      setTimeout(() => {
        router.push('/auth/signin?reset=success')
      }, 2000)
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Password Reset!</h1>
            <p className="text-gray-400">
              Your password has been successfully reset.
            </p>
          </div>

          <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
              <p className="text-green-400 text-sm">
                You can now sign in with your new password.
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push('/auth/signin')}
            className="w-full"
          >
            Continue to Sign In
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Lock className="h-16 w-16 text-blue-500" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-gray-400">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Input
                {...register('password')}
                type="password"
                placeholder="New password"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              />
              {errors.password && (
                <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <Input
                {...register('confirmPassword')}
                type="password"
                placeholder="Confirm new password"
                className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
              />
              {errors.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="gradient"
            className="w-full"
            disabled={isLoading || !token}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </Button>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-pink-500 hover:text-pink-400 transition-colors text-sm"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Loader2 className="h-16 w-16 text-blue-500 animate-spin" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Loading...</h1>
            <p className="text-gray-400">
              Please wait while we load the reset page.
            </p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
