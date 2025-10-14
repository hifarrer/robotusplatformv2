'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Image as ImageIcon, 
  Video, 
  Music, 
  Mic, 
  Sparkles,
  Copy,
  Check,
  Lightbulb,
  Palette,
  Camera,
  Film,
  Volume2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  onPromptSelect: (prompt: string) => void
}

interface PromptExample {
  id: string
  title: string
  description: string
  prompt: string
  icon: React.ReactNode
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  tips?: string[]
}

const promptExamples: PromptExample[] = [
  // Image Generation Examples
  {
    id: 'img-portrait',
    title: 'Portrait Photography',
    description: 'Create stunning portrait images',
    prompt: 'Professional headshot of a young woman with curly hair, soft lighting, studio photography, high quality, detailed',
    icon: <Camera className="w-5 h-5" />,
    category: 'Image Generation',
    difficulty: 'beginner',
    tips: ['Be specific about lighting', 'Describe facial features', 'Mention photography style']
  },
  {
    id: 'img-landscape',
    title: 'Landscape Art',
    description: 'Generate beautiful nature scenes',
    prompt: 'Majestic mountain range at sunset, golden hour lighting, misty mountains, cinematic composition, 4K quality',
    icon: <Palette className="w-5 h-5" />,
    category: 'Image Generation',
    difficulty: 'beginner',
    tips: ['Include time of day', 'Describe weather conditions', 'Mention composition style']
  },
  {
    id: 'img-concept',
    title: 'Concept Art',
    description: 'Create fantasy and sci-fi concepts',
    prompt: 'Futuristic cyberpunk cityscape at night, neon lights, flying cars, rain-soaked streets, Blade Runner style, highly detailed',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'Image Generation',
    difficulty: 'intermediate',
    tips: ['Reference specific art styles', 'Include mood and atmosphere', 'Describe architectural elements']
  },
  
  // Video Generation Examples
  {
    id: 'vid-cinematic',
    title: 'Cinematic Video',
    description: 'Create movie-like video sequences',
    prompt: 'Cinematic shot of a person walking through a forest, camera following behind, golden hour lighting, film grain, 5 seconds',
    icon: <Film className="w-5 h-5" />,
    category: 'Video Generation',
    difficulty: 'intermediate',
    tips: ['Specify camera movement', 'Include duration (5s or 8s)', 'Describe cinematic style']
  },
  {
    id: 'vid-animation',
    title: 'Animated Scene',
    description: 'Bring static images to life',
    prompt: 'Animate this image with gentle wind effects, leaves swaying, clouds moving, subtle camera pan, 8 seconds',
    icon: <Video className="w-5 h-5" />,
    category: 'Video Generation',
    difficulty: 'beginner',
    tips: ['Upload a reference image first', 'Describe the type of motion', 'Keep it simple for best results']
  },
  {
    id: 'vid-transformation',
    title: 'Transformation Video',
    description: 'Show dramatic changes over time',
    prompt: 'Time-lapse transformation from day to night, city lights gradually turning on, dramatic sky change, 10 seconds',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'Video Generation',
    difficulty: 'advanced',
    tips: ['Be specific about the transformation', 'Include timing details', 'Describe the visual progression']
  },

  // Audio Generation Examples
  {
    id: 'audio-narration',
    title: 'Voice Narration',
    description: 'Generate professional voiceovers',
    prompt: '"Welcome to our presentation. Today we will explore the fascinating world of artificial intelligence and its impact on modern technology." - Professional American male voice, clear pronunciation, confident tone',
    icon: <Volume2 className="w-5 h-5" />,
    category: 'Audio Generation',
    difficulty: 'beginner',
    tips: ['Put text in quotes', 'Specify voice characteristics', 'Describe tone and style']
  },
  {
    id: 'audio-character',
    title: 'Character Voice',
    description: 'Create unique character voices',
    prompt: '"Greetings, traveler! Welcome to the mystical realm of adventure!" - Deep, booming male voice, fantasy character, enthusiastic delivery',
    icon: <Mic className="w-5 h-5" />,
    category: 'Audio Generation',
    difficulty: 'intermediate',
    tips: ['Define character personality', 'Include emotional tone', 'Specify accent if needed']
  },
  {
    id: 'audio-ambient',
    title: 'Ambient Audio',
    description: 'Generate atmospheric sounds',
    prompt: '"The gentle sound of rain on leaves, birds chirping in the distance, peaceful forest ambiance" - Nature sounds, relaxing atmosphere',
    icon: <Music className="w-5 h-5" />,
    category: 'Audio Generation',
    difficulty: 'beginner',
    tips: ['Describe the environment', 'Include specific sounds', 'Mention the mood']
  },

  // Lipsync Examples
  {
    id: 'lipsync-presentation',
    title: 'Presentation Lipsync',
    description: 'Make images speak presentations',
    prompt: 'Make this person speak: "Hello everyone, thank you for joining today\'s meeting. Let\'s begin with our quarterly review." - Professional business tone',
    icon: <Mic className="w-5 h-5" />,
    category: 'Lipsync',
    difficulty: 'beginner',
    tips: ['Upload a clear face image', 'Keep text concise', 'Use natural speech patterns']
  },
  {
    id: 'lipsync-character',
    title: 'Character Lipsync',
    description: 'Animate character dialogue',
    prompt: 'Make this character say: "Welcome to my magical workshop! What adventure shall we embark on today?" - Enthusiastic, friendly tone',
    icon: <Sparkles className="w-5 h-5" />,
    category: 'Lipsync',
    difficulty: 'intermediate',
    tips: ['Use character-appropriate language', 'Include emotional context', 'Keep sentences natural']
  },
  {
    id: 'lipsync-tutorial',
    title: 'Tutorial Lipsync',
    description: 'Create educational speaking content',
    prompt: 'Make this instructor explain: "First, we need to understand the basic principles. Let me show you step by step how this works." - Clear, educational tone',
    icon: <Lightbulb className="w-5 h-5" />,
    category: 'Lipsync',
    difficulty: 'intermediate',
    tips: ['Use instructional language', 'Break down complex concepts', 'Include pauses naturally']
  }
]

