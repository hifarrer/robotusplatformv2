'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCredits } from '@/contexts/credits-context'

const FLASHY_POPUP_KEY = 'flashy-popup-dismissed'
const POPUP_DELAY = 3 * 1000 // 3 seconds delay before showing (reduced from 5)
const POPUP_INTERVAL = process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 30 * 60 * 1000 // 2 minutes in dev, 30 minutes in production

export function useFlashyPromoPopup() {
  const { creditsData, isLoading } = useCredits()
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)

  // Check if user should see the popup
  const shouldShowPopup = useCallback(() => {
    console.log('🔍 [FLASHY POPUP] Checking if should show popup:', {
      creditsData: !!creditsData,
      isLoading,
      hasShown,
      creditsBalance: creditsData?.balance
    })

    // Don't show if still loading or no credits data
    if (isLoading || !creditsData) {
      console.log('🔍 [FLASHY POPUP] Not showing - loading or no credits data')
      return false
    }

    // Don't show if already shown in this session
    if (hasShown) {
      console.log('🔍 [FLASHY POPUP] Not showing - already shown in this session')
      return false
    }

    // Check if popup was dismissed recently
    const dismissedTime = localStorage.getItem(FLASHY_POPUP_KEY)
    if (dismissedTime) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedTime)
      const shouldShowAgain = timeSinceDismissed >= POPUP_INTERVAL
      console.log('🔍 [FLASHY POPUP] Dismissal check:', {
        dismissedTime: new Date(parseInt(dismissedTime)).toLocaleString(),
        timeSinceDismissed: Math.round(timeSinceDismissed / 1000 / 60), // minutes
        shouldShowAgain
      })
      return shouldShowAgain
    }

    // Show for all authenticated users
    console.log('🔍 [FLASHY POPUP] Should show - no previous dismissal')
    return true
  }, [creditsData, isLoading, hasShown])

  // Show popup with delay
  const showPopup = useCallback(() => {
    if (shouldShowPopup()) {
      console.log('🎉 [FLASHY POPUP] Scheduling popup to show in', POPUP_DELAY / 1000, 'seconds')
      setTimeout(() => {
        console.log('🎉 [FLASHY POPUP] Showing popup now!')
        setIsVisible(true)
        setHasShown(true)
      }, POPUP_DELAY)
    }
  }, [shouldShowPopup])

  // Close popup and set timer
  const closePopup = useCallback(() => {
    console.log('❌ [FLASHY POPUP] Closing popup')
    setIsVisible(false)
    localStorage.setItem(FLASHY_POPUP_KEY, Date.now().toString())
  }, [])

  // Handle upgrade action
  const handleUpgrade = useCallback(() => {
    console.log('🚀 [FLASHY POPUP] Upgrade clicked - navigating to pricing')
    // Navigate to pricing page with TRYROBOTUS discount code
    const pricingUrl = '/pricing?discount=TRYROBOTUS'
    window.location.href = pricingUrl
    closePopup()
  }, [closePopup])

  // Check on mount and when credits data changes
  useEffect(() => {
    console.log('🔄 [FLASHY POPUP] Effect triggered:', { creditsData: !!creditsData, isLoading })
    if (creditsData && !isLoading) {
      showPopup()
    }
  }, [creditsData, isLoading, showPopup])

  // Set up interval to check every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ [FLASHY POPUP] 30-minute interval check')
      if (creditsData && !isLoading) {
        setHasShown(false) // Reset the hasShown flag
        showPopup()
      }
    }, POPUP_INTERVAL)

    return () => clearInterval(interval)
  }, [creditsData, isLoading, showPopup])

  console.log('🔍 [FLASHY POPUP] Hook state:', { isVisible, hasShown, creditsData: !!creditsData, isLoading })

  return {
    isVisible,
    closePopup,
    handleUpgrade
  }
}
