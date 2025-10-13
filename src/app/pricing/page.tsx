'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Check, 
  ArrowLeft, 
  Bot, 
  Sparkles,
  Zap,
  Crown,
  Gift
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  stripeMonthlyPriceId?: string | null
  stripeYearlyPriceId?: string | null
  credits: number
  description?: string | null
  features?: string[]
  isActive: boolean
}

interface PlansData {
  plans: Plan[]
  currentPlan: Plan | null
  currentCredits: number
}

export default function PricingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [plansData, setPlansData] = useState<PlansData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchPlans()
    
    // Check for success/cancel query parameters
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      alert('Payment successful! Your plan has been upgraded.')
      // Clean URL
      window.history.replaceState({}, '', '/pricing')
    } else if (urlParams.get('canceled') === 'true') {
      alert('Payment was cancelled.')
      // Clean URL
      window.history.replaceState({}, '', '/pricing')
    }
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/plans')
      if (response.ok) {
        const data = await response.json()
        setPlansData(data)
      } else {
        console.error('Failed to fetch plans:', response.status, response.statusText)
        setPlansData(null)
      }
    } catch (error) {
      console.error('Error fetching plans:', error)
      setPlansData(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpgrade = async (planId: string, planName: string) => {
    setIsUpgrading(planName)
    
    try {
      // Free plan doesn't require payment
      if (planName === 'Free') {
        const response = await fetch('/api/upgrade-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planName, billingCycle }),
        })

        if (response.ok) {
          await fetchPlans()
          alert(`Successfully switched to ${planName} plan!`)
        } else {
          const error = await response.json()
          alert(error.error || 'Failed to switch plan')
        }
        setIsUpgrading(null)
        return
      }

      // For paid plans, use Stripe checkout
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle }),
      })

      if (response.ok) {
        const { url } = await response.json()
        // Redirect to Stripe Checkout
        window.location.href = url
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create checkout session')
        setIsUpgrading(null)
      }
    } catch (error) {
      alert('An error occurred while processing your request')
      setIsUpgrading(null)
    }
  }

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'Free': return <Gift className="w-6 h-6" />
      case 'Basic': return <Zap className="w-6 h-6" />
      case 'Premium': return <Crown className="w-6 h-6" />
      default: return <Sparkles className="w-6 h-6" />
    }
  }

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'Free': return 'from-gray-500 to-gray-700'
      case 'Basic': return 'from-blue-500 to-blue-700'
      case 'Premium': return 'from-purple-500 to-pink-600'
      default: return 'from-gray-500 to-gray-700'
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    )
  }

  if (!session?.user || !plansData) {
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
              <h1 className="text-white font-semibold">Robotus.AI</h1>
            </div>

            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Page Title */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-white">Choose Your Plan</h1>
              <p className="text-xl text-gray-400">
                Unlock the power of AI with credits for all your creative needs
              </p>
              
              {plansData.currentPlan && (
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-white">
                    Current Plan: <strong>{plansData.currentPlan.name}</strong>
                  </span>
                  <Badge variant="secondary">{plansData.currentCredits} credits</Badge>
                </div>
              )}
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex justify-center">
              <div className="bg-gray-900 rounded-lg p-1 inline-flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    billingCycle === 'monthly'
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-6 py-2 rounded-md transition-colors ${
                    billingCycle === 'yearly'
                      ? 'bg-primary text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Yearly <Badge className="ml-2" variant="secondary">Save 2 months</Badge>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {plansData?.plans?.length > 0 ? plansData.plans.map((plan) => {
                if (!plan || !plan.id || !plan.name) {
                  return null
                }
                
                const isCurrentPlan = plansData?.currentPlan?.id === plan.id
                const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
                const isPremium = plan.name === 'Premium'
                
                return (
                  <div
                    key={plan.id}
                    className={`relative bg-gray-900 rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
                      isPremium 
                        ? 'border-primary shadow-lg shadow-primary/20' 
                        : isCurrentPlan
                        ? 'border-green-500'
                        : 'border-gray-800'
                    }`}
                  >
                    {isPremium && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-600">
                          POPULAR
                        </Badge>
                      </div>
                    )}
                    
                    {isCurrentPlan && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-green-500">
                          CURRENT PLAN
                        </Badge>
                      </div>
                    )}

                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${getPlanColor(plan.name)} mb-4`}>
                      {getPlanIcon(plan.name)}
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                    <p className="text-gray-400 mb-4 min-h-[3rem]">{plan.description || 'No description available'}</p>

                    <div className="mb-6">
                      <div className="flex items-baseline">
                        <span className="text-5xl font-bold text-white">${price}</span>
                        <span className="text-gray-400 ml-2">
                          /{billingCycle === 'monthly' ? 'month' : 'year'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && price > 0 && (
                        <p className="text-sm text-gray-400 mt-1">
                          ${(price / 12).toFixed(2)}/month when billed annually
                        </p>
                      )}
                    </div>

                    <div className="space-y-4 mb-8">
                      {/* Display features from database */}
                      {plan.features && plan.features.length > 0 ? (
                        plan.features.map((feature, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="bg-green-500/10 rounded-full p-1">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-white">{feature}</span>
                          </div>
                        ))
                      ) : (
                        // Fallback if no features in database
                        <>
                          <div className="flex items-center gap-3">
                            <div className="bg-green-500/10 rounded-full p-1">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-white font-medium">{plan.credits} Credits</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="bg-green-500/10 rounded-full p-1">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-white">All AI models</span>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      onClick={() => !isCurrentPlan && handleUpgrade(plan.id, plan.name)}
                      disabled={isCurrentPlan || isUpgrading === plan.name || (plan.name !== 'Free' && !plan.stripeMonthlyPriceId && !plan.stripeYearlyPriceId)}
                      className={`w-full ${
                        isPremium && !isCurrentPlan
                          ? 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                          : ''
                      }`}
                      variant={isCurrentPlan ? 'outline' : 'default'}
                    >
                      {isUpgrading === plan.name 
                        ? 'Processing...' 
                        : isCurrentPlan 
                        ? 'Current Plan' 
                        : plan.name === 'Free'
                        ? 'Get Started'
                        : 'Subscribe Now'
                      }
                    </Button>
                  </div>
                )
              }) : (
                <div className="col-span-full text-center text-gray-400">
                  No plans available. Please try again later.
                </div>
              )}
            </div>

            {/* Credit Costs Section */}
            <div className="bg-gray-900 rounded-2xl p-8 mt-12">
              <h2 className="text-2xl font-bold text-white mb-6">Credit Costs</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Image Generation</h3>
                  <p className="text-3xl font-bold text-primary">5</p>
                  <p className="text-gray-400 text-sm">credits per image</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Video (5s)</h3>
                  <p className="text-3xl font-bold text-primary">25</p>
                  <p className="text-gray-400 text-sm">credits per video</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Video (8-10s)</h3>
                  <p className="text-3xl font-bold text-primary">50</p>
                  <p className="text-gray-400 text-sm">credits per video</p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-white">Audio</h3>
                  <p className="text-3xl font-bold text-primary">1</p>
                  <p className="text-gray-400 text-sm">credit per 15 seconds</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

