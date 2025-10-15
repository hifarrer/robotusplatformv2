'use client'

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
import { useCredits } from '@/contexts/credits-context'

export function CreditsDisplay({ isMobile = false }: { isMobile?: boolean }) {
  const { creditsData, isLoading } = useCredits()

  if (isLoading || !creditsData) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 ${isMobile ? 'px-2 py-1' : ''}`}>
        <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} animate-pulse`} />
        <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium`}>Loading...</span>
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
          size={isMobile ? "sm" : "sm"}
          className={`gap-2 hover:bg-primary/5 transition-colors ${isMobile ? 'text-xs px-2 py-1' : ''}`}
        >
          <Sparkles className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} ${creditColor}`} />
          <span className={`${isMobile ? 'text-xs' : 'font-semibold'}`}>{creditsData.balance}</span>
          {!isMobile && <span className="text-muted-foreground">credits</span>}
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
              <Badge variant="secondary">{creditsData.plan?.name || 'Free'}</Badge>
            </div>
            <div className="p-4 rounded-lg border">
              <p className="font-medium mb-2">{creditsData.plan?.name || 'Free'} Plan</p>
              {creditsData.plan?.description && (
                <p className="text-sm text-muted-foreground mb-3">{creditsData.plan.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Monthly: </span>
                  <span className="font-semibold">${creditsData.plan?.monthlyPrice || 0}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Credits: </span>
                  <span className="font-semibold">{creditsData.plan?.credits || 120}</span>
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

          {/* Upgrade Plan Button */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Upgrade Your Plan
            </h3>
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
              <p className="text-sm text-muted-foreground mb-3">
                Get more credits and unlock premium features with our flexible plans.
              </p>
              <Button 
                size="sm" 
                className="w-full"
                onClick={() => window.location.href = '/pricing'}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

