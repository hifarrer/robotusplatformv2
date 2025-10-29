'use client'

import { useSession } from 'next-auth/react'
import { FlashyPromoPopup } from '@/components/flashy-promo-popup'
import { useFlashyPromoPopup } from '@/hooks/use-flashy-promo-popup'

export function FlashyPromoPopupProvider() {
  const { data: session } = useSession()
  const { isVisible, closePopup, handleUpgrade } = useFlashyPromoPopup()

  // Only show for authenticated users
  if (!session) {
    return null
  }

  return (
    <FlashyPromoPopup
      isVisible={isVisible}
      onClose={closePopup}
      onUpgrade={handleUpgrade}
    />
  )
}
