'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCredits } from '@/contexts/credits-context'

const PROMO_BANNER_KEY = 'promo-banner-dismissed'
const TIMER_INTERVAL = 15 * 60 * 1000 // 15 minutes in milliseconds
const CREDIT_THRESHOLD = 30

export function usePromoBanner() {
  const { creditsData } = useCredits()
  const [isOpen, setIsOpen] = useState(false)
  const [lastShown, setLastShown] = useState<number | null>(null)

  // Check if user should see the promo banner
  const shouldShowBanner = useCallback(() => {
    if (!creditsData || creditsData.balance > CREDIT_THRESHOLD) {
      return false
    }

    // Check if banner was dismissed recently
    const dismissedTime = localStorage.getItem(PROMO_BANNER_KEY)
    if (dismissedTime) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedTime)
      return timeSinceDismissed >= TIMER_INTERVAL
    }

    // Show immediately if credits are low and no previous dismissal
    return true
  }, [creditsData])

  // Show banner if conditions are met
  const checkAndShowBanner = useCallback(() => {
    if (shouldShowBanner()) {
      setIsOpen(true)
      setLastShown(Date.now())
    }
  }, [shouldShowBanner, creditsData])

  // Close banner and set timer
  const closeBanner = useCallback(() => {
    setIsOpen(false)
    localStorage.setItem(PROMO_BANNER_KEY, Date.now().toString())
  }, [])

  // Handle upgrade action
  const handleUpgrade = useCallback(() => {
    // Navigate to pricing page with discount code
    const pricingUrl = '/pricing?discount=WELCOME'
    window.location.href = pricingUrl
    closeBanner()
  }, [closeBanner])

  // Check on mount and when credits change
  useEffect(() => {
    if (creditsData) {
      // Use requestAnimationFrame to defer the check until after render
      requestAnimationFrame(() => {
        checkAndShowBanner()
      })
    }
  }, [creditsData, checkAndShowBanner])

  // Set up interval to check every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (creditsData && creditsData.balance <= CREDIT_THRESHOLD) {
        requestAnimationFrame(() => {
          checkAndShowBanner()
        })
      }
    }, TIMER_INTERVAL)

    return () => clearInterval(interval)
  }, [creditsData, checkAndShowBanner])


  return {
    isOpen,
    closeBanner,
    handleUpgrade,
    shouldShow: creditsData ? creditsData.balance <= CREDIT_THRESHOLD : false
  }
}
