'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup
} from '@/components/ui/dropdown-menu'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Settings, ChevronDown } from 'lucide-react'
import { 
  UserPreferences, 
  PreferencesUpdateRequest,
  AspectRatio,
  TextToImageModel,
  ImageToImageModel,
  VideoModel,
  ASPECT_RATIO_OPTIONS,
  TEXT_TO_IMAGE_MODEL_OPTIONS,
  IMAGE_TO_IMAGE_MODEL_OPTIONS,
  VIDEO_MODEL_OPTIONS
} from '@/types'

interface PreferencesMenuProps {
  onPreferencesChange?: (preferences: UserPreferences) => void
}

export function PreferencesMenu({ onPreferencesChange }: PreferencesMenuProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      console.log('🔧 Loading user preferences...')
      const response = await fetch('/api/user-preferences')
      
      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error Response:', errorText)
        throw new Error(`Failed to load preferences: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('✅ Preferences loaded successfully:', data)
      setPreferences(data)
      onPreferencesChange?.(data)
    } catch (error) {
      console.error('❌ Error loading preferences:', error)
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreferences = async (updates: PreferencesUpdateRequest) => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/user-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) throw new Error('Failed to update preferences')
      
      const updatedPreferences = await response.json()
      setPreferences(updatedPreferences)
      onPreferencesChange?.(updatedPreferences)
    } catch (error) {
      console.error('Error updating preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAspectRatioChange = (value: AspectRatio) => {
    updatePreferences({ aspectRatio: value })
  }

  const handleTextToImageModelChange = (value: TextToImageModel) => {
    updatePreferences({ textToImageModel: value })
  }

  const handleImageToImageModelChange = (value: ImageToImageModel) => {
    updatePreferences({ imageToImageModel: value })
  }

  const handleVideoModelChange = (value: VideoModel) => {
    updatePreferences({ videoModel: value })
  }

  if (!preferences) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-400"
        disabled
      >
        <Settings className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    )
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-gray-400 hover:text-white"
          disabled={isLoading}
        >
          <Settings className="w-4 h-4 mr-2" />
          Preferences
          <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 bg-gray-900 border-gray-700" 
        align="end"
        side="bottom"
      >
        <DropdownMenuLabel className="text-white font-semibold">
          AI Generation Preferences
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Aspect Ratio
            </label>
            <Select
              value={preferences.aspectRatio}
              onValueChange={handleAspectRatioChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {ASPECT_RATIO_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400">{option.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Text-to-Image Model
            </label>
            <Select
              value={preferences.textToImageModel}
              onValueChange={handleTextToImageModelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {TEXT_TO_IMAGE_MODEL_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400">{option.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Image-to-Image Model
            </label>
            <Select
              value={preferences.imageToImageModel}
              onValueChange={handleImageToImageModelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {IMAGE_TO_IMAGE_MODEL_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400">{option.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="bg-gray-700" />
        
        <DropdownMenuGroup>
          <div className="px-2 py-2">
            <label className="text-sm font-medium text-gray-300 block mb-2">
              Video Model
            </label>
            <Select
              value={preferences.videoModel}
              onValueChange={handleVideoModelChange}
              disabled={isLoading}
            >
              <SelectTrigger className="w-full bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                {VIDEO_MODEL_OPTIONS.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-white hover:bg-gray-700"
                  >
                    <div>
                      <div className="font-medium">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-gray-400">{option.description}</div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}