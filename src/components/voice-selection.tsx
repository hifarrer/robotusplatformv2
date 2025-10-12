'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Volume2, Loader2, Check } from 'lucide-react'

interface Voice {
  language: string
  voice_id: string
  gender: string
  age: string
  description: string
}

interface VoiceSelectionProps {
  isOpen: boolean
  onClose: () => void
  onSelectVoice: (voiceId: string, language: string) => void
  userDescription?: string
  userGender?: string
  userLanguage?: string
}

export function VoiceSelection({ 
  isOpen, 
  onClose, 
  onSelectVoice, 
  userDescription = '', 
  userGender = '', 
  userLanguage = 'English' 
}: VoiceSelectionProps) {
  const [voices, setVoices] = useState<Voice[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterLanguage, setFilterLanguage] = useState(userLanguage)
  const [matchingVoice, setMatchingVoice] = useState<string | null>(null)
  const [isMatching, setIsMatching] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadVoices()
    }
  }, [isOpen])

  const loadVoices = async () => {
    try {
      setLoading(true)
      const response = await fetch('/assets/voices.json')
      if (response.ok) {
        const voicesData = await response.json()
        setVoices(voicesData)
      }
    } catch (error) {
      console.error('Error loading voices:', error)
    } finally {
      setLoading(false)
    }
  }

  const matchVoiceWithAI = async () => {
    if (!userDescription.trim()) return

    try {
      setIsMatching(true)
      const response = await fetch('/api/match-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: userDescription,
          gender: userGender,
          language: userLanguage
        })
      })

      if (response.ok) {
        const result = await response.json()
        setMatchingVoice(result.voiceId)
        setSelectedVoice(result.voiceId)
      }
    } catch (error) {
      console.error('Error matching voice:', error)
    } finally {
      setIsMatching(false)
    }
  }

  const filteredVoices = voices.filter(voice => {
    const matchesSearch = voice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voice.voice_id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesGender = !filterGender || voice.gender === filterGender
    const matchesLanguage = !filterLanguage || voice.language === filterLanguage
    return matchesSearch && matchesGender && matchesLanguage
  })

  const handleSelectVoice = (voiceId: string) => {
    setSelectedVoice(voiceId)
  }

  const handleConfirm = () => {
    if (selectedVoice) {
      const voice = voices.find(v => v.voice_id === selectedVoice)
      onSelectVoice(selectedVoice, voice?.language || userLanguage)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Volume2 className="w-5 h-5 mr-2" />
            Select Voice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Voice Matching */}
          {userDescription && (
            <div className="bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">AI Voice Matching</h3>
              <p className="text-gray-300 text-sm mb-3">
                Description: "{userDescription}"
              </p>
              <Button
                onClick={matchVoiceWithAI}
                disabled={isMatching}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Matching Voice...
                  </>
                ) : (
                  'Find Best Match'
                )}
              </Button>
              {matchingVoice && (
                <div className="mt-2 text-green-400 text-sm">
                  ✓ Found match: {matchingVoice}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-white text-sm font-medium mb-1 block">Search</label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search voices..."
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-1 block">Gender</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
              >
                <option value="">All</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-1 block">Language</label>
              <select
                value={filterLanguage}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="w-full p-2 bg-gray-800 border border-gray-600 rounded text-white"
              >
                <option value="">All</option>
                <option value="English">English</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Portuguese">Portuguese</option>
                <option value="Chinese">Chinese</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
              </select>
            </div>
          </div>

          {/* Voice List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-400">Loading voices...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVoices.map((voice) => (
                  <div
                    key={voice.voice_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVoice === voice.voice_id
                        ? 'border-pink-500 bg-pink-500/10'
                        : 'border-gray-600 bg-gray-800 hover:border-gray-500'
                    }`}
                    onClick={() => handleSelectVoice(voice.voice_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-medium">{voice.voice_id}</span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                            {voice.gender}
                          </span>
                          <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">
                            {voice.language}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm">{voice.description}</p>
                      </div>
                      {selectedVoice === voice.voice_id && (
                        <Check className="w-5 h-5 text-pink-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div className="text-gray-400 text-sm">
              {filteredVoices.length} voices found
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="text-gray-300 border-gray-600 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!selectedVoice}
                className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
              >
                Select Voice
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
