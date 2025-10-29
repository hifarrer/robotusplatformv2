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
    <>
      <FlashyPromoPopup
        isVisible={isVisible}
        onClose={closePopup}
        onUpgrade={handleUpgrade}
      />
      
      {/* Temporary debug button - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => {
              console.log('🧪 [DEBUG] Force showing popup')
              // Clear localStorage to force show
              localStorage.removeItem('flashy-popup-dismissed')
              // Reload page to trigger popup
              window.location.reload()
            }}
            className="bg-red-500 text-white px-3 py-1 rounded text-xs"
          >
            🧪 Force Show Popup
          </button>
        </div>
      )}
    </>
  )
}
