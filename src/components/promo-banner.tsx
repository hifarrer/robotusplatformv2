'use client'

import { useState, useEffect } from 'react'
import { X, Gift, Sparkles, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Start animation after component mounts
    const timer = setTimeout(() => setIsAnimating(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = () => {
    setIsVisible(false)
  }

  const copyCode = () => {
    navigator.clipboard.writeText('WELCOME')
    // You could add a toast notification here
  }

  if (!isVisible) return null

  return (
    <div className={`relative overflow-hidden transition-all duration-500 ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full'
    }`}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 opacity-90">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 animate-pulse"></div>
      </div>
      
      {/* Animated sparkles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-2 left-4 w-2 h-2 bg-yellow-300 rounded-full animate-bounce"></div>
        <div className="absolute top-4 right-8 w-1 h-1 bg-white rounded-full animate-ping"></div>
        <div className="absolute bottom-3 left-12 w-1.5 h-1.5 bg-yellow-200 rounded-full animate-bounce delay-300"></div>
        <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-ping delay-500"></div>
        <div className="absolute top-6 left-1/2 w-1 h-1 bg-yellow-300 rounded-full animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Animated gift icon */}
            <div className={`transform transition-all duration-700 ${
              isAnimating ? 'scale-110 rotate-12' : 'scale-100 rotate-0'
            }`}>
              <Gift className="w-8 h-8 text-white animate-bounce" />
            </div>
            
            {/* Main content */}
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-spin" />
              <span className="text-white font-bold text-lg">
                🎉 LIMITED TIME OFFER! 
              </span>
              <span className="text-yellow-300 font-black text-xl animate-pulse">
                50% OFF
              </span>
              <span className="text-white font-bold text-lg">
                your first month!
              </span>
            </div>

            {/* Promo code section */}
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 border-2 border-white/30">
                <span className="text-white text-sm font-medium">Use code:</span>
                <span className="text-yellow-300 font-black text-lg ml-2 tracking-wider">
                  WELCOME
                </span>
              </div>
              
              <Button
                onClick={copyCode}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <Zap className="w-4 h-4 mr-1" />
                Copy Code
              </Button>
            </div>
          </div>

          {/* Close button */}
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Animated border */}
      <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 rounded-lg animate-pulse">
        <div className="absolute inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-md"></div>
      </div>
    </div>
  )
}
