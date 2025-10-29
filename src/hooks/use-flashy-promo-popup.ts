'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCredits } from '@/contexts/credits-context'

const FLASHY_POPUP_KEY = 'flashy-popup-dismissed'
const POPUP_DELAY = 5 * 1000 // 5 seconds delay before showing
const POPUP_INTERVAL = 30 * 60 * 1000 // 30 minutes between shows

export function useFlashyPromoPopup() {
  const { creditsData } = useCredits()
  const [isVisible, setIsVisible] = useState(false)
  const [hasShown, setHasShown] = useState(false)

  // Check if user should see the popup
  const shouldShowPopup = useCallback(() => {
    if (!creditsData || hasShown) {
      return false
    }

    // Check if popup was dismissed recently
    const dismissedTime = localStorage.getItem(FLASHY_POPUP_KEY)
    if (dismissedTime) {
      const timeSinceDismissed = Date.now() - parseInt(dismissedTime)
      return timeSinceDismissed >= POPUP_INTERVAL
    }

    // Show for all users (not just low credit users)
    return true
  }, [creditsData, hasShown])

  // Show popup with delay
  const showPopup = useCallback(() => {
    if (shouldShowPopup()) {
      setTimeout(() => {
        setIsVisible(true)
        setHasShown(true)
      }, POPUP_DELAY)
    }
  }, [shouldShowPopup])

  // Close popup and set timer
  const closePopup = useCallback(() => {
    setIsVisible(false)
    localStorage.setItem(FLASHY_POPUP_KEY, Date.now().toString())
  }, [])

  // Handle upgrade action
  const handleUpgrade = useCallback(() => {
    // Navigate to pricing page with TRYROBOTUS discount code
    const pricingUrl = '/pricing?discount=TRYROBOTUS'
    window.location.href = pricingUrl
    closePopup()
  }, [closePopup])

  // Check on mount
  useEffect(() => {
    if (creditsData) {
      showPopup()
    }
  }, [creditsData, showPopup])

  // Set up interval to check every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (creditsData) {
        setHasShown(false) // Reset the hasShown flag
        showPopup()
      }
    }, POPUP_INTERVAL)

    return () => clearInterval(interval)
  }, [creditsData, showPopup])

  return {
    isVisible,
    closePopup,
    handleUpgrade
  }
}
