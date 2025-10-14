'use client'

import { useEffect } from 'react'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LogoutPage() {
  const router = useRouter()

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await signOut({ 
          callbackUrl: '/auth/signin',
          redirect: true 
        })
      } catch (error) {
        console.error('Logout error:', error)
        // Fallback: redirect to signin page
        router.push('/auth/signin')
      }
    }

    handleLogout()
  }, [router])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="text-center">
        <div className="spinner mb-4"></div>
        <p className="text-white">Logging out...</p>
      </div>
    </div>
  )
}
