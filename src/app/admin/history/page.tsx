'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Bot, 
  Shield, 
  ChevronLeft, 
  ChevronRight,
  Image as ImageIcon,
  Video,
  Music,
  Eye,
  ExternalLink,
  Calendar,
  User,
  CreditCard,
  Loader2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { Badge } from '@/components/ui/badge'

interface GenerationHistory {
  id: string
  type: string
  status: string
  prompt: string
  provider: string
  model: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
    credits: number
    plan: string
  }
  thumbnailUrl: string | null
  mediaType: string | null
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface HistoryResponse {
  generations: GenerationHistory[]
  pagination: PaginationInfo
}

export default function AdminHistory() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [data, setData] = useState<HistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    fetchHistory()
  }, [currentPage])

  const fetchHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/history?page=${currentPage}&limit=20`)
      if (response.status === 403) {
        setError('Access denied. Admin privileges required.')
        return
      }
      if (response.ok) {
        const result = await response.json()
        setData(result)
      } else {
        setError('Failed to load generations history')
      }
    } catch (error) {
      console.error('Error fetching history:', error)
      setError('An error occurred while loading history')
    } finally {
      setIsLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'TEXT_TO_IMAGE':
      case 'IMAGE_TO_IMAGE':
      case 'IMAGE_UPSCALE':
        return <ImageIcon className="w-4 h-4 text-blue-500" />
      case 'TEXT_TO_VIDEO':
      case 'IMAGE_TO_VIDEO':
      case 'LIPSYNC':
        return <Video className="w-4 h-4 text-purple-500" />
      case 'TEXT_TO_AUDIO':
        return <Music className="w-4 h-4 text-pink-500" />
      default:
        return <ImageIcon className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>
      case 'PROCESSING':
        return <Badge className="bg-yellow-500">Processing</Badge>
      case 'PENDING':
        return <Badge className="bg-blue-500">Pending</Badge>
      case 'FAILED':
        return <Badge className="bg-red-500">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const handleThumbnailClick = (thumbnailUrl: string, mediaType: string) => {
    // The thumbnailUrl already contains the correct path, so use it directly
    window.open(thumbnailUrl, '_blank')
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
          <div className="text-white">Loading generations history...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-screen bg-black items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto" />
          <p className="text-red-400 text-lg">{error}</p>
          <Button onClick={() => router.push('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (!session?.user || !data) {
    return null
  }

  return (
    <div className="flex h-screen bg-black">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/admin')}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
            
            <div className="flex items-center space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-5 h-5 text-white" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Badge className="bg-red-500">ADMIN</Badge>
              </div>
            </div>

            <UserMenu />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Page Title */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Shield className="w-8 h-8 text-red-500" />
                Generations History
              </h1>
              <p className="text-gray-400">
                View all user generations with pagination ({data.pagination.totalCount} total)
              </p>
            </div>

            {/* Generations Table */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
              <div className="p-6 border-b border-gray-800">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Recent Generations
                </h2>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-gray-300 font-medium">User</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Type</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Status</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Prompt</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Credits</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Preview</th>
                        <th className="text-left p-3 text-gray-300 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.generations.map((generation) => (
                        <tr key={generation.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                          <td className="p-3">
                            <div className="flex items-center space-x-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-gray-700 text-white text-xs">
                                  {generation.user.name?.[0] || generation.user.email[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-white text-sm font-medium">
                                  {generation.user.name || 'No name'}
                                </p>
                                <p className="text-gray-400 text-xs">{generation.user.email}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {generation.user.plan}
                                </Badge>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              {getTypeIcon(generation.type)}
                              <span className="text-white text-sm">
                                {generation.type.replace(/_/g, ' ')}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            {getStatusBadge(generation.status)}
                          </td>
                          <td className="p-3 max-w-xs">
                            <p className="text-gray-300 text-sm truncate" title={generation.prompt}>
                              {generation.prompt}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1">
                              <CreditCard className="w-4 h-4 text-yellow-500" />
                              <span className="text-white text-sm">{generation.user.credits}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {generation.thumbnailUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleThumbnailClick(generation.thumbnailUrl!, generation.mediaType!)}
                                className="p-1 h-auto"
                              >
                                {generation.mediaType === 'image' ? (
                                  <ImageIcon className="w-6 h-6 text-blue-500" />
                                ) : generation.mediaType === 'video' ? (
                                  <Video className="w-6 h-6 text-purple-500" />
                                ) : (
                                  <Music className="w-6 h-6 text-pink-500" />
                                )}
                                <ExternalLink className="w-3 h-3 ml-1 text-gray-400" />
                              </Button>
                            ) : (
                              <span className="text-gray-500 text-sm">No preview</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300 text-sm">
                                {formatDate(generation.createdAt)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-700">
                  <div className="text-gray-400 text-sm">
                    Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                    {Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)} of{' '}
                    {data.pagination.totalCount} results
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={!data.pagination.hasPrev}
                      className="text-gray-300 border-gray-600 hover:bg-gray-800"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(
                          data.pagination.totalPages - 4,
                          data.pagination.page - 2
                        )) + i
                        
                        if (pageNum > data.pagination.totalPages) return null
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === data.pagination.page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className={
                              pageNum === data.pagination.page
                                ? "bg-red-500 hover:bg-red-600"
                                : "text-gray-300 border-gray-600 hover:bg-gray-800"
                            }
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={!data.pagination.hasNext}
                      className="text-gray-300 border-gray-600 hover:bg-gray-800"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

