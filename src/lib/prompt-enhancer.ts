/**
 * Prompt Enhancement Utility for Robotus
 * 
 * This utility automatically enhances text-to-image prompts with hyper-realistic keywords
 * to ensure Robotus specializes in photo-realistic content, while respecting user preferences
 * for non-realistic styles like cartoon or 3D animated content.
 */

// Keywords that indicate non-realistic styles - these should NOT be enhanced
const NON_REALISTIC_KEYWORDS = [
  // Cartoon/Anime styles
  'cartoon', 'cartoonish', 'anime', 'manga', 'comic', 'comic book', 'illustration', 'illustrated',
  'drawing', 'sketch', 'hand drawn', 'hand-drawn', 'sketched', 'drawn',
  
  // 3D/Computer graphics
  '3d', '3-d', 'three dimensional', 'three-dimensional', 'cgi', 'computer generated', 'computer-generated',
  'rendered', '3d render', '3d rendered', 'blender', 'maya', 'cinema 4d', '3ds max',
  
  // Artistic styles
  'painting', 'painted', 'oil painting', 'watercolor', 'acrylic', 'digital art', 'digital painting',
  'artwork', 'artistic', 'abstract', 'surreal', 'fantasy art', 'concept art',
  
  // Stylized approaches
  'stylized', 'artistic style', 'art style', 'low poly', 'low-poly', 'pixel art', 'pixelated',
  'retro', 'vintage', 'old school', 'oldschool', '8-bit', '16-bit', 'game art',
  
  // Specific non-realistic descriptors
  'unrealistic', 'fantasy', 'magical', 'fairy tale', 'fairy-tale', 'storybook', 'story book',
  'children\'s book', 'childrens book', 'kid\'s book', 'kids book'
]

// Hyper-realistic enhancement keywords to add
const HYPER_REALISTIC_KEYWORDS = [
  'photo realistic', 'hyper realistic', 'hyperrealistic', 'ultra realistic', 'ultra-realistic',
  'photorealistic', 'photography', 'professional photography', 'high resolution', 'high-resolution',
  'detailed skin', 'skin details', 'pore details', 'skin texture', 'realistic skin',
  'natural lighting', 'studio lighting', 'professional lighting', 'sharp focus', 'crisp details',
  'fine details', 'intricate details', 'realistic materials', 'realistic textures',
  'depth of field', 'bokeh', 'cinematic', 'film quality', '4k', '8k'
]

/**
 * Checks if a prompt contains non-realistic style keywords
 * @param prompt - The user's prompt text
 * @returns true if the prompt contains non-realistic keywords
 */
export function containsNonRealisticKeywords(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase()
  
  return NON_REALISTIC_KEYWORDS.some(keyword => 
    lowerPrompt.includes(keyword.toLowerCase())
  )
}

/**
 * Enhances a prompt with hyper-realistic keywords if it doesn't contain non-realistic style keywords
 * @param originalPrompt - The user's original prompt
 * @returns Enhanced prompt with hyper-realistic keywords, or original prompt if non-realistic keywords detected
 */
export function enhancePromptForRealism(originalPrompt: string): string {
  // Check if the prompt already contains non-realistic keywords
  if (containsNonRealisticKeywords(originalPrompt)) {
    console.log('🎨 Prompt contains non-realistic keywords - skipping enhancement:', originalPrompt)
    return originalPrompt
  }
  
  // Check if the prompt already contains realistic keywords
  const lowerPrompt = originalPrompt.toLowerCase()
  const alreadyHasRealisticKeywords = HYPER_REALISTIC_KEYWORDS.some(keyword => 
    lowerPrompt.includes(keyword.toLowerCase())
  )
  
  if (alreadyHasRealisticKeywords) {
    console.log('🎨 Prompt already contains realistic keywords - skipping enhancement:', originalPrompt)
    return originalPrompt
  }
  
  // Select 2-3 relevant enhancement keywords based on the prompt content
  const selectedKeywords = selectRelevantEnhancementKeywords(originalPrompt)
  
  if (selectedKeywords.length === 0) {
    console.log('🎨 No relevant enhancement keywords selected - returning original prompt:', originalPrompt)
    return originalPrompt
  }
  
  // Enhance the prompt
  const enhancedPrompt = `${originalPrompt}, ${selectedKeywords.join(', ')}`
  
  console.log('🎨 Enhanced prompt for realism:', {
    original: originalPrompt,
    enhanced: enhancedPrompt,
    addedKeywords: selectedKeywords
  })
  
  return enhancedPrompt
}

