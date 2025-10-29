'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
  onMarkAsShown: () => void
}

export function DemoModal({ isOpen, onClose, onMarkAsShown }: DemoModalProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleVideoEnd = () => {
    setIsPlaying(false)
  }

  const handleVideoLoad = () => {
    setVideoLoaded(true)
  }

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setIsPlaying(false)
    onClose()
  }

  const handleSkip = () => {
    onMarkAsShown()
    handleClose()
  }

  const handleGetStarted = () => {
    onMarkAsShown()
    handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl w-full h-auto p-0 bg-black border-gray-800">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-white">
              Welcome to Robotus! 🎉
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-gray-300 mt-2">
            Watch this quick demo to see how Robotus can help you create amazing AI-generated content!
          </p>
        </DialogHeader>
        
        <div className="relative bg-black">
          <div className="relative aspect-video bg-gray-900">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onEnded={handleVideoEnd}
              onLoadedData={handleVideoLoad}
              muted={isMuted}
              preload="metadata"
            >
              <source 
                src="https://res.cloudinary.com/dqemas8ht/video/upload/v1761696641/RobotusDemo2_h1ce7e.mp4" 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
            
            {/* Video Controls Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              {!videoLoaded && (
                <div className="text-white text-lg">Loading video...</div>
              )}
              {videoLoaded && !isPlaying && (
                <Button
                  onClick={handlePlayPause}
                  className="bg-white/20 hover:bg-white/30 text-white border-0 rounded-full p-4"
                  size="lg"
                >
                  <Play className="h-8 w-8 ml-1" />
                </Button>
              )}
            </div>
            
            {/* Bottom Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Button
                  onClick={handlePlayPause}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={handleMuteToggle}
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-6 pt-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              onClick={handleSkip}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
            >
              Skip Demo
            </Button>
            <Button
              onClick={handleGetStarted}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Get Started!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
