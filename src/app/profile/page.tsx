'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, 
  Mail, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  ArrowLeft,
  Lock,
  Save,
  Bot,
  Sparkles,
  History
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  credits: number
  description?: string
}

interface CreditTransaction {
  id: string
  amount: number
  balance: number
  type: string
  generationType?: string
  description: string
  createdAt: string
}

interface CreditsData {
  balance: number
  plan: Plan
  transactions: CreditTransaction[]
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [name, setName] = useState('')
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

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    } else {
      setName('')
    }
    fetchCredits()
  }, [session])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits?limit=10')
      if (response.ok) {
        const data = await response.json()
        setCreditsData(data)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateProfile = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || 'Failed to update profile' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while updating profile' })
    } finally {
      setIsSaving(false)
    }
  }

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DEBIT': return 'text-red-500'
      case 'CREDIT': return 'text-green-500'
      case 'REFUND': return 'text-blue-500'
      case 'PURCHASE': return 'text-purple-500'
      default: return 'text-gray-500'
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
  }

  // Additional safety check for session
  if (!session?.user?.email) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-white">Please log in to access your profile.</div>
      </div>
    )
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/chat')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <h1 className="text-white font-semibold">Robotus.AI</h1>
            </div>

            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Profile & Settings</h1>
              <p className="text-gray-400">Manage your account settings and view your usage</p>
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

            {/* Profile Section */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={session.user.image || ''} />
                  <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-2xl">
                    {session.user.name?.[0] || <User className="w-10 h-10" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">{session.user.name || 'User'}</h2>
                  <p className="text-gray-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {session.user.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 block mb-2">
                    Full Name
                  </label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
                <Button 
                  onClick={handleUpdateProfile} 
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>

            {/* Credits & Plan Section */}
            {creditsData && (
              <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Credits & Plan
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Available Credits</p>
                    <p className="text-3xl font-bold text-white">{creditsData?.balance || 0}</p>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Current Plan</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-white">{creditsData?.plan?.name || 'Free'}</p>
                      <Badge variant="secondary">${creditsData?.plan?.monthlyPrice || 0}/mo</Badge>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={() => router.push('/pricing')} 
                  variant="outline"
                  className="w-full"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            )}

            {/* Recent Transactions */}
            {creditsData && creditsData.transactions.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Recent Activity
                </h2>
                
                <div className="space-y-2">
                  {creditsData.transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="bg-gray-800 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-white font-medium">{transaction.description}</p>
                        <p className="text-sm text-gray-400">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${getTransactionColor(transaction.type)}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                        </p>
                        <p className="text-sm text-gray-400">Balance: {transaction.balance}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button 
                  onClick={() => router.push('/pricing')} 
                  variant="ghost"
                  className="w-full text-gray-400 hover:text-white"
                >
                  View All Transactions
                </Button>
              </div>
            )}

            {/* Change Password Section */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-4">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
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
                  <Lock className="w-4 h-4 mr-2" />
                  {isSaving ? 'Changing...' : 'Change Password'}
                </Button>
              </div>
            </div>

            {/* Account Info */}
            <div className="bg-gray-900 rounded-lg p-6 space-y-3">
              <h2 className="text-xl font-semibold text-white">Account Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Account Type</span>
                  <span className="text-white">{creditsData?.plan.name || 'Free'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

