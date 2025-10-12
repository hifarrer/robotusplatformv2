'use client'

import { Button } from '@/components/ui/button'
import { User, User2 } from 'lucide-react'

interface GenderSelectionProps {
  onGenderSelect: (gender: 'female' | 'male') => void
}

export function GenderSelection({ onGenderSelect }: GenderSelectionProps) {
  return (
    <div className="flex gap-3 mt-3">
      <Button
        variant="outline"
        size="lg"
        onClick={() => onGenderSelect('female')}
        className="flex-1 bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100 hover:border-pink-300 transition-colors"
      >
        <User className="w-5 h-5 mr-2" />
        Female
      </Button>
      <Button
        variant="outline"
        size="lg"
        onClick={() => onGenderSelect('male')}
        className="flex-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors"
      >
        <User2 className="w-5 h-5 mr-2" />
        Male
      </Button>
    </div>
  )
}
