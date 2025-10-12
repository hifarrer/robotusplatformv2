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
  Eye,
  Calendar,
  Image as ImageIcon,
  Loader2,
  Video,
  Music
} from 'lucide-react'
import { cn, formatFileSize, formatTimestamp } from '@/lib/utils'
import Image from 'next/image'

interface SavedImage {
  id: string
  title: string
  prompt: string
  localPath: string
  fileName: string
  fileSize: number
  width?: number
  height?: number
  mimeType: string
  createdAt: string
  generation?: {
    type: string
    provider: string
    model: string
  }
}

interface ImagesResponse {
  images: SavedImage[]
  total: number
  page: number
  totalPages: number
  hasMore: boolean
}

export function MyImagesView() {
  const { data: session } = useSession()
  const [images, setImages] = useState<SavedImage[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedImage, setSelectedImage] = useState<SavedImage | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchImages = async (pageNum = 1) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/my-images?page=${pageNum}&limit=20`)
      if (!response.ok) throw new Error('Failed to fetch images')
      
      const data: ImagesResponse = await response.json()
      
      if (pageNum === 1) {
        setImages(data.images)
      } else {
        setImages(prev => [...prev, ...data.images])
      }
      
      setPage(data.page)
      setTotalPages(data.totalPages)
    } catch (error) {
      console.error('Error fetching images:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchImages()
  }, [])

  const loadMore = () => {
    if (page < totalPages && !loading) {
      fetchImages(page + 1)
    }
  }

  const deleteImage = async (imageId: string) => {
    try {
      setDeleting(imageId)
      console.log('🗑️ Frontend: Deleting image with ID:', imageId)
      
      const response = await fetch(`/api/my-images?id=${imageId}`, {
        method: 'DELETE',
      })
      
      console.log('🗑️ Frontend: Delete response status:', response.status)
      const data = await response.json()
      console.log('🗑️ Frontend: Delete response data:', data)
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete image')
      }
      
      console.log('✅ Frontend: Image deleted successfully, removing from UI')
      setImages(prev => prev.filter(img => img.id !== imageId))
      setSelectedImage(null)
    } catch (error) {
      console.error('❌ Frontend: Error deleting image:', error)
      alert(`Failed to delete image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setDeleting(null)
    }
  }

  const downloadImage = (image: SavedImage) => {
    const link = document.createElement('a')
    link.href = image.localPath
    link.download = image.fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
              <Avatar className="w-7 h-7">
                <AvatarImage src={session?.user?.image || ''} />
                <AvatarFallback className="bg-gray-700 text-white text-xs">
                  {session?.user?.name?.[0] || <User className="w-3 h-3" />}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="text-gray-400 hover:text-white p-2"
              >
                <LogOut className="w-4 h-4" />
              </Button>
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
                onClick={() => window.location.href = '/my-videos'}
                className="text-gray-400 hover:text-white"
                title="My Videos"
              >
                <Video className="w-4 h-4 mr-2" />
                My Videos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.href = '/my-audios'}
                className="text-gray-400 hover:text-white"
                title="My Audios"
              >
                <Music className="w-4 h-4 mr-2" />
                My Audios
              </Button>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-2 sm:p-4">
        {loading && images.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading your images...</p>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
              <ImageIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">No Images Yet</h2>
            <p className="text-gray-400 max-w-md mb-6">
              Start generating images in the chat to see them saved here!
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
            {/* Images Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="group relative bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors"
                >
                  {/* Image */}
                  <div className="aspect-square relative">
                    <Image
                      src={image.localPath}
                      alt={image.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    />
                    
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedImage(image)}
                        className="text-white hover:bg-white/20"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadImage(image)}
                        className="text-white hover:bg-white/20"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteImage(image.id)}
                        disabled={deleting === image.id}
                        className="text-red-400 hover:bg-red-500/20"
                      >
                        {deleting === image.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Image Info */}
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm truncate mb-1">
                      {image.title}
                    </h3>
                    <p className="text-gray-400 text-xs truncate mb-2">
                      {image.prompt}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {formatTimestamp(new Date(image.createdAt))}
                      </span>
                      <span>{formatFileSize(image.fileSize)}</span>
                    </div>
                    {image.generation && (
                      <div className="mt-1 text-xs text-gray-500">
                        {image.generation.model}
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

      {/* Image Detail Modal */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{selectedImage?.title}</DialogTitle>
          </DialogHeader>
          
          {selectedImage && (
            <div className="space-y-4">
              {/* Image */}
              <div className="relative max-h-96 overflow-hidden rounded-lg">
                <Image
                  src={selectedImage.localPath}
                  alt={selectedImage.title}
                  width={selectedImage.width || 512}
                  height={selectedImage.height || 512}
                  className="w-full h-auto object-contain"
                />
              </div>
              
              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-medium mb-2">Prompt</h4>
                  <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded">
                    {selectedImage.prompt}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-white font-medium mb-1">Details</h4>
                    <div className="text-gray-300 text-sm space-y-1">
                      <div>Created: {new Date(selectedImage.createdAt).toLocaleString()}</div>
                      <div>Size: {formatFileSize(selectedImage.fileSize)}</div>
                      {selectedImage.width && selectedImage.height && (
                        <div>Dimensions: {selectedImage.width} × {selectedImage.height}</div>
                      )}
                      <div>Format: {selectedImage.mimeType}</div>
                    </div>
                  </div>
                  
                  {selectedImage.generation && (
                    <div>
                      <h4 className="text-white font-medium mb-1">Generation</h4>
                      <div className="text-gray-300 text-sm space-y-1">
                        <div>Type: {selectedImage.generation.type.replace('_', ' ')}</div>
                        <div>Model: {selectedImage.generation.model}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => downloadImage(selectedImage)}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
                
                <Button
                  variant="destructive"
                  onClick={() => deleteImage(selectedImage.id)}
                  disabled={deleting === selectedImage.id}
                >
                  {deleting === selectedImage.id ? (
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