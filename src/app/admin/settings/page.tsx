'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Shield, 
  ArrowLeft, 
  Bot, 
  Lock,
  Save
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setIsSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to change password' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while changing password' })
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <Badge className="bg-red-500">ADMIN</Badge>
            </div>

            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-500" />
                Admin Settings
              </h1>
              <p className="text-gray-400">Manage admin account settings</p>
            </div>

            {/* Message Banner */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* Change Password Section */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Admin Password
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Current Password
                  </label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    New Password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button 
                  onClick={handleChangePassword} 
                  disabled={isSaving || !currentPassword || !newPassword || !confirmPassword}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-3">
              <h2 className="text-xl font-semibold text-white">Account Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Username</span>
                  <span className="text-white font-medium">admin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Role</span>
                  <Badge className="bg-red-500">Administrator</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Permissions</span>
                  <span className="text-white">Full Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

