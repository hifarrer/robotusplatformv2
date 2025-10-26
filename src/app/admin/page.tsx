'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  CreditCard, 
  TrendingUp, 
  Activity,
  DollarSign,
  ArrowLeft,
  Bot,
  Shield,
  Image as ImageIcon,
  Video,
  Music,
  Sparkles,
  BarChart3
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalCreditsUsed: number
  totalRevenue: number
  imagesGenerated: number
  videosGenerated: number
  audiosGenerated: number
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    credits: number
    plan: { name: string } | null
    createdAt: string
  }>
  planDistribution: Array<{
    name: string
    count: number
    percentage: number
  }>
  recentTransactions: Array<{
    id: string
    user: { name: string | null; email: string }
    amount: number
    type: string
    description: string
    createdAt: string
  }>
}

interface Plan {
  id: string
  name: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchStats()
    fetchPlans()
  }, [])

  useEffect(() => {
    fetchStats()
  }, [selectedPlanId])

  const fetchStats = async () => {
    try {
      const url = selectedPlanId === 'all' 
        ? '/api/admin/stats' 
        : `/api/admin/stats?planId=${selectedPlanId}`
      const response = await fetch(url)
      if (response.status === 403) {
        setError('Access denied. Admin privileges required.')
        return
      }
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else {
        setError('Failed to load dashboard stats')
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
      setError('An error occurred while loading stats')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-red-400 text-lg">{error}</p>
          <Button onClick={() => router.push('/chat')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
        </div>
      </div>
    )
  }

  if (!session?.user || !stats) {
    return null
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
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
              <div>
                <Badge className="bg-red-500">ADMIN</Badge>
              </div>
            </div>

            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Page Title */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Shield className="w-8 h-8 text-red-500" />
                  Admin Dashboard
                </h1>
                <p className="text-gray-400">Monitor platform usage and manage users</p>
              </div>
              <div className="w-48">
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Plans</option>
                  <option value="">No Plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <Button
                onClick={() => router.push('/admin/users')}
                className="h-auto p-4 flex flex-col items-start space-y-2 bg-gray-900 hover:bg-gray-800"
                variant="outline"
              >
                <Users className="w-6 h-6 text-blue-500" />
                <span className="text-white font-semibold">Manage Users</span>
                <span className="text-sm text-gray-400">Edit & Delete Users</span>
              </Button>

              <Button
                onClick={() => router.push('/admin/plans')}
                className="h-auto p-4 flex flex-col items-start space-y-2 bg-gray-900 hover:bg-gray-800"
                variant="outline"
              >
                <CreditCard className="w-6 h-6 text-green-500" />
                <span className="text-white font-semibold">Manage Plans</span>
                <span className="text-sm text-gray-400">Edit Plans & Pricing</span>
              </Button>

              <Button
                onClick={() => router.push('/admin/history')}
                className="h-auto p-4 flex flex-col items-start space-y-2 bg-gray-900 hover:bg-gray-800"
                variant="outline"
              >
                <BarChart3 className="w-6 h-6 text-cyan-500" />
                <span className="text-white font-semibold">Generations History</span>
                <span className="text-sm text-gray-400">View All User Generations</span>
              </Button>

              <Button
                onClick={() => router.push('/admin/settings')}
                className="h-auto p-4 flex flex-col items-start space-y-2 bg-gray-900 hover:bg-gray-800"
                variant="outline"
              >
                <Shield className="w-6 h-6 text-purple-500" />
                <span className="text-white font-semibold">Settings</span>
                <span className="text-sm text-gray-400">Admin Settings</span>
              </Button>

              <Button
                onClick={fetchStats}
                className="h-auto p-4 flex flex-col items-start space-y-2 bg-gray-900 hover:bg-gray-800"
                variant="outline"
              >
                <Activity className="w-6 h-6 text-orange-500" />
                <span className="text-white font-semibold">Refresh Stats</span>
                <span className="text-sm text-gray-400">Update Dashboard</span>
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-8 h-8 text-blue-500" />
                  <Badge variant="secondary">{stats.activeUsers} active</Badge>
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalUsers}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <Sparkles className="w-8 h-8 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-white">{stats.totalCreditsUsed.toLocaleString()}</p>
                <p className="text-sm text-gray-400">Credits Used</p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="w-8 h-8 text-green-500" />
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-white">${stats.totalRevenue}</p>
                <p className="text-sm text-gray-400">Monthly Revenue</p>
              </div>

              <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-2">
                  <BarChart3 className="w-8 h-8 text-purple-500" />
                </div>
                <p className="text-3xl font-bold text-white">
                  {stats.imagesGenerated + stats.videosGenerated + stats.audiosGenerated}
                </p>
                <p className="text-sm text-gray-400">Total Generations</p>
              </div>
            </div>

            {/* Generation Stats */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Generation Statistics</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                  <ImageIcon className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.imagesGenerated}</p>
                    <p className="text-sm text-gray-400">Images</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                  <Video className="w-8 h-8 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.videosGenerated}</p>
                    <p className="text-sm text-gray-400">Videos</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg">
                  <Music className="w-8 h-8 text-pink-500" />
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.audiosGenerated}</p>
                    <p className="text-sm text-gray-400">Audios</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan Distribution */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Plan Distribution</h2>
              <div className="space-y-3">
                {stats.planDistribution.map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="w-32">
                        <span className="text-white font-medium">{plan.name}</span>
                      </div>
                      <div className="flex-1 bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${plan.percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <span className="text-white font-semibold">{plan.count}</span>
                      <span className="text-gray-400 text-sm ml-2">({plan.percentage.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Users */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Users</h2>
              <div className="space-y-3">
                {stats.recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-gray-700 text-white">
                          {user.name?.[0] || user.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-white font-medium">{user.name || 'No name'}</p>
                        <p className="text-sm text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{user.credits} credits</p>
                      <Badge variant="secondary">{user.plan?.name || 'No plan'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-900 rounded-lg p-6 border border-gray-800">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Transactions</h2>
              <div className="space-y-2">
                {stats.recentTransactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex-1">
                      <p className="text-white font-medium">{tx.description}</p>
                      <p className="text-sm text-gray-400">{tx.user.name || tx.user.email}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        tx.type === 'DEBIT' ? 'text-red-500' :
                        tx.type === 'CREDIT' ? 'text-green-500' :
                        tx.type === 'REFUND' ? 'text-blue-500' :
                        'text-purple-500'
                      }`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                      </p>
                      <p className="text-xs text-gray-400">{tx.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

