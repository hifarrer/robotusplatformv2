'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles, Gift, Zap, Star, Crown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TryRobotusBannerProps {
  onUpgrade: () => void
  onClose?: () => void
}

export function TryRobotusBanner({ onUpgrade, onClose }: TryRobotusBannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [animationClass, setAnimationClass] = useState('')

  useEffect(() => {
    // Add entrance animation
    setAnimationClass('animate-pulse')
    
    // Add periodic flash effect
    const interval = setInterval(() => {
      setAnimationClass('animate-bounce')
      setTimeout(() => setAnimationClass('animate-pulse'), 1000)
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-2xl p-6 mb-8 border-2 border-yellow-400 shadow-2xl">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-24 h-24 bg-yellow-400/20 rounded-full animate-ping"></div>
        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-pink-400/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-purple-400/20 rounded-full animate-bounce"></div>
      </div>

      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-4 right-4 h-8 w-8 p-0 rounded-full bg-white/20 hover:bg-white/30 text-white z-10"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      <div className="relative z-10">
        {/* Header with animated sparkles */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <Sparkles className={`h-8 w-8 text-yellow-300 ${animationClass}`} />
          <h2 className="text-3xl font-bold text-white text-center">
            🎉 LIMITED TIME OFFER! 🎉
          </h2>
          <Sparkles className={`h-8 w-8 text-yellow-300 ${animationClass}`} />
        </div>

        {/* Main offer */}
        <div className="text-center space-y-4 mb-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="flex items-center justify-center gap-4 mb-3">
              <Crown className="h-10 w-10 text-yellow-400 animate-pulse" />
              <div>
                <div className="text-4xl font-black text-white mb-1">
                  Basic Plan
                </div>
                <div className="text-lg text-yellow-200">
                  Just $1 with coupon TRYROBOTUS!
                </div>
              </div>
              <Crown className="h-10 w-10 text-yellow-400 animate-pulse" />
            </div>
            
            {/* Price display */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="text-2xl text-gray-300 line-through">$15</span>
              <span className="text-5xl font-black text-yellow-300 animate-bounce">$1</span>
              <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                93% OFF!
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500/30 to-blue-500/30 rounded-lg p-3 border border-green-400/50">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Gift className="h-6 w-6 text-green-300" />
                <span className="text-xl font-bold text-white">Use Code: TRYROBOTUS</span>
              </div>
              <p className="text-sm text-gray-200">
                Get 500 credits + all premium features for just $1!
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <Zap className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-medium">500 Credits</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-medium">All AI Models</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
            <Crown className="h-5 w-5 text-yellow-400" />
            <span className="text-white font-medium">Premium Support</span>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center">
          <Button
            onClick={onUpgrade}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-black text-xl py-4 px-8 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-200 animate-pulse"
          >
            <Gift className="h-6 w-6 mr-3" />
            GET BASIC PLAN FOR $1!
            <ArrowRight className="h-6 w-6 ml-3" />
          </Button>
          
          <p className="text-yellow-200 text-sm mt-3 font-medium">
            ⏰ Offer expires soon - Don't miss out!
          </p>
        </div>
      </div>
    </div>
  )
}
