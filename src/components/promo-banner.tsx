'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Gift, Zap, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useCredits } from '@/contexts/credits-context'

interface PromoBannerProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export function PromoBanner({ isOpen, onClose, onUpgrade }: PromoBannerProps) {
  const { creditsData } = useCredits()
  
  // Don't render if no credits data or if not open
  if (!creditsData || !isOpen) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-2 border-gradient-to-r from-pink-500 to-purple-500 bg-gradient-to-br from-purple-900/20 via-pink-900/20 to-orange-900/20 backdrop-blur-sm">
        <DialogHeader className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute -top-2 -right-2 h-8 w-8 p-0 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <X className="h-4 w-4" />
          </Button>
          <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-orange-400 bg-clip-text text-transparent">
            🎉 Special Offer! 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Animated Sparkles */}
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="h-16 w-16 text-yellow-400 animate-pulse" />
              <Sparkles className="h-8 w-8 text-pink-400 absolute -top-2 -right-2 animate-bounce" />
              <Sparkles className="h-6 w-6 text-purple-400 absolute -bottom-1 -left-2 animate-ping" />
            </div>
          </div>

          {/* Main Message */}
          <div className="text-center space-y-4">
            <div className="bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-lg p-4 border border-pink-400/30">
              <h3 className="text-xl font-bold text-white mb-2">
                Running Low on Credits?
              </h3>
              <p className="text-gray-200 text-sm">
                You have <span className="font-bold text-yellow-400">{creditsData.balance}</span> credits remaining
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg p-4 border border-green-400/30">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-green-400" />
                <span className="text-lg font-bold text-white">50% OFF Your First Month!</span>
              </div>
              <p className="text-gray-200 text-sm">
                Use code <span className="font-bold text-green-400 bg-green-500/20 px-2 py-1 rounded">WELCOME</span> for 50% discount
              </p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span>Unlimited AI generations</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Star className="h-4 w-4 text-yellow-400" />
              <span>Premium features unlocked</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span>Priority support</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onUpgrade}
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Gift className="h-5 w-5 mr-2" />
              Upgrade Now - 50% OFF!
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-400 text-gray-300 hover:bg-white/10 hover:text-white"
            >
              Maybe Later
            </Button>
          </div>

          {/* Timer or urgency message */}
          <div className="text-center">
            <p className="text-xs text-gray-400">
              ⏰ Limited time offer - Don't miss out!
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}