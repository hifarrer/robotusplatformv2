'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  User,
  Bot,
  X,
  Paperclip,
  RefreshCw,
  Folder,
  Images,
  Plus,
  Music,
  Mic,
  Dice6,
  ZoomIn,
  Trash2,
  Download,
  Edit,
  HelpCircle,
  Sparkles
} from 'lucide-react'
import { FileUpload, ChatMessage, UserPreferences } from '@/types'
import { UserMenu } from '@/components/user-menu'
import { CreditsDisplay } from '@/components/credits-display'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PreferencesMenu } from '@/components/preferences-menu'
import { GenderSelection } from '@/components/gender-selection'
import { HelpModal } from '@/components/help-modal'
import { useCredits } from '@/contexts/credits-context'
import { cn, isImageFile, isAudioFile, formatFileSize, generateId } from '@/lib/utils'
import { validateAndMapVideoDuration } from '@/lib/duration-utils'
import { getRandomPrompt, getRandomVideoPrompt } from '@/lib/prompt-generator'
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

export function ChatInterface() {
  const { data: session } = useSession()
  const { refreshCredits } = useCredits()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState<SavedImage[]>([])
  const [libraryVideos, setLibraryVideos] = useState<any[]>([])
  const [libraryAudios, setLibraryAudios] = useState<any[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [loadingLibraryTab, setLoadingLibraryTab] = useState<string | null>(null)
  const [deletingLibraryImageId, setDeletingLibraryImageId] = useState<string | null>(null)
  const [activeLibraryTab, setActiveLibraryTab] = useState<'images' | 'videos' | 'audios'>('images')
  const [chatId, setChatId] = useState<string | null>(null)
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [showDurationSelection, setShowDurationSelection] = useState(false)
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<any>(null)
  const [videoPrompt, setVideoPrompt] = useState<string>('')
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [showTalkModal, setShowTalkModal] = useState(false)
  const [selectedImageForTalk, setSelectedImageForTalk] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const scrollToBottom = () => {
      if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
        if (scrollContainer) {
          // Use smooth scrolling for better UX
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: 'smooth'
          })
        }
      }
    }

    // Use setTimeout to ensure the scroll happens after DOM updates
    const timeoutId = setTimeout(scrollToBottom, 100)
    
    return () => clearTimeout(timeoutId)
  }, [messages])

  // Poll for generation updates
  const checkGenerations = async () => {
    try {
      console.log('🔄 Checking generations...')
      const response = await fetch('/api/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        console.error('Generations API error:', response.status, response.statusText)
        return
      }
      
      const result = await response.json()
      console.log('📊 Generations result:', result)
      console.log('📊 Generations count:', result.generations?.length || 0)
      
      if (result.generations && result.generations.length > 0) {
        console.log('✅ Found generations to update:', result.generations.length)
        console.log('🎬 Generations details:', JSON.stringify(result.generations, null, 2))
        
        // Update messages with completed generations
        setMessages(prev => {
          console.log('📋 Current messages count:', prev.length)
          console.log('📋 Message IDs:', prev.map(m => m.id))
          console.log('📋 Generation messageIds:', result.generations.map((g: any) => g.messageId))
          console.log('📋 Generation details:', result.generations.map((g: any) => ({ id: g.id, messageId: g.messageId, status: g.status, type: g.type, model: g.model })))
          
          // Refresh credits when generations complete
          const hasCompletedGenerations = result.generations.some((g: any) => g.status === 'COMPLETED')
          if (hasCompletedGenerations) {
            refreshCredits()
          }
          
          const updatedMessages = prev.map(message => {
            // Find all generations that belong to this message (by messageId)
            const matchingGenerations = result.generations.filter((g: any) => g.messageId === message.id)
            
            if (matchingGenerations.length > 0) {
              console.log('🎯 Found', matchingGenerations.length, 'generations for message', message.id, 'Types:', matchingGenerations.map((g: any) => g.type))
              console.log('🎯 Generation details:', matchingGenerations.map((g: any) => ({ id: g.id, status: g.status, type: g.type, model: g.model, resultUrls: g.resultUrls })))
              
              // Merge with existing generations (if any)
              const existingGenerations = message.generations || []
              const updatedGenerations = [...existingGenerations]
              
              // Update or add each matching generation
              matchingGenerations.forEach((newGen: any) => {
                const existingIndex = updatedGenerations.findIndex(g => g.id === newGen.id)
                if (existingIndex >= 0) {
                  // Update existing
                  console.log('🔄 Updating existing generation:', newGen.id, 'Status:', newGen.status, 'Type:', newGen.type)
                  updatedGenerations[existingIndex] = newGen
                } else {
                  // Add new
                  console.log('➕ Adding new generation:', newGen.id, 'Status:', newGen.status, 'Type:', newGen.type)
                  updatedGenerations.push(newGen)
                }
              })
              
              console.log('✅ Message', message.id, 'now has', updatedGenerations.length, 'generations')
              return { ...message, generations: updatedGenerations }
            }
            
            // No matching generations, return as-is
            return message
          })
          
          console.log('📤 Updated messages count:', updatedMessages.length)
          return updatedMessages
        })
      } else {
        console.log('ℹ️ No generations to update')
      }
    } catch (error) {
      console.error('❌ Error checking generations:', error)
    }
  }

  useEffect(() => {
    // Poll every 3 seconds
    const interval = setInterval(checkGenerations, 3000)
    return () => clearInterval(interval)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFileSelect(droppedFiles)
  }, [])

  const handleFileSelect = (selectedFiles: File[]) => {
    const newFiles: FileUpload[] = selectedFiles.map(file => ({
      id: generateId(),
      file,
      preview: URL.createObjectURL(file),
      type: isImageFile(file) ? 'image' : isAudioFile(file) ? 'audio' : 'other'
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (fileId: string) => {
    setFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  // Load library images
  const loadLibraryImages = async (forceRefresh = false) => {
    if (libraryImages.length > 0 && !forceRefresh) {
      setShowImageLibrary(true)
      setActiveLibraryTab('images')
      return
    }
    
    try {
      setLoadingLibrary(true)
      const response = await fetch('/api/my-images?limit=50')
      if (!response.ok) throw new Error('Failed to fetch images')
      
      const data = await response.json()
      setLibraryImages(data.images || [])
      setShowImageLibrary(true)
      setActiveLibraryTab('images')
    } catch (error) {
      console.error('Error loading library images:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Handle tab switching
  const handleTabSwitch = async (tab: 'images' | 'videos' | 'audios') => {
    setActiveLibraryTab(tab)
    
    if (tab === 'videos' && libraryVideos.length === 0) {
      setLoadingLibraryTab('videos')
      await loadLibraryVideos()
      setLoadingLibraryTab(null)
    } else if (tab === 'audios' && libraryAudios.length === 0) {
      setLoadingLibraryTab('audios')
      await loadLibraryAudios()
      setLoadingLibraryTab(null)
    }
  }

  // Refresh current library tab
  const refreshCurrentLibrary = async () => {
    if (activeLibraryTab === 'images') {
      await loadLibraryImages(true)
    } else if (activeLibraryTab === 'videos') {
      await loadLibraryVideos(true)
    } else if (activeLibraryTab === 'audios') {
      await loadLibraryAudios(true)
    }
  }

  // Load library videos
  const loadLibraryVideos = async (forceRefresh = false) => {
    if (libraryVideos.length > 0 && !forceRefresh) {
      setShowImageLibrary(true)
      setActiveLibraryTab('videos')
      return
    }
    
    try {
      setLoadingLibrary(true)
      const response = await fetch('/api/my-videos?limit=50')
      if (!response.ok) throw new Error('Failed to fetch videos')
      
      const data = await response.json()
      setLibraryVideos(data.videos || [])
      setShowImageLibrary(true)
      setActiveLibraryTab('videos')
    } catch (error) {
      console.error('Error loading library videos:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Load library audios
  const loadLibraryAudios = async (forceRefresh = false) => {
    if (libraryAudios.length > 0 && !forceRefresh) {
      setShowImageLibrary(true)
      setActiveLibraryTab('audios')
      return
    }
    
    try {
      setLoadingLibrary(true)
      const response = await fetch('/api/my-audios?limit=50')
      if (!response.ok) throw new Error('Failed to fetch audios')
      
      const data = await response.json()
      setLibraryAudios(data.audios || [])
      setShowImageLibrary(true)
      setActiveLibraryTab('audios')
    } catch (error) {
      console.error('Error loading library audios:', error)
    } finally {
      setLoadingLibrary(false)
    }
  }

  // Select image from library
  const selectFromLibrary = (image: SavedImage) => {
    // Create a File-like object from the library image
    fetch(image.localPath)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], image.fileName, { type: image.mimeType })
        const newFile: FileUpload = {
          id: generateId(),
          file,
          preview: image.localPath,
          type: 'image'
        }
        setFiles(prev => [...prev, newFile])
        setShowImageLibrary(false)
      })
      .catch(error => {
        console.error('Error selecting library image:', error)
      })
  }

  // Select video from library
  const selectVideoFromLibrary = (video: any) => {
    // Create a File-like object from the library video
    fetch(video.localPath)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], video.fileName, { type: video.mimeType })
        const newFile: FileUpload = {
          id: generateId(),
          file,
          preview: video.localPath,
          type: 'video'
        }
        setFiles(prev => [...prev, newFile])
        setShowImageLibrary(false)
      })
      .catch(error => {
        console.error('Error selecting library video:', error)
      })
  }

  // Select audio from library
  const selectAudioFromLibrary = (audio: any) => {
    // Create a File-like object from the library audio
    // Use the full URL for fetching the audio file
    const audioUrl = audio.localPath.startsWith('http') 
      ? audio.localPath 
      : `${window.location.origin}${audio.localPath}`
    
    fetch(audioUrl)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch audio: ${res.status} ${res.statusText}`)
        }
        return res.blob()
      })
      .then(blob => {
        // Determine mime type from file extension if not provided
        const getMimeTypeFromFileName = (fileName: string): string => {
          const ext = fileName.toLowerCase().split('.').pop()
          switch (ext) {
            case 'mp3': return 'audio/mpeg'
            case 'wav': return 'audio/wav'
            case 'ogg': return 'audio/ogg'
            case 'm4a': return 'audio/mp4'
            case 'aac': return 'audio/aac'
            default: return 'audio/mpeg'
          }
        }
        
        const mimeType = audio.mimeType || getMimeTypeFromFileName(audio.fileName)
        const file = new File([blob], audio.fileName, { type: mimeType })
        const newFile: FileUpload = {
          id: generateId(),
          file,
          preview: audioUrl,
          type: 'audio'
        }
        setFiles(prev => [...prev, newFile])
        setShowImageLibrary(false)
        
        // If audio was selected from Talk button, pre-populate the prompt
        if (selectedImageForTalk) {
          setInput('Make the person in the image talk')
        }
      })
      .catch(error => {
        console.error('Error selecting library audio:', error)
        // Show user-friendly error message
        const errorMessage: ChatMessage = {
          id: generateId(),
          role: 'ASSISTANT',
          content: `Sorry, there was an error loading the audio file: ${error.message}. Please try again or select a different audio.`,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMessage])
      })
  }

  // Delete image from library
  const deleteFromLibrary = async (e: React.MouseEvent, imageId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (deletingLibraryImageId) return
    try {
      setDeletingLibraryImageId(imageId)
      const resp = await fetch(`/api/my-images?id=${encodeURIComponent(imageId)}`, {
        method: 'DELETE',
      })
      if (!resp.ok) throw new Error('Failed to delete image')
      setLibraryImages(prev => prev.filter(img => img.id !== imageId))
    } catch (err) {
      console.error('Error deleting library image:', err)
    } finally {
      setDeletingLibraryImageId(null)
    }
  }

  // Download generated content
  const downloadGeneratedContent = (url: string, type: string, index: number = 0) => {
    const link = document.createElement('a')
    link.href = url
    link.download = `generated-${type.toLowerCase()}-${index + 1}.${type.includes('VIDEO') ? 'mp4' : 'png'}`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate video from image
  const generateVideoFromImage = async (generation: any) => {
    // Get the image URL
    const imageUrl = generation.resultUrls?.[0] || generation.resultUrl
    if (!imageUrl) {
      throw new Error('No image URL found to generate video from')
    }
    
    // Check if user's preferred video model is WAN-2.5
    if (userPreferences?.videoModel === ('WAN_2_5' as any)) {
      // Add immediate feedback message for WAN-2.5
      const loadingMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: '🎬 Analyzing your image to create a video prompt...\n\n⏳ This may take a few moments. Please wait while I analyze the image.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, loadingMessage])
      
      // Analyze image first to get video prompt
      try {
        setIsLoading(true)
        
        const analysisResponse = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageUrl }),
        })
        
        if (analysisResponse.ok) {
          const analysisResult = await analysisResponse.json()
          setVideoPrompt(analysisResult.videoPrompt)
          
          // Update loading message with the generated prompt
          setMessages(prev => prev.map(msg => 
            msg.id === loadingMessage.id 
              ? {
                  ...msg,
                  content: `🎬 I've analyzed your image and created this video prompt: "${analysisResult.videoPrompt}"\n\nNow choose your video duration:`,
                }
              : msg
          ))
        }
      } catch (error) {
        console.error('Error analyzing image for video prompt:', error)
        
        // Update loading message with error
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                content: '❌ Sorry, there was an error analyzing your image. Please try again.',
              }
            : msg
        ))
      } finally {
        setIsLoading(false)
      }
      
      // Show duration selection for WAN-2.5 model
      setSelectedImageForVideo(generation)
      setShowDurationSelection(true)
      return
    }
    
    // Add immediate feedback message
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: 'I\'m analyzing your image and creating a video prompt. This will take a few moments...',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      
      // Analyze image and generate video prompt
      const analysisResponse = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl }),
      })
      
      if (!analysisResponse.ok) {
        throw new Error('Failed to analyze image')
      }
      
      const analysisResult = await analysisResponse.json()
      const videoPrompt = analysisResult.videoPrompt
      
      // Update loading message with the generated prompt
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `I've analyzed your image and created this video prompt: "${videoPrompt}". Now generating the video...`,
            }
          : msg
      ))
      
      // Generate video using the prompt and image
      const videoResponse = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: videoPrompt,
          imageUrls: [imageUrl],
          model: userPreferences?.videoModel || 'WAN_2_5',
          aspectRatio: userPreferences?.aspectRatio || 'WIDE',
        }),
      })
      
      if (!videoResponse.ok) {
        throw new Error('Failed to generate video')
      }
      
      const result = await videoResponse.json()
      
      // Attach the created generation (if returned) to the loading message immediately
      if (result.generation) {
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id
            ? {
                ...msg,
                generations: [
                  // If API returned the new generation, seed it here so polling can update it
                  ...(msg.generations || []),
                  result.generation,
                ],
              }
            : msg
        ))
      }
      
      // Keep the loading message as is - the video generation is happening asynchronously
      // The polling system will update this message when the video is actually completed
      console.log('🎬 Video generation request submitted successfully:', result)
    } catch (error: any) {
      console.error('Error generating video from image:', error)
      
      // Replace the loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `Sorry, there was an error generating a video from your image: ${error?.message || 'Unknown error'}`,
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Handle preferences change
  const handlePreferencesChange = (preferences: UserPreferences) => {
    setUserPreferences(preferences)
    console.log('🎛️ User preferences updated:', preferences)
  }

  // Start new conversation
  const startNewConversation = async () => {
    try {
      // Clear any pending generations first
      console.log('🧹 Clearing generation queue before starting new conversation...')
      const response = await fetch('/api/generations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Generation queue cleared:', result.message)
      } else {
        console.warn('⚠️ Failed to clear generation queue, but continuing with new conversation')
      }
    } catch (error) {
      console.warn('⚠️ Error clearing generation queue:', error)
    }
    
    // Clear the UI state
    setMessages([])
    setChatId(null)
    setFiles([])
    setInput('')
    setShowDurationSelection(false)
    setSelectedImageForVideo(null)
    setIsGeneratingVideo(false)
    console.log('✨ Started new conversation')
  }

  // Generate random prompt for Create Image button
  const generateRandomPrompt = () => {
    const randomPrompt = getRandomPrompt()
    setInput(randomPrompt)
    // Auto-focus the input field so user can see the prompt
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Generate random video prompt for Generate Video button
  const generateRandomVideoPrompt = () => {
    const randomPrompt = getRandomVideoPrompt()
    setInput(randomPrompt)
    // Auto-focus the input field so user can see the prompt
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Generate sample audio prompt for Generate Audio button
  const generateSampleAudioPrompt = () => {
    const samplePrompt = 'Generate an audio of a female voice saying "Life is like a box of chocolates, you never know what you\'re gonna get."'
    setInput(samplePrompt)
    // Auto-focus the input field so user can see the prompt
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }

  // Handle gender selection for audio requests
  const handleGenderSelection = async (gender: 'female' | 'male') => {
    const genderMessage = `I'd like a ${gender} voice for my audio.`
    setInput(genderMessage)
    
    // Auto-submit the gender selection
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
    
    // Submit the form automatically
    const formEvent = new Event('submit', { bubbles: true, cancelable: true }) as any
    formEvent.preventDefault = () => {}
    handleSubmit(formEvent)
  }

  // Regenerate content with the same prompt
  const regenerateContent = async (generation: any) => {
    try {
      setIsLoading(true)
      
      const requestBody = {
        message: generation.prompt,
        images: [], // No images for regeneration
        audio: [], // No audio for regeneration
        chatId: chatId,
      }
      
      console.log('🔄 Regenerating content with prompt:', generation.prompt)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Store chatId from response if we don't have one
      if (!chatId && result.chatId) {
        setChatId(result.chatId)
      }
      
      // Add user message for the regeneration
      const userMessage: ChatMessage = {
        id: result.userMessageId || generateId(),
        role: 'USER',
        content: generation.prompt,
        timestamp: new Date(),
      }
      
      // Add AI response with the proper database ID
      const aiMessage: ChatMessage = {
        id: result.messageId || generateId(),
        role: 'ASSISTANT',
        content: result.response || 'Processing your regeneration request...',
        timestamp: new Date(),
        generations: result.generations || [],
      }
      
      setMessages(prev => [...prev, userMessage, aiMessage])
    } catch (error: any) {
      console.error('Error regenerating content:', error)
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: `Sorry, there was an error regenerating your content: ${error?.message || 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Upscale image
  const upscaleImage = async (generation: any) => {
    // Get the image URL to upscale
    const imageUrl = generation.resultUrls?.[0] || generation.resultUrl
    if (!imageUrl) {
      throw new Error('No image URL found to upscale')
    }
    
    // Add immediate feedback message
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: 'I\'m upscaling your image to higher resolution. This will take a few moments...',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      
      const requestBody = {
        action: 'upscale',
        imageUrl: imageUrl,
        chatId: chatId,
      }
      
      console.log('🔍 Upscaling image:', imageUrl)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        throw new Error(`Chat API failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Store chatId from response if we don't have one
      if (!chatId && result.chatId) {
        setChatId(result.chatId)
      }
      
      // Handle upscaling response - add the upscaling message to chat
      if (result.isUpscaling && result.messageId) {
        console.log('🔄 Adding upscaling message to chat:', result.messageId)
        const upscalingMessage: ChatMessage = {
          id: result.messageId,
          role: 'ASSISTANT',
          content: result.response || 'Upscaling your image...',
          generations: result.generations || [],
          timestamp: new Date(),
        }
        
        // Remove the loading message and add the upscaling message
        setMessages(prev => {
          const filteredMessages = prev.filter(msg => msg.id !== loadingMessage.id)
          return [...filteredMessages, upscalingMessage]
        })
      } else {
        // Replace the loading message with the actual response
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                content: result.response || 'Upscaling your image...',
                generations: result.generations || [],
              }
            : msg
        ))
      }
    } catch (error: any) {
      console.error('Error upscaling image:', error)
      
      // Replace the loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `Sorry, there was an error upscaling your image: ${error?.message || 'Unknown error'}`,
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // ReImagine image with WAVESPEED.ai Soul model
  const reimagineImage = async (generation: any) => {
    // Get the image URL to reimagine
    const imageUrl = generation.resultUrls?.[0] || generation.resultUrl
    if (!imageUrl) {
      throw new Error('No image URL found to reimagine')
    }
    
    // Add immediate feedback message
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: 'I\'m reimagining your image with creative AI variations. This will take a few moments...',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      
      console.log('🎨 Reimagining image:', imageUrl)
      
      const response = await fetch('/api/reimagine-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: imageUrl,
          chatId: chatId,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `ReImagine failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Store chatId from response if we don't have one
      if (!chatId && result.chatId) {
        setChatId(result.chatId)
      }
      
      // Handle reimagine response - add the reimagine message to chat
      if (result.isReimagining && result.messageId) {
        console.log('🔄 Adding reimagine message to chat:', result.messageId)
        const reimagineMessage: ChatMessage = {
          id: result.messageId,
          role: 'ASSISTANT',
          content: result.response || 'Here\'s your reimagined image!',
          generations: result.generations || [],
          timestamp: new Date(),
        }
        
        // Remove the loading message and add the reimagine message
        setMessages(prev => {
          const filteredMessages = prev.filter(msg => msg.id !== loadingMessage.id)
          return [...filteredMessages, reimagineMessage]
        })
      } else {
        // Replace the loading message with the actual response
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                content: result.response || 'Here\'s your reimagined image!',
                generations: result.generations || [],
              }
            : msg
        ))
      }
      
      // Refresh credits after reimagining
      await refreshCredits()
    } catch (error: any) {
      console.error('❌ Error reimagining image:', error)
      
      // Replace the loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `Sorry, there was an error reimagining your image: ${error?.message || 'Unknown error'}`,
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Enhance image with FAL.ai
  const enhanceImage = async (generation: any) => {
    // Get the image URL to enhance
    const imageUrl = generation.resultUrls?.[0] || generation.resultUrl
    if (!imageUrl) {
      throw new Error('No image URL found to enhance')
    }
    
    // Add immediate feedback message
    const loadingMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: 'I\'m enhancing your image with face and skin details. This will take a few moments...',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      
      const requestBody = {
        action: 'enhance',
        imageUrl: imageUrl,
        chatId: chatId,
      }
      
      console.log('✨ Enhancing image:', imageUrl)
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Chat API failed: ${response.status}`)
      }
      
      const result = await response.json()
      
      // Store chatId from response if we don't have one
      if (!chatId && result.chatId) {
        setChatId(result.chatId)
      }
      
      // Handle enhance response - add the enhance message to chat
      if (result.isEnhancing && result.messageId) {
        console.log('🔄 Adding enhance message to chat:', result.messageId)
        const enhanceMessage: ChatMessage = {
          id: result.messageId,
          role: 'ASSISTANT',
          content: result.response || 'Enhancing your image...',
          generations: result.generations || [],
          timestamp: new Date(),
        }
        
        // Remove the loading message and add the enhance message
        setMessages(prev => {
          const filteredMessages = prev.filter(msg => msg.id !== loadingMessage.id)
          return [...filteredMessages, enhanceMessage]
        })
      } else {
        // Replace the loading message with the actual response
        setMessages(prev => prev.map(msg => 
          msg.id === loadingMessage.id 
            ? {
                ...msg,
                content: result.response || 'Enhancing your image...',
                generations: result.generations || [],
              }
            : msg
        ))
      }
      
      // Refresh credits after enhancing
      await refreshCredits()
    } catch (error: any) {
      console.error('Error enhancing image:', error)
      
      // Replace the loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `Sorry, there was an error enhancing your image: ${error?.message || 'Unknown error'}`,
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
    }
  }

  // Edit image - send chatbot message and populate input
  const editImage = (generation: any) => {
    // Add chatbot response message
    const chatbotMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: 'You can edit anything you want in this image, the background, characters, clothes styles, colors, etc.',
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, chatbotMessage])
    
    // Populate input with edit prompt
    const editPrompt = "Change the following on this image: "
    setInput(editPrompt)
    
    // Auto-focus the input field so user can see the prompt
    if (textareaRef.current) {
      textareaRef.current.focus()
      // Position cursor at the end of the text
      textareaRef.current.setSelectionRange(editPrompt.length, editPrompt.length)
    }
  }

  // Edit video prompt - copy prompt to input and hide duration selection
  const editVideoPrompt = () => {
    if (videoPrompt) {
      setInput(videoPrompt)
      setShowDurationSelection(false)
      setSelectedImageForVideo(null)
      setIsGeneratingVideo(false)
      
      // Auto-focus the input field so user can see the prompt
      if (textareaRef.current) {
        textareaRef.current.focus()
        // Position cursor at the end of the text
        textareaRef.current.setSelectionRange(videoPrompt.length, videoPrompt.length)
      }
    }
  }

  // Handle duration selection from chat message buttons
  const handleDurationSelection = async (duration: number) => {
    if (isLoading) return
    
    setIsLoading(true)
    
    try {
      // Get the last assistant message that contains the duration selection prompt
      const lastAssistantMessage = messages
        .filter(msg => msg.role === 'ASSISTANT')
        .pop()
      
      if (!lastAssistantMessage) {
        throw new Error('No assistant message found')
      }
      
      // Extract the video prompt from the message content
      const promptMatch = lastAssistantMessage.content.match(/I'd be happy to create a video with your prompt: "([^"]+)"/)
      const videoPrompt = promptMatch ? promptMatch[1] : 'Create a video'
      
      // Validate duration against user's video model preference
      const videoModel = userPreferences?.videoModel || 'WAN_2_5'
      const durationValidation = validateAndMapVideoDuration(duration, videoModel)
      const finalDuration = durationValidation.duration
      
      // Send the video generation request with validated duration
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `${videoPrompt} ${finalDuration} seconds`,
          chatId: chatId,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate video')
      }
      
      const result = await response.json()
      
      // Add the user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'USER',
        content: `${videoPrompt} ${finalDuration} seconds`,
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, userMessage])
      
      // Add the assistant response
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: result.message,
        timestamp: new Date(),
        generations: result.generations || [],
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      console.error('Error generating video:', error)
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: 'Sorry, I encountered an error while trying to create your video. Please try again.',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Talk button click
  const handleTalkImage = (generation: any) => {
    setSelectedImageForTalk(generation)
    setShowTalkModal(true)
  }

  // Handle audio file upload for lipsync
  const handleAudioUploadForTalk = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedImageForTalk) return
    
    setShowTalkModal(false)
    
    // Add audio file to files array
    const audioUrl = URL.createObjectURL(file)
    const newFile: FileUpload = {
      id: generateId(),
      file,
      preview: audioUrl,
      type: 'audio'
    }
    setFiles(prev => [...prev, newFile])
    
    // Pre-populate the prompt
    setInput('Make the person in the image talk')
    
    // Reset audio input
    if (event.target) {
      event.target.value = ''
    }
  }

  // Handle audio generation from text
  const handleGenerateAudioForTalk = async () => {
    setShowTalkModal(false)
    
    const examplePrompt = 'Generate an audio of an enthusiastic female voice with american accent saying "Life is like a box of chocolates, you never know what you\'re gonna get."'
    
    const helpMessage: ChatMessage = {
      id: generateId(),
      role: 'ASSISTANT',
      content: `To generate audio for your image to talk, please send a message with your audio generation request. Here's an example:\n\n"${examplePrompt}"\n\nMake sure to include:\n- Voice characteristics (gender, accent, tone)\n- The text you want spoken (in quotes)\n\nOnce the audio is generated, I'll automatically combine it with your image to create a talking animation!`,
      timestamp: new Date(),
    }
    
    setMessages(prev => [...prev, helpMessage])
    setSelectedImageForTalk(null)
  }

  // Handle audio selection from library
  const handleSelectAudioFromLibrary = async () => {
    setShowTalkModal(false)
    await loadLibraryAudios()
  }

  // Generate video with WAN-2.5 model and selected duration
  const generateVideoWithDuration = async (duration: number) => {
    if (!selectedImageForVideo) return
    
    // Disable buttons immediately
    setIsGeneratingVideo(true)
    
    // Validate duration against user's video model preference
    const videoModel = userPreferences?.videoModel || 'WAN_2_5'
    const durationValidation = validateAndMapVideoDuration(duration, videoModel)
    const finalDuration = durationValidation.duration
    
    const imageUrl = selectedImageForVideo.resultUrls?.[0] || selectedImageForVideo.resultUrl
    if (!imageUrl) {
      throw new Error('No image URL found to generate video from')
    }
    
    // Create a real database message for the video generation
    const messageResponse = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Generate ${finalDuration} second video from image using ${videoModel} model`,
        images: [imageUrl],
        audio: [],
        chatId: chatId,
      }),
    })
    
    if (!messageResponse.ok) {
      throw new Error('Failed to create message')
    }
    
    const messageResult = await messageResponse.json()
    const modelName = videoModel === 'VEO3_FAST' ? 'Google VEO3-Fast' : 'Alibaba WAN-2.5'
    const durationMessage = durationValidation.message ? `${durationValidation.message}\n\n` : ''
    
    const loadingMessage: ChatMessage = {
      id: messageResult.messageId,
      role: 'ASSISTANT',
      content: `${durationMessage}🎬 Generating ${finalDuration}-second video using ${modelName} model...\n\n⏳ This may take a few minutes. Please wait while we create your video.`,
      timestamp: new Date(),
      generations: messageResult.generations || [],
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      setShowDurationSelection(false)
      
      // The video generation is already triggered by the /api/chat call above
      // The polling system will update the message when the video is completed
      console.log('🎬 Video generation request submitted successfully via chat API')
    } catch (error: any) {
      console.error('Error generating video:', error)
      
      // Replace the loading message with error message
      setMessages(prev => prev.map(msg => 
        msg.id === loadingMessage.id 
          ? {
              ...msg,
              content: `Sorry, there was an error generating your video: ${error?.message || 'Unknown error'}`,
            }
          : msg
      ))
    } finally {
      setIsLoading(false)
      setIsGeneratingVideo(false)
      setSelectedImageForVideo(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🌟 === FORM SUBMIT STARTED ===') // Debug log
    console.log('🚀 Form submitted:', { input, filesCount: files.length }) // Debug log
    
    if (!input.trim() && files.length === 0) {
      console.log('⚠️ No input or files, returning early') // Debug log
      return
    }
    
    console.log('📋 Setting loading state...') // Debug log
    setIsLoading(true)
    
    try {
      // Upload files to get URLs if there are files
      let uploadedFiles: any[] = []
      if (files.length > 0) {
        console.log('📁 Uploading files...') // Debug log
        setIsUploadingImages(true)
        const formData = new FormData()
        files.forEach(file => {
          formData.append('files', file.file)
        })
        
        console.log('📤 Calling upload API...') // Debug log
        const uploadResponse = await fetch('/api/upload-files', {
          method: 'POST',
          body: formData,
        })
        
        console.log('📥 Upload response status:', uploadResponse.status) // Debug log
        
        if (!uploadResponse.ok) {
          console.error('❌ Upload failed:', uploadResponse.status) // Debug log
          throw new Error('Failed to upload files')
        }
        
        const uploadResult = await uploadResponse.json()
        console.log('📊 Upload result:', uploadResult) // Debug log
        uploadedFiles = uploadResult.files || []
        console.log('🔗 Uploaded files:', uploadedFiles) // Debug log
        setIsUploadingImages(false)
      }
      
      // Separate images and audio files
      const imageFiles = uploadedFiles.filter(f => f.fileType === 'image')
      const audioFiles = uploadedFiles.filter(f => f.fileType === 'audio')
      const imageDataUrls = imageFiles.map((img: any) => img.fullUrl)
      const audioDataUrls = audioFiles.map((audio: any) => audio.fullUrl)
      
      // If there's a selected image for talk, add it to the images array
      if (selectedImageForTalk) {
        const talkImageUrl = selectedImageForTalk.resultUrls?.[0] || selectedImageForTalk.resultUrl
        if (talkImageUrl && !imageDataUrls.includes(talkImageUrl)) {
          imageDataUrls.unshift(talkImageUrl) // Add at the beginning
        }
      }
      
      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'USER',
        content: input,
        images: files.filter(f => f.type === 'image').map(f => f.preview), // Only include image files
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, userMessage])
      setInput('')
      setFiles([])
      
      // Reset selected image for talk after message is sent
      if (selectedImageForTalk) {
        setSelectedImageForTalk(null)
      }
      
      // Send to AI orchestrator with base64 images
      console.log('📤 Preparing chat API request...') // Debug log
      const requestBody = {
        message: input,
        images: imageDataUrls, // Send base64 data URLs instead of blob URLs
        audio: audioDataUrls, // Send audio URLs
        chatId: chatId, // Include chatId for context
      }
      console.log('📤 Request body:', requestBody) // Debug log
      
      console.log('📡 Calling chat API...') // Debug log
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })
      
      console.log('📥 Chat response status:', response.status) // Debug log
      console.log('📥 Chat response headers:', Object.fromEntries(response.headers.entries())) // Debug log
      
      if (!response.ok) {
        console.error('❌ Chat API failed:', response.status, response.statusText) // Debug log
        
        // Try to parse error response as JSON
        const errorData = await response.json().catch(() => ({ error: `Chat API failed: ${response.status}` }))
        console.error('❌ Error response:', errorData) // Debug log
        
        // Handle profanity errors specially
        if (errorData.isProfanity) {
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: 'ASSISTANT',
            content: `🚫 ${errorData.error || 'Your message contains inappropriate content that is not permitted.'}`,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, errorMessage])
          setInput('') // Clear the input
          setFiles([]) // Clear any files
          return
        }
        
        // Handle safety check failures
        if (errorData.isUnsafe) {
          const errorMessage: ChatMessage = {
            id: generateId(),
            role: 'ASSISTANT',
            content: `🛡️ ${errorData.error || 'Your prompt did not pass our safety guidelines.'}`,
            timestamp: new Date(),
          }
          setMessages(prev => [...prev, errorMessage])
          setInput('') // Clear the input
          setFiles([]) // Clear any files
          return
        }
        
        throw new Error(errorData.error || `Chat API failed: ${response.status} ${response.statusText}`)
      }
      
      console.log('📋 Parsing response JSON...') // Debug log
      const result = await response.json()
      
      console.log('📊 Chat response data:', result) // Debug log
      
      // Log voice selection for audio generation
      if (result.debugInfo?.selectedVoiceId) {
        console.log('🎤 Selected Voice ID:', result.debugInfo.selectedVoiceId)
      }
      
      // Store chatId from response if we don't have one
      if (!chatId && result.chatId) {
        setChatId(result.chatId)
      }
      
      // Update user message with database ID from response
      if (result.userMessageId) {
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id 
            ? { ...msg, id: result.userMessageId }
            : msg
        ))
      }
      
      // Add AI response with database ID
      const aiMessage: ChatMessage = {
        id: result.messageId || generateId(),
        role: 'ASSISTANT',
        content: result.response || 'Processing your request...',
        timestamp: new Date(),
        generations: result.generations || [],
      }
      
      setMessages(prev => [...prev, aiMessage])
    } catch (error: any) {
      console.error('💥 === FORM SUBMIT ERROR ===') // Debug log
      console.error('💥 Error type:', error?.constructor?.name) // Debug log
      console.error('💥 Error message:', error?.message) // Debug log
      console.error('💥 Full error:', error) // Debug log
      
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: `Sorry, there was an error processing your request: ${error?.message || 'Unknown error'}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      console.log('🏁 Form submit completed, cleaning up...') // Debug log
      setIsLoading(false)
      setIsUploadingImages(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleHelpPromptSelect = (prompt: string) => {
    setInput(prompt)
    // Focus the textarea after setting the prompt
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }, 100)
  }

  return (
    <div className="flex h-screen bg-black">
      {/* Main chat area */}
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
                onClick={startNewConversation}
                className="text-gray-400 hover:text-white p-2"
                title="New Conversation"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <PreferencesMenu onPreferencesChange={handlePreferencesChange} />
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
                onClick={startNewConversation}
                className="text-gray-400 hover:text-white"
                title="Start New Conversation"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
              <PreferencesMenu onPreferencesChange={handlePreferencesChange} />
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

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-2 sm:p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mb-4">
                <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                  <Bot className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg sm:text-2xl font-semibold text-white mb-2">
                Welcome to Robotus.AI
              </h2>
              <p className="text-gray-400 max-w-md text-sm sm:text-base">
                I can help you create images, edit images, and generate videos. 
                Just describe what you want or upload images to get started!
              </p>
              <div className="flex flex-col sm:flex-row gap-2 mt-6 w-full max-w-sm">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1"
                  onClick={generateRandomPrompt}
                  title="Generate a random image prompt"
                >
                  <Dice6 className="w-4 h-4 mr-2" />
                  Create Image
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1"
                  onClick={generateRandomVideoPrompt}
                  title="Generate a random video prompt"
                >
                  <Dice6 className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1"
                  onClick={generateSampleAudioPrompt}
                  title="Generate a sample audio prompt"
                >
                  <Music className="w-4 h-4 mr-2" />
                  Generate Audio
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-2 sm:gap-3 message-fade-in",
                    message.role === 'USER' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'ASSISTANT' && (
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 mt-1 flex-shrink-0">
                      <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                        <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[70%] lg:max-w-[60%] xl:max-w-[50%] rounded-lg p-3 sm:p-4 overflow-hidden",
                      message.role === 'USER'
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        : "bg-gray-800 text-white"
                    )}
                    style={{ maxWidth: 'calc(100vw - 2rem)', wordWrap: 'break-word' }}
                  >
                    {message.content && (
                      <div>
                        <p className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{message.content}</p>
                        
                        {/* Show gender selection buttons if AI is asking for gender */}
                        {message.role === 'ASSISTANT' && 
                         message.content.includes('**Female** | **Male**') && (
                          <GenderSelection onGenderSelect={handleGenderSelection} />
                        )}
                        
                        {/* Show duration selection buttons if AI is asking for video duration */}
                        {message.role === 'ASSISTANT' && 
                         (message.content.includes('**5 Seconds** | **10 Seconds**') || 
                          message.content.includes('**5 Seconds** | **8 Seconds**')) && (
                          <div className="mt-3 flex flex-col sm:flex-row gap-2">
                            {message.content.includes('**5 Seconds** | **8 Seconds**') ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDurationSelection(5)}
                                  disabled={isLoading}
                                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  5 Seconds
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDurationSelection(8)}
                                  disabled={isLoading}
                                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  8 Seconds
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDurationSelection(5)}
                                  disabled={isLoading}
                                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  5 Seconds
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDurationSelection(10)}
                                  disabled={isLoading}
                                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                >
                                  <Video className="w-4 h-4 mr-2" />
                                  10 Seconds
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {message.images && message.images.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                        {message.images.map((image, index) => (
                          <div key={index} className="relative w-full max-w-sm mx-auto">
                            <Image
                              src={image}
                              alt={`Uploaded image ${index + 1}`}
                              width={300}
                              height={300}
                              className="rounded-lg object-contain w-full h-auto"
                              style={{ maxHeight: '400px' }}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {message.generations && message.generations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.generations.map((generation) => (
                          <div key={generation.id} className="border border-gray-600 rounded p-2 w-full max-w-full overflow-hidden">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-300">
                                {generation.type.replace('_', ' ').toLowerCase()} - {generation.model}
                              </span>
                              <span className={cn(
                                "text-xs px-2 py-1 rounded",
                                generation.status === 'COMPLETED' ? "bg-green-600" :
                                generation.status === 'PROCESSING' ? "bg-yellow-600" :
                                generation.status === 'FAILED' ? "bg-red-600" :
                                "bg-gray-600"
                              )}>
                                {generation.status.toLowerCase()}
                              </span>
                            </div>
                            
                            {/* Show processing message */}
                            {generation.status === 'PROCESSING' && (
                              <div className="mt-2 flex items-center space-x-2">
                                <div className="spinner w-4 h-4"></div>
                                <span className="text-xs text-gray-400">Generating...</span>
                              </div>
                            )}
                            
                            {/* Show error message */}
                            {generation.status === 'FAILED' && generation.error && (
                              <div className="mt-2 text-xs text-red-400">
                                {generation.error}
                              </div>
                            )}
                            
                            
                            {/* Show results */}
                            {generation.status === 'COMPLETED' && generation.resultUrls && generation.resultUrls.length > 0 && (
                              <div className="mt-2 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                                  {generation.resultUrls.map((url, index) => (
                                    <div key={index} className="relative group w-full max-w-full overflow-hidden flex justify-center">
                                      {(
                                        generation.type === 'TEXT_TO_VIDEO' ||
                                        generation.type === 'IMAGE_TO_VIDEO' ||
                                        generation.type === 'LIPSYNC' ||
                                        (typeof url === 'string' && url.toLowerCase().includes('.mp4'))
                                      ) ? (
                                        <video
                                          controls
                                          className="rounded w-full max-w-full h-auto"
                                          poster=""
                                          preload="metadata"
                                          onError={(e) => {
                                            console.error('Failed to load generated video:', url)
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        >
                                          <source src={url} type="video/mp4" />
                                          Your browser does not support the video tag.
                                        </video>
                                      ) : generation.type === 'TEXT_TO_AUDIO' ? (
                                        <div className="w-full max-w-full bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center">
                                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                                            <Music className="w-8 h-8 text-white" />
                                          </div>
                                          <audio
                                            controls
                                            className="w-full max-w-md"
                                            preload="metadata"
                                            onError={(e) => {
                                              console.error('Failed to load generated audio:', url)
                                              e.currentTarget.style.display = 'none'
                                            }}
                                          >
                                            <source src={url} type="audio/mpeg" />
                                            Your browser does not support the audio tag.
                                          </audio>
                                          <p className="text-gray-300 text-sm mt-2 text-center">
                                            Generated audio: {generation.prompt}
                                          </p>
                                        </div>
                                      ) : (
                                        <Image
                                          src={url}
                                          alt={`Generated ${generation.type.toLowerCase()} ${index + 1}`}
                                          width={400}
                                          height={400}
                                          className="rounded object-contain w-full max-w-lg mx-auto"
                                          style={{ maxWidth: '100%', height: 'auto', maxHeight: '600px' }}
                                          onError={(e) => {
                                            console.error('Failed to load generated image:', url)
                                            e.currentTarget.style.display = 'none'
                                          }}
                                        />
                                      )}
                                      
                                      {/* Download button */}
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="absolute top-2 left-2 w-8 h-8 rounded-full opacity-80 group-hover:opacity-100 transition-opacity bg-black/70 border-white/30 hover:bg-black/80"
                                        onClick={() => downloadGeneratedContent(url, generation.type, index)}
                                        title="Download"
                                      >
                                        <Download className="w-4 h-4 text-white" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Action buttons: New, Edit, ReImagine, Enhance, Upscale, Video */}
                                <div className="flex flex-wrap justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regenerateContent(generation)}
                                    disabled={isLoading}
                                    className="text-gray-300 border-gray-600 hover:bg-gray-700 text-xs sm:text-sm"
                                  >
                                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    New
                                  </Button>
                                  {/* Show edit button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => editImage(generation)}
                                      disabled={isLoading}
                                      className="text-blue-400 border-blue-600 hover:bg-blue-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </Button>
                                  )}
                                  {/* Show reimagine button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reimagineImage(generation)}
                                      disabled={isLoading}
                                      className="text-purple-400 border-purple-600 hover:bg-purple-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      ReImagine
                                    </Button>
                                  )}
                                  {/* Show enhance button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => enhanceImage(generation)}
                                      disabled={isLoading}
                                      className="text-yellow-400 border-yellow-500 hover:bg-yellow-500 hover:text-black text-xs sm:text-sm"
                                    >
                                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Enhance
                                    </Button>
                                  )}
                                  {/* Show upscale button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => upscaleImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700 text-xs sm:text-sm"
                                    >
                                      <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Upscale
                                    </Button>
                                  )}
                                  {/* Show generate video button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateVideoFromImage(generation)}
                                      disabled={isLoading}
                                      className="text-red-400 border-red-600 hover:bg-red-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Video
                                    </Button>
                                  )}
                                  {/* Show talk button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTalkImage(generation)}
                                      disabled={isLoading}
                                      className="text-green-400 border-green-600 hover:bg-green-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Talk
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Fallback for single resultUrl */}
                            {generation.status === 'COMPLETED' && generation.resultUrl && (!generation.resultUrls || generation.resultUrls.length === 0) && (
                              <div className="mt-2 space-y-3">
                                <div className="relative group w-full max-w-full overflow-hidden">
                                  {(
                                    generation.type === 'TEXT_TO_VIDEO' ||
                                    generation.type === 'IMAGE_TO_VIDEO' ||
                                    generation.type === 'LIPSYNC' ||
                                    (typeof generation.resultUrl === 'string' && generation.resultUrl.toLowerCase().includes('.mp4'))
                                  ) ? (
                                    <video
                                      controls
                                      className="rounded w-full max-w-full h-auto"
                                      poster=""
                                      preload="metadata"
                                      onError={(e) => {
                                        console.error('Failed to load generated video:', generation.resultUrl)
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    >
                                      <source src={generation.resultUrl} type="video/mp4" />
                                      Your browser does not support the video tag.
                                    </video>
                                  ) : generation.type === 'TEXT_TO_AUDIO' ? (
                                    <div className="w-full max-w-full bg-gray-800 rounded-lg p-6 flex flex-col items-center justify-center">
                                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                                        <Music className="w-8 h-8 text-white" />
                                      </div>
                                      <audio
                                        controls
                                        className="w-full max-w-md"
                                        preload="metadata"
                                        onError={(e) => {
                                          console.error('Failed to load generated audio:', generation.resultUrl)
                                          e.currentTarget.style.display = 'none'
                                        }}
                                      >
                                        <source src={generation.resultUrl} type="audio/mpeg" />
                                        Your browser does not support the audio tag.
                                      </audio>
                                      <p className="text-gray-300 text-sm mt-2 text-center">
                                        Generated audio: {generation.prompt}
                                      </p>
                                    </div>
                                  ) : (
                                    <Image
                                      src={generation.resultUrl}
                                      alt={`Generated ${generation.type.toLowerCase()}`}
                                      width={400}
                                      height={400}
                                      className="rounded object-cover w-full max-w-full h-auto"
                                      style={{ maxWidth: '100%', height: 'auto' }}
                                      onError={(e) => {
                                        console.error('Failed to load generated image:', generation.resultUrl)
                                        e.currentTarget.style.display = 'none'
                                      }}
                                    />
                                  )}
                                  
                                  {/* Download button */}
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute top-2 left-2 w-8 h-8 rounded-full opacity-80 group-hover:opacity-100 transition-opacity bg-black/70 border-white/30 hover:bg-black/80"
                                    onClick={() => generation.resultUrl && downloadGeneratedContent(generation.resultUrl, generation.type, 0)}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4 text-white" />
                                  </Button>
                                </div>
                                
                                {/* Action buttons: New, Edit, ReImagine, Enhance, Upscale, Video */}
                                <div className="flex flex-wrap justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regenerateContent(generation)}
                                    disabled={isLoading}
                                    className="text-gray-300 border-gray-600 hover:bg-gray-700 text-xs sm:text-sm"
                                  >
                                    <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                    New
                                  </Button>
                                  {/* Show edit button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => editImage(generation)}
                                      disabled={isLoading}
                                      className="text-blue-400 border-blue-600 hover:bg-blue-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </Button>
                                  )}
                                  {/* Show reimagine button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => reimagineImage(generation)}
                                      disabled={isLoading}
                                      className="text-purple-400 border-purple-600 hover:bg-purple-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      ReImagine
                                    </Button>
                                  )}
                                  {/* Show enhance button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => enhanceImage(generation)}
                                      disabled={isLoading}
                                      className="text-yellow-400 border-yellow-500 hover:bg-yellow-500 hover:text-black text-xs sm:text-sm"
                                    >
                                      <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Enhance
                                    </Button>
                                  )}
                                  {/* Show upscale button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => upscaleImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700 text-xs sm:text-sm"
                                    >
                                      <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Upscale
                                    </Button>
                                  )}
                                  {/* Show generate video button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateVideoFromImage(generation)}
                                      disabled={isLoading}
                                      className="text-red-400 border-red-600 hover:bg-red-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Video className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Video
                                    </Button>
                                  )}
                                  {/* Show talk button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE' || generation.type === 'IMAGE_REIMAGINE' || generation.type === 'IMAGE_UPSCALE' || generation.type === 'IMAGE_ENHANCEMENT') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleTalkImage(generation)}
                                      disabled={isLoading}
                                      className="text-green-400 border-green-600 hover:bg-green-500 hover:text-white text-xs sm:text-sm"
                                    >
                                      <Mic className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                      Talk
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.role === 'USER' && (
                    <Avatar className="w-6 h-6 sm:w-8 sm:h-8 mt-1 flex-shrink-0">
                      <AvatarImage src={session?.user?.image || ''} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {session?.user?.name && session.user.name.length > 0 ? session.user.name[0].toUpperCase() : <User className="w-3 h-3 sm:w-4 sm:h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-2 sm:gap-3">
                  <Avatar className="w-6 h-6 sm:w-8 sm:h-8 mt-1 flex-shrink-0">
                    <AvatarImage src="https://robotus.ai/assets/images/Robotusavatar.jpg" />
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                      <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800 rounded-lg p-3 sm:p-4">
                    <div className="flex items-center space-x-2">
                      <div className="spinner"></div>
                      <span className="text-gray-300 text-sm sm:text-base">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Duration Selection for WAN-2.5 Model */}
        {showDurationSelection && (
          <div className="border-t border-gray-800 p-3 sm:p-4 bg-gray-900">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="text-center">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Select Video Duration</h3>
                <p className="text-gray-400 text-xs sm:text-sm">Choose how long you want your video to be:</p>
                {videoPrompt && (
                  <div className="mt-3 p-2 sm:p-3 bg-gray-800 rounded-lg">
                    <p className="text-gray-300 text-xs sm:text-sm">
                      <strong>Video prompt:</strong> {videoPrompt}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full max-w-sm">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => generateVideoWithDuration(5)}
                  disabled={isLoading || isGeneratingVideo}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-4 sm:px-8 py-2 sm:py-3 flex-1"
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  5 Seconds
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => generateVideoWithDuration(10)}
                  disabled={isLoading || isGeneratingVideo}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-4 sm:px-8 py-2 sm:py-3 flex-1"
                >
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  10 Seconds
                </Button>
              </div>
              <div className="flex justify-center w-full">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => editVideoPrompt()}
                  disabled={isLoading || isGeneratingVideo}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit prompt
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowDurationSelection(false)
                  setSelectedImageForVideo(null)
                  setIsGeneratingVideo(false)
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Talk Modal - Upload Audio or Generate from Text */}
        {showTalkModal && (
          <div className="border-t border-gray-800 p-3 sm:p-4 bg-gray-900">
            <div className="flex flex-col items-center space-y-3 sm:space-y-4">
              <div className="text-center max-w-3xl">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-2">Make Your Image Talk</h3>
                <p className="text-gray-400 text-xs sm:text-sm">Choose how you want to add voice to your image:</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full max-w-3xl">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isLoading}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-4 py-3 flex-1"
                >
                  <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-xs sm:text-sm">Upload Audio File</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSelectAudioFromLibrary}
                  disabled={isLoading}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-4 py-3 flex-1"
                >
                  <Folder className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-xs sm:text-sm">Select from Library</span>
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleGenerateAudioForTalk}
                  disabled={isLoading}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-4 py-3 flex-1"
                >
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="text-xs sm:text-sm">Generate from Text</span>
                </Button>
              </div>
              <div className="w-full max-w-3xl">
                <div className="p-3 bg-gray-800 rounded-lg text-left">
                  <p className="text-gray-400 text-xs mb-1">
                    <strong className="text-gray-300">Example prompt:</strong>
                  </p>
                  <p className="text-gray-300 text-xs italic">
                    "Generate an audio of an enthusiastic female voice with american accent saying 'Life is like a box of chocolates, you never know what you're gonna get.'"
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowTalkModal(false)
                  setSelectedImageForTalk(null)
                }}
                className="text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-800 p-3 sm:p-4">
          {/* Selected image for talk preview */}
          {selectedImageForTalk && (
            <div className="mb-3 bg-blue-900/20 border border-blue-500/30 rounded-lg p-2">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded-lg overflow-hidden border border-blue-500/50">
                  <Image
                    src={selectedImageForTalk.resultUrls?.[0] || selectedImageForTalk.resultUrl}
                    alt="Selected image"
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-blue-400 font-medium">Image for Talk</p>
                  <p className="text-xs text-gray-400">This image will be used for lipsync</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 text-gray-400 hover:text-white"
                  onClick={() => setSelectedImageForTalk(null)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
          
          {/* File previews */}
          {files.length > 0 && (
            <div className="mb-3 sm:mb-4 flex flex-wrap gap-2">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-600">
                    {file.type === 'image' ? (
                      <Image
                        src={file.preview}
                        alt={file.file.name}
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    ) : file.type === 'audio' ? (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <Music className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <Paperclip className="w-4 h-4 sm:w-6 sm:h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-4 h-4 sm:w-5 sm:h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-2 h-2 sm:w-3 sm:h-3" />
                  </Button>
                  <p className="text-xs text-gray-400 mt-1 truncate w-16 sm:w-20">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.file.size)}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Drag and drop area / Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div
              className={cn(
                "relative drag-drop-area border-2 border-dashed rounded-lg transition-colors",
                dragOver ? "border-primary bg-primary/10" : "border-gray-600"
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you want to create, or drag and drop images here..."
                className="min-h-[60px] sm:min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500 text-sm sm:text-base"
                disabled={isLoading}
              />
              
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg">
                  <div className="text-center">
                    <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2" />
                    <p className="text-primary font-medium text-sm sm:text-base">Drop files here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-0 sm:justify-between">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,audio/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFileSelect(Array.from(e.target.files))
                    }
                  }}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={handleAudioUploadForTalk}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1 sm:flex-none"
                >
                  <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Attach</span>
                  <span className="sm:hidden">Attach</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadLibraryImages()}
                  disabled={loadingLibrary}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1 sm:flex-none"
                >
                  {loadingLibrary ? (
                    <div className="spinner w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2"></div>
                  ) : (
                    <Images className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  )}
                  <span className="hidden sm:inline">Select from Library</span>
                  <span className="sm:hidden">Library</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHelpModal(true)}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 flex-1 sm:flex-none"
                  title="Help & Examples"
                >
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Help Me</span>
                  <span className="sm:hidden">Help</span>
                </Button>
              </div>

              <Button
                type="submit"
                variant="gradient"
                disabled={isLoading || isUploadingImages || (!input.trim() && files.length === 0)}
                className="min-w-[80px] sm:min-w-[100px] w-full sm:w-auto"
              >
                {isUploadingImages ? (
                  <>
                    <div className="spinner"></div>
                    <span className="ml-2 text-sm sm:text-base">Uploading...</span>
                  </>
                ) : isLoading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <Send className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="text-sm sm:text-base">Send</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Library Modal with Tabs */}
      <Dialog open={showImageLibrary} onOpenChange={setShowImageLibrary}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden bg-gray-900 border-gray-700 mx-4 sm:mx-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white text-sm sm:text-base">Select from Your Library</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshCurrentLibrary}
                disabled={loadingLibrary}
                className="text-gray-400 hover:text-white p-2"
                title="Refresh library"
              >
                <RefreshCw className={`w-4 h-4 ${loadingLibrary ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </DialogHeader>
          
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => handleTabSwitch('images')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLibraryTab === 'images'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Images className="w-4 h-4 inline mr-2" />
              Images
            </button>
            <button
              onClick={() => handleTabSwitch('videos')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLibraryTab === 'videos'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              disabled={loadingLibraryTab === 'videos'}
            >
              {loadingLibraryTab === 'videos' ? (
                <div className="spinner w-4 h-4 inline mr-2" />
              ) : (
                <Video className="w-4 h-4 inline mr-2" />
              )}
              Videos
            </button>
            <button
              onClick={() => handleTabSwitch('audios')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeLibraryTab === 'audios'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
              disabled={loadingLibraryTab === 'audios'}
            >
              {loadingLibraryTab === 'audios' ? (
                <div className="spinner w-4 h-4 inline mr-2" />
              ) : (
                <Music className="w-4 h-4 inline mr-2" />
              )}
              Audios
            </button>
          </div>
          
          <div className="overflow-auto max-h-[70vh] sm:max-h-[60vh]">
            {/* Images Tab */}
            {activeLibraryTab === 'images' && (
              <>
                {libraryImages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4">
                    <Images className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4" />
                    <h3 className="text-white font-medium mb-2 text-sm sm:text-base">No Images in Library</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Generate some images first to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {libraryImages.map((image) => (
                      <div
                        key={image.id}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
                        onClick={() => selectFromLibrary(image)}
                      >
                        <div className="aspect-square relative">
                          <Image
                            src={image.localPath}
                            alt={image.title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                          />

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1 sm:mb-2">
                                <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <p className="text-xs">Select</p>
                            </div>
                          </div>
                          
                          {/* Delete button - positioned above overlay */}
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 sm:top-2 sm:right-2 w-5 h-5 sm:w-7 sm:h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            onClick={(e) => deleteFromLibrary(e, image.id)}
                            disabled={deletingLibraryImageId === image.id}
                            title="Delete image"
                          >
                            {deletingLibraryImageId === image.id ? (
                              <div className="spinner w-2 h-2 sm:w-3 sm:h-3" />
                            ) : (
                              <Trash2 className="w-2 h-2 sm:w-3 sm:h-3" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Image info */}
                        <div className="p-1 sm:p-2">
                          <p className="text-white text-xs font-medium truncate mb-1">
                            {image.title}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {image.prompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Videos Tab */}
            {activeLibraryTab === 'videos' && (
              <>
                {loadingLibraryTab === 'videos' ? (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4">
                    <div className="spinner w-8 h-8 sm:w-12 sm:h-12 mb-3 sm:mb-4" />
                    <h3 className="text-white font-medium mb-2 text-sm sm:text-base">Loading Videos...</h3>
                  </div>
                ) : libraryVideos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4">
                    <Video className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4" />
                    <h3 className="text-white font-medium mb-2 text-sm sm:text-base">No Videos in Library</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Generate some videos first to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {libraryVideos.map((video) => (
                      <div
                        key={video.id}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
                        onClick={() => selectVideoFromLibrary(video)}
                      >
                        <div className="aspect-square relative">
                          <video
                            src={video.localPath}
                            className="w-full h-full object-cover"
                            muted
                          />

                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1 sm:mb-2">
                                <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                              </div>
                              <p className="text-xs">Select</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Video info */}
                        <div className="p-1 sm:p-2">
                          <p className="text-white text-xs font-medium truncate mb-1">
                            {video.title || 'Untitled Video'}
                          </p>
                          <p className="text-gray-400 text-xs truncate">
                            {video.prompt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Audios Tab */}
            {activeLibraryTab === 'audios' && (
              <>
                {loadingLibraryTab === 'audios' ? (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4">
                    <div className="spinner w-8 h-8 sm:w-12 sm:h-12 mb-3 sm:mb-4" />
                    <h3 className="text-white font-medium mb-2 text-sm sm:text-base">Loading Audios...</h3>
                  </div>
                ) : libraryAudios.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 sm:h-48 text-center px-4">
                    <Music className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4" />
                    <h3 className="text-white font-medium mb-2 text-sm sm:text-base">No Audios in Library</h3>
                    <p className="text-gray-400 text-xs sm:text-sm">Generate some audios first to see them here!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                    {libraryAudios.map((audio) => (
                      <div
                        key={audio.id}
                        className="group relative cursor-pointer rounded-lg overflow-hidden border border-gray-700 hover:border-gray-500 transition-colors"
                        onClick={() => selectAudioFromLibrary(audio)}
                      >
                        <div className="p-4 flex items-center space-x-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                            <Music className="w-6 h-6 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium truncate">
                              {audio.title || 'Untitled Audio'}
                            </p>
                            <p className="text-gray-400 text-xs truncate">
                              {audio.prompt}
                            </p>
                          </div>
                        </div>

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="text-white text-center">
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-1 sm:mb-2">
                              <Paperclip className="w-3 h-3 sm:w-4 sm:h-4" />
                            </div>
                            <p className="text-xs">Select</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
        onPromptSelect={handleHelpPromptSelect}
      />
    </div>
  )
}