const categories = [
  { id: 'all', name: 'All Examples', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'Image Generation', name: 'Images', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'Video Generation', name: 'Videos', icon: <Video className="w-4 h-4" /> },
  { id: 'Audio Generation', name: 'Audio', icon: <Music className="w-4 h-4" /> },
  { id: 'Lipsync', name: 'Lipsync', icon: <Mic className="w-4 h-4" /> }
]

export function HelpModal({ isOpen, onClose, onPromptSelect }: HelpModalProps) {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null)

  const filteredExamples = selectedCategory === 'all' 
    ? promptExamples 
    : promptExamples.filter(example => example.category === selectedCategory)

  const handleCopyPrompt = async (prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopiedPrompt(prompt)
      setTimeout(() => setCopiedPrompt(null), 2000)
    } catch (err) {
      console.error('Failed to copy prompt:', err)
    }
  }

  const handleUsePrompt = (prompt: string) => {
    onPromptSelect(prompt)
    onClose()
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'intermediate': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'advanced': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            Help Me - Prompt Examples & Tips
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-700">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  "flex items-center gap-2",
                  selectedCategory === category.id
                    ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                    : "text-gray-300 border-gray-600 hover:bg-gray-700"
                )}
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>

          {/* Examples Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExamples.map((example) => (
                <div
                  key={example.id}
                  className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:bg-gray-750/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {example.icon}
                      <h3 className="font-semibold text-white">{example.title}</h3>
                    </div>
                    <Badge className={getDifficultyColor(example.difficulty)}>
                      {example.difficulty}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3">{example.description}</p>
                  
                  <div className="bg-gray-900/50 border border-gray-600 rounded p-3 mb-3">
                    <p className="text-gray-200 text-sm font-mono leading-relaxed">
                      {example.prompt}
                    </p>
                  </div>
                  
                  {example.tips && example.tips.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">💡 Tips:</p>
                      <ul className="text-xs text-gray-400 space-y-1">
                        {example.tips.map((tip, index) => (
                          <li key={index}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUsePrompt(example.prompt)}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                    >
                      Use This Prompt
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCopyPrompt(example.prompt)}
                      className="px-3"
                    >
                      {copiedPrompt === example.prompt ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-400">
              <p>💡 Click "Use This Prompt" to add it to your chat, or copy to clipboard</p>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
