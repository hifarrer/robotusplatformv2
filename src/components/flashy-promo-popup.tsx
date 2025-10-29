'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Gift, Zap, Star, Crown, ArrowRight, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FlashyPromoPopupProps {
  isVisible: boolean
  onUpgrade: () => void
  onClose?: () => void
}

export function FlashyPromoPopup({ isVisible, onUpgrade, onClose }: FlashyPromoPopupProps) {
  const [animationClass, setAnimationClass] = useState('')
  const [pulseClass, setPulseClass] = useState('')

  useEffect(() => {
    if (isVisible) {
      // Add entrance animation
      setAnimationClass('animate-bounce')
      
      // Add periodic flash effects
      const interval = setInterval(() => {
        setPulseClass('animate-pulse')
        setTimeout(() => setPulseClass('animate-ping'), 500)
        setTimeout(() => setPulseClass(''), 1000)
      }, 4000)

      return () => clearInterval(interval)
    }
  }, [isVisible])

  const handleClose = () => {
    onClose?.()
  }

  const handleUpgrade = () => {
    onUpgrade()
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm">
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl p-6 border-4 border-yellow-400 shadow-2xl transform hover:scale-105 transition-all duration-300">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-2 -left-2 w-16 h-16 bg-yellow-400/30 rounded-full animate-ping"></div>
          <div className="absolute -bottom-2 -right-2 w-20 h-20 bg-pink-400/30 rounded-full animate-pulse"></div>
          <div className="absolute top-1/2 left-1/3 w-12 h-12 bg-purple-400/30 rounded-full animate-bounce"></div>
          <div className="absolute top-1/4 right-1/4 w-8 h-8 bg-orange-400/30 rounded-full animate-ping"></div>
        </div>

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-2 right-2 h-6 w-6 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white z-10"
        >
          <X className="h-3 w-3" />
        </Button>

        <div className="relative z-10">
          {/* Header with animated sparkles */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className={`h-6 w-6 text-yellow-300 ${animationClass}`} />
            <h2 className="text-lg font-black text-white text-center">
              🎉 FLASH SALE! 🎉
            </h2>
            <Sparkles className={`h-6 w-6 text-yellow-300 ${animationClass}`} />
          </div>

          {/* Main offer */}
          <div className="text-center space-y-3 mb-4">
            <div className="bg-white/15 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Crown className="h-8 w-8 text-yellow-400 animate-pulse" />
                <div>
                  <div className="text-2xl font-black text-white">
                    Basic Plan
                  </div>
                  <div className="text-sm text-yellow-200">
                    Just $1 with code!
                  </div>
                </div>
                <Crown className="h-8 w-8 text-yellow-400 animate-pulse" />
              </div>
              
              {/* Price display */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-lg text-gray-300 line-through">$15</span>
                <div className="relative">
                  <DollarSign className={`h-8 w-8 text-yellow-300 ${pulseClass}`} />
                  <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-black text-yellow-300">
                    1
                  </span>
                </div>
                <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                  93% OFF!
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500/40 to-blue-500/40 rounded-lg p-2 border border-green-400/60">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Gift className="h-4 w-4 text-green-300" />
                  <span className="text-sm font-bold text-white">Code: TRYROBOTUS</span>
                </div>
                <p className="text-xs text-gray-200">
                  500 credits + premium features!
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-xs font-medium">500 Credits</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-xs font-medium">All AI Models</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-xs font-medium">Premium Support</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
              <Sparkles className="h-4 w-4 text-yellow-400" />
              <span className="text-white text-xs font-medium">Priority Queue</span>
            </div>
          </div>

          {/* Call to action */}
          <div className="text-center">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black text-sm py-3 px-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 animate-pulse"
            >
              <Gift className="h-4 w-4 mr-2" />
              GET BASIC PLAN FOR $1!
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <p className="text-yellow-200 text-xs mt-2 font-medium animate-pulse">
              ⏰ Limited time - Act now!
            </p>
          </div>
        </div>

        {/* Floating sparkles */}
        <div className="absolute top-1 left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-1 right-1 w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 right-1 w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
      </div>
    </div>
  )
}
