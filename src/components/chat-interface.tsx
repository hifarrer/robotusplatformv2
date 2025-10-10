'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Send, 
  Upload, 
  Image as ImageIcon, 
  Video, 
  LogOut, 
  User,
  Bot,
  X,
  Paperclip,
  RefreshCw,
  Folder,
  Images,
  Plus,
  Music,
  Dice6,
  ZoomIn,
  Trash2,
  Download,
  Edit
} from 'lucide-react'
import { FileUpload, ChatMessage, UserPreferences } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PreferencesMenu } from '@/components/preferences-menu'
import { cn, isImageFile, isAudioFile, formatFileSize, generateId } from '@/lib/utils'
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<FileUpload[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [showImageLibrary, setShowImageLibrary] = useState(false)
  const [libraryImages, setLibraryImages] = useState<SavedImage[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(false)
  const [deletingLibraryImageId, setDeletingLibraryImageId] = useState<string | null>(null)
  const [chatId, setChatId] = useState<string | null>(null)
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null)
  const [showDurationSelection, setShowDurationSelection] = useState(false)
  const [selectedImageForVideo, setSelectedImageForVideo] = useState<any>(null)
  const [videoPrompt, setVideoPrompt] = useState<string>('')
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
          
          const updatedMessages = prev.map(message => {
            // Find all generations that belong to this message (by messageId)
            const matchingGenerations = result.generations.filter((g: any) => g.messageId === message.id)
            
            if (matchingGenerations.length > 0) {
              console.log('🎯 Found', matchingGenerations.length, 'generations for message', message.id, 'Types:', matchingGenerations.map((g: any) => g.type))
              
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
  const loadLibraryImages = async () => {
    if (libraryImages.length > 0) {
      setShowImageLibrary(true)
      return
    }
    
    try {
      setLoadingLibrary(true)
      const response = await fetch('/api/my-images?limit=50')
      if (!response.ok) throw new Error('Failed to fetch images')
      
      const data = await response.json()
      setLibraryImages(data.images || [])
      setShowImageLibrary(true)
    } catch (error) {
      console.error('Error loading library images:', error)
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
    if (userPreferences?.videoModel === 'WAN_2_5') {
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
          model: userPreferences?.videoModel || 'VEO3_FAST',
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
      
      // Add AI response
      const aiMessage: ChatMessage = {
        id: generateId(),
        role: 'ASSISTANT',
        content: result.response || 'Processing your regeneration request...',
        timestamp: new Date(),
        generations: result.generations || [],
      }
      
      setMessages(prev => [...prev, aiMessage])
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

  // Generate video with WAN-2.5 model and selected duration
  const generateVideoWithDuration = async (duration: number) => {
    if (!selectedImageForVideo) return
    
    // Disable buttons immediately
    setIsGeneratingVideo(true)
    
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
        message: `Generate ${duration}-second video from image using WAN-2.5 model`,
        images: [imageUrl],
        audio: [],
        chatId: chatId,
      }),
    })
    
    if (!messageResponse.ok) {
      throw new Error('Failed to create message')
    }
    
    const messageResult = await messageResponse.json()
    const loadingMessage: ChatMessage = {
      id: messageResult.messageId,
      role: 'ASSISTANT',
      content: `🎬 Generating ${duration}-second video using Alibaba WAN-2.5 model...\n\n⏳ This may take a few minutes. Please wait while we create your video.`,
      timestamp: new Date(),
      generations: messageResult.generations || [],
    }
    setMessages(prev => [...prev, loadingMessage])
    
    try {
      setIsLoading(true)
      setShowDurationSelection(false)
      
      // Generate video using WAN-2.5 API
      const videoResponse = await fetch('/api/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: videoPrompt || `Create a ${duration}-second video from this image`,
          imageUrls: [imageUrl],
          model: 'WAN_2_5',
          aspectRatio: userPreferences?.aspectRatio || 'WIDE',
          duration: duration,
          messageId: messageResult.messageId, // Pass real message ID for generation record
        }),
      })
      
      if (!videoResponse.ok) {
        throw new Error('Failed to generate video')
      }
      
      const result = await videoResponse.json()
      
      // Keep the loading message as is - the video generation is happening asynchronously
      // The polling system will update this message when the video is actually completed
      console.log('🎬 Video generation request submitted successfully:', result)
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
      
      // Create user message
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'USER',
        content: input,
        images: files.map(f => f.preview), // Keep preview URLs for display
        timestamp: new Date(),
      }
      
      setMessages(prev => [...prev, userMessage])
      setInput('')
      setFiles([])
      
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
        const errorText = await response.text()
        console.error('❌ Error response:', errorText) // Debug log
        throw new Error(`Chat API failed: ${response.status} ${response.statusText}`)
      }
      
      console.log('📋 Parsing response JSON...') // Debug log
      const result = await response.json()
      
      console.log('📊 Chat response data:', result) // Debug log
      
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

  return (
    <div className="flex h-screen bg-black">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-semibold">Robotus AI</h1>
              <p className="text-gray-400 text-sm">AI-powered creative assistant</p>
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
              onClick={checkGenerations}
              className="text-gray-400 hover:text-white"
              title="Refresh generations"
            >
              <RefreshCw className="w-4 h-4" />
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

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">
                Welcome to Robotus AI
              </h2>
              <p className="text-gray-400 max-w-md">
                I can help you create images, edit images, and generate videos. 
                Just describe what you want or upload images to get started!
              </p>
              <div className="flex flex-wrap gap-2 mt-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  onClick={generateRandomPrompt}
                  title="Generate a random image prompt"
                >
                  <Dice6 className="w-4 h-4 mr-2" />
                  Create Image
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                  onClick={generateRandomVideoPrompt}
                  title="Generate a random video prompt"
                >
                  <Dice6 className="w-4 h-4 mr-2" />
                  Generate Video
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 message-fade-in",
                    message.role === 'USER' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'ASSISTANT' && (
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                        <Bot className="w-4 h-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg p-4",
                      message.role === 'USER'
                        ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        : "bg-gray-800 text-white"
                    )}
                  >
                    {message.content && (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                    
                    {message.images && message.images.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {message.images.map((image, index) => (
                          <div key={index} className="relative">
                            <Image
                              src={image}
                              alt={`Uploaded image ${index + 1}`}
                              width={200}
                              height={200}
                              className="rounded-lg object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {message.generations && message.generations.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {message.generations.map((generation) => (
                          <div key={generation.id} className="border border-gray-600 rounded p-2">
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
                            
                            {/* DEBUG: Show raw generation data */}
                            {generation.status === 'COMPLETED' && (
                              <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                                <div>Type: {generation.type}</div>
                                <div>ResultUrl: {generation.resultUrl || 'none'}</div>
                                <div>ResultUrls: {generation.resultUrls?.length || 0} items</div>
                                {generation.resultUrls && generation.resultUrls.length > 0 && (
                                  <div>First URL: {generation.resultUrls[0]}</div>
                                )}
                              </div>
                            )}
                            
                            {/* Show results */}
                            {generation.status === 'COMPLETED' && generation.resultUrls && generation.resultUrls.length > 0 && (
                              <div className="mt-2 space-y-3">
                                <div className="grid grid-cols-1 gap-2">
                                  {generation.resultUrls.map((url, index) => (
                                    <div key={index} className="relative group">
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
                                      ) : (
                                        <Image
                                          src={url}
                                          alt={`Generated ${generation.type.toLowerCase()} ${index + 1}`}
                                          width={400}
                                          height={400}
                                          className="rounded object-cover max-w-full h-auto"
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
                                        className="absolute top-2 left-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 border-white/20 hover:bg-black/70"
                                        onClick={() => downloadGeneratedContent(url, generation.type, index)}
                                        title="Download"
                                      >
                                        <Download className="w-4 h-4 text-white" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Generate New, Upscale, Edit, and Generate Video buttons */}
                                <div className="flex justify-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regenerateContent(generation)}
                                    disabled={isLoading}
                                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Generate New
                                  </Button>
                                  {/* Show upscale button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => upscaleImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <ZoomIn className="w-4 h-4 mr-2" />
                                      Upscale
                                    </Button>
                                  )}
                                  {/* Show edit button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => editImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </Button>
                                  )}
                                  {/* Show generate video button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateVideoFromImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <Video className="w-4 h-4 mr-2" />
                                      Generate Video
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Fallback for single resultUrl */}
                            {generation.status === 'COMPLETED' && generation.resultUrl && (!generation.resultUrls || generation.resultUrls.length === 0) && (
                              <div className="mt-2 space-y-3">
                                <div className="relative group">
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
                                  ) : (
                                    <Image
                                      src={generation.resultUrl}
                                      alt={`Generated ${generation.type.toLowerCase()}`}
                                      width={400}
                                      height={400}
                                      className="rounded object-cover max-w-full h-auto"
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
                                    className="absolute top-2 left-2 w-8 h-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 border-white/20 hover:bg-black/70"
                                    onClick={() => generation.resultUrl && downloadGeneratedContent(generation.resultUrl, generation.type, 0)}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4 text-white" />
                                  </Button>
                                </div>
                                
                                {/* Generate New, Upscale, Edit, and Generate Video buttons */}
                                <div className="flex justify-center space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => regenerateContent(generation)}
                                    disabled={isLoading}
                                    className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                  >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Generate New
                                  </Button>
                                  {/* Show upscale button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => upscaleImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <ZoomIn className="w-4 h-4 mr-2" />
                                      Upscale
                                    </Button>
                                  )}
                                  {/* Show edit button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => editImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </Button>
                                  )}
                                  {/* Show generate video button only for completed image generations */}
                                  {(generation.type === 'TEXT_TO_IMAGE' || generation.type === 'IMAGE_TO_IMAGE') && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => generateVideoFromImage(generation)}
                                      disabled={isLoading}
                                      className="text-gray-300 border-gray-600 hover:bg-gray-700"
                                    >
                                      <Video className="w-4 h-4 mr-2" />
                                      Generate Video
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
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarImage src={session?.user?.image || ''} />
                      <AvatarFallback className="bg-gray-700 text-white">
                        {session?.user?.name?.[0] || <User className="w-4 h-4" />}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-gradient-to-r from-pink-500 to-purple-500">
                      <Bot className="w-4 h-4 text-white" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="spinner"></div>
                      <span className="text-gray-300">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Duration Selection for WAN-2.5 Model */}
        {showDurationSelection && (
          <div className="border-t border-gray-800 p-4 bg-gray-900">
            <div className="flex flex-col items-center space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-white mb-2">Select Video Duration</h3>
                <p className="text-gray-400 text-sm">Choose how long you want your video to be:</p>
                {videoPrompt && (
                  <div className="mt-3 p-3 bg-gray-800 rounded-lg">
                    <p className="text-gray-300 text-sm">
                      <strong>Video prompt:</strong> {videoPrompt}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => generateVideoWithDuration(5)}
                  disabled={isLoading || isGeneratingVideo}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-8 py-3"
                >
                  <Video className="w-5 h-5 mr-2" />
                  5 Seconds
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => generateVideoWithDuration(10)}
                  disabled={isLoading || isGeneratingVideo}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700 px-8 py-3"
                >
                  <Video className="w-5 h-5 mr-2" />
                  10 Seconds
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
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-800 p-4">
          {/* File previews */}
          {files.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {files.map((file) => (
                <div key={file.id} className="relative group">
                  <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-600">
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
                        <Music className="w-6 h-6 text-gray-400" />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-700">
                        <Paperclip className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeFile(file.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                  <p className="text-xs text-gray-400 mt-1 truncate w-20">
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
                className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-gray-500"
                disabled={isLoading}
              />
              
              {dragOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg">
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-primary font-medium">Drop files here</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadLibraryImages}
                  disabled={loadingLibrary}
                  className="text-gray-300 border-gray-600 hover:bg-gray-700"
                >
                  {loadingLibrary ? (
                    <div className="spinner w-4 h-4 mr-2"></div>
                  ) : (
                    <Images className="w-4 h-4 mr-2" />
                  )}
                  Select from Library
                </Button>
              </div>

              <Button
                type="submit"
                variant="gradient"
                disabled={isLoading || isUploadingImages || (!input.trim() && files.length === 0)}
                className="min-w-[100px]"
              >
                {isUploadingImages ? (
                  <>
                    <div className="spinner"></div>
                    <span className="ml-2">Uploading...</span>
                  </>
                ) : isLoading ? (
                  <div className="spinner"></div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Image Library Modal */}
      <Dialog open={showImageLibrary} onOpenChange={setShowImageLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Select from Your Image Library</DialogTitle>
          </DialogHeader>
          
          <div className="overflow-auto max-h-[60vh]">
            {libraryImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <Images className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-white font-medium mb-2">No Images in Library</h3>
                <p className="text-gray-400 text-sm">Generate some images first to see them here!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <p className="text-xs">Select</p>
                        </div>
                      </div>
                      
                      {/* Delete button - positioned above overlay */}
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => deleteFromLibrary(e, image.id)}
                        disabled={deletingLibraryImageId === image.id}
                        title="Delete image"
                      >
                        {deletingLibraryImageId === image.id ? (
                          <div className="spinner w-3 h-3" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    
                    {/* Image info */}
                    <div className="p-2">
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
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}