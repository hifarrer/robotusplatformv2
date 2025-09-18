'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { 
  ArrowLeft,
  LogOut, 
  User,
  Bot,
  Download,
  Trash2,
  Play,
  Calendar,
  Video,
  Loader2
} from 'lucide-react'
import { cn, formatFileSize, formatTimestamp } from '@/lib/utils'

interface SavedVideo {
  id: string
  title: string
  prompt: string
  localPath: string
  fileName: string
  fileSize: number
  mimeType: string
  createdAt: string
  generation?: {
    type: string
    provider: string
    model: string
  }
}

interface VideosResponse {
  videos: SavedVideo[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export function MyVideosView() {
  const { data: session } = useSession()
  const [videos, setVideos] = useState<SavedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedVideo, setSelectedVideo] = useState<SavedVideo | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchVideos = async (pageNum = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-videos?page=${pageNum}&limit=20`)
      if (!response.ok) throw new Error('Failed to fetch videos')
      
      const data: VideosResponse = await response.json()
      
      if (pageNum === 1) {
        setVideos(data.videos)
      } else {
        setVideos(prev => [...prev, ...data.videos])
      }
      
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchVideos(page + 1)
    }
  }

  const deleteVideo = async (videoId: string) => {
    try {
      setDeleting(videoId)
      const response = await fetch(`/api/my-videos?id=${videoId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to delete video')
      
      setVideos(prev => prev.filter(vid => vid.id !== videoId))
      setSelectedVideo(null)
    } catch (error) {
      console.error('Error deleting video:', error)
    } finally {
      setDeleting(null)
    }
  }

  const downloadVideo = (video: SavedVideo) => {
    const link = document.createElement('a')
    link.href = video.localPath
    link.download = video.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-800 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/chat'}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Chat
          </Button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-semibold">My Videos</h1>
            <p className="text-gray-400 text-sm">Your saved generated videos</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={session?.user?.image || ''} />
            <AvatarFallback className="bg-gray-700 text-white">
              {session?.user?.name?.[0] || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="text-gray-400 hover:text-white"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {loading && videos.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading your videos...</p>
            </div>
          </div>
        ) : videos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Videos Yet</h2>
            <p className="text-gray-400 max-w-md mb-6">
              Start generating videos in the chat to see them saved here!
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
            {/* Videos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
                >
                  {/* Video Preview */}
                  <div className="aspect-video relative bg-gray-800">
                    <video
                      className="w-full h-full object-cover"
                      poster=""
                      preload="metadata"
                    >
                      <source src={video.localPath} type={video.mimeType} />
                    </video>
                    
                    {/* Play icon overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <Play className="w-6 h-6 text-white ml-1" />
                      </div>
                    </div>
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedVideo(video)}
                        className="text-white hover:bg-white/20"
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadVideo(video)}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVideo(video.id)}
                        disabled={deleting === video.id}
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        {deleting === video.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm truncate mb-1">
                      {video.title}
                    </h3>
                    <p className="text-gray-400 text-xs truncate mb-2">
                      {video.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatTimestamp(new Date(video.createdAt))}
                      </span>
                      <span>{formatFileSize(video.fileSize)}</span>
                    </div>
                    {video.generation && (
                      <div className="mt-1 text-xs text-gray-500">
                        {video.generation.model}
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

      {/* Video Detail Modal */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedVideo?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedVideo && (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="relative rounded-lg overflow-hidden bg-black">
                <video
                  className="w-full max-h-96 object-contain"
                  controls
                  preload="metadata"
                >
                  <source src={selectedVideo.localPath} type={selectedVideo.mimeType} />
                  Your browser does not support the video tag.
                </video>
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Prompt</h4>
                  <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded">
                    {selectedVideo.prompt}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-white font-medium mb-1">Details</h4>
                    <div className="text-gray-300 text-sm space-y-1">
                      <div>Created: {new Date(selectedVideo.createdAt).toLocaleString()}</div>
                      <div>Size: {formatFileSize(selectedVideo.fileSize)}</div>
                      <div>Format: {selectedVideo.mimeType}</div>
                    </div>
                  </div>
                  
                  {selectedVideo.generation && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Generation</h4>
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>Type: {selectedVideo.generation.type.replace('_', ' ')}</div>
                        <div>Model: {selectedVideo.generation.model}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => downloadVideo(selectedVideo)}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => deleteVideo(selectedVideo.id)}
                  disabled={deleting === selectedVideo.id}
                >
                  {deleting === selectedVideo.id ? (
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
  )
}