/**
 * Selects relevant enhancement keywords based on the prompt content
 * @param prompt - The user's prompt
 * @returns Array of selected enhancement keywords
 */
function selectRelevantEnhancementKeywords(prompt: string): string[] {
  const lowerPrompt = prompt.toLowerCase()
  const selectedKeywords: string[] = []
  
  // Always add basic realism keywords
  selectedKeywords.push('photo realistic', 'hyper realistic')
  
  // Add skin-related keywords if the prompt mentions people, faces, or portraits
  if (lowerPrompt.includes('person') || lowerPrompt.includes('people') || 
      lowerPrompt.includes('face') || lowerPrompt.includes('portrait') || 
      lowerPrompt.includes('woman') || lowerPrompt.includes('man') || 
      lowerPrompt.includes('girl') || lowerPrompt.includes('boy') ||
      lowerPrompt.includes('human') || lowerPrompt.includes('character')) {
    selectedKeywords.push('detailed skin', 'skin texture')
  }
  
  // Add lighting keywords if not already specified
  if (!lowerPrompt.includes('lighting') && !lowerPrompt.includes('light') && 
      !lowerPrompt.includes('shadow') && !lowerPrompt.includes('bright')) {
    selectedKeywords.push('natural lighting')
  }
  
  // Add detail keywords for objects, products, or scenes
  if (lowerPrompt.includes('product') || lowerPrompt.includes('object') || 
      lowerPrompt.includes('scene') || lowerPrompt.includes('environment') ||
      lowerPrompt.includes('background') || lowerPrompt.includes('setting')) {
    selectedKeywords.push('fine details', 'sharp focus')
  }
  
  // Limit to 3-4 keywords maximum to avoid overwhelming the prompt
  return selectedKeywords.slice(0, 4)
}

/**
 * Analyzes a prompt to determine if it should be enhanced for realism
 * @param prompt - The user's prompt
 * @returns Analysis result with recommendation
 */
export function analyzePromptForEnhancement(prompt: string): {
  shouldEnhance: boolean
  reason: string
  detectedNonRealisticKeywords: string[]
  detectedRealisticKeywords: string[]
} {
  const lowerPrompt = prompt.toLowerCase()
  
  // Find detected non-realistic keywords
  const detectedNonRealisticKeywords = NON_REALISTIC_KEYWORDS.filter(keyword => 
    lowerPrompt.includes(keyword.toLowerCase())
  )
  
  // Find detected realistic keywords
  const detectedRealisticKeywords = HYPER_REALISTIC_KEYWORDS.filter(keyword => 
    lowerPrompt.includes(keyword.toLowerCase())
  )
  
  const shouldEnhance = detectedNonRealisticKeywords.length === 0 && detectedRealisticKeywords.length === 0
  
  let reason = ''
  if (detectedNonRealisticKeywords.length > 0) {
    reason = `Non-realistic style detected: ${detectedNonRealisticKeywords.join(', ')}`
  } else if (detectedRealisticKeywords.length > 0) {
    reason = `Already contains realistic keywords: ${detectedRealisticKeywords.join(', ')}`
  } else {
    reason = 'Suitable for realism enhancement'
  }
  
  return {
    shouldEnhance,
    reason,
    detectedNonRealisticKeywords,
    detectedRealisticKeywords
  }
}

/**
 * Gets all available non-realistic keywords for reference
 * @returns Array of all non-realistic keywords
 */
export function getNonRealisticKeywords(): string[] {
  return [...NON_REALISTIC_KEYWORDS]
}

/**
 * Gets all available hyper-realistic keywords for reference
 * @returns Array of all hyper-realistic keywords
 */
export function getHyperRealisticKeywords(): string[] {
  return [...HYPER_REALISTIC_KEYWORDS]
}
