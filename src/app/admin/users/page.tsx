'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  ArrowLeft, 
  Bot, 
  Shield, 
  Search,
  Edit,
  Trash2,
  X,
  Save
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'

interface User {
  id: string
  name: string | null
  email: string
  credits: number
  role: string
  isActive: boolean
  createdAt: string
  plan: { id: string; name: string } | null
}

interface Plan {
  id: string
  name: string
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    credits: 0,
    planId: '',
    isActive: true
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchUsers()
    fetchPlans()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
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

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name || '',
      email: user.email,
      credits: user.credits,
      planId: user.plan?.id || '',
      isActive: user.isActive
    })
  }

  const handleSave = async () => {
    if (!editingUser) return

    try {
      const response = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        await fetchUsers()
        setEditingUser(null)
        alert('User updated successfully')
      } else {
        alert('Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('An error occurred')
    }
  }

  const handleDelete = async (userId: string, userEmail: string) => {
    if (userEmail === 'admin') {
      alert('Cannot delete admin user')
      return
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchUsers()
        alert('User deleted successfully')
      } else {
        alert('Failed to delete user')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('An error occurred')
    }
  }

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-500" />
                  User Management
                </h1>
                <p className="text-gray-400">Manage user accounts and permissions</p>
              </div>
              <Badge variant="secondary">{users.length} Total Users</Badge>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by email or name..."
                className="pl-10 bg-gray-900 border-gray-800 text-white"
              />
            </div>

            {/* Users Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Avatar className="w-10 h-10">
                              <AvatarFallback className="bg-gray-700 text-white">
                                {user.name?.[0] || user.email[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-white">{user.name || 'No name'}</div>
                              {user.role === 'ADMIN' && (
                                <Badge className="mt-1 bg-red-500 text-xs">Admin</Badge>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary">{user.plan?.name || 'No Plan'}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-white font-semibold">{user.credits}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={user.isActive ? 'bg-green-500' : 'bg-red-500'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(user)}
                              className="text-blue-400 hover:text-blue-300"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(user.id, user.email)}
                              className="text-red-400 hover:text-red-300"
                              disabled={user.email === 'admin'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="User name"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Email</label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="Email"
                className="bg-gray-800 border-gray-700 text-white"
                disabled
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Credits</label>
              <Input
                type="number"
                value={editForm.credits}
                onChange={(e) => setEditForm({ ...editForm, credits: parseInt(e.target.value) })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Plan</label>
              <select
                value={editForm.planId}
                onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-md"
              >
                <option value="">No Plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>{plan.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="w-4 h-4"
              />
              <label className="text-sm text-gray-300">Active</label>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="ghost" onClick={() => setEditingUser(null)}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

