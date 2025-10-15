'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { UserMenu } from '@/components/user-menu'
import { CreditsDisplay } from '@/components/credits-display'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowLeft,
  User,
  Bot,
  Download,
  Trash2,
  Play,
  Calendar,
  Volume2,
  Loader2,
  Image as ImageIcon,
  Video,
  Music
} from 'lucide-react'
import { cn, formatFileSize, formatTimestamp } from '@/lib/utils'

interface SavedAudio {
  id: string
  title: string
  prompt: string
  localPath: string
  fileName: string
  fileSize: number
  duration?: number
  voiceId?: string
  language?: string
  mimeType?: string
  createdAt: string
  generation?: {
    type: string
    provider: string
    model: string
  }
}

interface AudiosResponse {
  audios: SavedAudio[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export function MyAudiosView() {
  const { data: session } = useSession()
  const [audios, setAudios] = useState<SavedAudio[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedAudio, setSelectedAudio] = useState<SavedAudio | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)

  const fetchAudios = async (pageNum = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-audios?page=${pageNum}&limit=20`)
      if (!response.ok) throw new Error('Failed to fetch audios')
      
      const data: AudiosResponse = await response.json()
      
      if (pageNum === 1) {
        setAudios(data.audios)
      } else {
        setAudios(prev => [...prev, ...data.audios])
      }
      
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching audios:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudios()
  }, [])

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchAudios(page + 1)
    }
  }

  const deleteAudio = async (audioId: string) => {
    try {
      setDeleting(audioId)
      const response = await fetch(`/api/my-audios?id=${audioId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete audio')
      
      setAudios(prev => prev.filter(audio => audio.id !== audioId))
      setSelectedAudio(null)
    } catch (error) {
      console.error('Error deleting audio:', error)
    } finally {
      setDeleting(null)
    }
  }

  const downloadAudio = (audio: SavedAudio) => {
    const link = document.createElement('a')
    link.href = audio.localPath
    link.download = audio.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const togglePlay = (audio: SavedAudio) => {
    if (playingAudio === audio.id) {
      setPlayingAudio(null)
    } else {
      setPlayingAudio(audio.id)
    }
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Main content area */}
      <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-gray-800 p-3 sm:p-4">
          {/* Mobile header - stacked layout */}
          <div className="flex items-center justify-between mb-3 sm:hidden">
            <div className="flex items-center space-x-2">
              <Avatar className="w-7 h-7">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-4 h-4 text-white" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-white font-semibold text-sm">Robotus.AI</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/chat'}
                className="text-gray-400 hover:text-white p-2"
                title="Back to Chat"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <UserMenu />
            </div>
          </div>
          
          {/* Desktop header - original layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-white font-semibold">Robotus.AI</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/chat'}
                className="text-gray-400 hover:text-white"
                title="Back to Chat"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/my-images'}
                className="text-gray-400 hover:text-white"
                title="My Images"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                My Images
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/my-videos'}
                className="text-gray-400 hover:text-white"
                title="My Videos"
              >
                <Video className="w-4 h-4 mr-2" />
                My Videos
              </Button>
              <CreditsDisplay />
              <UserMenu />
            </div>
          </div>
          
          {/* Mobile navigation menu */}
          <div className="flex sm:hidden items-center justify-center space-x-4 pt-2 border-t border-gray-700">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/my-images'}
              className="text-gray-400 hover:text-white text-xs px-2 py-1"
            >
              <ImageIcon className="w-3 h-3 mr-1" />
              Images
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/my-videos'}
              className="text-gray-400 hover:text-white text-xs px-2 py-1"
            >
              <Video className="w-3 h-3 mr-1" />
              Videos
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.href = '/my-audios'}
              className="text-gray-400 hover:text-white text-xs px-2 py-1"
            >
              <Music className="w-3 h-3 mr-1" />
              Audios
            </Button>
            <CreditsDisplay isMobile={true} />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4">
        {loading && audios.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading your audios...</p>
            </div>
          </div>
        ) : audios.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
              <Volume2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Audios Yet</h2>
            <p className="text-gray-400 max-w-md mb-6">
              Start generating audios in the chat to see them saved here!
            </p>
            <Button
              variant="gradient"
              onClick={() => window.location.href = '/chat'}
            >
              Start Creating
            </Button>
          </div>
        ) : (
          <>
            {/* Audios Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {audios.map((audio) => (
                <div
                  key={audio.id}
                  className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
                >
                  {/* Audio Preview */}
                  <div className="aspect-square relative bg-gray-800 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                      <Volume2 className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadAudio(audio)}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedAudio(audio)}
                        className="text-white hover:bg-white/20"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAudio(audio.id)}
                        disabled={deleting === audio.id}
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        {deleting === audio.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Audio Info */}
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm truncate mb-1">
                      {audio.title}
                    </h3>
                    <p className="text-gray-400 text-xs truncate mb-2">
                      {audio.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatTimestamp(new Date(audio.createdAt))}
                      </span>
                      <span>{formatFileSize(audio.fileSize)}</span>
                    </div>
                    {audio.voiceId && (
                      <div className="mt-1 text-xs text-gray-500">
                        Voice: {audio.voiceId}
                      </div>
                    )}
                    {audio.language && (
                      <div className="text-xs text-gray-500">
                        Language: {audio.language}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {page < totalPages && (
              <div className="flex justify-center mt-8">
                <Button
                  variant="outline"
                  onClick={loadMore}
                  disabled={loading}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Audio Detail Modal */}
      <Dialog open={!!selectedAudio} onOpenChange={() => setSelectedAudio(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedAudio?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedAudio && (
            <div className="space-y-4">
              {/* Audio Player */}
              <div className="relative rounded-lg overflow-hidden bg-black p-6">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
                    <Volume2 className="w-10 h-10 text-white" />
                  </div>
                </div>
                <audio
                  className="w-full"
                  controls
                  preload="metadata"
                >
                  <source src={selectedAudio.localPath} type="audio/mpeg" />
                  Your browser does not support the audio tag.
                </audio>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Text</h4>
                  <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded">
                    {selectedAudio.prompt}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-white font-medium mb-1">Details</h4>
                    <div className="text-gray-300 text-sm space-y-1">
                      <div>Created: {new Date(selectedAudio.createdAt).toLocaleString()}</div>
                      <div>Size: {formatFileSize(selectedAudio.fileSize)}</div>
                      {selectedAudio.duration && (
                        <div>Duration: {Math.round(selectedAudio.duration)}s</div>
                      )}
                    </div>
                  </div>
                  
                  {selectedAudio.voiceId && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Voice</h4>
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>Voice ID: {selectedAudio.voiceId}</div>
                        {selectedAudio.language && (
                          <div>Language: {selectedAudio.language}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedAudio.generation && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Generation</h4>
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>Type: {selectedAudio.generation.type.replace('_', ' ')}</div>
                        <div>Model: {selectedAudio.generation.model}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => downloadAudio(selectedAudio)}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => deleteAudio(selectedAudio.id)}
                  disabled={deleting === selectedAudio.id}
                >
                  {deleting === selectedAudio.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
