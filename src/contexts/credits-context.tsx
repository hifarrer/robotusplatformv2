'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'

interface Plan {
  id: string
  name: string
  monthlyPrice: number
  yearlyPrice: number
  credits: number
  description?: string
}

interface CreditsData {
  balance: number
  plan: Plan | null
}

interface CreditsContextType {
  creditsData: CreditsData | null
  isLoading: boolean
  refreshCredits: () => Promise<void>
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined)

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession()
  const [creditsData, setCreditsData] = useState<CreditsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCredits = async () => {
    if (!session?.user?.id) {
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/credits')
      if (response.ok) {
        const data = await response.json()
        setCreditsData(data)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshCredits = async () => {
    setIsLoading(true)
    await fetchCredits()
  }

  useEffect(() => {
    fetchCredits()
  }, [session?.user?.id])

  return (
    <CreditsContext.Provider value={{ creditsData, isLoading, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  )
}

export function useCredits() {
  const context = useContext(CreditsContext)
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditsProvider')
  }
  return context
}
