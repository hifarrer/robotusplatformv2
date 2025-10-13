'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  CreditCard, 
  ArrowLeft, 
  Bot, 
  Shield, 
  Edit,
  Save,
  X,
  Plus
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  stripeMonthlyPriceId: string | null
  stripeYearlyPriceId: string | null
  credits: number
  description: string | null
  features: string[]
  isActive: boolean
  _count?: { users: number }
}

export default function AdminPlansPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    stripeMonthlyPriceId: '',
    stripeYearlyPriceId: '',
    credits: 0,
    description: '',
    features: [] as string[],
    isActive: true
  })
  const [newFeature, setNewFeature] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans')
      if (response.ok) {
        const data = await response.json()
        setPlans(data)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setEditForm({
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      stripeMonthlyPriceId: plan.stripeMonthlyPriceId || '',
      stripeYearlyPriceId: plan.stripeYearlyPriceId || '',
      credits: plan.credits,
      description: plan.description || '',
      features: plan.features || [],
      isActive: plan.isActive
    })
  }

  const handleSave = async () => {
    if (!editingPlan) return

    try {
      const response = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        await fetchPlans()
        setEditingPlan(null)
        alert('Plan updated successfully')
      } else {
        alert('Failed to update plan')
      }
    } catch (error) {
      console.error('Error updating plan:', error)
      alert('An error occurred')
    }
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setEditForm({
        ...editForm,
        features: [...editForm.features, newFeature.trim()]
      })
      setNewFeature('')
    }
  }

  const removeFeature = (index: number) => {
    setEditForm({
      ...editForm,
      features: editForm.features.filter((_, i) => i !== index)
    })
  }

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
                  <CreditCard className="w-8 h-8 text-green-500" />
                  Plan Management
                </h1>
                <p className="text-gray-400">Manage subscription plans and pricing</p>
              </div>
              <Badge variant="secondary">{plans.length} Plans</Badge>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <Badge className={plan.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <p className="text-gray-400 mb-4">{plan.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monthly:</span>
                      <span className="text-white font-semibold">${plan.monthlyPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Yearly:</span>
                      <span className="text-white font-semibold">${plan.yearlyPrice}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Credits:</span>
                      <span className="text-white font-semibold">{plan.credits}</span>
                    </div>
                    {plan._count && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Users:</span>
                        <span className="text-white font-semibold">{plan._count.users}</span>
                      </div>
                    )}
                  </div>

                  {plan.features && plan.features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-400 mb-2">Features:</p>
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="text-sm text-gray-300">• {feature}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-xs text-gray-500">
                      <p>Stripe Monthly: {plan.stripeMonthlyPriceId || 'Not set'}</p>
                      <p>Stripe Yearly: {plan.stripeYearlyPriceId || 'Not set'}</p>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleEdit(plan)}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Plan
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingPlan} onOpenChange={(open) => !open && setEditingPlan(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan: {editingPlan?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Monthly Price ($)</label>
                <Input
                  type="number"
                  value={editForm.monthlyPrice}
                  onChange={(e) => setEditForm({ ...editForm, monthlyPrice: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 block mb-2">Yearly Price ($)</label>
                <Input
                  type="number"
                  value={editForm.yearlyPrice}
                  onChange={(e) => setEditForm({ ...editForm, yearlyPrice: parseFloat(e.target.value) })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
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
              <label className="text-sm font-medium text-gray-300 block mb-2">Description</label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Stripe Monthly Price ID</label>
              <Input
                value={editForm.stripeMonthlyPriceId}
                onChange={(e) => setEditForm({ ...editForm, stripeMonthlyPriceId: e.target.value })}
                placeholder="price_xxxxxxxxxxxxx"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Stripe Yearly Price ID</label>
              <Input
                value={editForm.stripeYearlyPriceId}
                onChange={(e) => setEditForm({ ...editForm, stripeYearlyPriceId: e.target.value })}
                placeholder="price_xxxxxxxxxxxxx"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 block mb-2">Features</label>
              <div className="space-y-2">
                {editForm.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...editForm.features]
                        newFeatures[index] = e.target.value
                        setEditForm({ ...editForm, features: newFeatures })
                      }}
                      className="bg-gray-800 border-gray-700 text-white flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFeature(index)}
                      className="text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center space-x-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                    placeholder="Add new feature..."
                    className="bg-gray-800 border-gray-700 text-white flex-1"
                  />
                  <Button size="sm" onClick={addFeature}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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
              <Button variant="ghost" onClick={() => setEditingPlan(null)}>
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

