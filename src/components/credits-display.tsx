'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

interface CreditsData {
  balance: number
  plan: Plan
}

export function CreditsDisplay() {
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits')
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

  if (isLoading || !creditsData) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-medium">Loading...</span>
      </div>
    )
  }

  const creditColor = 
    creditsData.balance < 10 ? 'text-red-500' :
    creditsData.balance < 50 ? 'text-yellow-500' :
    'text-green-500'

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="gap-2 hover:bg-primary/5 transition-colors"
        >
          <Sparkles className={`h-4 w-4 ${creditColor}`} />
          <span className="font-semibold">{creditsData.balance}</span>
          <span className="text-muted-foreground">credits</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credits & Plans
          </DialogTitle>
          <DialogDescription>
            Manage your credits and upgrade your plan
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
              <p className="text-3xl font-bold">{creditsData.balance} <span className="text-lg text-muted-foreground">credits</span></p>
            </div>
            <Sparkles className={`h-10 w-10 ${creditColor}`} />
          </div>

          {/* Current Plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Current Plan</h3>
              <Badge variant="secondary">{creditsData.plan.name}</Badge>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="font-medium mb-2">{creditsData.plan.name} Plan</p>
              {creditsData.plan.description && (
                <p className="text-sm text-muted-foreground mb-3">{creditsData.plan.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Monthly: </span>
                  <span className="font-semibold">${creditsData.plan.monthlyPrice}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Credits: </span>
                  <span className="font-semibold">{creditsData.plan.credits}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Credit Costs */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Credit Costs</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between p-2 rounded hover:bg-muted/50">
                <span className="text-muted-foreground">Image Generation</span>
                <span className="font-medium">5 credits</span>
              </div>
              <div className="flex justify-between p-2 rounded hover:bg-muted/50">
                <span className="text-muted-foreground">Video (5 seconds)</span>
                <span className="font-medium">25 credits</span>
              </div>
              <div className="flex justify-between p-2 rounded hover:bg-muted/50">
                <span className="text-muted-foreground">Video (8-10 seconds)</span>
                <span className="font-medium">50 credits</span>
              </div>
              <div className="flex justify-between p-2 rounded hover:bg-muted/50">
                <span className="text-muted-foreground">Audio (per 15 seconds)</span>
                <span className="font-medium">1 credit</span>
              </div>
              <div className="flex justify-between p-2 rounded hover:bg-muted/50">
                <span className="text-muted-foreground">Lipsync (per 10 seconds)</span>
                <span className="font-medium">20 credits</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Upgrade Options */}
          {creditsData.plan.name === 'Free' && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Upgrade Your Plan
              </h3>
              <div className="grid gap-3">
                <div className="p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Basic Plan</p>
                      <p className="text-sm text-muted-foreground">500 credits</p>
                    </div>
                    <Badge variant="outline">$15/mo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ideal for regular content creators
                  </p>
                  <Button size="sm" className="w-full">
                    Upgrade to Basic
                  </Button>
                </div>
                <div className="p-4 rounded-lg border-2 border-primary hover:border-primary/80 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">Premium Plan</p>
                      <p className="text-sm text-muted-foreground">1200 credits</p>
                    </div>
                    <Badge>$29/mo</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Best for power users and professionals
                  </p>
                  <Button size="sm" className="w-full">
                    Upgrade to Premium
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

